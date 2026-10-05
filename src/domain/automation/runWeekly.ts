/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Club } from '../../types/game';
import type { ClubManagementState } from '../clubManagement/types';
import type { GameEvent, LivingWorldState } from '../livingWorld/types';
import type { RecruitmentWorldState } from '../recruitment/types';
import {
  delegationSkipReasons,
  findDelegationStaffReportFromLog,
} from './features/delegationMirror';
import { playersAboveRestedInjuryBaseline, RECOVERY_SESSION_COIN_COST } from './recoveryRisk';
import type { InjuryRiskContext } from '../playerLife/injuryRisk';
import type {
  AutomationExecutionStamps,
  AutomationFeatureId,
  AutomationReport,
  AutomationRunResult,
  AutomationSettings,
} from './types';
import { buildAutomationGameEvent, createAutomationReport } from './reports';

export type WeeklyAutomationEffect = { feature: 'recovery'; kind: 'recovery_apply' } | { kind: 'none' };

export interface WeeklyAutomationInput {
  settings: AutomationSettings;
  stamps: AutomationExecutionStamps;
  club: Club;
  livingWorld: LivingWorldState;
  clubManagement: ClubManagementState;
  recruitmentWorld: RecruitmentWorldState | undefined;
  gameWeek: number;
  matchday: number;
  timestampIso: string;
  injuryCtx: Omit<InjuryRiskContext, 'minutesThisMatch'>;
  /** Events produced by the weekly club tick this run (delegation already executed). */
  weeklyTickEvents: readonly GameEvent[];
}

export interface WeeklyAutomationOutput {
  result: AutomationRunResult;
  effects: WeeklyAutomationEffect[];
  events: ReturnType<typeof buildAutomationGameEvent>[];
  reports: AutomationReport[];
  stamps: AutomationExecutionStamps;
}

function mirrorDelegationFeature(
  input: WeeklyAutomationInput,
  feature: 'scout' | 'loans',
  task: 'scouting' | 'loan_search',
  stampKey: 'lastScoutGameWeek' | 'lastLoansGameWeek',
): { report?: AutomationReport; event?: ReturnType<typeof buildAutomationGameEvent>; stamps: AutomationExecutionStamps } {
  const season = input.livingWorld.currentSeason;
  const clubId = input.club.id;
  let stamps = input.stamps;
  if (stamps[stampKey] === input.gameWeek) {
    return { stamps };
  }
  const setting = input.settings[feature];
  if (!setting.enabled) {
    return { stamps };
  }

  const skip = delegationSkipReasons(
    input.clubManagement,
    task,
    input.gameWeek,
    !!input.recruitmentWorld,
  );

  const reportEvent =
    findDelegationStaffReportFromLog(input.weeklyTickEvents, task, input.gameWeek) ??
    findDelegationStaffReportFromLog(input.livingWorld.eventLog, task, input.gameWeek);

  const lastReportWeek = input.clubManagement.delegation.lastReportWeekByTask[task] ?? 0;
  const hasReportThisWeek = lastReportWeek === input.gameWeek && !!reportEvent;

  if (skip.includes('delegation_mode_manual') || skip.includes('staff_unassigned') || skip.includes('recruitment_world_unavailable')) {
    const reasonCodes = skip.filter((c) =>
      ['delegation_mode_manual', 'staff_unassigned', 'recruitment_world_unavailable'].includes(c),
    );
    stamps = { ...stamps, [stampKey]: input.gameWeek };
    return {
      stamps,
      report: createAutomationReport({
        id: `auto_${feature}_${input.gameWeek}_${season}`,
        feature,
        mode: 'suggest',
        status: 'skipped',
        summaryCode: `automation_${feature}_skipped`,
        reasonCodes,
        undoable: false,
        gameWeek: input.gameWeek,
        season,
        createdAt: input.timestampIso,
        changeSummary: {},
      }),
      event: buildAutomationGameEvent({
        reportId: `auto_${feature}_${input.gameWeek}_${season}`,
        clubId,
        season,
        timestampIso: input.timestampIso,
        feature,
        mode: 'suggest',
        status: 'skipped',
        summaryCode: `automation_${feature}_skipped`,
        reasonCodes,
        gameWeek: input.gameWeek,
        changeSummary: {},
        undoable: false,
      }),
    };
  }

  if (!hasReportThisWeek) {
    const reasonCodes = skip.includes('delegation_cooldown')
      ? ['delegation_cooldown']
      : reportEvent
        ? ['delegation_report_missing_week']
        : ['delegation_no_report'];
    if (reasonCodes[0] === 'delegation_cooldown' || !reportEvent) {
      stamps = { ...stamps, [stampKey]: input.gameWeek };
      return {
        stamps,
        report: createAutomationReport({
          id: `auto_${feature}_${input.gameWeek}_${season}`,
          feature,
          mode: 'suggest',
          status: 'skipped',
          summaryCode: `automation_${feature}_skipped`,
          reasonCodes,
          undoable: false,
          gameWeek: input.gameWeek,
          season,
          createdAt: input.timestampIso,
          changeSummary: {},
        }),
        event: buildAutomationGameEvent({
          reportId: `auto_${feature}_${input.gameWeek}_${season}`,
          clubId,
          season,
          timestampIso: input.timestampIso,
          feature,
          mode: 'suggest',
          status: 'skipped',
          summaryCode: `automation_${feature}_skipped`,
          reasonCodes,
          gameWeek: input.gameWeek,
          changeSummary: {},
          undoable: false,
        }),
      };
    }
  }

  const summaryCode = String(reportEvent?.context.summaryCode ?? `automation_${feature}_mirrored`);
  const reasonCodes = String(reportEvent?.context.reasonCodes ?? 'delegation_mirrored').split(',').filter(Boolean);
  stamps = { ...stamps, [stampKey]: input.gameWeek };
  return {
    stamps,
    report: createAutomationReport({
      id: `auto_${feature}_${input.gameWeek}_${season}`,
      feature,
      mode: 'suggest',
      status: 'suggested',
      summaryCode,
      reasonCodes,
      undoable: false,
      gameWeek: input.gameWeek,
      season,
      createdAt: input.timestampIso,
      changeSummary: {},
      delegationReport: reportEvent
        ? {
            task,
            staffId: String(reportEvent.context.staffId ?? 'unassigned'),
            reasonCodes,
            summaryCode,
            gameWeek: input.gameWeek,
            season,
          }
        : undefined,
    }),
    event: buildAutomationGameEvent({
      reportId: `auto_${feature}_${input.gameWeek}_${season}`,
      clubId,
      season,
      timestampIso: input.timestampIso,
      feature,
      mode: 'suggest',
      status: 'suggested',
      summaryCode,
      reasonCodes,
      gameWeek: input.gameWeek,
      changeSummary: {},
      undoable: false,
    }),
  };
}

