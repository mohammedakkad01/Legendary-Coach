/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Maps legacy FootballTactics enums/sliders → Phase B instruction blocks
 * so default-migrated saves preserve pre-Phase-B engine behaviour.
 */

import type { FootballTactics, MatchMentality, PassingStyle, PressingStyle, TeamTempo } from '../../types/game';
import { TACTICAL_DEFAULTS as D } from '../../config/gameTuning';
import { resolveTacticalState } from './tacticalState';
import type { TacticalInstructions, TransitionAttack, TransitionDefence } from './instructionTypes';
import { normalizeTacticalInstructions } from './instructionTypes';

const pick = <K extends string>(table: Readonly<Record<K, number>>, key: string | undefined, fallback = 50): number =>
  key !== undefined && key in table ? table[key as K] : fallback;

const widthEnumToSlider = (width: FootballTactics['width']): number => {
  if (width === 'narrow') return 25;
  if (width === 'wide') return 75;
  return 50;
};

const tempoEnumToSlider = (tempo: TeamTempo): number => {
  if (tempo === 'slow_patient') return 30;
  if (tempo === 'fast_electric') return 75;
  return 50;
};

const passingToDirectness = (passing: PassingStyle): number => pick(D.directPlayFromPassing, passing, 45);

const passingToRisk = (passing: PassingStyle): number => {
  if (passing === 'short_tiki_taka') return 35;
  if (passing === 'direct_counter') return 70;
  if (passing === 'long_ball') return 65;
  return 50;
};

const mentalityToTransitionAttack = (mentality: MatchMentality): TransitionAttack => {
  if (mentality === 'all_out_attack' || mentality === 'attacking') return 'fast_build';
  if (mentality === 'ultra_defensive' || mentality === 'defensive') return 'hold_shape';
  return 'counter';
};

const pressingToTransitionDefence = (pressing: PressingStyle): TransitionDefence => {
  if (pressing === 'gegenpress' || pressing === 'high_press') return 'counter_press';
  if (pressing === 'low_block') return 'fall_back';
  return 'delay';
};

const pressingToTrigger = (pressing: PressingStyle): TacticalInstructions['outOfPossession']['pressingTrigger'] => {
  if (pressing === 'gegenpress' || pressing === 'high_press') return 'opponent_half';
  if (pressing === 'low_block') return 'own_third';
  return 'midfield';
};

/** Derive instructions from enums + resolved sliders (behaviour-preserving defaults). */
export function deriveTacticalInstructionsFromLegacy(tactics: FootballTactics): TacticalInstructions {
  const state = resolveTacticalState(tactics);
  return normalizeTacticalInstructions({
    inPossession: {
      width: widthEnumToSlider(tactics.width),
      tempo: tempoEnumToSlider(tactics.tempo),
      passingDirectness: state.directPlay,
      passingRisk: passingToRisk(tactics.passing),
    },
    outOfPossession: {
      lineHeight: state.defensiveLine,
      pressingIntensity: state.defensiveIntensity,
      pressingTrigger: pressingToTrigger(tactics.pressing),
      compactness: Math.round((state.defensiveIntensity + (100 - state.defensiveLine)) / 2),
    },
    transition: {
      attack: mentalityToTransitionAttack(tactics.mentality),
      defence: pressingToTransitionDefence(tactics.pressing),
    },
  });
}

export function ensureTacticalInstructions(tactics: FootballTactics): FootballTactics {
  if (tactics.tacticalInstructions) {
    return {
      ...tactics,
      tacticalInstructions: normalizeTacticalInstructions(tactics.tacticalInstructions),
    };
  }
  return {
    ...tactics,
    tacticalInstructions: deriveTacticalInstructionsFromLegacy(tactics),
  };
}
