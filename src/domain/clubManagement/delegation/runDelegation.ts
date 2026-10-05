/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { clamp } from '../../shared/math';
import { DELEGATION_TUNING } from '../config/clubManagementTuning';
import type {
  ClubManagementState,
  ClubSystemModifiers,
  DelegationTask,
  StaffMember,
  StaffReportPayload,
} from '../types';
import type { StateChange } from '../../livingWorld/types';
import {
  stateChangesForTrainingSession,
  legacyDrillToPlan,
} from '../../playerLife/trainingEngine';
import type { GameEvent } from '../../livingWorld/types';
import type { RecruitmentPatch } from '../../recruitment/types';
import type { DelegationIntegratorContext } from './delegationIntegratorContext';
import { runDelegatedScouting } from './delegatedScouting';
import { runDelegatedLoanSearch } from './delegatedLoanSearch';
import { runDelegatedYouthIntake } from './delegatedYouthIntake';
import { runDelegatedOppositionAnalysis } from './delegatedOppositionAnalysis';

export type { DelegationIntegratorContext } from './delegationIntegratorContext';

export interface DelegationRunInput {
  state: ClubManagementState;
  modifiers: ClubSystemModifiers;
  playerIds: string[];
  gameWeek: number;
  season: number;
  timestampIso: string;
  integrator?: DelegationIntegratorContext;
}

export interface DelegationRunResult {
  stateChanges: StateChange[];
  recruitmentPatches?: RecruitmentPatch[];
  report?: StaffReportPayload;
  event?: GameEvent;
  extraEvents?: GameEvent[];
}

function staffForTask(state: ClubManagementState, task: DelegationTask): StaffMember | undefined {
  const id = state.delegation.assigneeByTask[task];
  if (!id) return undefined;
  return state.staff.members.find((m) => m.id === id);
}

export function staffQualityFactor(
  staff: StaffMember | undefined,
  modifiers: ClubSystemModifiers,
  task: DelegationTask,
): number {
  if (!staff) return DELEGATION_TUNING.qualityClampMin;
  let raw = 1;
  switch (task) {
    case 'training':
      raw = modifiers.trainingEffectiveness;
      break;
    case 'scouting':
      raw = modifiers.scoutReportQualityMult;
      break;
    case 'fitness_management':
      raw = modifiers.medicalRecoveryMult;
      break;
    case 'set_pieces':
      raw = modifiers.setPieceQualityMult;
      break;
    case 'opposition_analysis':
      raw = modifiers.oppositionAnalysisMult;
      break;
    case 'youth_recruitment':
    case 'loan_search':
      raw = modifiers.academyCoachingQuality / 50;
      break;
    default:
      raw = 1;
  }
  return clamp(raw, DELEGATION_TUNING.qualityClampMin, DELEGATION_TUNING.qualityClampMax);
}

function canReport(state: ClubManagementState, task: DelegationTask, gameWeek: number): boolean {
  const last = state.delegation.lastReportWeekByTask[task] ?? 0;
  return gameWeek - last >= DELEGATION_TUNING.reportCooldownWeeks;
}

function buildStaffReportEvent(
  task: DelegationTask,
  input: DelegationRunInput,
  report: StaffReportPayload,
  reasonCodes: string[],
): GameEvent {
  return {
    id: `evt_staff_report_${task}_${input.gameWeek}_${report.staffId}`,
    type: 'staff.report',
    timestamp: input.timestampIso,
    season: input.season,
    severity: 'low',
    context: {
      task,
      staffId: report.staffId,
      summaryCode: report.summaryCode,
      reasonCodes: reasonCodes.join(','),
      gameWeek: input.gameWeek,
    },
  };
}

function scaleTrainingChanges(changes: StateChange[], quality: number): StateChange[] {
  return changes.map((c) => {
    if (c.kind !== 'patchPlayerLife') return c;
    const sharpBoost = c.conditionDelta?.sharpness ?? 0;
    const legacy = c.legacyDelta;
    return {
      ...c,
      conditionDelta: {
        ...c.conditionDelta,
        sharpness: sharpBoost * quality,
      },
      legacyDelta: legacy
        ? {
            ...legacy,
            form: legacy.form !== undefined ? legacy.form * quality : undefined,
            morale: legacy.morale !== undefined ? legacy.morale * quality : undefined,
            stamina: legacy.stamina !== undefined ? legacy.stamina * quality : undefined,
          }
        : undefined,
    };
  });
}

