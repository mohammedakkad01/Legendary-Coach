/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { GameEvent } from '../../livingWorld/types';
import type { RecruitmentPatch } from '../types';
import type { ClubNegotiationContext, PlayerNegotiationContext } from './contextTypes';
import { evaluateOffer } from './evaluateOffer';
import type { TransferNegotiation, TransferOffer } from './offerTypes';
import { validateOffer } from './validateOffer';

export interface SubmitOfferInput {
  negotiation: TransferNegotiation;
  offer: TransferOffer;
  buyer: ClubNegotiationContext;
  seller: ClubNegotiationContext;
  player: PlayerNegotiationContext;
  gameWeek: number;
  worldSeed: number;
  timestampIso: string;
  season: number;
  exchangePlayerIdsInBuyerSquad?: readonly string[];
}

export interface NegotiationFlowResult {
  ok: boolean;
  patches: RecruitmentPatch[];
  negotiation?: TransferNegotiation;
  event?: GameEvent;
  validationCodes?: readonly string[];
  evaluateCodes?: readonly string[];
}

export function submitNegotiationOffer(input: SubmitOfferInput): NegotiationFlowResult {
  const validation = validateOffer(
    input.buyer,
    input.seller,
    input.player,
    input.offer,
    { exchangePlayerIdsInBuyerSquad: input.exchangePlayerIdsInBuyerSquad },
  );
  if (!validation.valid) {
    return { ok: false, patches: [], validationCodes: validation.reasonCodes };
  }

  const evaluation = evaluateOffer({
    worldSeed: input.worldSeed,
    gameWeek: input.gameWeek,
    sellingClubId: input.seller.clubId,
    player: input.player,
    offer: input.offer,
    roundsUsed: input.negotiation.roundsUsed + 1,
    maxRounds: input.negotiation.maxRounds,
  });

  let status = input.negotiation.status;
  let counterOffer = input.negotiation.counterOffer;
  const reasonCodes = [...evaluation.reasonCodes];

  switch (evaluation.response) {
    case 'accepted':
      status = 'accepted';
      break;
    case 'counter':
      status = 'countered';
      counterOffer = evaluation.counterOffer;
      break;
    case 'rejected_insulting':
    case 'rejected_policy':
    case 'rejected_player_unwilling':
      status = 'rejected';
      break;
    case 'expired_rounds':
      status = 'expired';
      break;
    default:
      status = 'submitted';
  }

  const updated: TransferNegotiation = {
    ...input.negotiation,
    status,
    roundsUsed: input.negotiation.roundsUsed + 1,
    currentOffer: input.offer,
    counterOffer,
    lastReasonCodes: reasonCodes,
    updatedWeek: input.gameWeek,
  };

  const patches: RecruitmentPatch[] = [{ kind: 'upsertNegotiation', negotiation: updated }];

  const event: GameEvent = {
    id: `rec_neg_${updated.id}_${updated.roundsUsed}`,
    type: 'recruitment.negotiation.transition',
    timestamp: input.timestampIso,
    season: input.season,
    playerId: updated.playerId,
    clubId: input.buyer.clubId,
    severity: status === 'accepted' ? 'medium' : 'low',
    context: {
      negotiationId: updated.id,
      status,
      response: evaluation.response,
    },
  };

  return { ok: true, patches, negotiation: updated, event, evaluateCodes: evaluation.reasonCodes };
}

export function withdrawNegotiation(
  negotiation: TransferNegotiation,
  gameWeek: number,
): NegotiationFlowResult {
  if (negotiation.status === 'accepted' || negotiation.status === 'withdrawn') {
    return { ok: false, patches: [] };
  }
  const updated: TransferNegotiation = {
    ...negotiation,
    status: 'withdrawn',
    lastReasonCodes: ['withdrawn_by_buyer'],
    updatedWeek: gameWeek,
  };
  return { ok: true, patches: [{ kind: 'upsertNegotiation', negotiation: updated }], negotiation: updated };
}

export function acceptCounterOffer(
  negotiation: TransferNegotiation,
  gameWeek: number,
): NegotiationFlowResult {
  if (negotiation.status !== 'countered' || !negotiation.counterOffer) {
    return { ok: false, patches: [] };
  }
  const updated: TransferNegotiation = {
    ...negotiation,
    status: 'accepted',
    currentOffer: negotiation.counterOffer,
    lastReasonCodes: ['counter_accepted'],
    updatedWeek: gameWeek,
  };
  return { ok: true, patches: [{ kind: 'upsertNegotiation', negotiation: updated }], negotiation: updated };
}

export function createDraftNegotiation(params: {
  id: string;
  playerId: string;
  sellingClubId: string;
  buyingClubId: string;
  startedWeek: number;
  maxRounds?: number;
  initialOffer: TransferOffer;
}): TransferNegotiation {
  return {
    id: params.id,
    playerId: params.playerId,
    sellingClubId: params.sellingClubId,
    buyingClubId: params.buyingClubId,
    status: 'draft',
    roundsUsed: 0,
    maxRounds: params.maxRounds ?? 4,
    currentOffer: params.initialOffer,
    lastReasonCodes: [],
    startedWeek: params.startedWeek,
    updatedWeek: params.startedWeek,
  };
}
