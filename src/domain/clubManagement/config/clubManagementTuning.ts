/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phase E — single config for club management weights (neutral attribute 50 → modifier 1.0).
 */

import { clamp } from '../../shared/math';

function b(n: number, min: number, max: number): number {
  return clamp(n, min, max);
}

/** Linear map: attribute 50 → 1.0; slope applied per point from 50. */
export const ATTRIBUTE_MODIFIER = {
  slopePerPoint: b(0.004, 0.002, 0.008),
} as const;

export const FINANCE_TUNING = {
  wageBudgetHeadroom: b(1.15, 1.05, 1.35),
  wageBudgetWeeklyFloor: b(25_000, 10_000, 80_000),
  defaultTransferBudgetPctOfCoins: b(1, 0.5, 1),
  maxLedgerEntries: b(400, 100, 800),
  playerWagesLedgerCategory: 'player_wages' as const,
  staffWagesLedgerCategory: 'staff_wages' as const,
  facilityRunningLedgerCategory: 'facility_running' as const,
  matchRevenueLedgerCategory: 'match_revenue' as const,
  transferOutLedgerCategory: 'transfer_out' as const,
  transferInLedgerCategory: 'transfer_in' as const,
  openingBalanceCategory: 'opening_balance' as const,
} as const;

export const STAFF_TUNING = {
  defaultNeutralAttribute: 50,
  levelToAttributeBase: b(40, 35, 45),
  levelToAttributeStep: b(5, 3, 8),
  defaultContractWeeks: b(104, 52, 156),
  hiringPoolSize: b(8, 4, 12),
  /** Per-category modifier ranges (min/max at attr 1 / 99). */
  modifierRanges: {
    trainingEffectiveness: { min: b(0.85, 0.75, 0.92), max: b(1.2, 1.08, 1.35) },
    developmentRate: { min: b(0.9, 0.82, 0.95), max: b(1.18, 1.05, 1.28) },
    injuryRisk: { min: b(0.82, 0.72, 0.9), max: b(1.15, 1.05, 1.25) },
    recoverySpeed: { min: b(0.85, 0.75, 0.92), max: b(1.25, 1.1, 1.4) },
    diagnosisAccuracy: { min: b(0.85, 0.75, 0.92), max: b(1.2, 1.08, 1.32) },
    scoutReportQuality: { min: b(0.88, 0.8, 0.95), max: b(1.15, 1.05, 1.25) },
    academyCoaching: { min: b(0.88, 0.8, 0.95), max: b(1.16, 1.06, 1.28) },
    oppositionAnalysis: { min: b(0.7, 0.6, 0.82), max: b(1.15, 1.05, 1.25) },
    setPieceQuality: { min: b(0.92, 0.85, 0.97), max: b(1.12, 1.04, 1.2) },
  },
  categoryWeights: {
    trainingEffectiveness: {
      head_coach: b(0.35, 0.2, 0.5),
      assistant_manager: b(0.35, 0.2, 0.5),
      fitness_coach: b(0.3, 0.15, 0.45),
    },
    developmentRate: {
      head_coach: b(0.4, 0.25, 0.55),
      fitness_coach: b(0.35, 0.2, 0.5),
      assistant_manager: b(0.25, 0.1, 0.4),
    },
    injuryRisk: {
      physio: b(0.45, 0.3, 0.6),
      sports_scientist: b(0.35, 0.2, 0.5),
      medical_staff: b(0.2, 0.1, 0.35),
    },
    recoverySpeed: {
      physio: b(0.5, 0.35, 0.65),
      medical_staff: b(0.3, 0.15, 0.45),
      sports_scientist: b(0.2, 0.1, 0.35),
    },
    diagnosisAccuracy: {
      medical_staff: b(0.55, 0.4, 0.7),
      physio: b(0.45, 0.3, 0.6),
    },
    scoutReportQuality: {
      scout: b(0.7, 0.5, 0.85),
      recruitment_analyst: b(0.3, 0.15, 0.45),
    },
    academyCoaching: {
      youth_director: b(0.45, 0.3, 0.6),
      head_coach: b(0.3, 0.15, 0.45),
      director_of_football: b(0.25, 0.1, 0.4),
    },
    oppositionAnalysis: {
      assistant_manager: b(0.5, 0.35, 0.65),
      recruitment_analyst: b(0.3, 0.15, 0.45),
    },
    setPieceQuality: {
      assistant_manager: b(0.45, 0.3, 0.6),
      goalkeeping_coach: b(0.55, 0.4, 0.7),
    },
  },
} as const;

