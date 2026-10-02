/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phase D — recruitment tuning (single config source).
 */

import { clamp } from '../../shared/math';

const bounded = (value: number, min: number, max: number): number => clamp(value, min, max);

function deepFreeze<T extends object>(obj: T): T {
  Object.freeze(obj);
  for (const v of Object.values(obj)) {
    if (v && typeof v === 'object' && !Object.isFrozen(v)) deepFreeze(v as object);
  }
  return obj;
}

export const RECRUITMENT_TUNING = {
  schemaVersion: 1 as const,

  knowledge: {
    baseConfidenceExternal: bounded(18, 5, 40),
    baseConfidenceOwnSquad: bounded(92, 80, 100),
    maxConfidence: bounded(98, 90, 100),
    /** Overall rating range half-width at 0% confidence (±). */
    ratingHalfWidthAtZero: bounded(14, 8, 22),
    /** Overall rating range half-width at 100% confidence (±). */
    ratingHalfWidthAtMax: bounded(2, 1, 4),
    potentialBandHalfWidthAtZero: bounded(12, 6, 18),
    potentialBandHalfWidthAtMax: bounded(3, 1, 6),
    valueRangeSpreadAtZero: bounded(0.45, 0.2, 0.6),
    valueRangeSpreadAtMax: bounded(0.08, 0.03, 0.15),
    /** Scout report noise scale at low vs high confidence (multiplier on error draw). */
    errorScaleAtLowConfidence: bounded(1.35, 1, 2),
    errorScaleAtHighConfidence: bounded(0.35, 0.1, 0.6),
  },

  reveal: {
    stageOrder: [
      'technical',
      'physical',
      'mental',
      'strengths_weaknesses',
      'adaptability',
      'personality',
      'injury_concerns',
    ] as const,
    minConfidencePerStage: {
      technical: bounded(0, 0, 10),
      physical: bounded(22, 10, 35),
      mental: bounded(38, 25, 50),
      strengths_weaknesses: bounded(52, 40, 65),
      adaptability: bounded(62, 50, 75),
      personality: bounded(72, 60, 85),
      injury_concerns: bounded(82, 70, 92),
    },
  },

  transferWindow: {
    /** Inclusive game-week indices within a 52-week calendar (domain-only; calendar hook later). */
    summerOpenWeekStart: bounded(22, 1, 52),
    summerOpenWeekEnd: bounded(30, 1, 52),
    winterOpenWeekStart: bounded(48, 1, 52),
    winterOpenWeekEnd: bounded(52, 1, 52),
  },

  migration: {
    defaultGameWeek: bounded(1, 0, 52),
  },

  scouting: {
    maxActiveAssignmentsPerClub: bounded(6, 1, 12),
    maxStoredReports: bounded(48, 12, 120),
    confidencePerReport: bounded(9, 3, 18),
    confidencePerMatchWatched: bounded(4, 1, 10),
    matchesWatchedCapPerAssignment: bounded(5, 1, 10),
    /** League/region assignments use a generic data-availability prior (Phase E replaces). */
    dataAvailabilityPrior: bounded(55, 30, 80),
    reportOverallErrorMax: bounded(9, 4, 15),
    poorScoutReliabilityThreshold: bounded(42, 25, 55),
  },

  negotiation: {
    maxRoundsDefault: bounded(4, 2, 8),
    maxSellOnPercent: bounded(50, 10, 75),
    minCounterIncrement: bounded(5000, 1000, 25000),
    insultGap: bounded(0.28, 0.15, 0.4),
    temperamentalRejectChance: bounded(0.18, 0.05, 0.35),
    minTransferDesireToLeave: bounded(35, 20, 55),
    allowLoanWhenWindowClosed: false as boolean,
    maxSquadSizeDefault: bounded(30, 22, 40),
    minAcceptRatio: {
      leader: bounded(1.08, 1, 1.2),
      ambitious: bounded(1.03, 1, 1.15),
      temperamental: bounded(0.98, 0.9, 1.05),
      professional: bounded(0.95, 0.88, 1.02),
      loyal: bounded(0.9, 0.82, 0.98),
      nervous: bounded(0.88, 0.8, 0.96),
    },
  },
} as const;

export type KnowledgeRevealStage = (typeof RECRUITMENT_TUNING.reveal.stageOrder)[number];

deepFreeze(RECRUITMENT_TUNING);
