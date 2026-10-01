/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Seeded referee assignment for a user match. Same match seed → same referee.
 */

import { SeededRandom } from '../../engine/prng';
import { REFEREE as R } from '../../config/gameTuning';
import { clamp } from '../shared/math';
import type { RefereeProfile } from './refereeTypes';

const REF_NAMES = [
  { ar: 'محمد الحكم', en: 'Mohammed Al-Hakam' },
  { ar: 'جون أتkinson', en: 'John Atkinson' },
  { ar: 'لويس دías', en: 'Luis Diaz' },
  { ar: 'بierre لامont', en: 'Pierre Lamont' },
  { ar: 'Marco Orsato', en: 'Marco Orsato' },
  { ar: 'Anthony Taylor', en: 'Anthony Taylor' },
  { ar: 'Slavko Vinčić', en: 'Slavko Vinicic' },
  { ar: 'Clément Turpin', en: 'Clement Turpin' },
];

const trait = (rng: SeededRandom): number => rng.nextRange(R.traitMin, R.traitMax);

/** Derive a stable referee id from the match seed (used when old saves lack referee). */
export const refereeSeedFromMatchSeed = (matchSeed: number): number =>
  (Math.imul(matchSeed >>> 0, 2654435761) ^ 0x726566) >>> 0;

export function createRefereeFromSeed(matchSeed: number): RefereeProfile {
  const rng = new SeededRandom(refereeSeedFromMatchSeed(matchSeed));
  const pick = REF_NAMES[rng.nextRange(0, REF_NAMES.length - 1)]!;
  const id = `ref_${(refereeSeedFromMatchSeed(matchSeed) >>> 0).toString(16)}`;
  return {
    id,
    name: pick.ar,
    nameEn: pick.en,
    strictness: trait(rng),
    foulSensitivity: trait(rng),
    cardTendency: trait(rng),
    penaltyTendency: trait(rng),
    advantageTendency: trait(rng),
    varTendency: trait(rng),
  };
}

export const DEFAULT_REFEREE_PROFILE: RefereeProfile = {
  id: 'ref_default',
  name: 'حكم محايد',
  nameEn: 'Neutral Referee',
  strictness: 50,
  foulSensitivity: 50,
  cardTendency: 50,
  penaltyTendency: 50,
  advantageTendency: 50,
  varTendency: 50,
};

/** Old saves / missing field: derive from match seed so replay stays reproducible. */
export function resolveRefereeForMatch(referee: RefereeProfile | undefined | null, matchSeed: number): RefereeProfile {
  if (referee && referee.id) return referee;
  return createRefereeFromSeed(matchSeed);
}

/** Test / calibration override without touching the PRNG stream. */
export function refereeProfileWithTraits(
  base: RefereeProfile,
  traits: Partial<Pick<RefereeProfile, 'strictness' | 'foulSensitivity' | 'cardTendency' | 'penaltyTendency' | 'advantageTendency' | 'varTendency'>>,
): RefereeProfile {
  const clampTrait = (n: number) => clamp(n, R.traitMin, R.traitMax);
  return {
    ...base,
    ...traits,
    strictness: traits.strictness !== undefined ? clampTrait(traits.strictness) : base.strictness,
    foulSensitivity: traits.foulSensitivity !== undefined ? clampTrait(traits.foulSensitivity) : base.foulSensitivity,
    cardTendency: traits.cardTendency !== undefined ? clampTrait(traits.cardTendency) : base.cardTendency,
    penaltyTendency: traits.penaltyTendency !== undefined ? clampTrait(traits.penaltyTendency) : base.penaltyTendency,
    advantageTendency: traits.advantageTendency !== undefined ? clampTrait(traits.advantageTendency) : base.advantageTendency,
    varTendency: traits.varTendency !== undefined ? clampTrait(traits.varTendency) : base.varTendency,
  };
}
