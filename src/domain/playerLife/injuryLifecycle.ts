/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { SeededRandom } from '../../engine/prng';
import { PLAYER_LIFE as P } from '../../config/gameTuning';
import type { InjurySeverity, PlayerInjuryState } from './types';
import { clamp } from '../shared/math';

function pickSeverity(rng: SeededRandom, fatigueInjury: boolean): InjurySeverity {
  const r = rng.nextFloat();
  if (fatigueInjury) return r < 0.7 ? 'minor' : 'moderate';
  if (r < 0.45) return 'minor';
  if (r < 0.78) return 'moderate';
  if (r < 0.93) return 'major';
  return 'recurring';
}

function weeksForSeverity(severity: InjurySeverity, rng: SeededRandom): number {
  const band = P.injury.severityWeeks[severity];
  return rng.nextRange(band.min, band.max);
}

export function rollInjury(
  rng: SeededRandom,
  opts: { fatigueInjury?: boolean; medicalCenterLevel: number },
): PlayerInjuryState {
  const fatigueInjury = opts.fatigueInjury ?? rng.nextChance(0.35);
  const severity = pickSeverity(rng, fatigueInjury);
  const trueWeeks = weeksForSeverity(severity, rng);
  const medQ = 0.5 + (clamp(opts.medicalCenterLevel, 1, 10) - 1) * P.injury.medicalLevelToQuality;
  const diagnosisConfidence = clamp(55 + medQ * 35, 40, 95);
  const error = Math.round((1 - diagnosisConfidence / 100) * P.injury.diagnosisErrorMaxWeeks);
  const sign = rng.nextChance(0.5) ? 1 : -1;
  const estimated = Math.max(1, trueWeeks + sign * error);

  return {
    severity,
    fatigueInjury,
    muscleRisk: clamp(30 + (fatigueInjury ? 25 : 10) + rng.nextRange(-5, 15), 0, 100),
    trueWeeksRemaining: trueWeeks,
    estimatedWeeksRemaining: estimated,
    diagnosisConfidence,
  };
}

export function advanceInjuryWeek(
  injury: PlayerInjuryState,
  medicalCenterLevel: number,
): PlayerInjuryState | null {
  const med = 0.5 + (clamp(medicalCenterLevel, 1, 10) - 1) * P.injury.medicalLevelToQuality;
  const progress = P.injury.recoveryWeeklyProgress * med;
  const trueNext = injury.trueWeeksRemaining - progress;
  const estNext = injury.estimatedWeeksRemaining - progress;
  if (trueNext <= 0) return null;
  return {
    ...injury,
    trueWeeksRemaining: trueNext,
    estimatedWeeksRemaining: Math.max(1, estNext),
    diagnosisConfidence: clamp(injury.diagnosisConfidence + 3, 40, 98),
  };
}
