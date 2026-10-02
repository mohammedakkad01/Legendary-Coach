/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Bounded match performance multiplier (neutral = 1.0 at default migrated state).
 */

import type { Player } from '../../types/game';
import { PLAYER_LIFE as PL } from '../../config/gameTuning';
import { clamp } from '../shared/math';

const T = PL.matchPerformance;

function norm(value: number, neutral: number, span: number): number {
  return clamp((value - neutral) / span, -1, 1);
}

/**
 * Multiplier applied to attack/defense rating contribution for one player.
 */
export function computeMatchPerformanceMultiplier(player: Player): number {
  const life = player.playerLife;
  const sharpness = life?.condition.sharpness ?? T.sharpnessNeutral;
  const matchFitness = life?.condition.matchFitness ?? T.matchFitnessNeutral;
  const form = player.form ?? T.formNeutral;
  const morale = player.morale ?? T.moraleNeutral;
  const fatigue = player.fatigue ?? 0;

  const moraleN = norm(morale, T.moraleNeutral, 50);
  const sharpN = norm(sharpness, T.sharpnessNeutral, 50);
  const fitN = norm(matchFitness, T.matchFitnessNeutral, 35);
  const formN = norm(form, T.formNeutral, 4.5);
  const fatigueN = norm(fatigue, 35, 65);

  let score =
    moraleN * T.moraleWeight +
    sharpN * T.sharpnessWeight +
    fitN * T.matchFitnessWeight +
    formN * T.formWeight -
    Math.max(0, fatigueN) * T.fatiguePenaltyWeight;

  const span =
    T.moraleWeight + T.sharpnessWeight + T.matchFitnessWeight + T.formWeight + T.fatiguePenaltyWeight;
  const normalized = span > 0 ? score / span : 0;

  const halfRange = (T.multMax - T.multMin) / 2;
  return clamp(1 + normalized * halfRange, T.multMin, T.multMax);
}
