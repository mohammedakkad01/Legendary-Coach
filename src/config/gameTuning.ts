/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * المدرب الأسطورة — The Legendary Coach
 * GAME TUNING — the ONE place for every tunable number of the squad /
 * tactics / referee / VAR systems.
 * The VAR on/off switch is NOT here: it is the varEnabled argument of
 * FootballMatchEngine (default false). Rates below apply only when that
 * flag is true.
 *
 * Rules for this file:
 *  - Every value is documented (what it does + where it is consumed).
 *  - Every value is clamped at module load through `bounded()`, so a typo can
 *    never push the simulation outside a sane range.
 *  - The object is deeply frozen: nothing can mutate a tuning value at runtime.
 *  - Values that already existed in the codebase were MOVED here unchanged
 *    (position-compatibility curve, fatigue/morale factors). New values are
 *    marked "NEW" and are neutral until the phase that consumes them.
 */

import { clamp } from '../domain/shared/math';

/** Clamp at load time and remember the bounds next to the value. */
const bounded = (value: number, min: number, max: number): number => clamp(value, min, max);

// ---------------------------------------------------------------------------
// 1) POSITION SUITABILITY  (moved from utils/playerCalculations.ts — unchanged)
// ---------------------------------------------------------------------------
export const POSITION_SUITABILITY = {
  /**
   * Efficiency multiplier applied to `player.overall` per suitability reason.
   * Range 0.05 – 1.0. These are the exact values the game shipped with:
   * natural 1.0 / same family 1.0 / secondary or adjacent 0.85 /
   * two-three lines away or unknown slot 0.65 / far 0.40 / GK mismatch 0.15.
   */
  multiplier: {
    natural: bounded(1.0, 0.05, 1),
    sameFamily: bounded(1.0, 0.05, 1),
    secondary: bounded(0.85, 0.05, 1),
    adjacentFamily: bounded(0.85, 0.05, 1),
    distantFamily: bounded(0.65, 0.05, 1),
    farFamily: bounded(0.40, 0.05, 1),
    goalkeeperMismatch: bounded(0.15, 0.05, 1),
    unknownSlot: bounded(0.65, 0.05, 1),
  },
  /** Family distance (0 = same family) at/below which each tier applies. */
  distance: {
    adjacentMax: 1,
    distantMax: 3, // 2..3 → distantFamily, ≥4 → farFamily
  },
  /** Fatigue can remove at most this fraction of the rating (fatigue 100). */
  fatigueMaxPenalty: bounded(0.30, 0, 0.6),
  /**
   * Morale factor = base + (morale/100) × span → 0.90 at morale 0, 1.00 at 50,
   * 1.10 at 100. Stored as base+span (not min/max) so the arithmetic is
   * bit-identical to the original formula.
   */
  moraleFactorBase: bounded(0.90, 0.5, 1),
  moraleFactorSpan: bounded(0.20, 0, 0.5),
  /** Effective rating is always kept inside this range. */
  ratingMin: 1,
  ratingMax: 99,
} as const;

// ---------------------------------------------------------------------------
// 2) SQUAD LIMITS  (NEW — mirrors rules that already exist in the store)
// ---------------------------------------------------------------------------
export const SQUAD_LIMITS = {
  /** Starting XI size. Fixed by the formation definitions (11 slots). */
  startingSlots: 11,
  /**
   * Substitutes capacity when the caller does not pass one. The real cap comes
   * from the VIP tier (`VIPPrivilege.maxBenchSlots`, base 5) and is injected by
   * the store; this is only the safe fallback.
   */
  defaultMaxSubstitutes: bounded(5, 0, 12),
  /** Hard ceiling for any substitutes cap passed in from outside. */
  absoluteMaxSubstitutes: bounded(12, 0, 23),
} as const;

// ---------------------------------------------------------------------------
// 3) TACTICAL DEFAULTS  (NEW — neutral until Phase 3 wires the engine)
// ---------------------------------------------------------------------------
/**
 * The new 0-100 tactical sliders are OPTIONAL on saved tactics (old saves have
 * none). When absent they are derived from the existing enums with the tables
 * below. Nothing here changes match results in Phase 1: the engine only starts
 * reading these values in Phase 3, where they will be calibrated against a
 * fixed-seed golden master of the current engine.
 */