export const FACILITY_TUNING = {
  analyticsDefaultLevel: 1,
  runningCostBasePerLevel: b(1200, 400, 3000),
  runningCostByKey: {
    stadiumLevel: b(1.4, 1, 2),
    trainingGroundLevel: b(1.1, 0.8, 1.5),
    youthAcademyLevel: b(1, 0.7, 1.4),
    medicalCenterLevel: b(1.05, 0.8, 1.35),
    scoutingNetworkLevel: b(0.95, 0.7, 1.25),
    analyticsDepartmentLevel: b(1.15, 0.85, 1.5),
  },
  stadium: {
    baseGateCapacity: b(5200, 3000, 8000),
    capacityPerLevel: b(800, 400, 1200),
    attendanceMultMin: b(0.75, 0.6, 0.9),
    attendanceMultMax: b(1.22, 1.08, 1.35),
    levelAttendanceStep: b(0.035, 0.02, 0.05),
  },
  analyticsOppositionMult: {
    min: b(0.75, 0.65, 0.85),
    max: b(1.12, 1.02, 1.22),
    perLevel: b(0.032, 0.02, 0.05),
  },
  scoutingNetworkRangeBonusPerLevel: b(0.04, 0.02, 0.07),
} as const;

export const BOARD_TUNING = {
  initialPatience: b(70, 50, 85),
  trustFromWin: b(4, 1, 8),
  trustFromLoss: b(-3, -8, -1),
  trustFromDraw: b(0, -2, 2),
  warningTrustThreshold: b(35, 25, 45),
  ultimatumTrustThreshold: b(18, 12, 28),
  dismissalTrustThreshold: b(8, 4, 15),
  messageCooldownWeeks: b(3, 2, 6),
  transferRestrictionWeeks: b(6, 3, 12),
} as const;

export const FANS_TUNING = {
  moodFromWin: b(6, 2, 10),
  moodFromLoss: b(-4, -10, -2),
  moodFromDraw: b(1, -2, 3),
  confidenceDecayPerWeek: b(0.5, 0.1, 1.5),
  trustFromYouthIntake: b(2, 0, 5),
  ticketPriceMoodPenaltyScale: b(0.015, 0.005, 0.03),
  boardPressureFromLowMoodThreshold: b(35, 25, 45),
  boardPressureDelta: b(-2, -5, 0),
} as const;

export const INFLUENCE_TUNING = {
  weights: {
    results: b(0.22, 0.1, 0.35),
    trophies: b(0.12, 0.05, 0.22),
    development: b(0.12, 0.05, 0.2),
    boardTrust: b(0.18, 0.1, 0.28),
    clubReputation: b(0.12, 0.05, 0.2),
    seasonsAtClub: b(0.1, 0.04, 0.18),
    fanTrust: b(0.14, 0.06, 0.22),
  },
  thresholds: {
    transferBudgetSay: b(45, 35, 55),
    staffDecisions: b(38, 28, 48),
    academyDecisions: b(42, 32, 52),
    infrastructureRequests: b(50, 40, 60),
    playerAuthority: b(55, 45, 65),
    tacticalAutonomy: b(48, 38, 58),
  },
} as const;

export const DELEGATION_TUNING = {
  reportCooldownWeeks: b(2, 1, 4),
  qualityClampMin: b(0.55, 0.4, 0.7),
  qualityClampMax: b(1, 0.95, 1),
} as const;
