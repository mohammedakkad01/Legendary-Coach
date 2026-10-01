/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * moveEntity(state, playerId, target) — the ONLY way squad placement changes.
 *
 * Atomic: returns a brand-new SquadState or a typed error; the input is never
 * touched. Supports every direction (XI ↔ substitutes ↔ bench) and moves
 * inside a section.
 *
 * Swap semantics
 *  - Target slot / substitute index occupied  → the two players swap places.
 *  - Target section is the substitutes and it is full, no index given → the
 *    incoming player swaps with a deterministic "intuitive" partner:
 *      • coming from the XI:   the substitute who best fits the vacated slot
 *                              (suitability rank, then overall, then position);
 *      • coming from the bench: the lowest-overall substitute (ties → last),
 *                              never the only backup goalkeeper unless a
 *                              goalkeeper is the one coming in.
 *  - Target is the bench (derived) → the player simply leaves his section.
 *
 * Validation: the resulting state is checked with validateSquadState and the
 * move is rejected if it introduces a violation that did not exist before
 * (so legacy saves that are already imperfect can still be repaired by moves).
 */

import { err, ok } from '../shared/result';
import type { Result } from '../shared/result';
import { getFormation, isFootballFormation } from './formations';
import { evaluatePositionSuitability, SUITABILITY_RANK } from './positionSuitability';
import { locatePlayer } from './squadQueries';
import { validateSquadState, violationKey } from './squadRules';
import { EMPTY_SLOT } from './squadTypes';
import type {
  MoveError, MoveKind, MoveOutcome, MoveTarget, SquadLocation, SquadState,
} from './squadTypes';

export type { MoveError } from './squadTypes';
export type MoveResult = Result<MoveOutcome, MoveError>;

const isIndex = (n: unknown, exclusiveMax: number): n is number =>
  typeof n === 'number' && Number.isInteger(n) && n >= 0 && n < exclusiveMax;

/** Pick which substitute leaves when the substitutes section is full. */
function chooseDisplacedSubstitute(state: SquadState, playerId: string, from: SquadLocation): string {
  const subs = state.substitutes;

  if (from.section === 'starting') {
    const label = getFormation(state.formation).slots[from.slotIndex]?.label ?? 'GK';
    let best = subs[0];
    let bestRank = -1;
    let bestOverall = -1;
    for (const id of subs) {
      const ref = state.players.get(id);
      if (!ref) continue;
      const rank = SUITABILITY_RANK[evaluatePositionSuitability(ref, label).level];
      // Strictly better only → on a full tie the EARLIEST substitute wins.
      if (rank > bestRank || (rank === bestRank && ref.overall > bestOverall)) {
        best = id;
        bestRank = rank;
        bestOverall = ref.overall;
      }
    }
    return best;
  }

  // From the bench: drop the least valuable substitute (the last one on ties),
  // but never the ONLY backup goalkeeper unless a goalkeeper is coming in.
  const incomingIsGk = state.players.get(playerId)?.position === 'GK';
  const gkSubs = subs.filter((id) => state.players.get(id)?.position === 'GK');
  const protectedId = !incomingIsGk && gkSubs.length === 1 ? gkSubs[0] : null;
  const candidates = subs.filter((id) => id !== protectedId);
  const pool = candidates.length > 0 ? candidates : subs;

  let worst = pool[pool.length - 1];
  let worstOverall = Number.POSITIVE_INFINITY;
  for (const id of pool) {
    const overall = state.players.get(id)?.overall ?? 0;
    if (overall <= worstOverall) {
      worst = id;
      worstOverall = overall;
    }
  }
  return worst;
}

