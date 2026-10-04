/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phase G — single config for confidence weights, live triggers, cooldowns, caps.
 */

export const ASSISTANT_TUNING = {
  confidence: {
    base: 42,
    max: 96,
    unscoutedCap: 58,
    minScoutAccuracyForFull: 85,
    weights: {
      matchScoutUnlocked: 26,
      analyticsDepartmentPerLevel: 2.2,
      analyticsDepartmentMax: 22,
      opponentScoutingPerSample: 2.5,
      opponentScoutingSampleCap: 12,
      opponentScoutingMax: 18,
      fullOpponentXi: 8,
      partialOpponentXiPerPlayer: 1.2,
    },
    /** League-average referee placeholder (0–100 traits) for pre-kickoff copy only. */
    genericRefereeProfile: {
      strictness: 52,
      cardTendency: 50,
      penaltyTendency: 48,
      foulSensitivity: 51,
    },
  },
  live: {
    maxAlertsPerMatch: 3,
    triggers: {
      flank_overload_right: {
        minMinute: 20,
        minAwayAttTotal: 4,
        flankShareMin: 0.55,
        cooldownMinutes: 12,
        severity: 'warning' as const,
        importance: 72,
      },
      flank_overload_left: {
        minMinute: 20,
        minAwayAttTotal: 4,
        flankShareMin: 0.55,
        cooldownMinutes: 12,
        severity: 'warning' as const,
        importance: 72,
      },
      set_piece_pressure: {
        minMinute: 15,
        minAwaySetPieceShots: 3,
        minAwaySetPieceGoals: 1,
        cooldownMinutes: 15,
        severity: 'warning' as const,
        importance: 70,
      },
      press_not_sticking: {
        minMinute: 25,
        minPressAttempts: 8,
        maxSuccessRate: 0.35,
        cooldownMinutes: 10,
        severity: 'info' as const,
        importance: 65,
      },
      midfield_overrun: {
        minMinute: 30,
        minAwayPossession: 58,
        minDuels: 8,
        minDuelsLostShare: 0.55,
        cooldownMinutes: 12,
        severity: 'warning' as const,
        importance: 74,
      },
      sterile_possession: {
        minMinute: 35,
        minHomePossession: 58,
        maxProgressivePasses: 8,
        cooldownMinutes: 10,
        severity: 'info' as const,
        importance: 65,
      },
      opponent_tactical_change: {
        minMinute: 1,
        cooldownMinutes: 8,
        severity: 'info' as const,
        importance: 68,
      },
    },
  },
  expiry: {
    liveAlertMinutes: 8,
    preMatchFixtureKey: 'fixture' as const,
    postMatchHours: 48,
  },
} as const;

export type LiveTriggerId = keyof typeof ASSISTANT_TUNING.live.triggers;
