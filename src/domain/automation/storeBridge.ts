/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { notificationPipelineStepForEvent } from '../livingWorld/notifications/pipeline';
import { applyStateChanges } from '../livingWorld/reducer';
import { ingestGameEvent } from '../livingWorld/events/ingest';
import type { GameEvent, LivingWorldState, ReducerInput, StateChange } from '../livingWorld/types';
import type { Club, DailyMission, FootballFormation, LeagueStanding, PreMatchData } from '../../types/game';
import type { GameSaveData } from '../../types/save';
import type { ClubManagementState } from '../clubManagement/types';
import type { RecruitmentWorldState } from '../recruitment/types';
import type { InjuryRiskContext } from '../playerLife/injuryRisk';
import { createSquadState } from '../squad/squadStateAdapter';
import { validateForKickoff } from '../squad/squadRules';
import type {
  AutomationFeatureId,
  AutomationFeatureSetting,
  AutomationReport,
  AutomationRunResult,
  AutomationSettings,
  AutomationUndoSnapshot,
  UndoFailureReason,
} from './types';
import {
  loadAutomationPrefs,
  saveAutomationPrefs,
  patchAutomationFeature,
  setAutomationUndo,
  getAutomationUndo,
} from './settings';
import { runBeforeUserMatchAutomations } from './runBeforeUserMatch';
import { runWeeklyAutomations } from './runWeekly';

let runtimeReports: AutomationReport[] = [];

export function getRuntimeAutomationReports(): readonly AutomationReport[] {
  return runtimeReports;
}

export function clearRuntimeAutomationReportsForTests(): void {
  runtimeReports = [];
}

function deliverAutomationEvents(
  input: ReducerInput,
  events: GameEvent[],
  reports: AutomationReport[],
): { livingWorld: LivingWorldState; players: typeof input.players; reports: AutomationReport[] } {
  let lw = input.livingWorld;
  let players = input.players;
  const nextReports: AutomationReport[] = [];

  for (let i = 0; i < events.length; i += 1) {
    const event = events[i];
    const baseReport = reports[i];
    const ingested = ingestGameEvent({ livingWorld: lw, players }, event, {
      clubId: event.clubId,
    });
    lw = ingested.result.livingWorld;
    players = ingested.result.players;

    const step = notificationPipelineStepForEvent(event, { livingWorld: lw, players });
    const delivered = step.accepted.length > 0;
    let reasonCodes = [...(baseReport?.reasonCodes ?? [])];
    if (!delivered) {
      reasonCodes = [...reasonCodes, 'notification_throttled'];
    }
    if (baseReport) {
      nextReports.push({ ...baseReport, reasonCodes, notificationDelivered: delivered });
    }
  }

  runtimeReports = [...runtimeReports, ...nextReports].slice(-50);
  return { livingWorld: lw, players, reports: nextReports };
}

export function getAutomationSettingsFromPrefs(): AutomationSettings {
  return loadAutomationPrefs().settings;
}

export function setAutomationFeatureInPrefs(
  id: AutomationFeatureId,
  patch: Partial<AutomationFeatureSetting>,
): AutomationSettings {
  return patchAutomationFeature(id, patch);
}

export interface AutomationStoreSlice {
  club: Club;
  livingWorld: LivingWorldState;
  clubManagement: ClubManagementState;
  recruitmentWorld: RecruitmentWorldState | undefined;
  saveSnapshot: GameSaveData;
  maxSubstitutes: number;
  analyticsDepartmentLevel: number;
  leagueStandings: LeagueStanding[];
  injuryCtx: InjuryRiskContext;
  allowedFormations?: readonly FootballFormation[];
}

export type RecoveryApplyResult = {
  ok: boolean;
  club: Club;
  livingWorld: LivingWorldState;
  undo?: AutomationUndoSnapshot;
};

export function executeBeforeUserMatchAutomations(
  slice: AutomationStoreSlice,
  preMatch: PreMatchData | null,
  timestampIso: string,
  gameWeek: number,
  onRecoveryApply: () => RecoveryApplyResult,
): {
  run: AutomationRunResult;
  club: Club;
  livingWorld: LivingWorldState;
} {
  const prefs = loadAutomationPrefs();
  const out = runBeforeUserMatchAutomations({
    settings: prefs.settings,
    stamps: prefs.stamps,
    club: slice.club,
    livingWorld: slice.livingWorld,
    preMatch,
    maxSubstitutes: slice.maxSubstitutes,
    allowedFormations: slice.allowedFormations,
    analyticsDepartmentLevel: slice.analyticsDepartmentLevel,
    leagueStandings: slice.leagueStandings,
    saveSnapshot: slice.saveSnapshot,
    injuryCtx: slice.injuryCtx,
    timestampIso,
    gameWeek,
  });

  let club = slice.club;
  let livingWorld = slice.livingWorld;
  let undo = out.prefsUndo ?? prefs.undo;

  for (const effect of out.effects) {
    if (effect.kind === 'squad_apply') {
      club = effect.club;
    }
    if (effect.kind === 'recovery_apply') {
      const applied = onRecoveryApply();
      if (applied.ok) {
        club = applied.club;
        livingWorld = applied.livingWorld;
        if (applied.undo) undo = applied.undo;
      }
    }
  }

  saveAutomationPrefs({
    settings: prefs.settings,
    stamps: out.stamps,
    undo,
  });

  const delivered = deliverAutomationEvents({ livingWorld, players: club.footballSquad }, out.events, out.reports);

  return {
    run: out.result,
    club: { ...club, footballSquad: delivered.players },
    livingWorld: delivered.livingWorld,
  };
}

