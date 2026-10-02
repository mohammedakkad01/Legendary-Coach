/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { RECRUITMENT_TUNING as T } from '../config/recruitmentTuning';
import type { KnowledgeRevealStage } from '../config/recruitmentTuning';
import type { KnowledgeState, RevealedAttributeGroup } from '../types';

export function revealedGroupsForConfidence(confidencePct: number): readonly KnowledgeRevealStage[] {
  const out: KnowledgeRevealStage[] = [];
  for (const stage of T.reveal.stageOrder) {
    const min = T.reveal.minConfidencePerStage[stage];
    if (confidencePct >= min) out.push(stage);
  }
  return out;
}

export function mergeRevealedGroups(
  existing: readonly RevealedAttributeGroup[],
  confidencePct: number,
): readonly RevealedAttributeGroup[] {
  const next = revealedGroupsForConfidence(confidencePct);
  const set = new Set<RevealedAttributeGroup>([...existing, ...next]);
  return T.reveal.stageOrder.filter((s) => set.has(s));
}

export function applyProgressiveReveal(knowledge: KnowledgeState): KnowledgeState {
  const revealedGroups = mergeRevealedGroups(knowledge.revealedGroups, knowledge.confidencePct);
  let personalityIndicators = knowledge.personalityIndicators;
  let injuryConcernLevel = knowledge.injuryConcernLevel;

  if (revealedGroups.includes('personality') && !personalityIndicators) {
    personalityIndicators = ['professionalism_band_observed'];
  }
  if (revealedGroups.includes('injury_concerns') && injuryConcernLevel === undefined) {
    injuryConcernLevel = 0;
  }

  return {
    ...knowledge,
    revealedGroups,
    personalityIndicators,
    injuryConcernLevel,
  };
}
