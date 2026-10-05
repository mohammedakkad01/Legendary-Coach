/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Deterministic scouting target when manual UI does not pick a player.
 * Composes existing recruitment world data only.
 */

import { recruitmentRng } from '../../recruitment/rng/recruitmentRng';
import type { RecruitmentWorldState } from '../../recruitment/types';

export function pickScoutingDelegationTarget(
  world: RecruitmentWorldState,
  observerClubId: string,
  gameWeek: number,
): string | undefined {
  const seen = new Set<string>();
  const candidates: string[] = [];

  const push = (playerId: string | undefined) => {
    if (!playerId || seen.has(playerId)) return;
    if (!world.worldPlayers[playerId]) return;
    seen.add(playerId);
    candidates.push(playerId);
  };

  for (const interest of world.clubInterestRecords) {
    if (interest.interestedClubId === observerClubId) push(interest.playerId);
  }

  for (const rumor of world.transferRumors) {
    if (rumor.claimingClubId === observerClubId || rumor.type === 'club_interest') {
      push(rumor.subjectPlayerId);
    }
  }

  const clubKnowledge = world.knowledgeByObserverClubId[observerClubId] ?? {};
  for (const [playerId, knowledge] of Object.entries(clubKnowledge)) {
    if (knowledge.confidencePct < 72) push(playerId);
  }

  if (candidates.length === 0) {
    for (const playerId of Object.keys(world.worldPlayers)) {
      if (!clubKnowledge[playerId]) push(playerId);
      if (candidates.length >= 48) break;
    }
  }

  if (candidates.length === 0) return undefined;

  const rng = recruitmentRng(
    world.worldSeed,
    gameWeek,
    observerClubId,
    'delegation_scout_target',
    'knowledge_error',
  );
  const idx = rng.nextRange(0, candidates.length - 1);
  return candidates[idx];
}
