/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SeededRandom } from '../../../engine/prng';
import { hashStringToSeed } from '../../shared/seed';
import { clamp } from '../../shared/math';
import { STAFF_TUNING } from '../config/clubManagementTuning';
import type { StaffCategory, StaffMember } from '../types';
import { defaultAttributesFromSeed } from './staffFactory';

const POOL_NAMES = [
  'Marco Silva',
  'Elena Ortiz',
  'James Okonkwo',
  'Priya Nair',
  'Lucas Berg',
  'Hana Yusuf',
  'Diego Ferreira',
  'Amira Khalid',
];

const POOL_CATEGORIES: StaffCategory[] = [
  'fitness_coach',
  'physio',
  'scout',
  'recruitment_analyst',
  'goalkeeping_coach',
  'sports_scientist',
];

export function generateHiringPoolCandidates(
  clubId: string,
  worldSeed: number,
  gameWeek: number,
): StaffMember[] {
  const rng = new SeededRandom(hashStringToSeed(`staff_pool_${clubId}_${worldSeed}_${gameWeek}`));
  const size = STAFF_TUNING.hiringPoolSize;
  const out: StaffMember[] = [];
  for (let i = 0; i < size; i++) {
    const name = POOL_NAMES[rng.nextRange(0, POOL_NAMES.length - 1)]!;
    const category = POOL_CATEGORIES[rng.nextRange(0, POOL_CATEGORIES.length - 1)]!;
    const id = `hire_${clubId}_${gameWeek}_${i}`;
    const attrs = defaultAttributesFromSeed(`${id}_${worldSeed}`, rng);
    out.push({
      id,
      name,
      category,
      attributes: attrs,
      reputation: clamp(45 + rng.nextRange(-8, 18), 1, 99),
      weeklyWage: clamp(1200 + rng.nextRange(0, 2200), 800, 8000),
      contractWeeksRemaining: STAFF_TUNING.defaultContractWeeks,
    });
  }
  return out;
}
