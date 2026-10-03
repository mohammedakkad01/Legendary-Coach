/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * INTERNAL registry helpers — merge sparse truth without cloning Player.
 */

import type { Player } from '../../../types/game';
import type { TrueWorldPlayer } from '../trueProfile/types';
import { buildTrueWorldPlayerFromCanonical } from '../trueProfile/buildFromPlayer';
import type { RecruitmentWorldState } from '../types';

export function upsertWorldPlayerFromCanonical(
  world: RecruitmentWorldState,
  player: Player,
): RecruitmentWorldState {
  const entry = buildTrueWorldPlayerFromCanonical(player);
  return {
    ...world,
    worldPlayers: {
      ...world.worldPlayers,
      [player.id]: entry,
    },
  };
}

export function getInternalTruePlayer(
  world: RecruitmentWorldState,
  playerId: string,
): TrueWorldPlayer | undefined {
  return world.worldPlayers[playerId];
}

export function mergeWorldPlayers(
  existing: Record<string, TrueWorldPlayer>,
  players: readonly Player[],
): Record<string, TrueWorldPlayer> {
  const next = { ...existing };
  for (const p of players) {
    if (!next[p.id]) {
      next[p.id] = buildTrueWorldPlayerFromCanonical(p);
    }
  }
  return next;
}
