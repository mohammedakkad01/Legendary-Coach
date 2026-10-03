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
import { stateChangesForTrainingSession } from '../../playerLife/trainingEngine';
import { legacyDrillToPlan } from '../../playerLife/trainingEngine';
import type { GameEvent } from '../../livingWorld/types';

export interface DelegationRunInput {
  state: ClubManagementState;
  modifiers: ClubSystemModifiers;
  playerIds: string[];
  gameWeek: number;
  season: number;
  timestampIso: string;
}

export interface DelegationRunResult {
  stateChanges: StateChange[];
  report?: StaffReportPayload;
  event?: GameEvent;
}

function staffForTask(state: ClubManagementState, task: DelegationTask): StaffMember | undefined {
  const id = state.delegation.assigneeByTask[task];
  if (!id) return undefined;
  return state.staff.members.find((m) => m.id === id);
}

function staffQualityFactor(staff: StaffMember | undefined, modifiers: ClubSystemModifiers, task: DelegationTask): number {
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

  if (task === 'training') {
    const plan = legacyDrillToPlan('technical');
    const baseChanges = stateChangesForTrainingSession(input.playerIds, plan);
    const stateChanges: StateChange[] = baseChanges.map((c) => {
      if (c.kind !== 'patchPlayerLife') return c;
      const sharpBoost = c.conditionDelta?.sharpness ?? 0;
      return {
        ...c,
        conditionDelta: {
          ...c.conditionDelta,
          sharpness: sharpBoost * quality,
        },
      };
    });

    const report: StaffReportPayload = {
      task,
      staffId: staff?.id ?? 'unassigned',
      reasonCodes,
      summaryCode: 'delegation_training_complete',
      gameWeek: input.gameWeek,
      season: input.season,
    };

    const event: GameEvent = {
      id: `evt_staff_report_${task}_${input.gameWeek}`,
      type: 'staff.report',
      timestamp: input.timestampIso,
      season: input.season,
      severity: 'low',
      context: {
        task,
        staffId: report.staffId,
        summaryCode: report.summaryCode,
        reasonCodes: reasonCodes.join(','),
      },
    };

    return { stateChanges, report, event };
  }

  if (task === 'fitness_management') {
    const plan = legacyDrillToPlan('stamina');
    const stateChanges = stateChangesForTrainingSession(input.playerIds.slice(0, 11), plan);
    return {
      stateChanges,
      report: {
        task,
        staffId: staff?.id ?? 'unassigned',
        reasonCodes,
        summaryCode: 'delegation_fitness_session',
        gameWeek: input.gameWeek,
        season: input.season,
      },
      event: {
        id: `evt_staff_report_${task}_${input.gameWeek}`,
        type: 'staff.report',
        timestamp: input.timestampIso,
        season: input.season,
        severity: 'low',
        context: { task, summaryCode: 'delegation_fitness_session' },
      },
    };
  }

  return {
    stateChanges: [],
    report: {
      task,
      staffId: staff?.id ?? 'unassigned',
      reasonCodes: [...reasonCodes, 'task_no_op_domain_hook'],
      summaryCode: 'delegation_scheduled',
      gameWeek: input.gameWeek,
      season: input.season,
    },
  };
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
