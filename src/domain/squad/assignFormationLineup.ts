/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { FootballFormation, Player } from '../../types/game';
import { getFormation } from './formations';
import { evaluatePositionSuitability } from './positionSuitability';

/** Greedy XI: one player per formation slot by best suitability × overall. */
export function assignLineupToFormation(squad: readonly Player[], formation: FootballFormation): string[] {
  const slots = getFormation(formation).slots;
  const available = squad.filter((p) => (p.injuredWeeks ?? 0) <= 0 && (p.suspendedMatches ?? 0) <= 0);
  const pool = available.length >= 11 ? [...available] : [...squad];
  const used = new Set<string>();
  const lineup: string[] = new Array(slots.length).fill('');

  for (const slot of slots) {
    let best: Player | null = null;
    let bestScore = -1;
    for (const p of pool) {
      if (used.has(p.id)) continue;
      const suit = evaluatePositionSuitability(p, slot.label);
      const score = p.overall * suit.multiplier;
      if (score > bestScore) {
        bestScore = score;
        best = p;
      }
    }
    if (best) {
      lineup[slot.index] = best.id;
      used.add(best.id);
    }
  }
  return lineup;
}
