/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Instruction / role effects relative to kickoff baseline → ~1.0 multiplier for default clubs.
 */

import type { TacticalInstructions } from '../tactics/instructionTypes';
import {
  modifiersFromInstructions,
  phasePowerMultiplier,
  type InstructionModifiers,
} from './simWeights';
import type { TacticalPhase } from '../tactics/tacticalPhases';

const EFFECT_SCALE = 0.45;
const ROLE_SCALE = 0.4;
const PHASE_SCALE = 0.35;

export function deltaInstructionModifiers(
  current: TacticalInstructions,
  baseline: TacticalInstructions,
): InstructionModifiers {
  const cur = modifiersFromInstructions(current);
  const base = modifiersFromInstructions(baseline);
  const d = (a: number, b: number): number => (a - b) * EFFECT_SCALE;
  return {
    attackBonus: d(cur.attackBonus, base.attackBonus),
    defenseBonus: d(cur.defenseBonus, base.defenseBonus),
    shotRateDelta: d(cur.shotRateDelta, base.shotRateDelta),
    flankBias: d(cur.flankBias, base.flankBias),
    throughBallRisk: d(cur.throughBallRisk, base.throughBallRisk),
    xgPerShotMult: 1 + d(cur.xgPerShotMult - 1, base.xgPerShotMult - 1),
    onTargetMult: 1 + d(cur.onTargetMult - 1, base.onTargetMult - 1),
  };
}

export function scaledRoleMultiplier(currentRoleMul: number, baselineRoleMul: number): number {
  return 1 + (currentRoleMul - baselineRoleMul) * ROLE_SCALE;
}

export function scaledPhaseAttackMultiplier(phase: TacticalPhase): number {
  const mul = phasePowerMultiplier(phase).attack;
  return 1 + (mul - 1) * PHASE_SCALE;
}

export function scaledPhaseDefenseMultiplier(phase: TacticalPhase): number {
  const mul = phasePowerMultiplier(phase).defense;
  return 1 + (mul - 1) * PHASE_SCALE;
}
