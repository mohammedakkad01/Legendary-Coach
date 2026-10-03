/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { AiClubWeeklyBatchResult } from '../aiClubs/weeklyAiTransferBatch';
import type { TransferTargetCandidate } from '../aiClubs/clubProfileTypes';
import { generateWeeklyRumors } from './generateRumors';
import type { AgentActivityCandidate, GenerateWeeklyRumorsResult } from './generateRumors';
import type { RumorThrottleState } from './rumorTypes';

export function buildRumorsFromAiWeeklyBatch(params: {
  worldSeed: number;
  gameWeek: number;
  userClubId: string;
  throttle: RumorThrottleState;
  batch: AiClubWeeklyBatchResult;
  candidatesByClubId: Record<string, readonly TransferTargetCandidate[]>;
  agentActivities: readonly AgentActivityCandidate[];
  allowFabricatedRumors?: boolean;
}): GenerateWeeklyRumorsResult {
  const clubInterests = params.batch.processedClubIds.flatMap((clubId) => {
    const targets = params.batch.targetsByClubId[clubId] ?? [];
    const candidates = params.candidatesByClubId[clubId] ?? [];
    const byPlayer = new Map(candidates.map((c) => [c.playerId, c]));
    return targets.flatMap((target) => {
      const candidate = byPlayer.get(target.playerId);
      if (!candidate) return [];
      return [{
        interestedClubId: clubId,
        playerId: target.playerId,
        sellerClubId: candidate.sellerClubId,
        target,
        observed: candidate.observed,
      }];
    });
  });

  return generateWeeklyRumors({
    worldSeed: params.worldSeed,
    gameWeek: params.gameWeek,
    userClubId: params.userClubId,
    throttle: params.throttle,
    clubInterests,
    agentActivities: params.agentActivities,
    allowFabricatedRumors: params.allowFabricatedRumors,
  });
}
