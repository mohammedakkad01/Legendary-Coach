/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Single config: instruction / phase / role → simulation multipliers.
 */

import type { TacticalInstructions, TransitionAttack, TransitionDefence } from '../tactics/instructionTypes';
import { clampInstruction } from '../tactics/instructionTypes';
import type { TacticalPhase } from '../tactics/tacticalPhases';

export const SIM_WEIGHTS = {
  instructionNeutral: 50,
  lineHeightToDefDepth: 0.004,
  lineHeightToThroughBallRisk: 0.006,
  pressingToTurnoverShot: 0.008,
  compactnessToWideAttack: 0.005,
  widthToFlankChance: 0.15,
  tempoToActionThreshold: 0.002,
  passingRiskToXgPerShot: 0.0012,
  passingRiskToOnTargetPenalty: 0.0015,
  roleCompatMinMult: 0.55,
  roleCompatMaxMult: 1,
  phaseAttackBlend: 0.25,
  counterAttackShotBoost: 0.035,
  counterPressFoulBoost: 0.012,
  holdShapePossessionBoost: 0.008,
  setPieceDeliveryWeight: 0.45,
  setPieceAerialWeight: 0.35,
  setPieceDefMarkWeight: 0.4,
  adaptationConfidenceMin: 3,
  adaptationMaxShift: 12,
} as const;

export interface InstructionModifiers {
  readonly attackBonus: number;
  readonly defenseBonus: number;
  readonly shotRateDelta: number;
  readonly flankBias: number;
  readonly throughBallRisk: number;
  readonly xgPerShotMult: number;
  readonly onTargetMult: number;
}

export function modifiersFromInstructions(instructions: TacticalInstructions): InstructionModifiers {
  const ip = instructions.inPossession;
  const oop = instructions.outOfPossession;
  const width = clampInstruction(ip.width);
  const tempo = clampInstruction(ip.tempo);
  const risk = clampInstruction(ip.passingRisk);
  const line = clampInstruction(oop.lineHeight);
  const press = clampInstruction(oop.pressingIntensity);
  const compact = clampInstruction(oop.compactness);
  const mid = SIM_WEIGHTS.instructionNeutral;

  const attackBonus =
    (width - mid) * 0.02 +
    (tempo - mid) * 0.015 +
    (clampInstruction(ip.passingDirectness) - mid) * 0.01 +
    transitionAttackAttackBonus(instructions.transition.attack);

  const defenseBonus =
    (compact - mid) * SIM_WEIGHTS.compactnessToWideAttack +
    (press - mid) * 0.03 +
    transitionDefenceBonus(instructions.transition.defence);

  const lineDelta = line - mid;
  return {
    attackBonus,
    defenseBonus: defenseBonus - lineDelta * SIM_WEIGHTS.lineHeightToDefDepth * 10,
    shotRateDelta: (tempo - mid) * SIM_WEIGHTS.tempoToActionThreshold,
    flankBias: ((width - mid) / 50) * SIM_WEIGHTS.widthToFlankChance,
    throughBallRisk: lineDelta * SIM_WEIGHTS.lineHeightToThroughBallRisk,
    xgPerShotMult: 1 + (risk - mid) * SIM_WEIGHTS.passingRiskToXgPerShot,
    onTargetMult: 1 - (risk - mid) * SIM_WEIGHTS.passingRiskToOnTargetPenalty,
  };
}

function transitionAttackAttackBonus(attack: TransitionAttack): number {
  if (attack === 'fast_build') return 1.2;
  if (attack === 'counter') return 0.6;
  return 0;
}

function transitionDefenceBonus(defence: TransitionDefence): number {
  if (defence === 'counter_press') return 1;
  if (defence === 'delay') return 0.4;
  return 0;
}

export function phasePowerMultiplier(phase: TacticalPhase): { attack: number; defense: number } {
  switch (phase) {
    case 'final_third':
      return { attack: 1.06, defense: 0.97 };
    case 'build_up':
      return { attack: 0.96, defense: 1.02 };
    case 'defensive_phase':
      return { attack: 0.92, defense: 1.08 };
    case 'attacking_transition':
      return { attack: 1.08, defense: 0.94 };
    case 'defensive_transition':
      return { attack: 0.9, defense: 1.05 };
    default:
      return { attack: 1, defense: 1 };
  }
}

export function pickPhaseForMinute(minute: number, homePossession: number): TacticalPhase {
  const posHeavy = homePossession >= 55;
  if (minute < 15) return posHeavy ? 'build_up' : 'defensive_phase';
  if (minute > 75) return posHeavy ? 'final_third' : 'defensive_phase';
  if (minute % 7 === 0) return 'attacking_transition';
  if (minute % 11 === 0) return 'defensive_transition';
  return posHeavy ? 'possession' : 'defensive_phase';
}
