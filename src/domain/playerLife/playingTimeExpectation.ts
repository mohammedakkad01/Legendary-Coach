/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Player } from '../../types/game';
import { PLAYER_LIFE as P } from '../../config/gameTuning';
import { clamp100 } from './math';
import type { PlayerPlayingTimeSlice } from './types';

export function inferSquadRole(
  playerId: string,
  lineupIds: string[],
  benchIds: string[],
  player: Player,
): PlayerPlayingTimeSlice['squadRole'] {
  if (lineupIds.includes(playerId)) return 'starter';
  if (benchIds.includes(playerId)) return 'rotation';
  if (player.age <= 21) return 'youth';
  return 'fringe';
}

export function expectedMinutesForRole(role: PlayerPlayingTimeSlice['squadRole']): number {
  switch (role) {
    case 'starter':
      return P.playingTime.starterExpectedMin;
    case 'rotation':
      return P.playingTime.rotationExpectedMin;
    case 'youth':
      return P.playingTime.youthExpectedMin;
    default:
      return 15;
  }
}

export function computeExpectedMinutes(
  player: Player,
  lineupIds: string[],
  benchIds: string[],
): { role: PlayerPlayingTimeSlice['squadRole']; expected: number } {
  const profile = player.personalityProfile;
  const role = inferSquadRole(player.id, lineupIds, benchIds, player);
  let expected = expectedMinutesForRole(role);
  const ambition = profile?.ambition ?? 55;
  expected += ((ambition - 50) / 50) * 8;
  expected = clamp100(expected);
  return { role, expected: Math.round(expected) };
}

export function frustrationFromMinutesShortfall(
  expected: number,
  actualMinutes: number,
  ambition: number,
): number {
  const shortfall = Math.max(0, expected - actualMinutes);
  if (shortfall <= 0) return 0;
  const base = (shortfall / 10) * P.playingTime.shortfallFrustrationPer10Min;
  const ambMult =
    P.mental.ambitionFrustrationMultMin +
    ((ambition / 100) * (P.mental.ambitionFrustrationMultMax - P.mental.ambitionFrustrationMultMin));
  return base * ambMult;
}

export function pushMinutesHistory(history: number[], minutes: number, cap: number): number[] {
  return [...history, minutes].slice(-cap);
}