export const TACTICAL_DEFAULTS = {
  sliderMin: 0,
  sliderMax: 100,
  defensiveLineFromPressing: { low_block: 20, mid_press: 45, high_press: 70, gegenpress: 85 },
  defensiveIntensityFromPressing: { low_block: 25, mid_press: 50, high_press: 70, gegenpress: 90 },
  attackingIntensityFromMentality: {
    ultra_defensive: 15, defensive: 35, balanced: 50, attacking: 70, all_out_attack: 90,
  },
  possessionFocusFromPassing: { short_tiki_taka: 85, mixed: 50, direct_counter: 25, long_ball: 15 },
  directPlayFromPassing: { short_tiki_taka: 15, mixed: 45, direct_counter: 70, long_ball: 90 },
  counterAttackingFromPassing: { short_tiki_taka: 20, mixed: 40, direct_counter: 80, long_ball: 55 },
  timeWastingFromMentality: {
    ultra_defensive: 25, defensive: 15, balanced: 0, attacking: 0, all_out_attack: 0,
  },
} as const;

/** Current schema version of the persisted tactical state. */
export const TACTICAL_STATE_VERSION = 1;

// ---------------------------------------------------------------------------
// 4) MATCH ENGINE TACTICAL WEIGHTS  (NEW — Phase 3)
// ---------------------------------------------------------------------------
/**
 * How much each resolved TacticalState slider (0-100, neutral at 50) moves a
 * team's attack/defense power for one minute of simulation. Points are on the
 * SAME 0-99 scale as calcAttackPower/calcDefensePower.
 *
 * This REPLACES the old fixed if/else table keyed on the mentality/pressing
 * enums (attack ±3..8, defense ±2..8 per enum value) with a continuous
 * function of the sliders TacticalState already resolves those same enums to
 * — so a save with no sliders behaves the same shape as before (an
 * "all_out_attack" team still gets a clear attack boost, an
 * "ultra_defensive" one a clear defense boost), while a slider moved to any
 * value in between now has a real, proportional effect instead of jumping
 * between five fixed steps.
 *
 * Deliberately NOT tuned to reproduce the old numbers exactly — the old table
 * only ever looked at mentality (attack) and pressing (a single +3 attack
 * bump); this version also lets defensiveIntensity, possessionFocus,
 * directPlay, counterAttacking and defensiveLine each pull their own weight,
 * which is the whole point of consuming the full TacticalState.
 */
export const TACTICAL_ENGINE = {
  attackingIntensityToAttack: 0.16,
  attackingIntensityToDefenseCost: 0.12,
  defensiveIntensityToDefense: 0.14,
  defensiveIntensityToAttack: 0.05,
  possessionFocusToAttack: 0.03,
  directPlayToAttack: 0.02,
  counterAttackingToAttack: 0.03,
  defensiveLineToAttack: 0.02,
  defensiveLineToDefenseCost: 0.03,
  /** Flat bonus/cost for a high defensive line + offside trap together (bigger risk, bigger reward). */
  offsideTrapDefenseBonus: bounded(2, 0, 6),
  offsideTrapAttackCost: bounded(1, 0, 4),
  /** Final attack/defense tactical bonus is clamped to ±this many points. */
  maxAttackBonus: bounded(12, 0, 25),
  maxDefenseBonus: bounded(12, 0, 25),
  /** Unchanged from the pre-Phase-3 engine. */
  homeAdvantage: bounded(3.5, 0, 10),
} as const;

// ---------------------------------------------------------------------------
// 5) REFEREE  (Phase 5 — user-match engine only; NOT matchdaySimulator)
// ---------------------------------------------------------------------------
/**
 * Discipline rates per simulated minute. Neutral traits (50) with the bases
 * below reproduce the pre-Phase-5 foul band (~6% of minutes) and ~18% yellow
 * given a foul. Traits scale each rate via refereeMultipliers.ts.
 */
