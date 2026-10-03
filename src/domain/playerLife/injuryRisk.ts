/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Player } from '../../types/game';
import { PLAYER_LIFE as P } from '../../config/gameTuning';
import { clamp } from '../shared/math';
import { medicalStaffQuality } from './math';

export interface InjuryRiskContext {
  medicalCenterLevel: number;
  recentMatchesIn7Days: number;
  minutesThisMatch: number;
  /** Phase E staff modifier (neutral 1.0). Values below 1 reduce injury probability. */
  medicalInjuryRiskMult?: number;
}

export function computeInMatchInjuryProbability(player: Player, ctx: InjuryRiskContext): number {
  if ((player.injuredWeeks ?? 0) > 0) return 0;

  const life = player.playerLife;
  const fatigue = player.fatigue ?? 0;
  const load = life?.condition.trainingLoad ?? 0;
  const physical = player.attributes.physical ?? player.overall;

  let p = P.injury.baseInMatchPer90 * (ctx.minutesThisMatch / 90);
  p *= 1 + (fatigue / 100) * (P.injury.fatigueRiskScale - 1);
  p *= 1 + (load / 100) * (P.injury.loadRiskScale - 1);
  p *= 1 + Math.max(0, ctx.recentMatchesIn7Days - 1) * P.injury.congestionBonusPerMatch;
  if (player.age >= 30) p *= P.injury.ageRiskOver30;
  p *= 1.1 - medicalStaffQuality(ctx.medicalCenterLevel, P.injury.medicalLevelToQuality) * 0.25;
  p *= clamp(ctx.medicalInjuryRiskMult ?? 1, 0.5, 1.5);
  p *= clamp(1.05 - physical / 200, 0.75, 1.05);

  return clamp(p, 0, 0.35);
}
