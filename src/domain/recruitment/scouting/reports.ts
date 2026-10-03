/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { SeededRandom } from '../../../engine/prng';
import { RECRUITMENT_TUNING as T } from '../config/recruitmentTuning';
import type { KnowledgeRevealStage } from '../config/recruitmentTuning';
import type { TrueWorldPlayer } from '../trueProfile/types';
import type { ScoutStaff } from '../scouts/scoutTypes';
import { scoutQualityScore } from '../scouts/defaultScoutNetwork';
import { drawEstimateError } from '../knowledge/errorModel';
import { recruitmentRng } from '../rng/recruitmentRng';
import type { ScoutingReport, ScoutingReportClaim } from './types';
import type { ScoutingAssignment } from './types';

function claimForStage(
  rng: SeededRandom,
  stage: KnowledgeRevealStage,
  truth: TrueWorldPlayer,
  scout: ScoutStaff,
  confidencePct: number,
): ScoutingReportClaim {
  let base = truth.trueOverall;
  if (stage === 'technical') base = truth.attributeTruth.technical;
  if (stage === 'physical') base = truth.attributeTruth.physical;
  if (stage === 'mental') base = truth.attributeTruth.mental;
  if (stage === 'adaptability') base = Math.round((truth.attributeTruth.mental + truth.trueOverall) / 2);
  const reliabilityFactor = scout.reliability / 100;
  const maxErr = Math.round(T.scouting.reportOverallErrorMax * (2.1 - reliabilityFactor * 1.25));
  const err = drawEstimateError(rng, confidencePct, maxErr);
  return { stage, value: Math.max(1, Math.min(99, base + err)) };
}

export interface BuildReportInput {
  worldSeed: number;
  gameWeek: number;
  assignment: ScoutingAssignment;
  scout: ScoutStaff;
  truth: TrueWorldPlayer;
  currentConfidencePct: number;
  reportId: string;
}

export function buildScoutingReport(input: BuildReportInput): ScoutingReport {
  const rng = recruitmentRng(
    input.worldSeed,
    input.gameWeek,
    input.assignment.observerClubId,
    input.assignment.playerId ?? input.assignment.id,
    'knowledge_error',
  );

  const quality = scoutQualityScore(input.scout);
  const confidencePct = input.currentConfidencePct;
  const rel = input.scout.reliability / 100;
  const overallErr = drawEstimateError(
    rng,
    confidencePct,
    Math.round(T.scouting.reportOverallErrorMax * (2.2 - rel * 1.3)),
  );
  const potErr = drawEstimateError(rng, confidencePct, Math.round(T.scouting.reportOverallErrorMax * 1.1));

  const stagesToClaim: KnowledgeRevealStage[] = [];
  for (const stage of T.reveal.stageOrder) {
    if (confidencePct >= T.reveal.minConfidencePerStage[stage] - 5) {
      stagesToClaim.push(stage);
    }
  }
  if (stagesToClaim.length === 0) stagesToClaim.push('technical');

  const claims: ScoutingReportClaim[] = stagesToClaim.map((stage) =>
    claimForStage(rng, stage, input.truth, input.scout, confidencePct),
  );

  const matchBonus =
    input.assignment.matchesWatched * T.scouting.confidencePerMatchWatched;
  const reportBonus = T.scouting.confidencePerReport;
  const qualityBonus = Math.round((quality - 50) / 10);
  const confidenceDeltaApplied = reportBonus + matchBonus + qualityBonus;

  return {
    id: input.reportId,
    assignmentId: input.assignment.id,
    observerClubId: input.assignment.observerClubId,
    playerId: input.assignment.playerId!,
    scoutId: input.scout.id,
    gameWeek: input.gameWeek,
    statedOverall: Math.max(1, Math.min(99, input.truth.trueOverall + overallErr)),
    statedPotentialMid: Math.max(1, Math.min(99, input.truth.truePotential + potErr)),
    claims,
    scoutQualityScore: quality,
    confidenceDeltaApplied,
  };
}
