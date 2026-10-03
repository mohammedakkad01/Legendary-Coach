/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { GameSaveData } from '../../../types/save';
import { CURRENT_SAVE_VERSION } from '../../../types/save';
import { createDefaultBoard, generateSeasonObjectives } from '../board/boardLogic';
import { createOpeningFinance } from '../finance/financeLedger';
import { defaultDelegationSlice } from '../delegation/runDelegation';
import { createDefaultFans } from '../fans/fanLogic';
import { computeManagerInfluence } from '../influence/computeInfluence';
import { staffFromLegacyClub, averageStaffReputation } from '../staff/migrateLegacyStaff';
import { FACILITY_TUNING } from '../config/clubManagementTuning';
import type { ClubManagementState } from '../types';
import { deriveGameWeekFromSave } from '../../recruitment/world/gameWeek';

export function buildClubManagementFromSave(save: GameSaveData): ClubManagementState {
  const club = save.club;
  const gameWeek = deriveGameWeekFromSave(save);
  const season = save.livingWorld?.currentSeason ?? 1;
  const timestampIso = save.savedAt || new Date().toISOString();
  const squadWages = (club.footballSquad ?? []).map((p) => p.wage);
  const coins = club.finances.coins;

  const finance = createOpeningFinance({
    coins,
    squadWeeklyWages: squadWages.reduce((a, b) => a + b, 0),
    gameWeek,
    season,
    timestampIso,
    entryId: `ledger_open_${save.saveId}`,
  });

  const scouts = save.recruitmentWorld?.scoutNetwork ?? [];
  const members = staffFromLegacyClub(club.id, club.staff, scouts);

  const analyticsLevel =
    'analyticsDepartmentLevel' in club.facilities &&
    typeof (club.facilities as { analyticsDepartmentLevel?: number }).analyticsDepartmentLevel === 'number'
      ? (club.facilities as { analyticsDepartmentLevel: number }).analyticsDepartmentLevel
      : FACILITY_TUNING.analyticsDefaultLevel;

  const board = createDefaultBoard(club.boardTrust);
  board.objectives = generateSeasonObjectives(club.finances.reputation, club.footballSquad.length);

  const fans = createDefaultFans(club.fanMood);

  const influence = computeManagerInfluence({
    recentWinRate: 50,
    trophies: club.trophies ?? 0,
    developmentMomentumAvg: 0,
    boardTrust: board.trust,
    clubReputation: club.finances.reputation,
    seasonsAtClub: season,
    fanTrust: fans.trust,
    gameWeek,
  });

  return {
    schemaVersion: 1,
    finance,
    staff: { members, staffReputation: averageStaffReputation(members) },
    facilities: { analyticsDepartmentLevel: analyticsLevel },
    delegation: defaultDelegationSlice(),
    board,
    fans,
    influence,
    scheduled: { lastProcessedGameWeek: gameWeek, lastMonthlySummaryWeek: 0 },
  };
}

/** Idempotent: preserves coins, squad, facilities, board/fan/recruitment/player life. */
export function ensureClubManagementV6(save: GameSaveData): GameSaveData {
  if (save.clubManagement && save.clubManagement.schemaVersion === 1) {
    const cm = save.clubManagement;
    const coinsPreserved = save.club.finances.coins;
    if (cm.finance.coins !== coinsPreserved) {
      return {
        ...save,
        saveVersion: CURRENT_SAVE_VERSION,
        clubManagement: {
          ...cm,
          finance: { ...cm.finance, coins: coinsPreserved, transferBudget: cm.finance.transferBudget },
        },
      };
    }
    return { ...save, saveVersion: CURRENT_SAVE_VERSION };
  }

  const clubManagement = buildClubManagementFromSave(save);
  return {
    ...save,
    saveVersion: CURRENT_SAVE_VERSION,
    clubManagement,
  };
}
