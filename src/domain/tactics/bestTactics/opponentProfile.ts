/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Next-opponent adapter for Best Tactics. Uses the SAME power functions as the
 * pre-match odds (useGameStore.buildPreMatchData) and the live engine's base
 * power: calcAttackPower / calcDefensePower over buildSlotAssignments of the
 * opponent's real XI, plus the opponent club's own footballTactics.
 */

import type { Club } from '../../../types/game';
import { buildSlotAssignments, calcAttackPower, calcDefensePower } from '../../../engine/matchPrediction';
import { isFootballFormation } from '../../squad/formations';
import type { OpponentProfile } from './types';

/** `undefined` when there is no next opponent (the recommender then uses BEST_TACTICS.defaultOpponent). */
export function deriveOpponentProfile(opponent: Club | null | undefined): OpponentProfile | undefined {
  if (!opponent || !Array.isArray(opponent.footballSquad) || opponent.footballSquad.length === 0) return undefined;
  const tactics = opponent.footballTactics;
  if (!tactics || !isFootballFormation(tactics.formation)) return undefined;

  const xi = buildSlotAssignments(opponent);
  if (xi.length === 0) return undefined;

  return {
    attack: calcAttackPower(xi),
    defense: calcDefensePower(xi),
    formation: tactics.formation,
    mentality: tactics.mentality,
    pressing: tactics.pressing,
  };
}
