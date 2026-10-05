/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Player } from '../../types/game';
import { computeInMatchInjuryProbability, type InjuryRiskContext } from '../playerLife/injuryRisk';

export const RECOVERY_SESSION_COIN_COST = 500;

export function injuryProbabilityRestedBaseline(player: Player, ctx: Omit<InjuryRiskContext, 'minutesThisMatch'>): number {
  const rested: Player = {
    ...player,
    fatigue: 0,
    playerLife: player.playerLife
      ? {
          ...player.playerLife,
          condition: { ...player.playerLife.condition, trainingLoad: 0 },
        }
      : player.playerLife,
  };
  return computeInMatchInjuryProbability(rested, { ...ctx, minutesThisMatch: 90 });
}

export function playersAboveRestedInjuryBaseline(
  players: readonly Player[],
  ctx: Omit<InjuryRiskContext, 'minutesThisMatch'>,
): string[] {
  const ids: string[] = [];
  for (const p of players) {
    const current = computeInMatchInjuryProbability(p, { ...ctx, minutesThisMatch: 90 });
    const rested = injuryProbabilityRestedBaseline(p, ctx);
    if (current > rested) ids.push(p.id);
  }
  return ids;
}
