/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { PlayerMatchDelta } from '../../engine/matchdaySimulator';
import type { PostMatchPlayerSummary } from './types';

export function summariesFromUserDeltas(
  deltas: PlayerMatchDelta[],
  userClubId: string,
  lineupIds: readonly string[],
): PostMatchPlayerSummary[] {
  const lineup = new Set(lineupIds.filter(Boolean));
  const userDeltas = deltas.filter((d) => d.clubId === userClubId);
  const byId = new Map(userDeltas.map((d) => [d.playerId, d]));

  const summaries: PostMatchPlayerSummary[] = [];
  for (const id of lineup) {
    const d = byId.get(id);
    summaries.push({
      playerId: id,
      minutes: 88,
      goals: d?.goals ?? 0,
      assists: d?.assists ?? 0,
      matchRating: d?.rating ?? 6.4,
      wasStarter: true,
    });
  }

  for (const d of userDeltas) {
    if (lineup.has(d.playerId)) continue;
    summaries.push({
      playerId: d.playerId,
      minutes: d.goals + d.assists > 0 ? 25 : 0,
      goals: d.goals,
      assists: d.assists,
      matchRating: d.rating || 6.2,
      wasStarter: false,
    });
  }

  return summaries;
}
