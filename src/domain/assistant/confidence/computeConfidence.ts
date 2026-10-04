/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ASSISTANT_TUNING } from '../config/assistantTuning';

export interface ConfidenceInputs {
  readonly isScouted: boolean;
  readonly scoutAccuracy: number;
  readonly analyticsDepartmentLevel: number;
  readonly opponentScoutingSamples: number;
  readonly opponentStarters: number;
  readonly knowledgeConfidencePct?: number;
}

export function computeInformationConfidence(input: ConfidenceInputs): number {
  const t = ASSISTANT_TUNING.confidence;
  let score = t.base;

  if (input.isScouted) {
    const scoutFactor = Math.min(1, input.scoutAccuracy / t.minScoutAccuracyForFull);
    score += t.weights.matchScoutUnlocked * scoutFactor;
  }

  const analyticsBonus = Math.min(
    t.weights.analyticsDepartmentMax,
    Math.max(0, (input.analyticsDepartmentLevel - 1) * t.weights.analyticsDepartmentPerLevel),
  );
  score += analyticsBonus;

  const samples = Math.min(t.weights.opponentScoutingSampleCap, input.opponentScoutingSamples);
  score += Math.min(
    t.weights.opponentScoutingMax,
    samples * t.weights.opponentScoutingPerSample,
  );

  if (input.opponentStarters >= 11) {
    score += t.weights.fullOpponentXi;
  } else if (input.opponentStarters > 0) {
    score += input.opponentStarters * t.weights.partialOpponentXiPerPlayer;
  }

  let capped = Math.min(t.max, Math.round(score));

  if (!input.isScouted) {
    capped = Math.min(capped, t.unscoutedCap);
  }

  if (input.knowledgeConfidencePct !== undefined) {
    capped = Math.min(capped, Math.round(input.knowledgeConfidencePct));
  }

  return Math.max(0, capped);
}
