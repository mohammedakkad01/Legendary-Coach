/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { RECRUITMENT_TUNING as T } from '../config/recruitmentTuning';
import { recruitmentRng } from '../rng/recruitmentRng';
import type { EvaluateOfferResult, PlayerNegotiationContext } from './contextTypes';
import type { TransferOffer } from './offerTypes';
import { computeUpfrontCash } from './offerTypes';

function personalityMinAcceptRatio(personality: string): { minAcceptRatio: number; volatile: boolean } {
  switch (personality) {
    case 'leader':
      return { minAcceptRatio: T.negotiation.minAcceptRatio.leader, volatile: false };
    case 'ambitious':
      return { minAcceptRatio: T.negotiation.minAcceptRatio.ambitious, volatile: false };
    case 'temperamental':
      return { minAcceptRatio: T.negotiation.minAcceptRatio.temperamental, volatile: true };
    case 'professional':
      return { minAcceptRatio: T.negotiation.minAcceptRatio.professional, volatile: false };
    case 'loyal':
      return { minAcceptRatio: T.negotiation.minAcceptRatio.loyal, volatile: false };
    case 'nervous':
      return { minAcceptRatio: T.negotiation.minAcceptRatio.nervous, volatile: false };
    default:
      return { minAcceptRatio: T.negotiation.minAcceptRatio.professional, volatile: false };
  }
}

export interface EvaluateOfferInput {
  worldSeed: number;
  gameWeek: number;
  sellingClubId: string;
  player: PlayerNegotiationContext;
  offer: TransferOffer;
  roundsUsed: number;
  maxRounds: number;
}

export function evaluateOffer(input: EvaluateOfferInput): EvaluateOfferResult {
  const { minAcceptRatio, volatile } = personalityMinAcceptRatio(input.player.personality);
  const cash = computeUpfrontCash(input.offer.clauses);
  const ref = Math.max(1, input.player.referenceMarketValue);
  const ratio = cash / ref;

  const rng = recruitmentRng(
    input.worldSeed,
    input.gameWeek,
    input.sellingClubId,
    input.player.playerId,
    'negotiation_eval',
  );

  if (volatile && rng.nextChance(T.negotiation.temperamentalRejectChance) && ratio < minAcceptRatio + 0.12) {
    return { response: 'rejected_policy', reasonCodes: ['agent_temperamental'] };
  }

  const unwilling = input.player.transferDesire < T.negotiation.minTransferDesireToLeave;
  if (unwilling && ratio < minAcceptRatio + 0.25) {
    return { response: 'rejected_player_unwilling', reasonCodes: ['player_not_for_sale'] };
  }

  if (ratio >= minAcceptRatio) {
    return { response: 'accepted', reasonCodes: ['fee_meets_expectation'] };
  }

  if (ratio < minAcceptRatio - T.negotiation.insultGap) {
    return { response: 'rejected_insulting', reasonCodes: ['offer_insulting'] };
  }

  if (input.roundsUsed >= input.maxRounds) {
    return { response: 'expired_rounds', reasonCodes: ['max_rounds'] };
  }

  const counterCash = Math.round(ref * (minAcceptRatio - 0.03));
  const bumped = Math.max(counterCash, cash + T.negotiation.minCounterIncrement);
  const counterOffer: TransferOffer = {
    ...input.offer,
    id: `${input.offer.id}_counter_${input.roundsUsed}`,
    clauses: [{ kind: 'fee', amount: bumped }],
  };

  return {
    response: 'counter',
    reasonCodes: ['counter_demand'],
    counterOffer,
  };
}
