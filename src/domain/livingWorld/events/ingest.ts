/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Authoritative GameEvent ingestion for Phase F.
 *
 * Pipeline: GameEvent → append/dedupe → handler → StateChange[] → story → news → notifications
 *
 * Legacy direct `appendGameEvent` via applyStateChanges (Player Life injuries) bypasses this
 * pipeline intentionally to avoid double-applying player patches; the store should prefer
 * ingestGameEvent for any new emitters.
 */

import { deriveNotificationsFromEvent } from '../notifications/derive';
import { filterNotificationsByThrottle, mergeDuplicateNotifications } from '../notifications/throttle';
import { applyStateChanges } from '../reducer';
import type { ReducerInput, ReducerResult, StateChange, GameEvent } from '../types';
import { getHandler } from './registry';
import { isEventOnCooldown, type EventLogPolicy } from './eventLog';
import { buildStoryChanges } from '../story/pipeline';
import {
  appendNewsWithCaps,
  buildNewsItemFromGameEvent,
  canAcceptNews,
  recordNewsAccepted,
} from '../news/generator';
import { ensurePhaseFState } from '../phaseF/ensurePhaseF';
import { LIVING_WORLD_TUNING } from '../config/livingWorldTuning';
import { handlerChangesFromReputationEvent, isReputationCatalogEventType } from '../manager/reputationCatalog';

export interface IngestGameEventOptions {
  nowMs?: number;
  policy?: EventLogPolicy;
  gameWeek?: number;
  recentUserResults?: readonly ('W' | 'D' | 'L')[];
  clubId?: string;
}

export interface IngestGameEventResult {
  applied: boolean;
  skippedReason?: 'cooldown' | 'no_handler';
  result: ReducerResult;
  event?: GameEvent;
}

const defaultPolicy: EventLogPolicy = {
  cooldownMsByType: {
    'player.morale_shift': 30_000,
    'player.mental_shift': 30_000,
  },
};

function resolveHandlerChanges(event: GameEvent, input: ReducerInput): StateChange[] {
  if (isReputationCatalogEventType(event.type)) {
    return handlerChangesFromReputationEvent(event);
  }
  const handler = getHandler(event.type);
  return handler ? handler(event, input) : [];
}

function newsChangesFromEvent(
  event: GameEvent,
  input: ReducerInput,
  clubId: string,
): StateChange[] {
  const item = buildNewsItemFromGameEvent(event);
  if (!item) return [];
  const phaseF = ensurePhaseFState(input.livingWorld, clubId);
  if (!canAcceptNews(phaseF.newsThrottle, item.createdAt)) return [];
  if (phaseF.newsFeed.some((n) => n.id === item.id)) return [];
  const throttle = recordNewsAccepted(phaseF.newsThrottle, item.createdAt);
  const feed = appendNewsWithCaps(phaseF.newsFeed, item);
  return [
    {
      kind: 'patchPhaseF',
      clubId,
      patch: { newsFeed: feed, newsThrottle: throttle },
    },
  ];
}

function notificationChanges(
  event: GameEvent,
  input: ReducerInput,
): { changes: StateChange[]; throttle: ReducerInput['livingWorld']['notificationThrottle'] } {
  const phaseF = ensurePhaseFState(input.livingWorld, event.clubId ?? '');
  const newsItem = buildNewsItemFromGameEvent(event);
  const notifs = deriveNotificationsFromEvent({
    ...event,
    severity:
      newsItem && newsItem.importance >= LIVING_WORLD_TUNING.story.importanceMirrorToNotification
        ? 'high'
        : event.severity,
    context: {
      ...event.context,
      title: event.context.title ?? newsItem?.type ?? event.type,
      message: event.context.message ?? `Event ${event.type}`,
    },
  });
  const { accepted, throttle } = filterNotificationsByThrottle(
    input.livingWorld.notificationThrottle,
    notifs,
  );
  void phaseF;
  return {
    changes: accepted.map((n) => ({ kind: 'addNotification' as const, notification: n })),
    throttle,
  };
}

export function ingestGameEvent(
  input: ReducerInput,
  event: GameEvent,
  options?: IngestGameEventOptions,
): IngestGameEventResult {
  const nowMs = options?.nowMs ?? Date.parse(event.timestamp);
  const policy = options?.policy ?? defaultPolicy;
  const clubId = options?.clubId ?? event.clubId ?? '';

  if (isEventOnCooldown(input.livingWorld.eventLog, event, nowMs, policy)) {
    return {
      applied: false,
      skippedReason: 'cooldown',
      result: { livingWorld: input.livingWorld, players: input.players },
    };
  }

  const handlerChanges = resolveHandlerChanges(event, input);
  const storyChanges = buildStoryChanges({
    event,
    reducerInput: input,
    gameWeek: options?.gameWeek ?? 1,
    recentUserResults: options?.recentUserResults ?? [],
  });
  const newsChanges = clubId ? newsChangesFromEvent(event, input, clubId) : [];
  const notif = notificationChanges(event, input);

  const changes: StateChange[] = [
    { kind: 'appendGameEvent', event },
    ...handlerChanges,
    ...storyChanges,
    ...newsChanges,
    ...notif.changes,
  ];

  let result = applyStateChanges(input, changes);
  result = {
    ...result,
    livingWorld: {
      ...result.livingWorld,
      notificationThrottle: notif.throttle,
      notifications: mergeDuplicateNotifications(result.livingWorld.notifications, []),
    },
  };

  return { applied: true, result, event };
}

export function ingestGameEventBatch(
  input: ReducerInput,
  events: readonly GameEvent[],
  options?: IngestGameEventOptions,
): ReducerInput {
  let acc = input;
  for (const event of events) {
    const out = ingestGameEvent(acc, event, options);
    if (out.applied) {
      acc = out.result;
    }
  }
  return acc;
}
