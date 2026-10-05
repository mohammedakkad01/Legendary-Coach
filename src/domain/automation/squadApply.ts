/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pure squad mutations via moveEntity only (bench / rotation apply paths).
 */

import type { ClubSquadSlice } from '../squad/squadStateAdapter';
import { createSquadState, applySquadState } from '../squad/squadStateAdapter';
import { moveEntity } from '../squad/moveEntity';
import { validateForKickoff } from '../squad/squadRules';
import { EMPTY_SLOT } from '../squad/squadTypes';
import type { SquadState } from '../squad/squadTypes';
import { partitionSquad } from '../tactics/bestTactics/availability';
import { pickSubstitutes } from '../tactics/bestTactics/roles';
import { optimizeLineup } from '../tactics/bestTactics/lineupOptimizer';
import { toBestTacticsPlayer } from '../../hooks/bestTactics/bestTacticsInput';
import type { FootballTactics } from '../../types/game';
import type { BestTacticsPlayer } from '../tactics/bestTactics/types';
import type { SquadMovePlan } from './types';

export interface BenchPlanResult {
  targetSubstituteIds: readonly string[];
  excludedPlayerIds: readonly string[];
  leavingSubstituteIds: readonly string[];
  ok: boolean;
  reasonCodes: string[];
}

export function planBenchSubstitutes(
  club: ClubSquadSlice,
  maxSubstitutes: number,
): BenchPlanResult {
  const reasonCodes: string[] = [];
  const { state } = createSquadState(club, { maxSubstitutes });
  const squad = club.footballSquad.map(toBestTacticsPlayer);
  const { available, excluded } = partitionSquad(squad);
  const xiIds = new Set(state.slots.filter((id) => id !== EMPTY_SLOT));
  const required = state.slots.length;
  if (available.length < required) {
    reasonCodes.push('NOT_ENOUGH_AVAILABLE_PLAYERS');
    return {
      targetSubstituteIds: [],
      excludedPlayerIds: excluded.map((e) => e.playerId),
      leavingSubstituteIds: [],
      ok: false,
      reasonCodes,
    };
  }
  const targetSubstituteIds = pickSubstitutes(available, xiIds, maxSubstitutes);
  const targetSet = new Set(targetSubstituteIds);
  const leavingSubstituteIds = state.substitutes.filter((id) => !targetSet.has(id));
  return {
    targetSubstituteIds,
    excludedPlayerIds: excluded.map((e) => e.playerId),
    leavingSubstituteIds,
    ok: true,
    reasonCodes,
  };
}

export function buildSubstituteApplyMoves(
  state: SquadState,
  targetSubstituteIds: readonly string[],
): SquadMovePlan {
  const moves: Array<{ playerId: string; target: import('../squad/squadTypes').MoveTarget }> = [];
  const targetSet = new Set(targetSubstituteIds);
  for (const id of state.substitutes) {
    if (!targetSet.has(id)) {
      moves.push({ playerId: id, target: { section: 'bench' } });
    }
  }
  for (const id of targetSubstituteIds) {
    if (!state.substitutes.includes(id)) {
      moves.push({ playerId: id, target: { section: 'substitutes' } });
    }
  }
  return { moves };
}

export function applyBenchSubstitutePlan<T extends ClubSquadSlice>(
  club: T,
  maxSubstitutes: number,
  targetSubstituteIds: readonly string[],
): { ok: true; club: T } | { ok: false; reasonCode: 'squad_rules' | 'move_failed' } {
  const { state } = createSquadState(club, { maxSubstitutes });
  const moves = buildSubstituteApplyMoves(state, targetSubstituteIds);
  const applied = applySquadMovePlan(club, maxSubstitutes, moves);
  if (!applied.ok) return applied;
  const { state: mid } = createSquadState(applied.club, { maxSubstitutes });
  const ordered = reorderSubstitutes(mid, targetSubstituteIds);
  const violations = validateForKickoff(ordered);
  if (violations.length > 0) return { ok: false, reasonCode: 'squad_rules' };
  return { ok: true, club: applySquadState(applied.club, ordered) };
}

export function planRotationLineup(
  club: ClubSquadSlice & { footballTactics: FootballTactics },
  maxSubstitutes: number,
): {
  ok: boolean;
  reasonCodes: string[];
  targetSlots: string[];
  slotDiffs: { slotIndex: number; fromPlayerId: string; toPlayerId: string }[];
  excludedPlayerIds: string[];
  available: BestTacticsPlayer[];
} {
  const { state } = createSquadState(club, { maxSubstitutes });
  const squad = club.footballSquad.map(toBestTacticsPlayer);
  const { available, excluded } = partitionSquad(squad);
  const xi = optimizeLineup(state.formation, available, {
    playerRoles: club.footballTactics.playerRoles,
  });
  if (xi.length !== state.slots.length) {
    return {
      ok: false,
      reasonCodes: ['optimizer_incomplete_xi'],
      targetSlots: [],
      slotDiffs: [],
      excludedPlayerIds: excluded.map((e) => e.playerId),
      available,
    };
  }
  const targetSlots = state.slots.map((_, i) => xi.find((p) => p.slotIndex === i)?.player.id ?? EMPTY_SLOT);
  const slotDiffs: { slotIndex: number; fromPlayerId: string; toPlayerId: string }[] = [];
  for (let i = 0; i < state.slots.length; i += 1) {
    const from = state.slots[i];
    const to = targetSlots[i];
    if (from !== to && to !== EMPTY_SLOT) {
      slotDiffs.push({
        slotIndex: i,
        fromPlayerId: from === EMPTY_SLOT ? '' : from,
        toPlayerId: to,
      });
    }
  }
  return {
    ok: true,
    reasonCodes: [],
    targetSlots,
    slotDiffs,
    excludedPlayerIds: excluded.map((e) => e.playerId),
    available,
  };
}