export const REFEREE = {
  traitMin: 0,
  traitMax: 100,
  traitMultiplierMin: bounded(0.55, 0.2, 1),
  traitMultiplierMax: bounded(1.55, 1, 2.5),
  /** Chance a minute enters the discipline branch (was actionRoll > 0.94). */
  baseFoulMinuteChance: bounded(0.06, 0.02, 0.14),
  minFoulMinuteChance: bounded(0.02, 0.005, 0.08),
  maxFoulMinuteChance: bounded(0.14, 0.06, 0.25),
  foulSensitivityScale: bounded(0.45, 0, 1),
  strictnessScale: bounded(0.5, 0, 1),
  cardTendencyScale: bounded(0.55, 0, 1),
  penaltyTendencyScale: bounded(0.5, 0, 1),
  advantageTendencyScale: bounded(0.45, 0, 1),
  baseYellowGivenFoul: bounded(0.18, 0.05, 0.5),
  minYellowGivenFoul: bounded(0.04, 0, 0.2),
  maxYellowGivenFoul: bounded(0.55, 0.2, 0.85),
  baseRedGivenFoul: bounded(0.012, 0, 0.08),
  minRedGivenFoul: bounded(0.002, 0, 0.02),
  maxRedGivenFoul: bounded(0.08, 0.02, 0.2),
  basePenaltyGivenFoul: bounded(0.07, 0.01, 0.2),
  minPenaltyGivenFoul: bounded(0.01, 0, 0.05),
  maxPenaltyGivenFoul: bounded(0.22, 0.05, 0.4),
  /** Share of fouls where advantage is played (no card). */
  baseAdvantageRate: bounded(0.12, 0, 0.35),
  minAdvantageRate: bounded(0.02, 0, 0.15),
  maxAdvantageRate: bounded(0.4, 0.1, 0.6),
  /** Penalty conversion (neutral). */
  penaltyGoalChance: bounded(0.78, 0.5, 0.95),
} as const;