export function moveEntity(state: SquadState, playerId: string, target: MoveTarget): MoveResult {
  if (!isFootballFormation(state.formation)) {
    return err({ code: 'INVALID_FORMATION', formation: String(state.formation) });
  }
  const from = locatePlayer(state, playerId);
  if (!from) return err({ code: 'PLAYER_NOT_IN_SQUAD', playerId });

  // ---- target validation ---------------------------------------------------
  if (target.section === 'starting' && !isIndex(target.slotIndex, state.slots.length)) {
    return err({ code: 'INVALID_SLOT_INDEX', slotIndex: target.slotIndex });
  }
  if (target.section === 'substitutes') {
    if (state.rules.maxSubstitutes <= 0) return err({ code: 'SUBSTITUTES_UNAVAILABLE' });
    if (
      target.index !== undefined &&
      !(typeof target.index === 'number' && Number.isInteger(target.index) && target.index >= 0)
    ) {
      return err({ code: 'INVALID_SUBSTITUTE_INDEX', index: target.index });
    }
  }

  const slots = [...state.slots];
  const subs = [...state.substitutes];
  let kind: MoveKind = 'moved';
  let displaced: string | null = null;
  let to!: SquadLocation;

  /** Put `replacement` (or nothing) where the mover used to be. */
  const vacate = (replacement: string | null) => {
    if (from.section === 'starting') {
      slots[from.slotIndex] = replacement ?? EMPTY_SLOT;
    } else if (from.section === 'substitutes') {
      if (replacement) subs[from.index] = replacement;
      else subs.splice(from.index, 1);
    }
    // from bench: nothing to do — a player dropped from XI/substitutes is bench by definition.
  };

  switch (target.section) {
    case 'starting': {
      const i = target.slotIndex;
      to = { section: 'starting', slotIndex: i };
      const occupant = slots[i];
      if (occupant === playerId) return noop(state, playerId, from, to);
      const other = occupant !== EMPTY_SLOT ? occupant : null;
      slots[i] = playerId;
      vacate(other);
      if (other) { kind = 'swapped'; displaced = other; }
      break;
    }

    case 'substitutes': {
      const m = target.index;

      if (from.section === 'substitutes') {
        // Reorder inside the section.
        if (m === undefined || m >= subs.length) {
          if (from.index === subs.length - 1) return noop(state, playerId, from, from);
          subs.splice(from.index, 1);
          subs.push(playerId);
          to = { section: 'substitutes', index: subs.length - 1 };
          kind = 'reordered';
        } else {
          if (m === from.index) return noop(state, playerId, from, from);
          const other = subs[m];
          subs[m] = playerId;
          subs[from.index] = other;
          to = { section: 'substitutes', index: m };
          kind = 'swapped';
          displaced = other;
        }
        break;
      }

      if (m !== undefined && m < subs.length) {
        // Explicit occupied target → swap.
        const other = subs[m];
        subs[m] = playerId;
        vacate(other);
        to = { section: 'substitutes', index: m };
        kind = 'swapped';
        displaced = other;
      } else if (subs.length < state.rules.maxSubstitutes) {
        // Room available → append.
        subs.push(playerId);
        vacate(null);
        to = { section: 'substitutes', index: subs.length - 1 };
      } else {
        // Full → intuitive swap.
        const other = chooseDisplacedSubstitute(state, playerId, from);
        const at = subs.indexOf(other);
        subs[at] = playerId;
        vacate(other);
        to = { section: 'substitutes', index: at };
        kind = 'swapped';
        displaced = other;
      }
      break;
    }

    case 'bench': {
      to = { section: 'bench' };
      if (from.section === 'bench') return noop(state, playerId, from, to);
      vacate(null);
      break;
    }
  }

  const next: SquadState = { ...state, slots, substitutes: subs };

  // Reject only violations this move introduces.
  const before = new Set(validateSquadState(state).map(violationKey));
  const introduced = validateSquadState(next).filter((v) => !before.has(violationKey(v)));
  if (introduced.length > 0) return err({ code: 'RULE_VIOLATION', violations: introduced });

  return ok({ state: next, kind, playerId, displacedPlayerId: displaced, from, to });
}

function noop(state: SquadState, playerId: string, from: SquadLocation, to: SquadLocation): MoveResult {
  return ok({ state, kind: 'noop', playerId, displacedPlayerId: null, from, to });
}
