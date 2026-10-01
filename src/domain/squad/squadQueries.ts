/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Read-only helpers over SquadState. Pure.
 */

import { getFormation } from './formations';
import { evaluatePositionSuitability } from './positionSuitability';
import { EMPTY_SLOT } from './squadTypes';
import type { PlayerAssignment, SquadLocation, SquadState } from './squadTypes';

export function locatePlayer(state: SquadState, playerId: string): SquadLocation | null {
  const slotIndex = state.slots.indexOf(playerId);
  if (playerId !== EMPTY_SLOT && slotIndex >= 0) return { section: 'starting', slotIndex };
  const index = state.substitutes.indexOf(playerId);
  if (index >= 0) return { section: 'substitutes', index };
  return state.players.has(playerId) ? { section: 'bench' } : null;
}

/** Bench = registered players who are neither starting nor substitutes (squad order). */
export function getBenchIds(state: SquadState): string[] {
  const used = new Set<string>([...state.slots, ...state.substitutes]);
  return [...state.players.keys()].filter((id) => !used.has(id));
}

export const isStartingXiComplete = (state: SquadState): boolean =>
  state.slots.length > 0 && state.slots.every((id) => id !== EMPTY_SLOT);

export function getAssignments(state: SquadState): PlayerAssignment[] {
  const formation = getFormation(state.formation);
  const out: PlayerAssignment[] = [];

  state.slots.forEach((id, slotIndex) => {
    const player = id !== EMPTY_SLOT ? state.players.get(id) : undefined;
    if (!player) return;
    const label = formation.slots[slotIndex]?.label ?? null;
    out.push({
      playerId: id,
      section: 'starting',
      slotIndex,
      substituteIndex: null,
      assignedPosition: label,
      suitability: label ? evaluatePositionSuitability(player, label) : null,
    });
  });
  state.substitutes.forEach((id, substituteIndex) => {
    if (!state.players.has(id)) return;
    out.push({ playerId: id, section: 'substitutes', slotIndex: null, substituteIndex, assignedPosition: null, suitability: null });
  });
  getBenchIds(state).forEach((id) => {
    out.push({ playerId: id, section: 'bench', slotIndex: null, substituteIndex: null, assignedPosition: null, suitability: null });
  });
  return out;
}
