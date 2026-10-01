/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Best XI for ONE formation: globally optimal player→slot assignment
 * (Hungarian) over slotValue. A star winger is not wasted at centre-back and
 * a natural GK is not replaced by a higher-rated outfielder.
 */

import type { FootballFormation } from '../../../types/game';
import { getFormation } from '../../squad/formations';
import { solveAssignment } from './hungarian';
import { slotValue } from './slotValue';
import type { SlotValue } from './slotValue';
import type { BestTacticsPlayer } from './types';

export interface OptimizedPlacement {
  readonly slotIndex: number;
  readonly slotLabel: string;
  readonly player: BestTacticsPlayer;
  readonly slot: SlotValue;
}

/** `available` MUST already be filtered and id-sorted (see availability.ts). */
export function optimizeLineup(formation: FootballFormation, available: readonly BestTacticsPlayer[]): OptimizedPlacement[] {
  const slots = getFormation(formation).slots;
  if (available.length < slots.length) return [];

  const values: SlotValue[][] = slots.map((s) => available.map((p) => slotValue(p, s.label)));
  const cost = values.map((row) => row.map((v) => -v.value));
  const assignment = solveAssignment(cost);

  return slots.map((s, i) => ({
    slotIndex: s.index,
    slotLabel: s.label,
    player: available[assignment[i]],
    slot: values[i][assignment[i]],
  }));
}
