/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Club, LeagueStanding } from '../../../types/game';
import type { GameSaveData } from '../../../types/save';
import { applyClubManagementChanges } from '../reducer';
import {
  computeStaffWeeklyWages,
  facilityWeeklyRunningCost,
  postFinanceTransaction,
  sumSquadWeeklyWages,
} from '../finance/financeLedger';
import { computeClubSystemModifiers } from '../modifiers/attributeModifier';
import { extendedFacilitiesFromClub, syncClubFromClubManagement } from '../syncLegacyClub';
import type { ClubManagementState, WeeklyClubTickResult } from '../types';
import { applyResultToBoardTrust, evaluateBoardConsequenceLadder, updateObjectivesFromStandings } from '../board/boardLogic';
import { fanBoardPressureDelta } from '../fans/fanLogic';
import { computeManagerInfluence } from '../influence/computeInfluence';
import { DELEGATION_TASKS, runDelegatedTask } from '../delegation/runDelegation';
import type { GameEvent } from '../../livingWorld/types';
import { applyDismissalToManagerCareer } from '../board/boardLogic';
import type { LivingWorldState } from '../../livingWorld/types';
import type { StateChange } from '../../livingWorld/types';

export interface WeeklyClubTickInput {
  save: GameSaveData;
  club: Club;
  livingWorld: LivingWorldState;
  gameWeek: number;
  matchday: number;
  timestampIso: string;
  lastMatchWon?: boolean;
  lastMatchDrawn?: boolean;
}

export interface WeeklyClubTickOutput {
  clubManagement: ClubManagementState;
  club: Club;
  livingWorld: LivingWorldState;
  events: GameEvent[];
  playerLifeChanges: StateChange[];
}

