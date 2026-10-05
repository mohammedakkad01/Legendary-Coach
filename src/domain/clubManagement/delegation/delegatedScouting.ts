/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { GameEvent } from '../../livingWorld/types';
import type { RecruitmentPatch, RecruitmentWorldState } from '../../recruitment/types';
import { applyRecruitmentPatches } from '../../recruitment/reducer';
import { createScoutingAssignment } from '../../recruitment/scouting/orchestration';
import { watchMatchForScoutingAssignment } from '../../recruitment/scouting/orchestration';
import { completeScoutingReport } from '../../recruitment/scouting/completeReport';
import { runWeeklyScoutingStep } from '../../recruitment/tick/weeklySteps/scoutingStep';
import { findScout } from '../../recruitment/scouts/defaultScoutNetwork';
import { createInitialKnowledge } from '../../recruitment/knowledge/knowledgeState';
import type { StaffMember } from '../types';
import { pickScoutingDelegationTarget } from './pickScoutingDelegationTarget';

export interface DelegatedScoutingResult {
  patches: RecruitmentPatch[];
  events: GameEvent[];
  reasonCodes: string[];
  summaryCode: string;
  ok: boolean;
}

function resolveScoutId(
  staff: StaffMember | undefined,
  world: RecruitmentWorldState,
): string | undefined {
  if (staff?.linkedScoutId && findScout(world.scoutNetwork, staff.linkedScoutId)) {
    return staff.linkedScoutId;
  }
  return world.scoutNetwork[0]?.id;
}

export function runDelegatedScouting(params: {
  world: RecruitmentWorldState;
  userClubId: string;
  gameWeek: number;
  season: number;
  timestampIso: string;
  staff: StaffMember | undefined;
  scoutReportQualityMult: number;
}): DelegatedScoutingResult {
  const reasonCodes: string[] = [];
  let working = params.world;
  const patches: RecruitmentPatch[] = [];
  const events: GameEvent[] = [];

  const weekly = runWeeklyScoutingStep(working, {
    userClubId: params.userClubId,
    gameWeek: params.gameWeek,
    season: params.season,
    timestampIso: params.timestampIso,
    worldSeed: working.worldSeed,
  });

  if (weekly.patches.length > 0) {
    working = weekly.world;
    patches.push(...weekly.patches);
    events.push(...weekly.events);
  }

  if (weekly.reportsCompleted > 0) {
    reasonCodes.push('report_completed', 'assignment_advanced');
    return {
      patches,
      events,
      reasonCodes,
      summaryCode: 'delegation_scouting_report',
      ok: true,
    };
  }

  const scoutId = resolveScoutId(params.staff, working);
  if (!scoutId) {
    reasonCodes.push('no_scout_linked');
    return {
      patches,
      events,
      reasonCodes,
      summaryCode: 'delegation_scouting_degraded',
      ok: false,
    };
  }

  const targetPlayerId = pickScoutingDelegationTarget(working, params.userClubId, params.gameWeek);
  if (!targetPlayerId) {
    reasonCodes.push('no_viable_target');
    return {
      patches,
      events,
      reasonCodes,
      summaryCode: 'delegation_scouting_degraded',
      ok: false,
    };
  }

  const truth = working.worldPlayers[targetPlayerId];
  if (!truth) {
    reasonCodes.push('no_truth');
    return {
      patches,
      events,
      reasonCodes,
      summaryCode: 'delegation_scouting_degraded',
      ok: false,
    };
  }

  const knowledgeMap = working.knowledgeByObserverClubId[params.userClubId] ?? {};
  if (!knowledgeMap[targetPlayerId]) {
    const knowledge = createInitialKnowledge({
      worldSeed: working.worldSeed,
      gameWeek: params.gameWeek,
      observerClubId: params.userClubId,
      playerId: targetPlayerId,
      isOwnSquad: false,
      truth,
    });
    patches.push({ kind: 'upsertKnowledge', knowledge });
    working = applyRecruitmentPatches(working, [{ kind: 'upsertKnowledge', knowledge }]);
    reasonCodes.push('assignment_created');
  }

  const assignmentId = `deleg_asgn_${working.worldSeed}_${params.gameWeek}_${targetPlayerId}`;
  const created = createScoutingAssignment(working, {
    observerClubId: params.userClubId,
    scoutId,
    targetKind: 'player',
    playerId: targetPlayerId,
    gameWeek: params.gameWeek,
    assignmentId,
  });

  if (!created.ok) {
    reasonCodes.push(created.code ?? 'assignment_failed');
    return {
      patches,
      events,
      reasonCodes,
      summaryCode: 'delegation_scouting_degraded',
      ok: false,
    };
  }

  patches.push(...created.patches);
  working = applyRecruitmentPatches(working, created.patches);

  const watch = watchMatchForScoutingAssignment(working, assignmentId, params.gameWeek);
  if (watch.ok) {
    patches.push(...watch.patches);
    working = applyRecruitmentPatches(working, watch.patches);
  }

  const reportId = `deleg_scout_report_${working.worldSeed}_${params.gameWeek}_${targetPlayerId}`;
  const completed = completeScoutingReport(working, {
    observerClubId: params.userClubId,
    assignmentId,
    gameWeek: params.gameWeek,
    reportId,
    timestampIso: params.timestampIso,
    season: params.season,
    scoutReportQualityMult: params.scoutReportQualityMult,
  });

  if (!completed.ok || completed.patches.length === 0) {
    reasonCodes.push(completed.code ?? 'report_failed');
    return {
      patches,
      events,
      reasonCodes,
      summaryCode: 'delegation_scouting_degraded',
      ok: false,
    };
  }

  patches.push(...completed.patches);
  if (completed.event) events.push(completed.event);
  reasonCodes.push('report_completed');

  return {
    patches,
    events,
    reasonCodes,
    summaryCode: 'delegation_scouting_report',
    ok: true,
  };
}