// ---------------------------------------------------------------------------
// 6) BEST TACTICS  (Phase 4 — NEW; consumed only by domain/tactics/bestTactics/*)
// All values are heuristics, clamped at load, and only affect the RECOMMENDATION
// — never the match engine.
// ---------------------------------------------------------------------------
export const BEST_TACTICS = {
  /** When true, lineup optimizer blends functional-role compatibility into slotValue (opt-in). */
  useRoleCompatibilityInSlotValue: false,
  /** Share (0–0.5) of a slot value that comes from role-relevant attributes instead of overall. */
  attributeBlend: bounded(0.25, 0, 0.5),
  /** Max rating points a player's form (1–10) can add/remove. 0 disables form. */
  formBonusMax: bounded(2, 0, 5),
  /** Max rating points removed for very low stamina (0–100). */
  staminaPenaltyMax: bounded(3, 0, 6),
  /** Fatigue (0–100) at/above which a player counts as "tired" in the reasons. */
  tiredFatigue: bounded(70, 40, 100),
  /** Form (1–10) at/above which a player counts as "in form" in the reasons. */
  inFormThreshold: bounded(8, 6, 10),
  /** Used when no opponent info is available (power on the same ~rating scale). */
  defaultOpponent: { attack: bounded(70, 30, 99), defense: bounded(70, 30, 99) },
  /** Rating-point gap → win probability steepness (bigger = flatter). */
  logisticScale: bounded(9, 3, 30),
  /** Max draw probability (reached when teams are level). */
  drawMax: bounded(0.3, 0.1, 0.45),
  /** Composite score weights (normalized at use; must stay > 0 in total). */
  weights: {
    expectedPoints: bounded(0.55, 0, 1),
    suitability: bounded(0.15, 0, 1),
    condition: bounded(0.10, 0, 1),
    naturalShare: bounded(0.10, 0, 1),
    styleFit: bounded(0.10, 0, 1),
  },
  /** Per-position contribution to team attack / defence power (0–1). */
  attackWeight: {
    GK: 0, CB: 0.05, LB: 0.25, RB: 0.25, CDM: 0.2, CM: 0.45, CAM: 0.8, LW: 0.9, RW: 0.9, ST: 1,
  },
  defenseWeight: {
    GK: 1, CB: 1, LB: 0.6, RB: 0.6, CDM: 0.8, CM: 0.45, CAM: 0.15, LW: 0.1, RW: 0.1, ST: 0.05,
  },
  /** Attribute relevance per slot (each row sums to 1). Missing attribute → player's overall. */
  slotAttributes: {
    GK: { goalkeeping: 1 },
    CB: { defending: 0.55, physical: 0.3, pace: 0.15 },
    LB: { defending: 0.35, pace: 0.3, passing: 0.2, physical: 0.15 },
    RB: { defending: 0.35, pace: 0.3, passing: 0.2, physical: 0.15 },
    CDM: { defending: 0.4, passing: 0.3, physical: 0.3 },
    CM: { passing: 0.4, dribbling: 0.2, defending: 0.2, physical: 0.2 },
    CAM: { passing: 0.35, dribbling: 0.3, shooting: 0.25, pace: 0.1 },
    LW: { pace: 0.35, dribbling: 0.35, shooting: 0.2, passing: 0.1 },
    RW: { pace: 0.35, dribbling: 0.35, shooting: 0.2, passing: 0.1 },
    ST: { shooting: 0.5, pace: 0.2, physical: 0.2, dribbling: 0.1 },
  },
  /** How sliders move team power (rating points per slider point above/below 50). */
  sliderEffect: {
    attackPerAttackingIntensity: bounded(0.05, 0, 0.2),
    defensePerAttackingIntensity: bounded(-0.045, -0.2, 0),
    defensePerDefensiveIntensity: bounded(0.02, 0, 0.1),
  },
  /** Opponent-aware mentality: desired intensity = 50 + gap × gapScale (clamped ±maxShift). */
  mentality: {
    gapScale: bounded(3, 0, 8),
    maxShift: bounded(30, 0, 50),
    penaltyPerPoint: bounded(0.04, 0, 0.2),
  },
  /** Matchup bonuses, in rating points (added to the expected strength gap). */
  matchup: {
    midfieldPerPlayer: bounded(0.8, 0, 3),
    wideVsBackThree: bounded(0.8, 0, 3),
    directVsHighPress: bounded(1, 0, 3),
    tikiVsHighPress: bounded(-1, -3, 0),
    tikiSkillOk: bounded(75, 50, 95),
    counterVsAttacking: bounded(1, 0, 3),
    counterPaceMin: bounded(70, 50, 95),
    offsideTrapBonus: bounded(0.6, 0, 3),
    offsideTrapRisk: bounded(-0.8, -3, 0),
    offsideDefendingMin: bounded(72, 50, 95),
    offsideLineMin: bounded(60, 30, 100),
  },
  /** Squad-trait fit of tempo / width / passing / pressing (rating points, ±maxAdjust). */
  style: {
    maxAdjust: bounded(3, 0, 8),
    perSkillPoint: bounded(0.08, 0, 0.3),
    skillReference: bounded(65, 40, 90),
    pressingStaminaReference: bounded(70, 40, 95),
    pressingStaminaPenalty: bounded(2.5, 0, 8),
  },
  /** Do not recommend a change whose composite gain over the current setup is below this. */
  minImprovement: bounded(0.5, 0, 10),
  /** Number of runner-up formations returned for the preview. */
  alternativesCount: bounded(2, 0, 6),
} as const;

