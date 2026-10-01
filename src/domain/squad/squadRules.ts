/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * SquadRules — the validation half of the squad domain.
 *
 * `validateSquadState` returns every violated rule as typed data. `moveEntity`
 * uses it to refuse any move that would INTRODUCE a violation; the future
 * kickoff check uses `validateForKickoff` (which additionally demands a full
 * XI with exactly one goalkeeper).
 *
 * Pure: no React, no Firebase, no store.
 */

import { SQUAD_LIMITS } from '../../config/gameTuning';
import { clamp } from '../shared/math';
import { getFormation, isFootballFormation } from './formations';
import { EMPTY_SLOT } from './squadTypes';
import type { SquadRules, SquadState, SquadViolation } from './squadTypes';

export function createSquadRules(maxSubstitutes: number = SQUAD_LIMITS.defaultMaxSubstitutes): SquadRules {
  return {
    maxStarters: SQUAD_LIMITS.startingSlots,
    maxSubstitutes: Math.floor(clamp(maxSubstitutes, 0, SQUAD_LIMITS.absoluteMaxSubstitutes)),
  };
}

export interface ValidateOptions {
  /**
   * true  → the XI must be full with exactly one goalkeeper (kickoff check).
   * false → holes are allowed while editing; the goalkeeper rules only apply
   *         once the XI is complete.
   */
  readonly requireCompleteXI: boolean;
}

export function validateSquadState(
  state: SquadState,
  options: ValidateOptions = { requireCompleteXI: false },
): SquadViolation[] {
  const violations: SquadViolation[] = [];

  if (!isFootballFormation(state.formation)) {
    violations.push({ code: 'INVALID_FORMATION', formation: String(state.formation) });
    return violations; // slot definitions unknown → nothing else can be checked
  }
  const formation = getFormation(state.formation);

  if (state.slots.length !== formation.slots.length) {
    violations.push({ code: 'INVALID_SLOT_COUNT', expected: formation.slots.length, actual: state.slots.length });
  }

  const filled = state.slots.filter((id) => id !== EMPTY_SLOT);
  if (filled.length > state.rules.maxStarters) {
    violations.push({ code: 'TOO_MANY_STARTERS', count: filled.length, max: state.rules.maxStarters });
  }
  if (state.substitutes.length > state.rules.maxSubstitutes) {
    violations.push({ code: 'TOO_MANY_SUBSTITUTES', count: state.substitutes.length, max: state.rules.maxSubstitutes });
  }

  // A player must exist, and appear exactly once across XI + substitutes.
  const seen = new Set<string>();
  const reportedDuplicates = new Set<string>();
  for (const id of [...filled, ...state.substitutes]) {
    if (!state.players.has(id)) {
      violations.push({ code: 'UNKNOWN_PLAYER', playerId: id });
    }
    if (seen.has(id) && !reportedDuplicates.has(id)) {
      reportedDuplicates.add(id);
      violations.push({ code: 'DUPLICATE_PLAYER', playerId: id });
    }
    seen.add(id);
  }

  // Goalkeeper rules.
  let goalkeepers = 0;
  state.slots.forEach((id, slotIndex) => {
    if (id === EMPTY_SLOT) return;
    const player = state.players.get(id);
    if (!player || player.position !== 'GK') return;
    goalkeepers += 1;
    if (formation.slots[slotIndex]?.core !== 'GK') {
      violations.push({ code: 'GOALKEEPER_OUTSIDE_GK_SLOT', playerId: id, slotIndex });
    }
  });

  const xiComplete = filled.length === formation.slots.length;
  if (options.requireCompleteXI && !xiComplete) {
    violations.push({ code: 'INCOMPLETE_XI', filled: filled.length, expected: formation.slots.length });
  }
  if (goalkeepers > 1) {
    violations.push({ code: 'MULTIPLE_GOALKEEPERS_IN_XI', count: goalkeepers });
  }
  if (goalkeepers === 0 && (xiComplete || options.requireCompleteXI)) {
    violations.push({ code: 'NO_GOALKEEPER_IN_XI' });
  }

  return violations;
}

/** Strict check used right before kickoff (wired into the match flow in Phase 3). */
export const validateForKickoff = (state: SquadState): SquadViolation[] =>
  validateSquadState(state, { requireCompleteXI: true });

/** Stable identity of a violation, so "new vs already existing" can be compared. */
export function violationKey(v: SquadViolation): string {
  switch (v.code) {
    case 'UNKNOWN_PLAYER':
    case 'DUPLICATE_PLAYER':
    case 'GOALKEEPER_OUTSIDE_GK_SLOT':
      return `${v.code}:${v.playerId}`;
    default:
      return v.code;
  }
}
