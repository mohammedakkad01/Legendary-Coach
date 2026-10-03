/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { TrueWorldPlayer } from '../trueProfile/types';
import type { KnowledgeState } from '../types';
import { baseConfidenceForRelationship } from './confidenceModel';
import { applyErrorToOverall, drawEstimateError } from './errorModel';
import { applyProgressiveReveal } from './progressiveReveal';
import { rangesFromTruth } from './ranges';
import { recruitmentRng } from '../rng/recruitmentRng';

export interface CreateKnowledgeInput {
  worldSeed: number;
  gameWeek: number;
  observerClubId: string;
  playerId: string;
  isOwnSquad: boolean;
  truth: TrueWorldPlayer;
}

export function createInitialKnowledge(input: CreateKnowledgeInput): KnowledgeState {
  const confidencePct = baseConfidenceForRelationship(input.isOwnSquad);
  const rng = recruitmentRng(
    input.worldSeed,
    input.gameWeek,
    input.observerClubId,
    input.playerId,
    'knowledge_init',
  );

  let effectiveOverall = input.truth.trueOverall;
  if (!input.isOwnSquad) {
    const err = drawEstimateError(rng, confidencePct, 8);
    effectiveOverall = applyErrorToOverall(input.truth.trueOverall, err);
  }

  const ranges = rangesFromTruth(
    effectiveOverall,
    input.truth.truePotential,
    input.truth.trueMarketValue,
    confidencePct,
  );

  const base: KnowledgeState = {
    observerClubId: input.observerClubId,
    playerId: input.playerId,
    confidencePct,
    ...ranges,
    revealedGroups: [],
    lastUpdatedWeek: input.gameWeek,
  };

  const withReveal = applyProgressiveReveal(base);

  if (withReveal.revealedGroups.includes('injury_concerns')) {
    const concernRng = recruitmentRng(
      input.worldSeed,
      input.gameWeek,
      input.observerClubId,
      input.playerId,
      'knowledge_error',
    );
    const err = drawEstimateError(concernRng, confidencePct, 15);
    const observed = Math.max(0, Math.min(100, input.truth.injuryConcernTruth + err));
    return { ...withReveal, injuryConcernLevel: observed };
  }

  return withReveal;
}

export function adjustKnowledgeConfidence(
  knowledge: KnowledgeState,
  truth: TrueWorldPlayer,
  worldSeed: number,
  gameWeek: number,
  delta: number,
): KnowledgeState {
  const confidencePct = Math.min(100, Math.max(0, knowledge.confidencePct + delta));
  const rng = recruitmentRng(worldSeed, gameWeek, knowledge.observerClubId, knowledge.playerId, 'confidence_adjust');
  let effectiveOverall = truth.trueOverall;
  if (confidencePct < 95) {
    const err = drawEstimateError(rng, confidencePct, 6);
    effectiveOverall = applyErrorToOverall(truth.trueOverall, err);
  }
  const ranges = rangesFromTruth(
    effectiveOverall,
    truth.truePotential,
    truth.trueMarketValue,
    confidencePct,
  );
  const next: KnowledgeState = {
    ...knowledge,
    confidencePct,
    ...ranges,
    lastUpdatedWeek: gameWeek,
  };
  return applyProgressiveReveal(next);
}
