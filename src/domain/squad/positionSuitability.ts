/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Centralized position suitability.
 *
 * ONE function decides how well a player fits a formation slot. The badges,
 * the wrong-position warning, the tactical-board rating, the squad rules
 * (best-fit swaps), the match engine (Phase 3) and Best Tactics (Phase 4) all
 * call it, so every part of the game agrees.
 *
 * The numbers are the game's original position-compatibility curve, moved
 * unchanged into config/gameTuning.ts — this file only adds the 5-level
 * classification and the reason breakdown on top of them.
 *
 * Pure: no React, no Firebase, no store. Returns codes, never UI strings.
 */

import type { Player, PlayerPosition } from '../../types/game';
import { POSITION_SUITABILITY as T } from '../../config/gameTuning';
import { clamp } from '../shared/math';
import { FAMILY_OF, FAMILY_ORDER, normalizeSlot } from './positionTaxonomy';

export type SuitabilityLevel = 'natural' | 'very_suitable' | 'suitable' | 'acceptable' | 'poor';

/** Why the level was chosen — the UI localizes these codes. */
export type SuitabilityReasonCode =
  | 'natural_position'
  | 'same_position_family'      // e.g. LB at RB, LW at RW
  | 'secondary_position'        // listed in player.secondaryPositions
  | 'adjacent_position_family'  // one line away, e.g. CM at CAM
  | 'distant_position_family'   // two–three lines away
  | 'far_position_family'       // four+ lines away, e.g. CB at ST
  | 'goalkeeper_mismatch'       // goalkeeper in the field or vice versa
  | 'unknown_slot';             // label not part of the position taxonomy

export type SuitabilityPlayer = Pick<Player, 'position' | 'overall'> &
  Partial<Pick<Player, 'secondaryPositions' | 'fatigue' | 'morale'>>;

export interface PositionSuitability {
  readonly level: SuitabilityLevel;
  /** Efficiency multiplier (0.05–1) applied to overall. */
  readonly multiplier: number;
  readonly reason: SuitabilityReasonCode;
  readonly naturalPosition: PlayerPosition;
  /** The slot label exactly as given (may be LWB/RM/…). */
  readonly assignedPosition: string;
  /** The slot normalized to an official position, or null if unknown. */
  readonly assignedCore: PlayerPosition | null;
  /** Family-line distance, null when not applicable (GK / unknown / natural). */
  readonly familyDistance: number | null;
}

export interface EffectiveRatingBreakdown {
  readonly suitability: PositionSuitability;
  readonly baseOverall: number;
  readonly positionMultiplier: number;
  readonly fatigueFactor: number;
  readonly moraleFactor: number;
  /** Final rating, rounded and clamped to [ratingMin, ratingMax]. */
  readonly effective: number;
  /** effective − baseOverall (≤ 0 in practice, > 0 only for morale > ~50). */
  readonly delta: number;
}

const make = (
  player: SuitabilityPlayer,
  assignedPosition: string,
  assignedCore: PlayerPosition | null,
  level: SuitabilityLevel,
  multiplier: number,
  reason: SuitabilityReasonCode,
  familyDistance: number | null = null,
): PositionSuitability => ({
  level,
  multiplier,
  reason,
  naturalPosition: player.position,
  assignedPosition,
  assignedCore,
  familyDistance,
});

/** How well `player` fits the slot labelled `assignedPosition`. */
export function evaluatePositionSuitability(
  player: SuitabilityPlayer,
  assignedPosition: string,
): PositionSuitability {
  const core = normalizeSlot(assignedPosition);
  const natural = player.position;

  if (!core) {
    return make(player, assignedPosition, null, 'acceptable', T.multiplier.unknownSlot, 'unknown_slot');
  }
  if (core === natural) {
    return make(player, assignedPosition, core, 'natural', T.multiplier.natural, 'natural_position', 0);
  }
  // Goalkeeper in the field, or an outfielder in goal: worst case regardless of anything else.
  if (natural === 'GK' || core === 'GK') {
    return make(player, assignedPosition, core, 'poor', T.multiplier.goalkeeperMismatch, 'goalkeeper_mismatch');
  }
  if ((player.secondaryPositions ?? []).includes(core)) {
    return make(player, assignedPosition, core, 'very_suitable', T.multiplier.secondary, 'secondary_position');
  }

  const naturalFamily = FAMILY_OF[natural];
  const assignedFamily = FAMILY_OF[core];
  if (!naturalFamily || !assignedFamily) {
    return make(player, assignedPosition, core, 'acceptable', T.multiplier.unknownSlot, 'unknown_slot');
  }

  const distance = Math.abs(FAMILY_ORDER.indexOf(naturalFamily) - FAMILY_ORDER.indexOf(assignedFamily));
  if (distance === 0) {
    return make(player, assignedPosition, core, 'very_suitable', T.multiplier.sameFamily, 'same_position_family', 0);
  }
  if (distance <= T.distance.adjacentMax) {
    return make(player, assignedPosition, core, 'suitable', T.multiplier.adjacentFamily, 'adjacent_position_family', distance);
  }
  if (distance <= T.distance.distantMax) {
    return make(player, assignedPosition, core, 'acceptable', T.multiplier.distantFamily, 'distant_position_family', distance);
  }
  return make(player, assignedPosition, core, 'poor', T.multiplier.farFamily, 'far_position_family', distance);
}

/**
 * Rating of the player in that slot, with the full breakdown the UI needs
 * ("why is he a 71 here?"). Formula is unchanged from the original
 * getEffectivePlayerRating: overall × position × fatigue × morale.
 */
export function computeEffectiveRating(
  player: SuitabilityPlayer,
  assignedPosition: string,
): EffectiveRatingBreakdown {
  const suitability = evaluatePositionSuitability(player, assignedPosition);
  const fatigue = clamp(player.fatigue ?? 0, 0, 100);
  const morale = clamp(player.morale ?? 50, 0, 100);

  const fatigueFactor = 1 - (fatigue / 100) * T.fatigueMaxPenalty;
  const moraleFactor = T.moraleFactorBase + (morale / 100) * T.moraleFactorSpan;

  const raw = player.overall * suitability.multiplier * fatigueFactor * moraleFactor;
  const effective = clamp(Math.round(raw), T.ratingMin, T.ratingMax);

  return {
    suitability,
    baseOverall: player.overall,
    positionMultiplier: suitability.multiplier,
    fatigueFactor,
    moraleFactor,
    effective,
    delta: effective - player.overall,
  };
}

/** Rank used to compare levels (higher = better fit). */
export const SUITABILITY_RANK: Readonly<Record<SuitabilityLevel, number>> = {
  natural: 4, very_suitable: 3, suitable: 2, acceptable: 1, poor: 0,
};

/**
 * Whether the UI should show the small wrong-position icon.
 * Natural and "very suitable" (same family / declared secondary) stay quiet.
 */
export const isOutOfPosition = (level: SuitabilityLevel): boolean =>
  SUITABILITY_RANK[level] < SUITABILITY_RANK.very_suitable;
