/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MAX_EVENT_LOG } from '../types';
import type { GameEvent } from '../types';

export interface EventLogPolicy {
  cooldownMsByType: Record<string, number>;
}

const DEFAULT_COOLDOWN_MS = 60_000;

export function eventDedupeKey(event: GameEvent): string {
  return `${event.type}|${event.playerId ?? ''}|${event.clubId ?? ''}|${event.season}|${event.context['subType'] ?? ''}`;
}

export function isEventOnCooldown(
  log: GameEvent[],
  event: GameEvent,
  nowMs: number,
  policy: EventLogPolicy
): boolean {
  const cooldown = policy.cooldownMsByType[event.type] ?? DEFAULT_COOLDOWN_MS;
  const key = eventDedupeKey(event);
  for (let i = log.length - 1; i >= 0; i--) {
    const prev = log[i];
    if (eventDedupeKey(prev) !== key) continue;
    const prevMs = Date.parse(prev.timestamp);
    if (Number.isFinite(prevMs) && nowMs - prevMs < cooldown) {
      return true;
    }
    break;
  }
  return false;
}

export function appendToEventLog(log: GameEvent[], event: GameEvent): GameEvent[] {
  const next = [...log, event];
  if (next.length <= MAX_EVENT_LOG) return next;
  return next.slice(next.length - MAX_EVENT_LOG);
}
