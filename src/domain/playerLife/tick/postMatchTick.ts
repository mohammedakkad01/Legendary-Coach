/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { SeededRandom } from '../../../engine/prng';
import type { Player } from '../../../types/game';
import type { ReducerInput, StateChange } from '../../livingWorld/types';
import { PLAYER_LIFE as P } from '../../../config/gameTuning';
import { moraleChangesFromPostMatch } from '../moraleEngine';
import { updateFormFromMatchRating } from '../formEngine';
import {
  computeExpectedMinutes,
  frustrationFromMinutesShortfall,
  pushMinutesHistory,
} from '../playingTimeExpectation';
import { rollInjury } from '../injuryLifecycle';
import { weeklyDressingRoomChanges } from '../dressingRoom';
import type { PostMatchTickInput } from '../types';

export function buildPostMatchPlayerLifeChanges(
  input: ReducerInput,
  tick: PostMatchTickInput,
  lineupIds: string[],
  benchIds: string[],
  rng: SeededRandom,
): StateChange[] {
  const fatigueMult = tick.fatigueProtectionMult ?? 1;
  const changes: StateChange[] = [...moraleChangesFromPostMatch(tick.playerSummaries, tick.won, tick.drawn)];

  for (const s of tick.playerSummaries) {
    const player = input.players.find((p) => p.id === s.playerId);
    if (!player) continue;

    const { role, expected } = computeExpectedMinutes(player, lineupIds, benchIds);
    const history = pushMinutesHistory(
      player.playerLife?.playingTime.minutesLastMatches ?? [],
      s.minutes,
      P.playingTime.minutesHistoryLength,
    );

    const form = updateFormFromMatchRating(player.form, s.matchRating, s.minutes);
    const sharpGain = s.minutes * P.training.sharpnessFromMatchMin;

    changes.push({
      kind: 'patchPlayerLife',
      playerId: s.playerId,
      patch: {
        playingTime: { expectedMinutesPerMatch: expected, minutesLastMatches: history, squadRole: role },
      },
      conditionDelta: { sharpness: sharpGain, matchFitness: s.minutes * 0.08 },
      legacyDelta: {
        form: form - player.form,
        fatigue: s.wasStarter
          ? Math.round(20 * fatigueMult)
          : s.minutes > 0
            ? Math.round(8 * fatigueMult)
            : -15,
        stamina: s.wasStarter
          ? Math.max(-90, -Math.round(22 * fatigueMult))
          : s.minutes > 0
            ? -4
            : 15,
      },
    });

    const amb = player.personalityProfile?.ambition ?? 55;
    const frDelta = frustrationFromMinutesShortfall(expected, s.minutes, amb);
    if (frDelta > 0) {
      changes.push({
        kind: 'changePlayerMentalStateDelta',
        playerId: s.playerId,
        delta: { frustration: Math.round(frDelta) },
      });
    }
  }

  changes.push(
    ...weeklyDressingRoomChanges(input.livingWorld, tick.matchday, tick.season, tick.won, tick.drawn, rng),
  );

  return changes;
}

export function injuryStateChangeFromMatch(
  player: Player,
  minutes: number,
  ctx: {
    medicalCenterLevel: number;
    recentMatchesIn7Days: number;
    medicalDiagnosisMult?: number;
  },
  rng: SeededRandom,
): StateChange | null {
  if (minutes < 15) return null;
  const injury = rollInjury(rng, {
    medicalCenterLevel: ctx.medicalCenterLevel,
    fatigueInjury: player.fatigue > 75,
    medicalDiagnosisMult: ctx.medicalDiagnosisMult,
  });
  return {
    kind: 'patchPlayerLife',
    playerId: player.id,
    patch: { condition: { injury } },
    legacySet: { injuredWeeks: Math.ceil(injury.estimatedWeeksRemaining) },
  };
}