export function runWeeklyClubManagementTick(input: WeeklyClubTickInput): WeeklyClubTickOutput {
  let cm = input.save.clubManagement!;
  if (cm.scheduled.lastProcessedGameWeek >= input.gameWeek) {
    return {
      clubManagement: cm,
      club: input.club,
      livingWorld: input.livingWorld,
      events: [],
      playerLifeChanges: [],
    };
  }

  const events: GameEvent[] = [];
  const playerLifeChanges: StateChange[] = [];
  let livingWorld = input.livingWorld;
  const season = livingWorld.currentSeason;
  const facilities = extendedFacilitiesFromClub(input.club);
  const modifiers = computeClubSystemModifiers({
    staff: cm.staff.members,
    facilities,
    fanMood: cm.fans.mood,
    scoutingNetworkLevel: input.club.facilities.scoutingNetworkLevel,
  });

  const squadWages = sumSquadWeeklyWages(input.club.footballSquad.map((p) => p.wage));
  const staffWages = computeStaffWeeklyWages(cm.staff.members.map((m) => m.weeklyWage));
  const facilityCost = facilityWeeklyRunningCost({
    ...input.club.facilities,
    analyticsDepartmentLevel: cm.facilities.analyticsDepartmentLevel,
  });

  let finance = cm.finance;
  finance = postFinanceTransaction(finance, {
    amount: -squadWages,
    category: 'player_wages',
    reasonCode: 'weekly_player_wages',
    gameWeek: input.gameWeek,
    season,
    timestampIso: input.timestampIso,
    entryId: `ledger_pw_${input.gameWeek}`,
  });
  finance = postFinanceTransaction(finance, {
    amount: -staffWages,
    category: 'staff_wages',
    reasonCode: 'weekly_staff_wages',
    gameWeek: input.gameWeek,
    season,
    timestampIso: input.timestampIso,
    entryId: `ledger_sw_${input.gameWeek}`,
  });
  finance = postFinanceTransaction(finance, {
    amount: -facilityCost,
    category: 'facility_running',
    reasonCode: 'weekly_facility_running',
    gameWeek: input.gameWeek,
    season,
    timestampIso: input.timestampIso,
    entryId: `ledger_fr_${input.gameWeek}`,
  });

  cm = applyClubManagementChanges(cm, [{ kind: 'patchFinance', patch: finance }]);

  if (input.lastMatchWon !== undefined) {
    let board = applyResultToBoardTrust(cm.board, input.lastMatchWon, !!input.lastMatchDrawn);
    const pressure = fanBoardPressureDelta(cm.fans);
    if (pressure !== 0) {
      board = { ...board, trust: Math.max(0, board.trust + pressure) };
    }
    cm = applyClubManagementChanges(cm, [{ kind: 'patchBoard', patch: board }]);
  }

  const ladder = evaluateBoardConsequenceLadder(cm.board, input.gameWeek);
  cm = applyClubManagementChanges(cm, ladder.changes);
  events.push(...ladder.events);

  if (cm.board.consequenceLevel === 'dismissed' && livingWorld.managerCareer.employmentStatus !== 'dismissed') {
    livingWorld = {
      ...livingWorld,
      managerCareer: applyDismissalToManagerCareer(
        livingWorld.managerCareer,
        season,
        input.club.id,
      ),
    };
  }

  const standings = input.save.leagueStandings ?? [];
  const sorted = [...standings].sort(
    (a, b) => b.points - a.points || b.goalDifference - a.goalDifference,
  );
  const rankIdx = sorted.findIndex((s) => s.clubId === input.club.id);
  const position = rankIdx >= 0 ? rankIdx + 1 : 10;
  const objectives = updateObjectivesFromStandings(cm.board.objectives, position, 6);
  cm = applyClubManagementChanges(cm, [{ kind: 'patchBoard', patch: { objectives } }]);

  const influence = computeManagerInfluence({
    recentWinRate: 50,
    trophies: input.club.trophies ?? 0,
    developmentMomentumAvg: 0,
    boardTrust: cm.board.trust,
    clubReputation: input.club.finances.reputation,
    seasonsAtClub: season,
    fanTrust: cm.fans.trust,
    gameWeek: input.gameWeek,
  });
  cm = applyClubManagementChanges(cm, [{ kind: 'setInfluence', influence }]);

  if (input.gameWeek % 4 === 0 && cm.scheduled.lastMonthlySummaryWeek !== input.gameWeek) {
    finance = postFinanceTransaction(cm.finance, {
      amount: 0,
      category: 'monthly_summary',
      reasonCode: 'monthly_finance_summary',
      gameWeek: input.gameWeek,
      season,
      timestampIso: input.timestampIso,
      entryId: `ledger_month_${input.gameWeek}`,
    });
    cm = applyClubManagementChanges(cm, [
      { kind: 'patchFinance', patch: finance },
      { kind: 'patchScheduled', patch: { lastMonthlySummaryWeek: input.gameWeek } },
    ]);
  }

  for (const task of DELEGATION_TASKS) {
    const del = runDelegatedTask(task, {
      state: cm,
      modifiers,
      playerIds: input.club.footballSquad.map((p) => p.id),
      gameWeek: input.gameWeek,
      season,
      timestampIso: input.timestampIso,
    });
    playerLifeChanges.push(...del.stateChanges);
    if (del.event) events.push(del.event);
    if (del.report) {
      cm = applyClubManagementChanges(cm, [
        {
          kind: 'patchDelegation',
          patch: {
            lastReportWeekByTask: {
              ...cm.delegation.lastReportWeekByTask,
              [task]: input.gameWeek,
            },
          },
        },
      ]);
    }
  }

  cm = applyClubManagementChanges(cm, [
    { kind: 'patchScheduled', patch: { lastProcessedGameWeek: input.gameWeek } },
  ]);

  const clubSynced = syncClubFromClubManagement(input.club, cm);

  return {
    clubManagement: cm,
    club: clubSynced,
    livingWorld,
    events,
    playerLifeChanges,
  };
}

export function computeMatchGateReceipt(params: {
  ticketPrice: number;
  modifiers: ReturnType<typeof computeClubSystemModifiers>;
  isHome: boolean;
}): number {
  if (!params.isHome) return 0;
  return Math.round(
    params.ticketPrice * params.modifiers.gateCapacity * params.modifiers.stadiumAttendanceMult,
  );
}
