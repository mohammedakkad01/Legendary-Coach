/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Squad domain types.
 *
 * Sections (agreed in the Phase 0 review):
 *  - "starting"    = club.footballLineup    (11 slots, index = formation slot)
 *  - "substitutes" = club.footballBench     (capped by the VIP tier)
 *  - "bench"       = everyone else in club.footballSquad — DERIVED, never stored
 *
 * An empty starting slot is the empty string (EMPTY_SLOT). The game already
 * produces short/holey lineups (selling a starter), so the domain models holes
 * explicitly instead of pretending the XI is always full.
 */

import type { FootballFormation, Player } from '../../types/game';
import type { PositionSuitability } from './positionSuitability';

export const EMPTY_SLOT = '';

export type SquadSection = 'starting' | 'substitutes' | 'bench';

export type SquadLocation =
  | { readonly section: 'starting'; readonly slotIndex: number }
  | { readonly section: 'substitutes'; readonly index: number }
  | { readonly section: 'bench' };

/** Where the user wants the player to go. */
export type MoveTarget =
  | { readonly section: 'starting'; readonly slotIndex: number }
  /** `index` omitted = "the substitutes section" (append, or swap if full). */
  | { readonly section: 'substitutes'; readonly index?: number }
  | { readonly section: 'bench' };

/** The subset of Player the squad rules need (keeps the domain light + testable). */
export type SquadPlayerRef = Pick<Player, 'id' | 'position' | 'overall'> &
  Partial<Pick<Player, 'secondaryPositions' | 'fatigue' | 'morale'>>;

export interface SquadRules {
  /** Fixed by the formation (11). */
  readonly maxStarters: number;
  /** From the VIP tier; injected by the store. */
  readonly maxSubstitutes: number;
}

/** Immutable snapshot the pure functions work on. Never persisted. */
export interface SquadState {
  readonly formation: FootballFormation;
  /** Length = formation slots. `slots[i]` stands in `formation.slots[i]`. */
  readonly slots: readonly string[];
  readonly substitutes: readonly string[];
  /** Every registered player (starting + substitutes + bench). */
  readonly players: ReadonlyMap<string, SquadPlayerRef>;
  readonly rules: SquadRules;
}

/** One player's placement, with the suitability when he is a starter. */
export interface PlayerAssignment {
  readonly playerId: string;
  readonly section: SquadSection;
  readonly slotIndex: number | null;
  readonly substituteIndex: number | null;
  /** Slot label he plays (starters only). */
  readonly assignedPosition: string | null;
  readonly suitability: PositionSuitability | null;
}

// ---- violations & errors ---------------------------------------------------

export type SquadViolation =
  | { readonly code: 'INVALID_FORMATION'; readonly formation: string }
  | { readonly code: 'INVALID_SLOT_COUNT'; readonly expected: number; readonly actual: number }
  | { readonly code: 'TOO_MANY_STARTERS'; readonly count: number; readonly max: number }
  | { readonly code: 'UNKNOWN_PLAYER'; readonly playerId: string }
  | { readonly code: 'DUPLICATE_PLAYER'; readonly playerId: string }
  | { readonly code: 'TOO_MANY_SUBSTITUTES'; readonly count: number; readonly max: number }
  | { readonly code: 'MULTIPLE_GOALKEEPERS_IN_XI'; readonly count: number }
  | { readonly code: 'GOALKEEPER_OUTSIDE_GK_SLOT'; readonly playerId: string; readonly slotIndex: number }
  | { readonly code: 'NO_GOALKEEPER_IN_XI' }
  | { readonly code: 'INCOMPLETE_XI'; readonly filled: number; readonly expected: number };

export type MoveError =
  | { readonly code: 'PLAYER_NOT_IN_SQUAD'; readonly playerId: string }
  | { readonly code: 'INVALID_FORMATION'; readonly formation: string }
  | { readonly code: 'INVALID_SLOT_INDEX'; readonly slotIndex: number }
  | { readonly code: 'INVALID_SUBSTITUTE_INDEX'; readonly index: number }
  | { readonly code: 'SUBSTITUTES_UNAVAILABLE' }
  | { readonly code: 'RULE_VIOLATION'; readonly violations: readonly SquadViolation[] };

export type MoveKind = 'moved' | 'swapped' | 'reordered' | 'noop';

/** A card's own SquadLocation is always a valid drop target for something else (used by the UI's tap-tap fallback: tapping a second card drops the picked player onto it). */
export function locationToTarget(location: SquadLocation): MoveTarget {
  switch (location.section) {
    case 'starting':
      return { section: 'starting', slotIndex: location.slotIndex };
    case 'substitutes':
      return { section: 'substitutes', index: location.index };
    case 'bench':
      return { section: 'bench' };
  }
}

export interface MoveOutcome {
  readonly state: SquadState;
  readonly kind: MoveKind;
  readonly playerId: string;
  /** The other player who changed place (swap / full-section displacement). */
  readonly displacedPlayerId: string | null;
  readonly from: SquadLocation;
  readonly to: SquadLocation;
}
