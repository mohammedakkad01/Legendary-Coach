/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { RECRUITMENT_TUNING as T } from '../config/recruitmentTuning';
import { recruitmentRng } from '../rng/recruitmentRng';
import type { RumorReliability } from './rumorTypes';

export function assignRumorReliability(params: {
  worldSeed: number;
  gameWeek: number;
  playerId: string;
  clubId: string;
  truthFlag: boolean;
  observerConfidencePct: number;
  rumorIndex: number;
}): RumorReliability {
  if (!params.truthFlag) {
    const rng = recruitmentRng(
      params.worldSeed,
      params.gameWeek,
      params.clubId,
      params.playerId,
      'rumor_reliability',
    );
    return rng.nextChance(T.rumors.falseRumorReliabilityFalseRate) ? 'false' : 'uncertain';
  }

  if (params.observerConfidencePct >= T.rumors.reliableConfidenceThreshold) {
    return 'reliable';
  }
  if (params.observerConfidencePct >= T.rumors.uncertainConfidenceThreshold) {
    return 'uncertain';
  }

  const rng = recruitmentRng(
    params.worldSeed,
    params.gameWeek,
    params.clubId,
    `${params.playerId}_r${params.rumorIndex}`,
    'rumor_reliability',
  );
  return rng.nextChance(T.rumors.lowConfidenceTruthBecomesReliableChance) ? 'reliable' : 'uncertain';
}
