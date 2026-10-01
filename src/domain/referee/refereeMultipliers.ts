/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Maps a RefereeProfile to bounded simulation multipliers (gameTuning.REFEREE).
 */

import { REFEREE as R } from '../../config/gameTuning';
import { clamp } from '../shared/math';
import type { RefereeProfile } from './refereeTypes';

export interface RefereeMultipliers {
  readonly foulMinute: number;
  readonly yellowGivenFoul: number;
  readonly redGivenFoul: number;
  readonly penaltyGivenFoul: number;
  readonly advantagePlay: number;
}

const traitMul = (value: number, scale: number): number =>
  clamp(1 + ((value - 50) / 50) * scale, R.traitMultiplierMin, R.traitMultiplierMax);

export function refereeMultipliers(profile: RefereeProfile): RefereeMultipliers {
  const foulMinute = clamp(
    R.baseFoulMinuteChance * traitMul(profile.foulSensitivity, R.foulSensitivityScale),
    R.minFoulMinuteChance,
    R.maxFoulMinuteChance,
  );
  const strict = traitMul(profile.strictness, R.strictnessScale);
  const cards = traitMul(profile.cardTendency, R.cardTendencyScale);
  return {
    foulMinute,
    yellowGivenFoul: clamp(R.baseYellowGivenFoul * strict * cards, R.minYellowGivenFoul, R.maxYellowGivenFoul),
    redGivenFoul: clamp(R.baseRedGivenFoul * strict * cards, R.minRedGivenFoul, R.maxRedGivenFoul),
    penaltyGivenFoul: clamp(
      R.basePenaltyGivenFoul * traitMul(profile.penaltyTendency, R.penaltyTendencyScale),
      R.minPenaltyGivenFoul,
      R.maxPenaltyGivenFoul,
    ),
    advantagePlay: clamp(
      R.baseAdvantageRate * traitMul(profile.advantageTendency, R.advantageTendencyScale),
      R.minAdvantageRate,
      R.maxAdvantageRate,
    ),
  };
}
