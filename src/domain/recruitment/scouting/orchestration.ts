/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * High-level scouting commands → patches (+ optional GameEvent).
 */

import type { GameEvent } from '../../livingWorld/types';
import type { RecruitmentPatch, RecruitmentWorldState } from '../types';
import {
  buildScoutingAssignment,
  recordMatchWatchedOnAssignment,
  validateCreateAssignment,
  type CreateAssignmentInput,
} from './assignments';
import { completeScoutingReport, type CompleteScoutingReportInput } from './completeReport';
import { applyRecruitmentPatches } from '../reducer';

export interface CreateAssignmentResult {
  ok: boolean;
  code?: string;
  patches: RecruitmentPatch[];
  assignment?: import('./types').ScoutingAssignment;
}

export function createScoutingAssignment(
  world: RecruitmentWorldState,
  input: CreateAssignmentInput,
): CreateAssignmentResult {
  const valid = validateCreateAssignment(world, input);
  if (!valid.ok) return { ok: false, code: valid.code, patches: [] };
  const assignment = buildScoutingAssignment(input);
  return {
    ok: true,
    patches: [{ kind: 'upsertScoutingAssignment', assignment }],
    assignment,
  };
}

export function watchMatchForScoutingAssignment(
  world: RecruitmentWorldState,
  assignmentId: string,
  gameWeek: number,
): { ok: boolean; code?: string; patches: RecruitmentPatch[] } {
  const assignment = world.scoutingAssignments.find((a) => a.id === assignmentId);
  if (!assignment) return { ok: false, code: 'assignment_not_found', patches: [] };
  if (assignment.status !== 'active') return { ok: false, code: 'assignment_not_active', patches: [] };
  const updated = recordMatchWatchedOnAssignment(assignment, gameWeek);
  return { ok: true, patches: [{ kind: 'upsertScoutingAssignment', assignment: updated }] };
}

export interface ScoutingReportFlowResult {
  ok: boolean;
  code?: string;
  world: RecruitmentWorldState;
  report?: import('./types').ScoutingReport;
  event?: GameEvent;
}

export function runCompleteScoutingReport(
  world: RecruitmentWorldState,
  input: CompleteScoutingReportInput,
): ScoutingReportFlowResult {
  const result = completeScoutingReport(world, input);
  if (!result.ok) {
    return { ok: false, code: result.code, world };
  }
  const nextWorld = applyRecruitmentPatches(world, result.patches);
  return {
    ok: true,
    world: nextWorld,
    report: result.report,
    event: result.event,
  };
}

export function applyRecruitmentCommandPatches(
  world: RecruitmentWorldState,
  patches: readonly RecruitmentPatch[],
): RecruitmentWorldState {
  return applyRecruitmentPatches(world, patches);
}
