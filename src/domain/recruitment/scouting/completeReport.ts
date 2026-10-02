/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { GameEvent } from '../../livingWorld/types';
import type { RecruitmentPatch, RecruitmentWorldState } from '../types';
import { findScout } from '../scouts/defaultScoutNetwork';
import { buildScoutingReport } from './reports';
import { applyScoutingReportToKnowledge } from './applyReportToKnowledge';
import type { ScoutingAssignment } from './types';
import { RECRUITMENT_TUNING as T } from '../config/recruitmentTuning';

export type CompleteReportCode =
  | 'assignment_not_found'
  | 'assignment_not_active'
  | 'player_required'
  | 'scout_not_found'
  | 'no_truth';

export interface CompleteScoutingReportInput {
  observerClubId: string;
  assignmentId: string;
  gameWeek: number;
  reportId: string;
  timestampIso: string;
  season: number;
}

export interface CompleteScoutingReportResult {
  ok: boolean;
  code?: CompleteReportCode;
  patches: RecruitmentPatch[];
  report?: import('./types').ScoutingReport;
  event?: GameEvent;
}

function updateAssignmentAfterReport(
  assignment: ScoutingAssignment,
  gameWeek: number,
): ScoutingAssignment {
  return {
    ...assignment,
    reportsCompleted: assignment.reportsCompleted + 1,
    updatedWeek: gameWeek,
  };
}

export function completeScoutingReport(
  world: RecruitmentWorldState,
  input: CompleteScoutingReportInput,
): CompleteScoutingReportResult {
  const assignment = world.scoutingAssignments.find((a) => a.id === input.assignmentId);
  if (!assignment) return { ok: false, code: 'assignment_not_found', patches: [] };
  if (assignment.status !== 'active') return { ok: false, code: 'assignment_not_active', patches: [] };
  if (!assignment.playerId) return { ok: false, code: 'player_required', patches: [] };

  const scout = findScout(world.scoutNetwork, assignment.scoutId);
  if (!scout) return { ok: false, code: 'scout_not_found', patches: [] };

  const truth = world.worldPlayers[assignment.playerId];
  if (!truth) return { ok: false, code: 'no_truth', patches: [] };

  const knowledge =
    world.knowledgeByObserverClubId[input.observerClubId]?.[assignment.playerId];
  if (!knowledge) return { ok: false, code: 'no_truth', patches: [] };

  const report = buildScoutingReport({
    worldSeed: world.worldSeed,
    gameWeek: input.gameWeek,
    assignment,
    scout,
    truth,
    currentConfidencePct: knowledge.confidencePct,
    reportId: input.reportId,
  });

  const updatedKnowledge = applyScoutingReportToKnowledge(
    knowledge,
    truth,
    report,
    scout,
    world.worldSeed,
    input.gameWeek,
  );

  const patches: RecruitmentPatch[] = [
    { kind: 'appendScoutingReport', report },
    {
      kind: 'upsertScoutingAssignment',
      assignment: updateAssignmentAfterReport(assignment, input.gameWeek),
    },
    { kind: 'upsertKnowledge', knowledge: updatedKnowledge },
  ];

  const event: GameEvent = {
    id: `rec_scout_report_${report.id}`,
    type: 'recruitment.scouting.report_completed',
    timestamp: input.timestampIso,
    season: input.season,
    playerId: assignment.playerId,
    clubId: input.observerClubId,
    severity: 'low',
    context: {
      assignmentId: assignment.id,
      reportId: report.id,
      confidenceDelta: report.confidenceDeltaApplied,
      scoutQuality: report.scoutQualityScore,
    },
  };

  return { ok: true, patches, report, event };
}

export function trimReportsIfNeeded(reports: readonly import('./types').ScoutingReport[]): import('./types').ScoutingReport[] {
  const max = T.scouting.maxStoredReports;
  if (reports.length <= max) return [...reports];
  return reports.slice(reports.length - max);
}
