/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { RECRUITMENT_TUNING as T } from '../config/recruitmentTuning';
import type { RumorThrottleState } from './rumorTypes';

export function rumorDedupeKey(parts: {
  type: string;
  playerId: string;
  claimingClubId?: string;
  claimKind: string;
}): string {
  return `${parts.type}|${parts.playerId}|${parts.claimingClubId ?? '_'}|${parts.claimKind}`;
}

export function canCreateRumor(
  state: RumorThrottleState,
  gameWeek: number,
  dedupeKey: string,
): { allowed: boolean; reason?: 'weekly_cap' | 'cooldown' } {
  const createdThisWeek = state.rumorsCreatedByWeek[gameWeek] ?? 0;
  if (createdThisWeek >= T.rumors.maxPerWeek) {
    return { allowed: false, reason: 'weekly_cap' };
  }
  const last = state.lastCreatedWeekByKey[dedupeKey];
  if (last !== undefined && gameWeek - last < T.rumors.dedupeCooldownWeeks) {
    return { allowed: false, reason: 'cooldown' };
  }
  return { allowed: true };
}

export function recordRumorCreated(state: RumorThrottleState, gameWeek: number, dedupeKey: string): RumorThrottleState {
  return {
    rumorsCreatedByWeek: {
      ...state.rumorsCreatedByWeek,
      [gameWeek]: (state.rumorsCreatedByWeek[gameWeek] ?? 0) + 1,
    },
    lastCreatedWeekByKey: {
      ...state.lastCreatedWeekByKey,
      [dedupeKey]: gameWeek,
    },
  };
}

export function emptyRumorThrottleState(): RumorThrottleState {
  return { rumorsCreatedByWeek: {}, lastCreatedWeekByKey: {} };
}