export function runWeeklyAutomations(input: WeeklyAutomationInput): WeeklyAutomationOutput {
  const reports: AutomationReport[] = [];
  const events: ReturnType<typeof buildAutomationGameEvent>[] = [];
  const effects: WeeklyAutomationEffect[] = [];
  const appliedFeatureIds: AutomationFeatureId[] = [];
  let stamps = { ...input.stamps };
  const season = input.livingWorld.currentSeason;
  const clubId = input.club.id;

  const scout = mirrorDelegationFeature(input, 'scout', 'scouting', 'lastScoutGameWeek');
  stamps = scout.stamps;
  if (scout.report && scout.event) {
    reports.push(scout.report);
    events.push(scout.event);
  }

  const loans = mirrorDelegationFeature(input, 'loans', 'loan_search', 'lastLoansGameWeek');
  stamps = loans.stamps;
  if (loans.report && loans.event) {
    reports.push(loans.report);
    events.push(loans.event);
  }

  if (input.settings.recovery.enabled && stamps.lastRecoveryGameWeek !== input.gameWeek) {
    const feature: AutomationFeatureId = 'recovery';
    const mode = input.settings.recovery.mode;
    const squadPool = input.club.footballSquad.filter((p) => {
      const inXi = input.club.footballLineup.includes(p.id);
      const onBench = input.club.footballBench.includes(p.id);
      return inXi || onBench;
    });
    const atRisk = playersAboveRestedInjuryBaseline(squadPool, input.injuryCtx);
    if (atRisk.length === 0) {
      reports.push(
        createAutomationReport({
          id: `auto_recovery_wk_${input.gameWeek}_${season}`,
          feature,
          mode,
          status: 'skipped',
          summaryCode: 'automation_recovery_skipped',
          reasonCodes: ['recovery_not_needed'],
          undoable: false,
          gameWeek: input.gameWeek,
          season,
          createdAt: input.timestampIso,
          changeSummary: { wholeSquad: true },
        }),
      );
      events.push(
        buildAutomationGameEvent({
          reportId: `auto_recovery_wk_${input.gameWeek}_${season}`,
          clubId,
          season,
          timestampIso: input.timestampIso,
          feature,
          mode,
          status: 'skipped',
          summaryCode: 'automation_recovery_skipped',
          reasonCodes: ['recovery_not_needed'],
          gameWeek: input.gameWeek,
          changeSummary: { wholeSquad: true, coinCost: RECOVERY_SESSION_COIN_COST },
          undoable: false,
        }),
      );
      stamps = { ...stamps, lastRecoveryGameWeek: input.gameWeek };
    } else if (mode === 'suggest') {
      reports.push(
        createAutomationReport({
          id: `auto_recovery_wk_${input.gameWeek}_${season}`,
          feature,
          mode,
          status: 'suggested',
          summaryCode: 'automation_recovery_suggested',
          reasonCodes: ['injury_prob_above_rested_baseline'],
          undoable: false,
          gameWeek: input.gameWeek,
          season,
          createdAt: input.timestampIso,
          changeSummary: { playerIds: atRisk, wholeSquad: true, coinCost: RECOVERY_SESSION_COIN_COST },
        }),
      );
      events.push(
        buildAutomationGameEvent({
          reportId: `auto_recovery_wk_${input.gameWeek}_${season}`,
          clubId,
          season,
          timestampIso: input.timestampIso,
          feature,
          mode,
          status: 'suggested',
          summaryCode: 'automation_recovery_suggested',
          reasonCodes: ['injury_prob_above_rested_baseline'],
          gameWeek: input.gameWeek,
          changeSummary: { playerIds: atRisk, wholeSquad: true, coinCost: RECOVERY_SESSION_COIN_COST },
          undoable: false,
        }),
      );
      stamps = { ...stamps, lastRecoveryGameWeek: input.gameWeek };
    } else if (input.club.finances.coins < RECOVERY_SESSION_COIN_COST) {
      reports.push(
        createAutomationReport({
          id: `auto_recovery_wk_${input.gameWeek}_${season}`,
          feature,
          mode,
          status: 'skipped',
          summaryCode: 'automation_recovery_skipped',
          reasonCodes: ['insufficient_coins'],
          undoable: false,
          gameWeek: input.gameWeek,
          season,
          createdAt: input.timestampIso,
          changeSummary: { wholeSquad: true, coinCost: RECOVERY_SESSION_COIN_COST },
        }),
      );
      events.push(
        buildAutomationGameEvent({
          reportId: `auto_recovery_wk_${input.gameWeek}_${season}`,
          clubId,
          season,
          timestampIso: input.timestampIso,
          feature,
          mode,
          status: 'skipped',
          summaryCode: 'automation_recovery_skipped',
          reasonCodes: ['insufficient_coins'],
          gameWeek: input.gameWeek,
          changeSummary: { wholeSquad: true, coinCost: RECOVERY_SESSION_COIN_COST },
          undoable: false,
        }),
      );
      stamps = { ...stamps, lastRecoveryGameWeek: input.gameWeek };
    } else {
      effects.push({ feature: 'recovery', kind: 'recovery_apply' });
      appliedFeatureIds.push(feature);
      reports.push(
        createAutomationReport({
          id: `auto_recovery_wk_${input.gameWeek}_${season}`,
          feature,
          mode,
          status: 'applied',
          summaryCode: 'automation_recovery_applied',
          reasonCodes: ['injury_prob_above_rested_baseline'],
          undoable: true,
          gameWeek: input.gameWeek,
          season,
          createdAt: input.timestampIso,
          changeSummary: { playerIds: atRisk, wholeSquad: true, coinCost: RECOVERY_SESSION_COIN_COST },
        }),
      );
      events.push(
        buildAutomationGameEvent({
          reportId: `auto_recovery_wk_${input.gameWeek}_${season}`,
          clubId,
          season,
          timestampIso: input.timestampIso,
          feature,
          mode,
          status: 'applied',
          summaryCode: 'automation_recovery_applied',
          reasonCodes: ['injury_prob_above_rested_baseline'],
          gameWeek: input.gameWeek,
          changeSummary: { playerIds: atRisk, wholeSquad: true, coinCost: RECOVERY_SESSION_COIN_COST },
          undoable: true,
        }),
      );
      stamps = { ...stamps, lastRecoveryGameWeek: input.gameWeek };
    }
  }

  return {
    result: { reports, appliedFeatureIds },
    effects,
    events,
    reports,
    stamps,
  };
}
