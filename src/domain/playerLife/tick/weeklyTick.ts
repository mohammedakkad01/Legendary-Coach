/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { SeededRandom } from '../../../engine/prng';
import type { ReducerInput, StateChange } from '../../livingWorld/types';
import { weeklyTrainingLoadDecay } from '../trainingEngine';
import { advanceInjuryWeek } from '../injuryLifecycle';
import { weeklyDevelopmentProgress } from '../developmentEngine';
import { decayFormWhenIdle } from '../formEngine';
import { maybeGenerateInteraction } from '../interactions/generator';
import { weeklyMentoringChanges } from '../mentoring';
import type { WeeklyTickInput } from '../types';
import { PLAYER_LIFE as P } from '../../../config/gameTuning';
import { computeExpectedMinutes } from '../playingTimeExpectation';

export function buildWeeklyPlayerLifeChanges(
  input: ReducerInput,
  tick: WeeklyTickInput,
  rng: SeededRandom,
): StateChange[] {
  const changes: StateChange[] = [];

  for (const player of input.players) {
    const life = player.playerLife;
    const load = weeklyTrainingLoadDecay(life?.condition.trainingLoad ?? 0);
    const sharp = Math.max(0, (life?.condition.sharpness ?? 50) - P.training.sharpnessDecayPerWeek);

    let injuryPatch = life?.condition.injury;
    if (injuryPatch) {
      const next = advanceInjuryWeek(
        injuryPatch,
        tick.medicalCenterLevel,
        tick.medicalRecoveryMult ?? 1,
      );
      injuryPatch = next ?? undefined;
    }

    const minutesLast = life?.playingTime.minutesLastMatches.slice(-1)[0] ?? 0;
    const form = decayFormWhenIdle(player.form, minutesLast > 0);

    const { role, expected } = computeExpectedMinutes(player, tick.lineupIds, tick.benchIds);

    changes.push({
      kind: 'patchPlayerLife',
      playerId: player.id,
      patch: {
        condition: {
          trainingLoad: load,
          sharpness: sharp,
          injury: injuryPatch ?? null,
        },
        playingTime: { squadRole: role, expectedMinutesPerMatch: expected },
      },
      legacyDelta: { form: form - player.form },
      legacySet: {
        injuredWeeks: injuryPatch ? Math.ceil(injuryPatch.estimatedWeeksRemaining) : 0,
      },
    });

    const dev = weeklyDevelopmentProgress(
      player,
      minutesLast,
      tick.trainingGroundLevel,
      tick.staffDevelopmentMult ?? 1,
    );
    if (dev.overallDelta > 0 || dev.devPatch.momentum !== undefined) {
      changes.push({
        kind: 'patchPlayerLife',
        playerId: player.id,
        patch: { development: dev.devPatch },
        legacyDelta: { overall: dev.overallDelta },
      });
    }

    changes.push(...maybeGenerateInteraction(player, input.livingWorld, tick.matchday, tick.season, rng));
  }

  changes.push(...weeklyMentoringChanges(input.players, input.livingWorld.relationships));
  return changes;
}
