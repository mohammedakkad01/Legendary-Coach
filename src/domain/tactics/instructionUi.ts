/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * UI helpers for editing Phase B tactical instructions on saved tactics.
 */

import type { FootballTactics } from '../../types/game';
import type { TacticalInstructions } from './instructionTypes';
import { clampInstruction, normalizeTacticalInstructions } from './instructionTypes';
import { ensureTacticalInstructions } from './migrateTacticsPhaseB';

export type InstructionSliderKey =
  | 'inPossession.width'
  | 'inPossession.tempo'
  | 'inPossession.passingRisk'
  | 'outOfPossession.lineHeight'
  | 'outOfPossession.pressingIntensity';

const SLIDER_KEYS: Record<InstructionSliderKey, [section: keyof TacticalInstructions, field: string]> = {
  'inPossession.width': ['inPossession', 'width'],
  'inPossession.tempo': ['inPossession', 'tempo'],
  'inPossession.passingRisk': ['inPossession', 'passingRisk'],
  'outOfPossession.lineHeight': ['outOfPossession', 'lineHeight'],
  'outOfPossession.pressingIntensity': ['outOfPossession', 'pressingIntensity'],
};

export function instructionSliderLabels(isAr: boolean): Record<InstructionSliderKey, string> {
  if (isAr) {
    return {
      'inPossession.width': 'عرض اللعب',
      'inPossession.tempo': 'إيقاع الهجوم',
      'inPossession.passingRisk': 'مخاطرة التمرير',
      'outOfPossession.lineHeight': 'ارتفاع الخط',
      'outOfPossession.pressingIntensity': 'شدة الضغط',
    };
  }
  return {
    'inPossession.width': 'Attacking width',
    'inPossession.tempo': 'Tempo in possession',
    'inPossession.passingRisk': 'Passing risk',
    'outOfPossession.lineHeight': 'Defensive line height',
    'outOfPossession.pressingIntensity': 'Pressing intensity',
  };
}

export function getInstructionSliderValue(tactics: FootballTactics, key: InstructionSliderKey): number {
  const ensured = ensureTacticalInstructions(tactics);
  const instr = ensured.tacticalInstructions!;
  switch (key) {
    case 'inPossession.width':
      return instr.inPossession.width;
    case 'inPossession.tempo':
      return instr.inPossession.tempo;
    case 'inPossession.passingRisk':
      return instr.inPossession.passingRisk;
    case 'outOfPossession.lineHeight':
      return instr.outOfPossession.lineHeight;
    case 'outOfPossession.pressingIntensity':
      return instr.outOfPossession.pressingIntensity;
    default:
      return 50;
  }
}

export function patchInstructionSlider(
  tactics: FootballTactics,
  key: InstructionSliderKey,
  value: number,
): FootballTactics {
  const ensured = ensureTacticalInstructions(tactics);
  const instr = ensured.tacticalInstructions!;
  const [section, field] = SLIDER_KEYS[key];
  const nextSection = {
    ...instr[section],
    [field]: clampInstruction(value),
  };
  return {
    ...ensured,
    tacticalInstructions: normalizeTacticalInstructions({
      ...instr,
      [section]: nextSection,
    }),
  };
}
