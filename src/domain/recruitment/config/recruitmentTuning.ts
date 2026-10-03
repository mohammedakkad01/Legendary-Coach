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

  motivation: {
    weights: {
      playing_time: bounded(1.2, 0.5, 2),
      salary: bounded(0.9, 0.3, 1.5),
      bigger_club: bounded(1, 0.4, 1.6),
      champions_league: bounded(0.85, 0.3, 1.4),
      home_country: bounded(0.55, 0.2, 1),
      manager_relationship: bounded(1.05, 0.4, 1.6),
      career_development: bounded(1.1, 0.4, 1.7),
      club_ambition: bounded(0.75, 0.3, 1.3),
      contract: bounded(0.95, 0.4, 1.5),
    },
    playingTimeShortfallScale: bounded(0.95, 0.5, 1.2),
    salaryUnderpayScale: bounded(0.75, 0.3, 1),
    biggerClubGapScale: bounded(0.8, 0.3, 1.1),
    championsLeagueBase: bounded(28, 10, 45),
    championsLeagueSuitorBoost: bounded(18, 5, 35),
    homeCountrySuitorBoost: bounded(22, 8, 40),
    managerDissatisfactionScale: bounded(0.85, 0.4, 1.1),
    developmentDissatisfactionScale: bounded(0.9, 0.4, 1.2),
    clubAmbitionUpliftScale: bounded(0.7, 0.3, 1),
    contractDissatisfactionScale: bounded(0.8, 0.35, 1.1),
    shortContractBoost: bounded(15, 5, 30),
    rumorIntensityThreshold: bounded(45, 20, 70),
    rumorPlayingTimeBump: bounded(8, 2, 18),
    lowMoraleThreshold: bounded(42, 30, 55),
    lowMoraleDesireScale: bounded(0.35, 0.1, 0.6),
    frustrationScale: bounded(0.25, 0.05, 0.45),
    happinessDampScale: bounded(0.12, 0.02, 0.25),
    desireNoiseAmplitude: bounded(2.5, 0.5, 5),
    dominantMotiveThreshold: bounded(35, 20, 55),
    highDesireThreshold: bounded(62, 45, 80),
    lowDesireThreshold: bounded(28, 15, 40),
    preOfferInfluenceThreshold: bounded(48, 30, 65),
    preOfferReputationLiftScale: bounded(0.22, 0.05, 0.4),
    agentDesirePremiumSpan: bounded(0.18, 0.05, 0.3),
    agentOpeningAskGap: bounded(0.06, 0.02, 0.12),
    willingnessBands: {
      reluctant: bounded(25, 10, 40),
      open: bounded(45, 30, 60),
      keen: bounded(62, 45, 75),
      desperate: bounded(78, 60, 90),
    },
    archetypeBias: {
      ambitious: bounded(8, 0, 15),
      loyal: bounded(-10, -18, 0),
      temperamental: bounded(4, -2, 10),
      leader: bounded(-2, -8, 4),
      nervous: bounded(-4, -10, 2),
      professional: bounded(0, -5, 5),
    },
  },

  rumors: {
    maxPerWeek: bounded(8, 2, 20),
    maxStoredRumors: bounded(64, 16, 160),
    maxStoredInterests: bounded(48, 12, 120),
    dedupeCooldownWeeks: bounded(2, 1, 6),
    maxFabricatedPerWeek: bounded(2, 0, 5),
    reliableConfidenceThreshold: bounded(72, 55, 90),
    uncertainConfidenceThreshold: bounded(45, 25, 65),
    lowConfidenceTruthBecomesReliableChance: bounded(0.22, 0.05, 0.45),
    falseRumorReliabilityFalseRate: bounded(0.75, 0.5, 0.95),
  },

  loans: {
    maxDestinationsPerSearch: bounded(24, 8, 64),
    defaultMaxResults: bounded(8, 3, 20),
    minRecommendScore: bounded(42, 25, 65),
    minConfidencePct: bounded(28, 10, 45),
    strongPlayingTimeThreshold: bounded(65, 45, 85),
    strongFacilitiesThreshold: bounded(70, 50, 90),
    highPotentialThreshold: bounded(76, 65, 88),
    starterRoleBonus: bounded(12, 4, 22),
    youthPotentialBonus: bounded(8, 2, 16),
    uncertaintyPenaltyScale: bounded(0.22, 0.08, 0.4),
    defaultWageSplitPercent: bounded(50, 20, 80),
    defaultDurationWeeks: bounded(20, 8, 52),
    scoreWeights: {
      playingTime: bounded(0.32, 0.15, 0.5),
      leagueLevel: bounded(0.14, 0.05, 0.25),
      trainingFacilities: bounded(0.12, 0.05, 0.22),
      clubReputation: bounded(0.1, 0.04, 0.2),
      tacticalCompatibility: bounded(0.14, 0.06, 0.25),
      estimatedRating: bounded(0.12, 0.05, 0.22),
      starterRole: bounded(0.06, 0.02, 0.12),
    },
  },

  academy: {
    baseProspectsPerIntake: bounded(2, 1, 4),
    prospectsPerAcademyLevel: bounded(0.35, 0.1, 0.6),
    maxProspectsPerIntake: bounded(6, 2, 10),
    highInvestmentThreshold: bounded(65, 40, 85),
    highInvestmentProspectBonus: bounded(1, 0, 2),
    basePotential: bounded(68, 55, 78),
    potentialPerAcademyLevel: bounded(1.6, 0.8, 2.5),
    coachingPotentialBonus: bounded(6, 2, 12),
    reputationPotentialBonus: bounded(4, 1, 8),
    potentialNoise: bounded(8, 4, 14),
    minPotential: bounded(58, 45, 65),
    maxPotential: bounded(96, 88, 99),
    baseOverallGap: bounded(12, 8, 18),
    overallGapNoise: bounded(6, 2, 10),
    minOverall: bounded(45, 40, 52),
    minAge: bounded(16, 15, 17),
    maxAge: bounded(18, 17, 19),
    marketValueFactor: bounded(650, 400, 900),
    maxStoredIntakeRecords: bounded(32, 8, 80),
  },

  aiClubs: {
    maxClubsPerWeek: bounded(6, 2, 16),
    maxTargetsPerClub: bounded(4, 1, 10),
    maxCandidatesEvaluatedPerClub: bounded(12, 4, 32),
    uncertaintyPenaltyScale: bounded(0.35, 0.1, 0.6),
    minFitToRegisterInterest: bounded(42, 25, 60),
    loanPreferenceThreshold: bounded(0.55, 0.3, 0.85),
    sellPressureBudgetFloor: bounded(500_000, 0, 2_000_000),
    interestThresholds: {
      registerInterest: bounded(48, 30, 65),
      negotiate: bounded(62, 45, 78),
      bidImmediately: bounded(78, 60, 92),
    },
    willingnessBoost: {
      desperate: bounded(22, 10, 35),
      keen: bounded(14, 5, 25),
      open: bounded(6, 0, 15),
      reluctant: bounded(-8, -18, 0),
      refuse: bounded(-22, -35, -10),
    },
  },
} as const;

export type KnowledgeRevealStage = (typeof RECRUITMENT_TUNING.reveal.stageOrder)[number];

deepFreeze(RECRUITMENT_TUNING);
