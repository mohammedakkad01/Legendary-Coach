/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Tactical phases and per-phase shape offsets (pure geometry).
 */

import type { FootballFormation } from '../../types/game';
import { getFormation } from '../squad/formations';
import type { TacticalInstructions } from './instructionTypes';
import { clampInstruction } from './instructionTypes';

export type TacticalPhase =
  | 'build_up'
  | 'possession'
  | 'final_third'
  | 'defensive_transition'
  | 'attacking_transition'
  | 'defensive_phase';

export interface SlotPhaseOffset {
  readonly slotIndex: number;
  readonly dx: number;
  readonly dy: number;
}

export interface PhaseShapeInput {
  readonly formation: FootballFormation;
  readonly instructions: TacticalInstructions;
  readonly phase: TacticalPhase;
}

const phaseBaseShift: Record<TacticalPhase, { dyAttack: number; spread: number }> = {
  build_up: { dyAttack: -4, spread: 0.6 },
  possession: { dyAttack: -2, spread: 0.4 },
  final_third: { dyAttack: -10, spread: 1 },
  defensive_transition: { dyAttack: 6, spread: 0.3 },
  attacking_transition: { dyAttack: -8, spread: 0.8 },
  defensive_phase: { dyAttack: 8, spread: 0.5 },
};

/** Slot role line: 0 GK, 1 DEF, 2 MID, 3 ATT (approximate from y). */
function lineBand(y: number): number {
  if (y >= 80) return 0;
  if (y >= 58) return 1;
  if (y >= 32) return 2;
  return 3;
}

/**
 * Positional offsets (% pitch) per slot for a phase. Derived from formation
 * coordinates + instructions — not hardcoded per formation string.
 */
export function derivePhaseShapeOffsets(input: PhaseShapeInput): readonly SlotPhaseOffset[] {
  const def = getFormation(input.formation);
  const { phase, instructions } = input;
  const shift = phaseBaseShift[phase];
  const widthPull = (clampInstruction(instructions.inPossession.width) - 50) / 50;
  const linePush = (clampInstruction(instructions.outOfPossession.lineHeight) - 50) / 50;
  const compact = (clampInstruction(instructions.outOfPossession.compactness) - 50) / 50;

  return def.slots.map((slot) => {
    const band = lineBand(slot.y);
    let dy = 0;
    let dx = 0;

    if (band === 0) {
      dy = linePush * 3;
    } else if (band === 3) {
      dy = shift.dyAttack + linePush * -4;
      const side = slot.x < 50 ? -1 : slot.x > 50 ? 1 : 0;
      dx = side * shift.spread * (3 + widthPull * 4);
    } else if (band === 2) {
      dy = shift.dyAttack * 0.45;
      dx = (slot.x - 50) * widthPull * 0.08;
    } else {
      dy = linePush * 5 + (phase === 'defensive_phase' ? 4 : 0);
      dx = (slot.x - 50) * (compact * -0.06 + widthPull * 0.04);
    }

    if (phase === 'final_third' && band >= 2) dy -= 3;
    if (phase === 'build_up' && band <= 2) dy += 2;

    return { slotIndex: slot.index, dx, dy };
  });
}

export function deriveAllPhaseShapes(
  formation: FootballFormation,
  instructions: TacticalInstructions,
): Record<TacticalPhase, readonly SlotPhaseOffset[]> {
  const phases: TacticalPhase[] = [
    'build_up',
    'possession',
    'final_third',
    'defensive_transition',
    'attacking_transition',
    'defensive_phase',
  ];
  const out = {} as Record<TacticalPhase, readonly SlotPhaseOffset[]>;
  for (const phase of phases) {
    out[phase] = derivePhaseShapeOffsets({ formation, instructions, phase });
  }
  return out;
}
