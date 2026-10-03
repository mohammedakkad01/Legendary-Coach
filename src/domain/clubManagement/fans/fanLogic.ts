/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { clamp } from '../../shared/math';
import { FANS_TUNING } from '../config/clubManagementTuning';
import type { FansSlice, ClubManagementChange } from '../types';
import type { GameEvent } from '../../livingWorld/types';

export function createDefaultFans(mood: number): FansSlice {
  const m = clamp(mood, 0, 100);
  return {
    mood: m,
    confidence: m,
    trust: m,
    lastEventWeek: 0,
  };
}

export function applyMatchResultToFans(
  fans: FansSlice,
  won: boolean,
  drawn: boolean,
  ticketPrice: number,
  gameWeek: number,
): { fans: FansSlice; events: GameEvent[]; changes: ClubManagementChange[] } {
  let delta = FANS_TUNING.moodFromDraw;
  if (won) delta = FANS_TUNING.moodFromWin;
  else if (!drawn) delta = FANS_TUNING.moodFromLoss;

  const pricePenalty = Math.max(0, (ticketPrice - 25) * FANS_TUNING.ticketPriceMoodPenaltyScale);
  delta -= Math.round(pricePenalty);

  const mood = clamp(fans.mood + delta, 0, 100);
  const confidence = clamp(fans.confidence + delta * 0.6 - FANS_TUNING.confidenceDecayPerWeek, 0, 100);
  const trust = clamp(fans.trust + delta * 0.4, 0, 100);

  const next: FansSlice = { ...fans, mood, confidence, trust, lastEventWeek: gameWeek };
  const events: GameEvent[] = [];
  if (Math.abs(delta) >= 3) {
    events.push({
      id: `evt_fans_mood_${gameWeek}`,
      type: 'fans.mood_shift',
      timestamp: new Date().toISOString(),
      season: 1,
      severity: 'low',
      context: {
        delta,
        mood,
        reasonCode: won ? 'result_win' : drawn ? 'result_draw' : 'result_loss',
      },
    });
  }

  return {
    fans: next,
    events,
    changes: [{ kind: 'patchFans', patch: next }],
  };
}

export function fanBoardPressureDelta(fans: FansSlice): number {
  if (fans.mood < FANS_TUNING.boardPressureFromLowMoodThreshold) {
    return FANS_TUNING.boardPressureDelta;
  }
  return 0;
}
