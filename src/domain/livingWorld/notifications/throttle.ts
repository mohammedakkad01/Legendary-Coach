/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { GameNotification, NotificationCategory, NotificationThrottleState } from '../types';
import { NOTIFICATION_DAILY_CAP } from '../types';

export function dayKeyFromIso(iso: string): string {
  return iso.slice(0, 10);
}

export function canAcceptNotification(
  throttle: NotificationThrottleState,
  category: NotificationCategory,
  dayKey: string
): boolean {
  const bucket = throttle.dayBuckets[dayKey] ?? {};
  const count = bucket[category] ?? 0;
  return count < NOTIFICATION_DAILY_CAP[category];
}

export function recordNotificationAccepted(
  throttle: NotificationThrottleState,
  category: NotificationCategory,
  dayKey: string
): NotificationThrottleState {
  const bucket = { ...(throttle.dayBuckets[dayKey] ?? {}) };
  bucket[category] = (bucket[category] ?? 0) + 1;
  return {
    dayBuckets: {
      ...throttle.dayBuckets,
      [dayKey]: bucket,
    },
  };
}

export function filterNotificationsByThrottle(
  throttle: NotificationThrottleState,
  candidates: GameNotification[]
): { accepted: GameNotification[]; throttle: NotificationThrottleState } {
  let nextThrottle = throttle;
  const accepted: GameNotification[] = [];

  for (const n of candidates) {
    const day = dayKeyFromIso(n.createdAt);
    if (!canAcceptNotification(nextThrottle, n.category, day)) continue;
    nextThrottle = recordNotificationAccepted(nextThrottle, n.category, day);
    accepted.push(n);
  }

  return { accepted, throttle: nextThrottle };
}

export function mergeDuplicateNotifications(
  existing: GameNotification[],
  incoming: GameNotification[]
): GameNotification[] {
  const byKey = new Map<string, GameNotification>();
  for (const n of existing) byKey.set(n.dedupeKey, n);
  for (const n of incoming) {
    const prev = byKey.get(n.dedupeKey);
    if (prev) {
      byKey.set(n.dedupeKey, {
        ...prev,
        message: n.message,
        createdAt: n.createdAt,
        read: prev.read && n.read,
      });
    } else {
      byKey.set(n.dedupeKey, n);
    }
  }
  return Array.from(byKey.values());
}
