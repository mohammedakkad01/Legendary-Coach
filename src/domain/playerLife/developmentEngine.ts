/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Player } from '../../types/game';
import { PLAYER_LIFE as P } from '../../config/gameTuning';
import type { PlayerDevelopmentSlice } from './types';
import { clamp } from '../shared/math';

export function ageDevelopmentMultiplier(age: number): number {
  if (age < P.development.agePeakStart) return 0.85 + (age - 16) * 0.03;
  if (age <= P.development.agePeakEnd) return 1.15;
  if (age >= P.development.declineAge) return 0.55;
  return 1 - (age - P.development.agePeakEnd) * 0.06;
}

export function weeklyDevelopmentProgress(
  player: Player,
  minutesLastWeek: number,
  trainingGroundLevel: number,
  staffDevelopmentMult = 1,
): { overallDelta: number; devPatch: Partial<PlayerDevelopmentSlice> } {
  const dev = player.playerLife?.development;
  if (!dev || player.overall >= dev.truePotential) {
    return { overallDelta: 0, devPatch: { trajectory: 'stable', momentum: dev?.momentum ?? 0 } };
  }

  const prof = player.personalityProfile?.professionalism ?? 55;
  const morale = player.morale ?? 50;
  const facility = 1 + (clamp(trainingGroundLevel, 1, 10) - 1) * 0.04;
  const staffMult = clamp(staffDevelopmentMult, 0.5, 1.5);
  const minutesFactor = clamp(minutesLastWeek / 70, 0, 1.1);

  let progress =
    P.development.weeklyBaseProgress *
    ageDevelopmentMultiplier(player.age) *
    facility *
    staffMult *
    minutesFactor *
    (0.7 + prof / 200) *
    (0.85 + morale / 300);

  let momentum = dev.momentum;
  if (progress > 0.12) {
    momentum = clamp(momentum + P.development.momentumGain, -100, 100);
  } else if (minutesLastWeek < 20 && player.age <= 23) {
    momentum = clamp(momentum - P.development.momentumLoss, -100, 100);
    progress *= 0.5;
  }

  let trajectory: PlayerDevelopmentSlice['trajectory'] = 'stable';
  if (momentum > 25) trajectory = 'rising';
  if (momentum < -25) trajectory = 'declining';

  const overallDelta = progress >= 0.15 ? 1 : progress >= 0.08 && player.overall < dev.ceiling ? 1 : 0;

  const estimateDrift = (dev.potentialEstimate + dev.truePotential) / 2;
  const potentialEstimate = clamp(
    dev.potentialEstimate + (estimateDrift - dev.potentialEstimate) * 0.05,
    player.overall,
    dev.ceiling + dev.estimateUncertainty,
  );

  return {
    overallDelta,
    devPatch: { momentum, trajectory, potentialEstimate },
  };
}
