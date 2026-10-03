/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Project club management slice onto legacy Club fields (compat for UI).
 */

import type { Club, ClubFinances } from '../../types/game';
import type { ClubFacilitiesExtended, ClubManagementState } from './types';

export function syncClubFromClubManagement(club: Club, cm: ClubManagementState): Club {
  const finances: ClubFinances = {
    ...club.finances,
    coins: cm.finance.coins,
    totalSeasonRevenue: cm.finance.seasonRevenueTotal,
    totalSeasonExpenses: cm.finance.seasonExpenseTotal,
  };

  const facilities: ClubFacilitiesExtended = {
    ...club.facilities,
    analyticsDepartmentLevel: cm.facilities.analyticsDepartmentLevel,
  };

  return {
    ...club,
    boardTrust: cm.board.trust,
    fanMood: cm.fans.mood,
    finances,
    facilities,
  };
}

export function extendedFacilitiesFromClub(club: Club): ClubFacilitiesExtended {
  const f = club.facilities;
  const analytics =
    'analyticsDepartmentLevel' in f && typeof (f as ClubFacilitiesExtended).analyticsDepartmentLevel === 'number'
      ? (f as ClubFacilitiesExtended).analyticsDepartmentLevel
      : 1;
  return { ...f, analyticsDepartmentLevel: analytics };
}
