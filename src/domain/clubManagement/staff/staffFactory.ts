/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { SeededRandom } from '../../../engine/prng';
import { hashStringToSeed } from '../../shared/seed';
import { SeededRandom as SR } from '../../../engine/prng';
import { clamp } from '../../shared/math';
import type { StaffAttributes } from '../types';

export function defaultAttributesFromSeed(seedKey: string, rng?: SeededRandom): StaffAttributes {
  const r = rng ?? new SR(hashStringToSeed(seedKey));
  const jitter = () => clamp(50 + r.nextRange(-12, 12), 1, 99);
  return {
    tacticalKnowledge: jitter(),
    manManagement: jitter(),
    youthDevelopment: jitter(),
    judgingAbility: jitter(),
    injuryPrevention: jitter(),
    diagnosisAccuracy: jitter(),
    setPieceCoaching: jitter(),
    fitnessCoaching: jitter(),
    scoutingRange: jitter(),
  };
}
