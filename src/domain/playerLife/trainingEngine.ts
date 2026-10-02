/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { StateChange } from '../livingWorld/types';
import { PLAYER_LIFE as P } from '../../config/gameTuning';
import type { TrainingSessionPlan } from './types';
import { clamp100 } from './math';

export type LegacyDrillType = 'stamina' | 'technical' | 'finishing';

export function legacyDrillToPlan(drill: LegacyDrillType): TrainingSessionPlan {
  switch (drill) {
    case 'stamina':
      return { category: 'physical', intensity: 'normal' };
    case 'technical':
      return { category: 'technical', intensity: 'normal' };
    case 'finishing':
      return { category: 'position_specific', intensity: 'high' };
  }
}

export function stateChangesForTrainingSession(
  playerIds: string[],
  plan: TrainingSessionPlan,
): StateChange[] {
  const load =
    plan.category === 'recovery' ? P.training.recoveryLoadDelta : P.training.intensityLoad[plan.intensity];
  const changes: StateChange[] = [];

  for (const playerId of playerIds) {
    if (plan.category === 'recovery') {
      changes.push({
        kind: 'patchPlayerLife',
        playerId,
        conditionDelta: { trainingLoad: load, recoveryQuality: 5 },
        legacyDelta: { fatigue: -20, stamina: 12 },
      });
    } else if (plan.category === 'physical') {
      changes.push({
        kind: 'patchPlayerLife',
        playerId,
        conditionDelta: { trainingLoad: load, sharpness: P.training.sharpnessTrainingGain * 0.5 },
        legacyDelta: {
          fatigue: P.training.staminaDrillFatigueDelta,
          stamina: P.training.staminaDrillStaminaDelta,
        },
      });
    } else if (plan.category === 'technical') {
      changes.push({
        kind: 'patchPlayerLife',
        playerId,
        conditionDelta: { trainingLoad: load, sharpness: P.training.sharpnessTrainingGain },
        legacyDelta: { form: P.training.technicalFormDelta, morale: P.training.technicalMoraleDelta },
      });
    } else {
      changes.push({
        kind: 'patchPlayerLife',
        playerId,
        conditionDelta: { trainingLoad: load, sharpness: P.training.sharpnessTrainingGain * 0.8 },
        legacyDelta: { fatigue: Math.min(15, load) },
      });
    }
  }
  return changes;
}

export function weeklyTrainingLoadDecay(currentLoad: number): number {
  return clamp100(currentLoad - P.training.weeklyLoadDecay);
}
