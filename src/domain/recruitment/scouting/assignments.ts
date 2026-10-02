/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { RECRUITMENT_TUNING as T } from '../config/recruitmentTuning';
import type { RecruitmentWorldState } from '../types';
import type { ScoutingAssignment, ScoutingTargetKind } from './types';
import { findScout } from '../scouts/defaultScoutNetwork';

export type CreateAssignmentInput = {
  observerClubId: string;
  scoutId: string;
  targetKind: ScoutingTargetKind;
  playerId?: string;
  leagueId?: string;
  regionId?: string;
  roleFocus?: string;
  gameWeek: number;
  assignmentId: string;
};

export type AssignmentValidationCode =
  | 'scout_not_found'
  | 'max_assignments'
  | 'player_required'
  | 'player_not_in_world'
  | 'assignment_not_found'
  | 'assignment_not_active';

export function validateCreateAssignment(
  world: RecruitmentWorldState,
  input: CreateAssignmentInput,
): { ok: true } | { ok: false; code: AssignmentValidationCode } {
  if (!findScout(world.scoutNetwork, input.scoutId)) {
    return { ok: false, code: 'scout_not_found' };
  }
  const active = world.scoutingAssignments.filter(
    (a) => a.observerClubId === input.observerClubId && a.status === 'active',
  );
  if (active.length >= T.scouting.maxActiveAssignmentsPerClub) {
    return { ok: false, code: 'max_assignments' };
  }
  if (input.targetKind === 'player') {
    if (!input.playerId) return { ok: false, code: 'player_required' };
    if (!world.worldPlayers[input.playerId]) return { ok: false, code: 'player_not_in_world' };
  }
  return { ok: true };
}

export function buildScoutingAssignment(input: CreateAssignmentInput): ScoutingAssignment {
  return {
    id: input.assignmentId,
    observerClubId: input.observerClubId,
    scoutId: input.scoutId,
    targetKind: input.targetKind,
    playerId: input.playerId,
    leagueId: input.leagueId,
    regionId: input.regionId,
    roleFocus: input.roleFocus,
    status: 'active',
    matchesWatched: 0,
    reportsCompleted: 0,
    createdWeek: input.gameWeek,
    updatedWeek: input.gameWeek,
  };
}

export function recordMatchWatchedOnAssignment(
  assignment: ScoutingAssignment,
  gameWeek: number,
): ScoutingAssignment {
  const cap = T.scouting.matchesWatchedCapPerAssignment;
  const next = Math.min(cap, assignment.matchesWatched + 1);
  return {
    ...assignment,
    matchesWatched: next,
    updatedWeek: gameWeek,
  };
}
