/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Aligns academy intake uncertainty with Phase C playerLife estimate band pattern.
 */

import { PLAYER_LIFE as P } from '../../../config/gameTuning';
import { clamp } from '../../shared/math';
import type { SeededRandom } from '../../../engine/prng';

export function drawAcademyPotentialEstimate(
  truePotential: number,
  rng: SeededRandom,
): { potentialEstimate: number; potentialEstimateBand: number } {
  const band = P.development.potentialEstimateBand;
  const potentialEstimate = clamp(truePotential + rng.nextRange(-band, band), 1, 99);
  return { potentialEstimate, potentialEstimateBand: band };
}
