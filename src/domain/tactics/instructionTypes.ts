/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phase B — split tactical instructions (pure types + validation).
 */

import { clamp } from '../shared/math';

export type PressingTrigger = 'opponent_half' | 'midfield' | 'own_third';

export type TransitionAttack = 'hold_shape' | 'counter' | 'fast_build';

export type TransitionDefence = 'counter_press' | 'fall_back' | 'delay';

export interface InPossessionInstructions {
  readonly width: number;
  readonly tempo: number;
  readonly passingDirectness: number;
  readonly passingRisk: number;
}

export interface OutOfPossessionInstructions {
  readonly lineHeight: number;
  readonly pressingIntensity: number;
  readonly pressingTrigger: PressingTrigger;
  readonly compactness: number;
}

export interface TransitionInstructions {
  readonly attack: TransitionAttack;
  readonly defence: TransitionDefence;
}

export interface TacticalInstructions {
  readonly inPossession: InPossessionInstructions;
  readonly outOfPossession: OutOfPossessionInstructions;
  readonly transition: TransitionInstructions;
}

export const INSTRUCTION_MIN = 0;
export const INSTRUCTION_MAX = 100;

export const clampInstruction = (value: number, fallback = 50): number =>
  Math.round(clamp(typeof value === 'number' && Number.isFinite(value) ? value : fallback, INSTRUCTION_MIN, INSTRUCTION_MAX));

export function normalizeInPossession(raw: Partial<InPossessionInstructions> | undefined): InPossessionInstructions {
  return {
    width: clampInstruction(raw?.width ?? 50),
    tempo: clampInstruction(raw?.tempo ?? 50),
    passingDirectness: clampInstruction(raw?.passingDirectness ?? 50),
    passingRisk: clampInstruction(raw?.passingRisk ?? 50),
  };
}

export function normalizeOutOfPossession(raw: Partial<OutOfPossessionInstructions> | undefined): OutOfPossessionInstructions {
  const trigger = raw?.pressingTrigger;
  const pressingTrigger: PressingTrigger =
    trigger === 'opponent_half' || trigger === 'midfield' || trigger === 'own_third' ? trigger : 'midfield';
  return {
    lineHeight: clampInstruction(raw?.lineHeight ?? 50),
    pressingIntensity: clampInstruction(raw?.pressingIntensity ?? 50),
    pressingTrigger,
    compactness: clampInstruction(raw?.compactness ?? 50),
  };
}

const TRANSITION_ATTACK: readonly TransitionAttack[] = ['hold_shape', 'counter', 'fast_build'];
const TRANSITION_DEFENCE: readonly TransitionDefence[] = ['counter_press', 'fall_back', 'delay'];

export function normalizeTransition(raw: Partial<TransitionInstructions> | undefined): TransitionInstructions {
  const attack = raw?.attack;
  const defence = raw?.defence;
  return {
    attack: TRANSITION_ATTACK.includes(attack as TransitionAttack) ? (attack as TransitionAttack) : 'hold_shape',
    defence: TRANSITION_DEFENCE.includes(defence as TransitionDefence) ? (defence as TransitionDefence) : 'fall_back',
  };
}

export function normalizeTacticalInstructions(raw: Partial<TacticalInstructions> | undefined): TacticalInstructions {
  return {
    inPossession: normalizeInPossession(raw?.inPossession),
    outOfPossession: normalizeOutOfPossession(raw?.outOfPossession),
    transition: normalizeTransition(raw?.transition),
  };
}
