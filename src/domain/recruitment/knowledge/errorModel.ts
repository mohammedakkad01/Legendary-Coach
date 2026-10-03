/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { SeededRandom } from '../../../engine/prng';
import { errorScaleForConfidence } from './confidenceModel';

/** Deterministic bounded error draw for scout estimates (integer shift). */
export function drawEstimateError(rng: SeededRandom, confidencePct: number, maxAbs: number): number {
  const scale = errorScaleForConfidence(confidencePct);
  const spread = Math.max(1, Math.round(maxAbs * scale));
  return rng.nextRange(-spread, spread);
}

export function applyErrorToOverall(trueOverall: number, error: number): number {
  return Math.max(1, Math.min(99, trueOverall + error));
}
