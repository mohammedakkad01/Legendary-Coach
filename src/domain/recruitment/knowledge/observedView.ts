/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Public-safe read API for UI / AI (no true profile access).
 */

import type { KnowledgeState, ObservedPlayerView } from '../types';

function midpoint(min: number, max: number): number {
  return Math.round((min + max) / 2);
}

export function knowledgeToObservedView(knowledge: KnowledgeState): ObservedPlayerView {
  return {
    playerId: knowledge.playerId,
    observerClubId: knowledge.observerClubId,
    confidencePct: knowledge.confidencePct,
    ratingRange: { min: knowledge.ratingMin, max: knowledge.ratingMax },
    potentialBand: { min: knowledge.potentialBandMin, max: knowledge.potentialBandMax },
    valueRange: { min: knowledge.valueMin, max: knowledge.valueMax },
    revealedGroups: knowledge.revealedGroups,
    personalityIndicators: knowledge.personalityIndicators,
    injuryConcernLevel: knowledge.injuryConcernLevel,
    estimatedRating: midpoint(knowledge.ratingMin, knowledge.ratingMax),
    estimatedPotential: midpoint(knowledge.potentialBandMin, knowledge.potentialBandMax),
    estimatedValue: midpoint(knowledge.valueMin, knowledge.valueMax),
  };
}

export function getObservedPlayerView(
  recruitmentWorld: import('../types').RecruitmentWorldState,
  observerClubId: string,
  playerId: string,
): ObservedPlayerView | null {
  const knowledge = recruitmentWorld.knowledgeByObserverClubId[observerClubId]?.[playerId];
  if (!knowledge) return null;
  return knowledgeToObservedView(knowledge);
}
