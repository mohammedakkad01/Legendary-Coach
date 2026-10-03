/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { GameEvent } from '../../../livingWorld/types';
import type { RecruitmentPatch, RecruitmentWorldState } from '../../types';
import { completeScoutingReport } from '../../scouting/completeReport';
import { watchMatchForScoutingAssignment } from '../../scouting/orchestration';
import { applyRecruitmentPatches } from '../../reducer';

export interface WeeklyScoutingStepInput {
  userClubId: string;
  gameWeek: number;
  season: number;
  timestampIso: string;
  worldSeed: number;
}

export interface WeeklyScoutingStepResult {
  patches: RecruitmentPatch[];
  events: GameEvent[];
  matchesWatched: number;
  reportsCompleted: number;
  world: RecruitmentWorldState;
}

export function runWeeklyScoutingStep(
  world: RecruitmentWorldState,
  input: WeeklyScoutingStepInput,
): WeeklyScoutingStepResult {
  let working = world;
  const patches: RecruitmentPatch[] = [];
  const events: GameEvent[] = [];
  let matchesWatched = 0;
  let reportsCompleted = 0;

  const active = working.scoutingAssignments.filter(
    (a) => a.observerClubId === input.userClubId && a.status === 'active' && a.playerId,
  );

  for (const assignment of active) {
    const watch = watchMatchForScoutingAssignment(working, assignment.id, input.gameWeek);
    if (watch.ok && watch.patches.length > 0) {
      working = applyRecruitmentPatches(working, watch.patches);
      patches.push(...watch.patches);
      matchesWatched += 1;
    }

    const refreshed = working.scoutingAssignments.find((a) => a.id === assignment.id);
    if (!refreshed || refreshed.matchesWatched < 1) continue;

    const reportId = `scout_report_${input.worldSeed}_${input.gameWeek}_${assignment.id}`;
    const report = completeScoutingReport(working, {
      observerClubId: input.userClubId,
      assignmentId: assignment.id,
      gameWeek: input.gameWeek,
      reportId,
      timestampIso: input.timestampIso,
      season: input.season,
    });
    if (report.ok && report.patches.length > 0) {
      working = applyRecruitmentPatches(working, report.patches);
      patches.push(...report.patches);
      reportsCompleted += 1;
      if (report.event) events.push(report.event);
    }
  }

  return { patches, events, matchesWatched, reportsCompleted, world: working };
}