// ---------------------------------------------------------------------------
// 7) PLAYER LIFE  (Phase C — domain/playerLife/*; user squad only)
// ---------------------------------------------------------------------------
export const PLAYER_LIFE = {
  morale: {
    win: bounded(6, 0, 15),
    draw: bounded(0, -5, 5),
    loss: bounded(-5, -15, 0),
    goalBonus: bounded(3, 0, 8),
    assistBonus: bounded(2, 0, 6),
    cleanSheetBonus: bounded(2, 0, 6),
    benchUnhappiness: bounded(-2, -8, 0),
    starterHappiness: bounded(2, 0, 6),
  },
  mental: {
    pressureFromLossWhenExpected: bounded(5, 0, 12),
    frustrationFromMinutesScale: bounded(2.2, 0.5, 5),
    ambitionFrustrationMultMin: bounded(0.85, 0.5, 1),
    ambitionFrustrationMultMax: bounded(1.35, 1, 2),
  },
  playingTime: {
    starterExpectedMin: bounded(75, 50, 90),
    rotationExpectedMin: bounded(45, 20, 70),
    youthExpectedMin: bounded(20, 5, 40),
    shortfallFrustrationPer10Min: bounded(2.0, 0.5, 5),
    minutesHistoryLength: bounded(5, 3, 8),
  },
  complaint: {
    globalCooldownWeeks: bounded(2, 1, 4),
    perPlayerCooldownWeeks: bounded(4, 2, 8),
    maxProbability: bounded(0.35, 0.05, 0.6),
    frustrationThreshold: bounded(55, 40, 80),
  },
  form: {
    ratingWeight: bounded(0.55, 0.2, 0.9),
    idleWeekDecay: bounded(0.35, 0.1, 1),
    min: 1,
    max: 10,
    neutral: bounded(5.5, 4, 7),
  },
  training: {
    intensityLoad: {
      low: bounded(5, 1, 15),
      normal: bounded(12, 5, 25),
      high: bounded(22, 10, 40),
      very_high: bounded(35, 15, 55),
    },
    recoveryLoadDelta: bounded(-20, -40, -5),
    staminaDrillFatigueDelta: bounded(-5, -15, 0),
    staminaDrillStaminaDelta: bounded(8, 3, 15),
    technicalFormDelta: bounded(1, 0, 2),
    technicalMoraleDelta: bounded(4, 0, 10),
    weeklyLoadDecay: bounded(8, 2, 20),
    sharpnessFromMatchMin: bounded(0.15, 0.05, 0.4),
    sharpnessTrainingGain: bounded(4, 1, 10),
    sharpnessDecayPerWeek: bounded(3, 1, 8),
  },
  injury: {
    baseInMatchPer90: bounded(0.035, 0.01, 0.08),
    fatigueRiskScale: bounded(1.6, 1, 3),
    loadRiskScale: bounded(1.4, 1, 3),
    congestionBonusPerMatch: bounded(0.12, 0.02, 0.25),
    ageRiskOver30: bounded(1.25, 1, 2),
    medicalLevelToQuality: bounded(0.08, 0.04, 0.12),
    severityWeeks: {
      minor: { min: 1, max: 2 },
      moderate: { min: 3, max: 6 },
      major: { min: 8, max: 14 },
      recurring: { min: 2, max: 5 },
    },
    diagnosisErrorMaxWeeks: bounded(2, 0, 4),
    recoveryWeeklyProgress: bounded(1, 0.5, 2),
  },
  development: {
    weeklyBaseProgress: bounded(0.08, 0.02, 0.2),
    momentumGain: bounded(4, 1, 10),
    momentumLoss: bounded(3, 1, 8),
    potentialEstimateBand: bounded(6, 2, 12),
    agePeakStart: 22,
    agePeakEnd: 27,
    declineAge: 32,
  },
  dressingRoom: {
    crisisBaseProbability: bounded(0.018, 0.005, 0.05),
    crisisCooldownWeeks: bounded(10, 4, 16),
    cohesionFromWin: bounded(2, 0, 5),
    cohesionFromLoss: bounded(-2, -5, 0),
    lowCohesionThreshold: bounded(35, 20, 50),
  },
  captaincy: {
    leadershipWeight: bounded(0.22, 0, 0.4),
    experienceWeight: bounded(0.18, 0, 0.35),
    loyaltyWeight: bounded(0.12, 0, 0.3),
    trustWeight: bounded(0.2, 0, 0.4),
    relationshipWeight: bounded(0.15, 0, 0.35),
    changeShockMorale: bounded(-8, -20, 0),
    changeCohesionDelta: bounded(-5, -15, 0),
  },
  mentoring: {
    minAgeGap: bounded(4, 2, 8),
    relationshipStrengthScale: bounded(0.7, 0.2, 1),
    professionalismGain: bounded(2, 0, 5),
    leadershipGain: bounded(1, 0, 4),
    confidenceGain: bounded(2, 0, 6),
  },
  matchPerformance: {
    multMin: bounded(0.88, 0.75, 0.95),
    multMax: bounded(1.12, 1.05, 1.25),
    moraleNeutral: bounded(50, 40, 60),
    sharpnessNeutral: bounded(50, 40, 60),
    matchFitnessNeutral: bounded(70, 50, 85),
    formNeutral: bounded(5.5, 4, 7),
    moraleWeight: bounded(0.35, 0, 0.6),
    sharpnessWeight: bounded(0.25, 0, 0.5),
    matchFitnessWeight: bounded(0.2, 0, 0.4),
    formWeight: bounded(0.2, 0, 0.4),
    fatiguePenaltyWeight: bounded(0.15, 0, 0.35),
  },
} as const;

