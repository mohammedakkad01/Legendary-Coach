/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Best Tactics (Phase 4) — input/output contracts. Pure domain: no React,
 * no store, no Firebase.
 */

import type { FootballFormation, FootballTactics, MatchMentality, Player, PressingStyle } from '../../../types/game';
import type { PositionSuitability } from '../../squad/positionSuitability';
import type { RecommendationReason, RecommendedPlacement, TacticalRecommendation } from '../tacticalTypes';

/** The subset of Player the optimizer reads (real Player objects satisfy it). */
export type BestTacticsPlayer = Pick<
  Player,
  'id' | 'position' | 'overall' | 'secondaryPositions' | 'fatigue' | 'morale' | 'form' | 'stamina' | 'attributes' | 'injuredWeeks' | 'suspendedMatches'
>;

/** What we know about the next opponent. Every field is optional. */
export interface OpponentProfile {
  /** Attack / defence power on the rating scale (~40–99). */
  readonly attack?: number;
  readonly defense?: number;
  readonly formation?: FootballFormation;
  readonly mentality?: MatchMentality;
  readonly pressing?: PressingStyle;
}

export interface BestTacticsInput {
  readonly squad: readonly BestTacticsPlayer[];
  /** Current XI in slot order (for the "what changes" comparison). May be partial/invalid. */
  readonly currentLineup: readonly string[];
  readonly currentTactics: FootballTactics;
  readonly opponent?: OpponentProfile;
  /** VIP-tiered substitutes cap, injected by the caller. */
  readonly maxSubstitutes: number;
}

export type UnavailableReason = 'injured' | 'suspended';

export interface ExcludedPlayer {
  readonly playerId: string;
  readonly reason: UnavailableReason;
}

export interface FormationAlternative {
  readonly formation: FootballFormation;
  readonly score: number;
  readonly expectedPoints: number;
}

export interface BestTacticsRecommendation extends TacticalRecommendation {
  /** Substitutes (never includes anyone in `lineup` or any unavailable player). */
  readonly substitutes: readonly string[];
  readonly expectedPoints: number;
  /** Composite score of the CURRENT setup under the same model; null if it can't be scored. */
  readonly currentScore: number | null;
  /** True when the current setup is already within `minImprovement` of the best. */
  readonly alreadyOptimal: boolean;
  readonly alternatives: readonly FormationAlternative[];
  readonly excluded: readonly ExcludedPlayer[];
}

export type BestTacticsError =
  | { readonly code: 'NOT_ENOUGH_AVAILABLE_PLAYERS'; readonly available: number; readonly required: number }
  | { readonly code: 'INTERNAL_ERROR'; readonly message: string };

export type { PositionSuitability, RecommendationReason, RecommendedPlacement };
