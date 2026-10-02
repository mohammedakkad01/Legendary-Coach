/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { deriveNotificationsFromEvent } from '../notifications/derive';
import { filterNotificationsByThrottle, mergeDuplicateNotifications } from '../notifications/throttle';
import { applyStateChanges } from '../reducer';
import type { ReducerInput, ReducerResult, StateChange, GameEvent } from '../types';
import { getHandler } from './registry';
import { isEventOnCooldown, type EventLogPolicy } from './eventLog';

export interface DispatchResult {
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

export function dispatchGameEvent(
  input: ReducerInput,
  event: GameEvent,
  options?: { nowMs?: number; policy?: EventLogPolicy }
): DispatchResult {
  const nowMs = options?.nowMs ?? Date.parse(event.timestamp);
  const policy = options?.policy ?? defaultPolicy;

  if (isEventOnCooldown(input.livingWorld.eventLog, event, nowMs, policy)) {
    return {
      applied: false,
      skippedReason: 'cooldown',
      result: { livingWorld: input.livingWorld, players: input.players },
    };
  }

  const handler = getHandler(event.type);
  const handlerChanges: StateChange[] = handler ? handler(event, input) : [];

  if (!handler && handlerChanges.length === 0 && event.type !== 'system.noop') {
    // Still allow logging unknown types with empty handler
  }

  const notifs = deriveNotificationsFromEvent(event);
  const { accepted, throttle } = filterNotificationsByThrottle(
    input.livingWorld.notificationThrottle,
    notifs
  );

  const changes: StateChange[] = [
    { kind: 'appendGameEvent', event },
    ...handlerChanges,
    ...accepted.map((n) => ({ kind: 'addNotification' as const, notification: n })),
  ];

  let result = applyStateChanges(input, changes);
  result = {
    ...result,
    livingWorld: {
      ...result.livingWorld,
      notificationThrottle: throttle,
      notifications: mergeDuplicateNotifications(result.livingWorld.notifications, []),
    },
  };

  return { applied: true, result, event };
}
