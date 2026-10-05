/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Shared notification pipeline: derive → throttle → reducer changes → merge.
 * Used by full ingest and by notification-only paths (events already logged).
 */

import { LIVING_WORLD_TUNING } from '../config/livingWorldTuning';
import { buildNewsItemFromGameEvent } from '../news/generator';
import { applyStateChanges } from '../reducer';
import type {
  GameEvent,
  GameNotification,
  NotificationThrottleState,
  ReducerInput,
  ReducerResult,
  StateChange,
} from '../types';
import { deriveNotificationsFromEvent } from './derive';
import { filterNotificationsByThrottle, mergeDuplicateNotifications } from './throttle';

export interface NotificationPipelineStep {
  changes: StateChange[];
  throttle: NotificationThrottleState;
  accepted: GameNotification[];
}

/** Derive + throttle for one event (matches ingest notificationChanges semantics). */
export function notificationPipelineStepForEvent(
  event: GameEvent,
  input: ReducerInput,
): NotificationPipelineStep {
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
  return {
    changes: accepted.map((n) => ({ kind: 'addNotification' as const, notification: n })),
    throttle,
    accepted,
  };
}

function finalizeNotificationReducerResult(
  result: ReducerResult,
  throttle: NotificationThrottleState,
): ReducerResult {
  return {
    ...result,
    livingWorld: {
      ...result.livingWorld,
      notificationThrottle: throttle,
      notifications: mergeDuplicateNotifications(result.livingWorld.notifications, []),
    },
  };
}

/**
 * Apply notification pipeline for events already present in the event log.
 * Does not append events or run ingest handlers.
 */
export function applyNotificationPipelineForEvents(
  input: ReducerResult,
  events: readonly GameEvent[],
): ReducerResult {
  if (events.length === 0) {
    return input;
  }

  let throttle = input.livingWorld.notificationThrottle;
  const changes: StateChange[] = [];

  for (const event of events) {
    const step = notificationPipelineStepForEvent(event, {
      livingWorld: { ...input.livingWorld, notificationThrottle: throttle },
      players: input.players,
    });
    throttle = step.throttle;
    changes.push(...step.changes);
  }

  if (changes.length === 0) {
    return { ...input, livingWorld: { ...input.livingWorld, notificationThrottle: throttle } };
  }

  const applied = applyStateChanges(input, changes);
  return finalizeNotificationReducerResult(applied, throttle);
}
