/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { decideTransferAction } from './decideTransferAction';
import { scoreObservedFit } from './scoreCandidate';
import type {
  AiClubFinanceContext,
  AiClubTransferProfile,
  IdentifiedTransferTarget,
  SquadNeedContext,
  TransferTargetCandidate,
} from './clubProfileTypes';

export interface IdentifyTransferTargetsInput {
  worldSeed: number;
  gameWeek: number;
  actingClubId: string;
  profile: AiClubTransferProfile;
  finances: AiClubFinanceContext;
  squadNeeds: SquadNeedContext;
  transferWindowOpen: boolean;
  permanentTransferAllowed: boolean;
  candidates: readonly TransferTargetCandidate[];
  maxTargets: number;
}

export function identifyTransferTargets(input: IdentifyTransferTargetsInput): IdentifiedTransferTarget[] {
  const ranked = input.candidates
    .map((candidate) => {
      const fitScore = scoreObservedFit(input.profile, input.squadNeeds, candidate.observed);
      const decision = decideTransferAction({
        mode: 'buy',
        worldSeed: input.worldSeed,
        gameWeek: input.gameWeek,
        actingClubId: input.actingClubId,
        profile: input.profile,
        finances: input.finances,
        squadNeeds: input.squadNeeds,
        transferWindowOpen: input.transferWindowOpen,
        permanentTransferAllowed: input.permanentTransferAllowed,
        observedPlayer: candidate.observed,
        playerWillingness: candidate.willingness,
        playerMotivation: candidate.motivation,
        sellerClubId: candidate.sellerClubId,
        estimatedWeeklyWage: candidate.estimatedWeeklyWage,
      });
      return {
        playerId: candidate.playerId,
        interestLevel: decision.interestLevel,
        fitScore,
        decision,
      };
    })
    .filter((t) => t.decision.action !== 'pass' && t.decision.action !== 'wait')
    .sort((a, b) => b.interestLevel - a.interestLevel || b.fitScore - a.fitScore);

  return ranked.slice(0, input.maxTargets);
}
