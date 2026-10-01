/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Position taxonomy — the ONE definition of how positions relate to each other.
 *
 * Previously five files each kept their own copy of "which group is CDM in":
 * matchPrediction.groupOf, matchdaySimulator.positionGroup, teamSynergy.familyOf,
 * playerCalculations.FAMILY_OF and the isDefender/isMidfielder/isAttacker
 * helpers of tacticalMatchEngine. They all delegate here now.
 *
 * Pure: no React, no Firebase, no store.
 */

import type { PlayerPosition } from '../../types/game';

/** Coarse line of play used for attack/defense weighting. */
export type PositionGroup = 'GK' | 'DEF' | 'MID' | 'ATT';

/** Finer "family" used for position-compatibility distance. */
export type PositionFamily =
  | 'GK' | 'DEF_CENTRAL' | 'DEF_WIDE' | 'MID_DEF' | 'MID_CENTRAL' | 'MID_ATT' | 'WIDE_ATT' | 'ST';

/** null = not a football position (basketball). */
export const FAMILY_OF: Record<PlayerPosition, PositionFamily | null> = {
  GK: 'GK',
  CB: 'DEF_CENTRAL',
  LB: 'DEF_WIDE', RB: 'DEF_WIDE',
  CDM: 'MID_DEF',
  CM: 'MID_CENTRAL',
  CAM: 'MID_ATT',
  LW: 'WIDE_ATT', RW: 'WIDE_ATT',
  ST: 'ST',
  PG: null, SG: null, SF: null, PF: null, C: null,
};

/** Families ordered on the pitch from own goal to opposition goal. */
export const FAMILY_ORDER: readonly PositionFamily[] = [
  'GK', 'DEF_CENTRAL', 'DEF_WIDE', 'MID_DEF', 'MID_CENTRAL', 'MID_ATT', 'WIDE_ATT', 'ST',
];

/**
 * Tactical-board slot labels are wider than PlayerPosition (they include
 * LWB/RWB/LM/RM/LAM/RAM). Each maps to its closest official position.
 */
const SLOT_ALIASES: Readonly<Record<string, PlayerPosition>> = {
  LWB: 'LB', RWB: 'RB',
  LM: 'LW', RM: 'RW',
  LAM: 'CAM', RAM: 'CAM',
};

/** Slot label → official position, or null when the label is unknown. */
export function normalizeSlot(assignedPosition: string): PlayerPosition | null {
  const upper = assignedPosition.toUpperCase();
  if (upper in FAMILY_OF) return upper as PlayerPosition;
  return SLOT_ALIASES[upper] ?? null;
}

/** Coarse group of a FOOTBALL position; null for basketball positions. */
export function positionGroupOf(pos: PlayerPosition): PositionGroup | null {
  switch (pos) {
    case 'GK': return 'GK';
    case 'CB': case 'LB': case 'RB': return 'DEF';
    case 'CDM': case 'CM': case 'CAM': return 'MID';
    case 'LW': case 'RW': case 'ST': return 'ATT';
    default: return null;
  }
}

export const isGoalkeeper = (pos: PlayerPosition): boolean => pos === 'GK';
