/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { RECRUITMENT_TUNING as T } from '../config/recruitmentTuning';
import type { KnowledgeState } from '../types';
import type { TrueWorldPlayer } from '../trueProfile/types';
import type { ScoutStaff } from '../scouts/scoutTypes';
import { adjustKnowledgeConfidence } from '../knowledge/knowledgeState';
import { applyProgressiveReveal } from '../knowledge/progressiveReveal';
import type { ScoutingReport } from './types';
import { scoutQualityScore } from '../scouts/defaultScoutNetwork';

export function applyScoutingReportToKnowledge(
  knowledge: KnowledgeState,
  truth: TrueWorldPlayer,
  report: ScoutingReport,
  scout: ScoutStaff,
  worldSeed: number,
  gameWeek: number,
): KnowledgeState {
  const quality = scoutQualityScore(scout);
  const dataBoost = Math.round((T.scouting.dataAvailabilityPrior - 50) / 25);
  let delta = report.confidenceDeltaApplied + dataBoost;
  delta = Math.round(delta * (0.85 + quality / 200));

  let next = adjustKnowledgeConfidence(knowledge, truth, worldSeed, gameWeek, delta);

  const prevHalfR = Math.round((knowledge.ratingMax - knowledge.ratingMin) / 2);
  const prevHalfP = Math.round((knowledge.potentialBandMax - knowledge.potentialBandMin) / 2);
  const blend = Math.min(0.45, 0.15 + quality / 250);
  const estRating = Math.round(next.ratingMin * (1 - blend) + report.statedOverall * blend);
  const estPot = Math.round(
    ((next.potentialBandMin + next.potentialBandMax) / 2) * (1 - blend) +
      report.statedPotentialMid * blend,
  );
  const halfR = Math.min(prevHalfR, Math.max(2, Math.round((next.ratingMax - next.ratingMin) / 2)));
  const halfP = Math.min(prevHalfP, Math.max(2, Math.round((next.potentialBandMax - next.potentialBandMin) / 2)));

  next = {
    ...next,
    ratingMin: Math.max(1, estRating - halfR),
    ratingMax: Math.min(99, estRating + halfR),
    potentialBandMin: Math.max(1, estPot - halfP),
    potentialBandMax: Math.min(99, estPot + halfP),
  };

  if (report.claims.some((c) => c.stage === 'personality')) {
    next = {
      ...next,
      personalityIndicators: ['observed_via_scout_report'],
    };
  }
  if (report.claims.some((c) => c.stage === 'injury_concerns')) {
    const concernClaim = report.claims.find((c) => c.stage === 'injury_concerns');
    next = {
      ...next,
      injuryConcernLevel: concernClaim?.value ?? next.injuryConcernLevel ?? 0,
    };
  }

  return applyProgressiveReveal(next);
}