export function buildRotationApplyMoves(state: SquadState, targetSlots: readonly string[]): SquadMovePlan {
  const moves: Array<{ playerId: string; target: import('../squad/squadTypes').MoveTarget }> = [];

  for (let i = 0; i < state.slots.length; i += 1) {
    const cur = state.slots[i];
    const want = targetSlots[i];
    if (want === EMPTY_SLOT) continue;
    if (cur === want) continue;
    if (cur !== EMPTY_SLOT) {
      moves.push({ playerId: cur, target: { section: 'bench' } });
    }
  }

  for (let i = 0; i < targetSlots.length; i += 1) {
    const want = targetSlots[i];
    if (want === EMPTY_SLOT) continue;
    if (state.slots[i] === want) continue;
    moves.push({ playerId: want, target: { section: 'starting', slotIndex: i } });
  }

  return { moves };
}

export function applySquadMovePlan<T extends ClubSquadSlice>(
  club: T,
  maxSubstitutes: number,
  plan: SquadMovePlan,
): { ok: true; club: T } | { ok: false; reasonCode: 'squad_rules' | 'move_failed' } {
  let { state } = createSquadState(club, { maxSubstitutes });
  const applied: Array<{ playerId: string; target: import('../squad/squadTypes').MoveTarget }> = [];

  for (const step of plan.moves) {
    const result = moveEntity(state, step.playerId, step.target);
    if (!result.ok) {
      let rollback = createSquadState(club, { maxSubstitutes }).state;
      for (let i = applied.length - 1; i >= 0; i -= 1) {
        const inv = invertMove(applied[i], rollback);
        if (inv) {
          const rb = moveEntity(rollback, inv.playerId, inv.target);
          if (rb.ok && rb.value.kind !== 'noop') rollback = rb.value.state;
        }
      }
      return { ok: false, reasonCode: 'move_failed' };
    }
    if (result.value.kind !== 'noop') {
      applied.push(step);
      state = result.value.state;
    }
  }

  const violations = validateForKickoff(state);
  if (violations.length > 0) {
    return { ok: false, reasonCode: 'squad_rules' };
  }

  return { ok: true, club: applySquadState(club, state) };
}

/** Reorder substitutes to match target id list (moveEntity only). */
export function reorderSubstitutes(state: SquadState, targetIds: readonly string[]): SquadState {
  let s = state;
  for (let i = 0; i < targetIds.length; i += 1) {
    const want = targetIds[i];
    const at = s.substitutes.indexOf(want);
    if (at < 0 || at === i) continue;
    const r = moveEntity(s, want, { section: 'substitutes', index: i });
    if (r.ok && r.value.kind !== 'noop') s = r.value.state;
  }
  return s;
}

function invertMove(
  step: { playerId: string; target: import('../squad/squadTypes').MoveTarget },
  state: SquadState,
): { playerId: string; target: import('../squad/squadTypes').MoveTarget } | null {
  const loc = state.slots.includes(step.playerId)
    ? { section: 'starting' as const, slotIndex: state.slots.indexOf(step.playerId) }
    : state.substitutes.includes(step.playerId)
      ? { section: 'substitutes' as const, index: state.substitutes.indexOf(step.playerId) }
      : { section: 'bench' as const };

  if (step.target.section === 'bench') {
    if (loc.section === 'substitutes') {
      return { playerId: step.playerId, target: { section: 'substitutes', index: loc.index } };
    }
    if (loc.section === 'starting') {
      return { playerId: step.playerId, target: { section: 'starting', slotIndex: loc.slotIndex } };
    }
    return null;
  }
  if (step.target.section === 'substitutes') {
    return { playerId: step.playerId, target: { section: 'bench' } };
  }
  if (step.target.section === 'starting') {
    return { playerId: step.playerId, target: { section: 'bench' } };
  }
  return null;
}

export function tacticsUnchanged(before: FootballTactics, after: FootballTactics): boolean {
  return JSON.stringify(before) === JSON.stringify(after);
}

export function lineupUnchanged(before: readonly string[], after: readonly string[]): boolean {
  return before.length === after.length && before.every((id, i) => id === after[i]);
}
