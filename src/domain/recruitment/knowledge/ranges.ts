/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { RECRUITMENT_TUNING as T } from '../config/recruitmentTuning';
import { clamp } from '../../shared/math';

export function ratingHalfWidth(confidencePct: number): number {
  const t = clamp(confidencePct, 0, 100) / 100;
  return (
    T.knowledge.ratingHalfWidthAtZero +
    (T.knowledge.ratingHalfWidthAtMax - T.knowledge.ratingHalfWidthAtZero) * t
  );
}

export function potentialHalfWidth(confidencePct: number): number {
  const t = clamp(confidencePct, 0, 100) / 100;
  return (
    T.knowledge.potentialBandHalfWidthAtZero +
    (T.knowledge.potentialBandHalfWidthAtMax - T.knowledge.potentialBandHalfWidthAtZero) * t
  );
}

export function valueSpreadFraction(confidencePct: number): number {
  const t = clamp(confidencePct, 0, 100) / 100;
  return (
    T.knowledge.valueRangeSpreadAtZero +
    (T.knowledge.valueRangeSpreadAtMax - T.knowledge.valueRangeSpreadAtZero) * t
  );
}

export function rangesFromTruth(
  trueOverall: number,
  truePotential: number,
  trueMarketValue: number,
  confidencePct: number,
): Pick<
  import('../types').KnowledgeState,
  'ratingMin' | 'ratingMax' | 'potentialBandMin' | 'potentialBandMax' | 'valueMin' | 'valueMax'
> {
  const rHalf = ratingHalfWidth(confidencePct);
  const pHalf = potentialHalfWidth(confidencePct);
  const spread = valueSpreadFraction(confidencePct);
  const mid = trueMarketValue;
  return {
    ratingMin: clamp(Math.round(trueOverall - rHalf), 1, 99),
    ratingMax: clamp(Math.round(trueOverall + rHalf), 1, 99),
    potentialBandMin: clamp(Math.round(truePotential - pHalf), 1, 99),
    potentialBandMax: clamp(Math.round(truePotential + pHalf), 1, 99),
    valueMin: Math.max(0, Math.round(mid * (1 - spread))),
    valueMax: Math.round(mid * (1 + spread)),
  };
}