export function executeWeeklyAutomations(
  slice: AutomationStoreSlice,
  matchday: number,
  gameWeek: number,
  timestampIso: string,
  weeklyTickEvents: readonly GameEvent[],
  onRecoveryApply: () => RecoveryApplyResult,
): {
  run: AutomationRunResult;
  club: Club;
  livingWorld: LivingWorldState;
} {
  const prefs = loadAutomationPrefs();
  const out = runWeeklyAutomations({
    settings: prefs.settings,
    stamps: prefs.stamps,
    club: slice.club,
    livingWorld: slice.livingWorld,
    clubManagement: slice.clubManagement,
    recruitmentWorld: slice.recruitmentWorld,
    gameWeek,
    matchday,
    timestampIso,
    injuryCtx: slice.injuryCtx,
    weeklyTickEvents,
  });

  let club = slice.club;
  let livingWorld = slice.livingWorld;
  let undo = prefs.undo;

  for (const effect of out.effects) {
    if (effect.kind === 'recovery_apply') {
      const applied = onRecoveryApply();
      if (applied.ok) {
        club = applied.club;
        livingWorld = applied.livingWorld;
        if (applied.undo) undo = applied.undo;
      }
    }
  }

  saveAutomationPrefs({
    settings: prefs.settings,
    stamps: out.stamps,
    undo,
  });

  const delivered = deliverAutomationEvents({ livingWorld, players: club.footballSquad }, out.events, out.reports);

  return {
    run: out.result,
    club: { ...club, footballSquad: delivered.players },
    livingWorld: delivered.livingWorld,
  };
}

function invertRecoveryChange(change: StateChange): StateChange | null {
  if (change.kind !== 'patchPlayerLife') return null;
  const leg = change.legacyDelta;
  if (!leg) return null;
  return {
    kind: 'patchPlayerLife',
    playerId: change.playerId,
    conditionDelta: change.conditionDelta
      ? {
          trainingLoad: -(change.conditionDelta.trainingLoad ?? 0),
          recoveryQuality: -(change.conditionDelta.recoveryQuality ?? 0),
          sharpness: -(change.conditionDelta.sharpness ?? 0),
          matchFitness: -(change.conditionDelta.matchFitness ?? 0),
        }
      : undefined,
    legacyDelta: {
      fatigue: leg.fatigue !== undefined ? -leg.fatigue : undefined,
      stamina: leg.stamina !== undefined ? -leg.stamina : undefined,
      morale: leg.morale !== undefined ? -leg.morale : undefined,
      form: leg.form !== undefined ? -leg.form : undefined,
    },
  };
}

export function undoLastAutomationInStore(params: {
  club: Club;
  livingWorld: LivingWorldState;
  maxSubstitutes: number;
  dailyMissions: DailyMission[];
}):
  | { ok: true; club: Club; livingWorld: LivingWorldState; dailyMissions: DailyMission[] }
  | { ok: false; reasonCode: UndoFailureReason } {
  const snap = getAutomationUndo();
  if (!snap) return { ok: false, reasonCode: 'nothing_to_undo' };
  if (snap.feature === 'recovery') {
    return undoRecovery(params, snap);
  }
  return undoSquad(params, snap);
}

function undoSquad(
  params: { club: Club; livingWorld: LivingWorldState; maxSubstitutes: number; dailyMissions: DailyMission[] },
  snap: AutomationUndoSnapshot,
):
  | { ok: true; club: Club; livingWorld: LivingWorldState; dailyMissions: DailyMission[] }
  | { ok: false; reasonCode: UndoFailureReason } {
  const club: Club = {
    ...params.club,
    footballLineup: [...snap.footballLineup],
    footballBench: [...snap.footballBench],
  };
  const { state } = createSquadState(club, { maxSubstitutes: params.maxSubstitutes });
  if (validateForKickoff(state).length > 0) {
    return { ok: false, reasonCode: 'squad_rules' };
  }
  setAutomationUndo(null);
  return { ok: true, club, livingWorld: params.livingWorld, dailyMissions: params.dailyMissions };
}

function undoRecovery(
  params: { club: Club; livingWorld: LivingWorldState; dailyMissions: DailyMission[] },
  snap: AutomationUndoSnapshot,
):
  | { ok: true; club: Club; livingWorld: LivingWorldState; dailyMissions: DailyMission[] }
  | { ok: false; reasonCode: UndoFailureReason } {
  if (!snap.recoveryChanges?.length) return { ok: false, reasonCode: 'not_undoable' };

  for (const [pid, before] of Object.entries(snap.playerFatigueBefore ?? {})) {
    const p = params.club.footballSquad.find((x) => x.id === pid);
    if (!p || p.fatigue !== before) return { ok: false, reasonCode: 'undo_stale' };
  }
  if (snap.coinsBefore !== undefined && params.club.finances.coins !== snap.coinsBefore - 500) {
    return { ok: false, reasonCode: 'undo_stale' };
  }

  const inverse = snap.recoveryChanges.map(invertRecoveryChange).filter((c): c is StateChange => c !== null);
  const applied = applyStateChanges(
    { livingWorld: params.livingWorld, players: params.club.footballSquad },
    inverse,
  );

  let dailyMissions = params.dailyMissions;
  if (snap.dailyMissionManageFatigueBefore !== undefined) {
    dailyMissions = dailyMissions.map((m) =>
      m.id === 'mission_manage_fatigue' ? { ...m, current: snap.dailyMissionManageFatigueBefore! } : m,
    );
  }

  const club: Club = {
    ...params.club,
    footballSquad: applied.players,
    finances: {
      ...params.club.finances,
      coins: snap.coinsBefore ?? params.club.finances.coins,
    },
  };

  setAutomationUndo(null);
  return { ok: true, club, livingWorld: applied.livingWorld, dailyMissions };
}
