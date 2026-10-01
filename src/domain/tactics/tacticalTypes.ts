/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Tactics domain types: the resolved TacticalState and the shape of a Best
 * Tactics recommendation (produced in Phase 4, typed here so every layer
 * shares one definition).
 */

import type { FootballFormation, FootballTactics } from '../../types/game';
import type { PositionSuitability } from '../squad/positionSuitability';

/** FootballTactics with every extended slider resolved (never undefined). */
export type TacticalState = Omit<
  FootballTactics,
  | 'defensiveLine' | 'defensiveIntensity' | 'attackingIntensity' | 'counterAttacking'
  | 'possessionFocus' | 'directPlay' | 'timeWasting' | 'tacticalStateVersion'
> & {
  readonly version: number;
  readonly defensiveLine: number;
  readonly defensiveIntensity: number;
  readonly attackingIntensity: number;
  readonly counterAttacking: number;
  readonly possessionFocus: number;
  readonly directPlay: number;
  readonly timeWasting: number;
};

/** Machine-readable reason; the UI localizes it (Phase 4). */
export interface RecommendationReason {
  readonly code: string;
  readonly params?: Readonly<Record<string, string | number>>;
}

export interface RecommendedPlacement {
  readonly slotIndex: number;
  readonly playerId: string;
  readonly assignedPosition: string;
  readonly suitability: PositionSuitability;
}

export interface TacticalRecommendation {
  readonly id: string;
  readonly formation: FootballFormation;
  /** Slot order, same convention as club.footballLineup. */
  readonly lineup: readonly RecommendedPlacement[];
  readonly tactics: TacticalState;
  /** Deterministic score used to rank candidates (0-100). */
  readonly score: number;
  readonly reasons: readonly RecommendationReason[];
}