/** Delegated training uses the same trainingEngine path as manual drills. */
export function runDelegatedTask(
  task: DelegationTask,
  input: DelegationRunInput,
): DelegationRunResult {
  if (input.state.delegation.modes[task] !== 'delegate') {
    return { stateChanges: [] };
  }
  if (!canReport(input.state, task, input.gameWeek)) {
    return { stateChanges: [] };
  }

  const staff = staffForTask(input.state, task);
  const quality = staffQualityFactor(staff, input.modifiers, task);
  const reasonCodes: string[] = [`delegated_${task}`, `quality_${Math.round(quality * 100)}`];
  if (!staff) reasonCodes.push('staff_unassigned');

  const integrator = input.integrator;

  if (task === 'training') {
    const plan = legacyDrillToPlan('technical');
    const stateChanges = scaleTrainingChanges(
      stateChangesForTrainingSession(input.playerIds, plan),
      quality,
    );
    const report: StaffReportPayload = {
      task,
      staffId: staff?.id ?? 'unassigned',
      reasonCodes,
      summaryCode: 'delegation_training_complete',
      gameWeek: input.gameWeek,
      season: input.season,
    };
    return { stateChanges, report, event: buildStaffReportEvent(task, input, report, reasonCodes) };
  }

  if (task === 'fitness_management') {
    const plan = legacyDrillToPlan('stamina');
    const stateChanges = stateChangesForTrainingSession(input.playerIds.slice(0, 11), plan);
    const report: StaffReportPayload = {
      task,
      staffId: staff?.id ?? 'unassigned',
      reasonCodes,
      summaryCode: 'delegation_fitness_session',
      gameWeek: input.gameWeek,
      season: input.season,
    };
    return { stateChanges, report, event: buildStaffReportEvent(task, input, report, reasonCodes) };
  }

  if (task === 'set_pieces') {
    const plan = { category: 'set_pieces' as const, intensity: 'normal' as const };
    const stateChanges = scaleTrainingChanges(
      stateChangesForTrainingSession(input.playerIds.slice(0, 16), plan),
      quality,
    );
    reasonCodes.push('delegation_set_piece_session', `players_${Math.min(16, input.playerIds.length)}`);
    const report: StaffReportPayload = {
      task,
      staffId: staff?.id ?? 'unassigned',
      reasonCodes,
      summaryCode: 'delegation_set_piece_session',
      gameWeek: input.gameWeek,
      season: input.season,
    };
    return { stateChanges, report, event: buildStaffReportEvent(task, input, report, reasonCodes) };
  }

  if (task === 'scouting') {
    const world = integrator?.recruitmentWorld;
    if (!world || !integrator.userClubId) {
      reasonCodes.push('recruitment_world_unavailable');
      const report: StaffReportPayload = {
        task,
        staffId: staff?.id ?? 'unassigned',
        reasonCodes,
        summaryCode: 'delegation_scouting_degraded',
        gameWeek: input.gameWeek,
        season: input.season,
      };
      return { stateChanges: [], report, event: buildStaffReportEvent(task, input, report, reasonCodes) };
    }

    const scouting = runDelegatedScouting({
      world,
      userClubId: integrator.userClubId,
      gameWeek: input.gameWeek,
      season: input.season,
      timestampIso: input.timestampIso,
      staff,
      scoutReportQualityMult: input.modifiers.scoutReportQualityMult,
    });

    const mergedReasons = [...reasonCodes, ...scouting.reasonCodes];
    const report: StaffReportPayload = {
      task,
      staffId: staff?.id ?? 'unassigned',
      reasonCodes: mergedReasons,
      summaryCode: scouting.summaryCode,
      gameWeek: input.gameWeek,
      season: input.season,
    };

    return {
      stateChanges: [],
      recruitmentPatches: scouting.patches,
      report,
      event: buildStaffReportEvent(task, input, report, mergedReasons),
      extraEvents: scouting.events.filter((e) => e.type !== 'staff.report'),
    };
  }

  if (task === 'loan_search') {
    const world = integrator?.recruitmentWorld;
    const squad = integrator?.userClub?.footballSquad ?? [];
    const destinations = integrator?.loanSearch?.destinations ?? [];

    if (!world || !integrator?.userClubId) {
      reasonCodes.push('recruitment_world_unavailable');
      const report: StaffReportPayload = {
        task,
        staffId: staff?.id ?? 'unassigned',
        reasonCodes,
        summaryCode: 'delegation_loan_degraded',
        gameWeek: input.gameWeek,
        season: input.season,
      };
      return { stateChanges: [], report, event: buildStaffReportEvent(task, input, report, reasonCodes) };
    }

    const loan = runDelegatedLoanSearch({
      world,
      userClubId: integrator.userClubId,
      squad,
      destinations,
      gameWeek: input.gameWeek,
      season: input.season,
      timestampIso: input.timestampIso,
      quality,
    });

    const mergedReasons = [...reasonCodes, ...loan.reasonCodes];
    const report: StaffReportPayload = {
      task,
      staffId: staff?.id ?? 'unassigned',
      reasonCodes: mergedReasons,
      summaryCode: loan.summaryCode,
      gameWeek: input.gameWeek,
      season: input.season,
    };

    return {
      stateChanges: [],
      recruitmentPatches: loan.patches,
      report,
      event: buildStaffReportEvent(task, input, report, mergedReasons),
      extraEvents: loan.events.filter((e) => e.type !== 'staff.report'),
    };
  }

  if (task === 'youth_recruitment') {
    const world = integrator?.recruitmentWorld;
    const club = integrator?.userClub;

    if (!world || !club) {
      reasonCodes.push('recruitment_world_unavailable');
      const report: StaffReportPayload = {
        task,
        staffId: staff?.id ?? 'unassigned',
        reasonCodes,
        summaryCode: 'delegation_youth_skipped',
        gameWeek: input.gameWeek,
        season: input.season,
      };
      return { stateChanges: [], report, event: buildStaffReportEvent(task, input, report, reasonCodes) };
    }

    const youth = runDelegatedYouthIntake({
      world,
      club,
      modifiers: input.modifiers,
      gameWeek: input.gameWeek,
      season: input.season,
      timestampIso: input.timestampIso,
      quality,
    });

    const mergedReasons = [...reasonCodes, ...youth.reasonCodes];
    const report: StaffReportPayload = {
      task,
      staffId: staff?.id ?? 'unassigned',
      reasonCodes: mergedReasons,
      summaryCode: youth.summaryCode,
      gameWeek: input.gameWeek,
      season: input.season,
    };

    return {
      stateChanges: [],
      recruitmentPatches: youth.patches,
      report,
      event: buildStaffReportEvent(task, input, report, mergedReasons),
      extraEvents: youth.events,
    };
  }

  if (task === 'opposition_analysis') {
    const club = integrator?.userClub;
    if (!club) {
      reasonCodes.push('integrator_club_unavailable');
      const report: StaffReportPayload = {
        task,
        staffId: staff?.id ?? 'unassigned',
        reasonCodes,
        summaryCode: 'delegation_opposition_degraded',
        gameWeek: input.gameWeek,
        season: input.season,
      };
      return { stateChanges: [], report, event: buildStaffReportEvent(task, input, report, reasonCodes) };
    }

    const opposition = runDelegatedOppositionAnalysis({
      userClub: club,
      nextFixture: integrator?.nextFixture ?? integrator?.leagueFixtures?.find((f) => !f.played),
      opponentClub: integrator?.opponentClub,
      livingWorld: integrator?.livingWorld,
      leagueStandings: integrator?.leagueStandings,
      analyticsDepartmentLevel: input.state.facilities.analyticsDepartmentLevel,
      gameWeek: input.gameWeek,
      season: input.season,
      timestampIso: input.timestampIso,
      quality,
    });

    const mergedReasons = [...reasonCodes, ...opposition.reasonCodes];
    const report: StaffReportPayload = {
      task,
      staffId: staff?.id ?? 'unassigned',
      reasonCodes: mergedReasons,
      summaryCode: opposition.summaryCode,
      gameWeek: input.gameWeek,
      season: input.season,
    };

    return {
      stateChanges: [],
      report,
      event: buildStaffReportEvent(task, input, report, mergedReasons),
      extraEvents: opposition.events,
    };
  }

  return { stateChanges: [] };
}

export const DELEGATION_TASKS: readonly DelegationTask[] = [
  'training',
  'scouting',
  'loan_search',
  'youth_recruitment',
  'opposition_analysis',
  'fitness_management',
  'set_pieces',
];

export function defaultDelegationSlice(): import('../types').DelegationSlice {
  const modes = {} as Record<DelegationTask, import('../types').DelegationMode>;
  for (const t of DELEGATION_TASKS) modes[t] = 'manual';
  return { modes, assigneeByTask: {}, lastReportWeekByTask: {} };
}