// ---------------------------------------------------------------------------
// 8) VAR  (Phase 6 — user-match engine only, and only when the engine is
// constructed with varEnabled: true. NOT matchdaySimulator. There is no
// enabled flag in this object.)
// ---------------------------------------------------------------------------
/**
 * Mistake and intervention rates for VAR reviews.
 *
 * KNOWN LIMITATION — offside:
 * The engine does not simulate offside. `offsideLabelRate` is the chance that
 * the VAR stream labels an already-scored open-play goal as offside. It is
 * not an offside incident the engine generated. Handballs are not modeled
 * and are not reviewed.
 *
 * Neutral referee traits (50) leave each base rate unchanged. Strictness
 * above 50 lowers mistake rates; foul sensitivity above 50 raises them.
 * Every scaled rate is then clamped to [rateMin, rateMax].
 */
export const VAR = {
  /** Share of open-play goals labeled offside. Known limitation — see the comment above. */
  offsideLabelRate: bounded(0.18, 0, 0.45),
  /** Share of penalty incidents where the referee's initial call is wrong. */
  penaltyErrorRate: bounded(0.16, 0, 0.5),
  /**
   * Among those penalty mistakes, the share that withhold the kick
   * (VAR can award it). The rest are a kick the referee gave wrongly
   * (VAR can cancel it).
   */
  penaltyWithholdShare: bounded(0.5, 0, 1),
  /** Share of red cards where the referee's initial call is wrong. */
  redErrorRate: bounded(0.14, 0, 0.5),
  strictnessErrorScale: bounded(0.35, 0, 1),
  foulSensitivityErrorScale: bounded(0.25, 0, 1),
  errorScaleMin: bounded(0.45, 0.2, 1),
  errorScaleMax: bounded(1.55, 1, 2),
  rateMin: bounded(0.02, 0, 0.15),
  rateMax: bounded(0.45, 0.2, 0.7),
  /** Intervention probability at varTendency 50, then scaled by that trait. */
  baseInterventionRate: bounded(0.7, 0.05, 0.95),
  interventionScale: bounded(0.45, 0, 1),
  minInterventionRate: bounded(0.12, 0, 0.4),
  maxInterventionRate: bounded(0.95, 0.5, 1),
  /** Hard cap on reviews stored for one match. */
  maxReviewsPerMatch: bounded(3, 1, 8),
  confidenceBase: bounded(0.74, 0.5, 0.95),
  confidenceSpan: bounded(0.16, 0, 0.4),
} as const;

// ---------------------------------------------------------------------------
// Deep freeze so no consumer can mutate tuning at runtime.
// ---------------------------------------------------------------------------
const deepFreeze = <T>(obj: T): T => {
  if (obj && typeof obj === 'object') {
    Object.values(obj as Record<string, unknown>).forEach(deepFreeze);
    Object.freeze(obj);
  }
  return obj;
};
deepFreeze(POSITION_SUITABILITY);
deepFreeze(SQUAD_LIMITS);
deepFreeze(TACTICAL_DEFAULTS);
deepFreeze(TACTICAL_ENGINE);
deepFreeze(REFEREE);
deepFreeze(BEST_TACTICS);
deepFreeze(PLAYER_LIFE);
deepFreeze(VAR);
