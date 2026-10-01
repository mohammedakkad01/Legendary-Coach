/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * المدرب الأسطورة — The Legendary Coach
 * GAME TUNING — the ONE place for every tunable number of the squad /
 * tactics / (later) referee / VAR systems.
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
