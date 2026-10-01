/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Bridge between the persisted club shape (footballSquad / footballLineup /
 * footballBench / footballTactics.formation) and the immutable SquadState the
 * domain works on. Pure — the store calls it, the domain never sees the store.
 *
 * Reading is FORGIVING: old or hand-edited saves may have a short lineup,
 * ids of sold players, or duplicates. They are repaired into a valid shape
 * (and every repair is reported) instead of failing.
 */

import type { FootballFormation, Player } from '../../types/game';
import { DEFAULT_FORMATION, getFormation, isFootballFormation } from './formations';
import { createSquadRules } from './squadRules';
import { EMPTY_SLOT } from './squadTypes';
import type { SquadPlayerRef, SquadState } from './squadTypes';

/** The slice of Club this adapter reads and writes. */
export interface ClubSquadSlice {
  footballSquad: Player[];
  footballLineup: string[];
  footballBench: string[];
  footballTactics: { formation: FootballFormation };
}

export type SquadRepair =
  | { readonly code: 'FORMATION_DEFAULTED'; readonly received: string }
  | { readonly code: 'LINEUP_PADDED'; readonly missing: number }
  | { readonly code: 'LINEUP_TRUNCATED'; readonly removed: number }
  | { readonly code: 'LINEUP_UNKNOWN_ID_CLEARED'; readonly playerId: string }
  | { readonly code: 'LINEUP_DUPLICATE_CLEARED'; readonly playerId: string }
  | { readonly code: 'BENCH_UNKNOWN_ID_REMOVED'; readonly playerId: string }
  | { readonly code: 'BENCH_DUPLICATE_REMOVED'; readonly playerId: string }
  | { readonly code: 'BENCH_OVERLAPS_LINEUP_REMOVED'; readonly playerId: string };

export interface SquadStateReadResult {
  readonly state: SquadState;
  readonly repairs: readonly SquadRepair[];
}

export function createSquadState(
  club: ClubSquadSlice,
  options: { maxSubstitutes?: number } = {},
): SquadStateReadResult {
  const repairs: SquadRepair[] = [];

  const rawFormation = club.footballTactics?.formation;
  let formation: FootballFormation = DEFAULT_FORMATION;
  if (isFootballFormation(rawFormation)) formation = rawFormation;
  else repairs.push({ code: 'FORMATION_DEFAULTED', received: String(rawFormation) });

  const slotCount = getFormation(formation).slots.length;

  const players = new Map<string, SquadPlayerRef>();
  for (const p of club.footballSquad ?? []) players.set(p.id, p);

  // Lineup → exactly `slotCount` slots.
  const source = Array.isArray(club.footballLineup) ? club.footballLineup : [];
  const slots: string[] = [];
  const used = new Set<string>();
  source.slice(0, slotCount).forEach((id) => {
    if (!id || id === EMPTY_SLOT) { slots.push(EMPTY_SLOT); return; }
    if (!players.has(id)) { repairs.push({ code: 'LINEUP_UNKNOWN_ID_CLEARED', playerId: id }); slots.push(EMPTY_SLOT); return; }
    if (used.has(id)) { repairs.push({ code: 'LINEUP_DUPLICATE_CLEARED', playerId: id }); slots.push(EMPTY_SLOT); return; }
    used.add(id);
    slots.push(id);
  });
  if (source.length > slotCount) repairs.push({ code: 'LINEUP_TRUNCATED', removed: source.length - slotCount });
  if (slots.length < slotCount) {
    repairs.push({ code: 'LINEUP_PADDED', missing: slotCount - slots.length });
    while (slots.length < slotCount) slots.push(EMPTY_SLOT);
  }

  // Substitutes.
  const substitutes: string[] = [];
  const benchSeen = new Set<string>();
  for (const id of Array.isArray(club.footballBench) ? club.footballBench : []) {
    if (!players.has(id)) { repairs.push({ code: 'BENCH_UNKNOWN_ID_REMOVED', playerId: id }); continue; }
    if (used.has(id)) { repairs.push({ code: 'BENCH_OVERLAPS_LINEUP_REMOVED', playerId: id }); continue; }
    if (benchSeen.has(id)) { repairs.push({ code: 'BENCH_DUPLICATE_REMOVED', playerId: id }); continue; }
    benchSeen.add(id);
    substitutes.push(id);
  }

  return {
    state: { formation, slots, substitutes, players, rules: createSquadRules(options.maxSubstitutes) },
    repairs,
  };
}

/** Write a SquadState back onto the club (immutable — returns a new object). */
export function applySquadState<T extends ClubSquadSlice>(club: T, state: SquadState): T {
  return {
    ...club,
    footballLineup: [...state.slots],
    footballBench: [...state.substitutes],
  };
}
