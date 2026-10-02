/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { RECRUITMENT_TUNING as T } from '../config/recruitmentTuning';
import { checkPermanentTransferAllowed, isTransferWindowOpen } from '../world/transferWindow';
import type { ClubNegotiationContext, OfferValidationCode, OfferValidationResult, PlayerNegotiationContext } from './contextTypes';
import type { TransferOffer, TransferOfferClause } from './offerTypes';
import { computeUpfrontCash, isLoanOffer } from './offerTypes';

function validateClause(clause: TransferOfferClause): OfferValidationCode[] {
  const codes: OfferValidationCode[] = [];
  switch (clause.kind) {
    case 'fee':
      if (clause.amount <= 0) codes.push('invalid_clause_amount');
      break;
    case 'installments':
      if (clause.upfront < 0) codes.push('invalid_clause_amount');
      if (clause.installments.some((i) => i.amount <= 0 || i.dueWeek < 0)) {
        codes.push('invalid_installment_schedule');
      }
      break;
    case 'sell_on':
      if (clause.percent <= 0 || clause.percent > 50) codes.push('invalid_sell_on_percent');
      break;
    case 'player_exchange':
      if (clause.valuedAt <= 0) codes.push('invalid_clause_amount');
      break;
    case 'bonus':
    case 'performance_bonus':
    case 'release_clause':
    case 'loan':
    case 'loan_with_option':
    case 'loan_with_obligation':
      if ('amount' in clause && (clause as { amount: number }).amount <= 0) {
        codes.push('invalid_clause_amount');
      }
      break;
    default:
      break;
  }
  return codes;
}

export function validateOffer(
  buyer: ClubNegotiationContext,
  seller: ClubNegotiationContext,
  player: PlayerNegotiationContext,
  offer: TransferOffer,
  options?: { exchangePlayerIdsInBuyerSquad?: readonly string[] },
): OfferValidationResult {
  const reasonCodes: OfferValidationCode[] = [];

  if (offer.clauses.length === 0) reasonCodes.push('offer_missing_terms');
  if (offer.playerId !== player.playerId) reasonCodes.push('wrong_buyer');
  if (offer.fromClubId !== buyer.clubId || offer.toClubId !== seller.clubId) {
    reasonCodes.push('wrong_seller');
  }

  const loan = isLoanOffer(offer.clauses);
  const permanentCheck = checkPermanentTransferAllowed(buyer.transferWindow);
  if (!loan && !permanentCheck.allowed) reasonCodes.push('window_closed');
  if (loan && !isTransferWindowOpen(buyer.transferWindow) && !T.negotiation.allowLoanWhenWindowClosed) {
    reasonCodes.push('loan_not_allowed_outside_window');
  }

  for (const clause of offer.clauses) {
    reasonCodes.push(...validateClause(clause));
    if (clause.kind === 'player_exchange') {
      const ok = options?.exchangePlayerIdsInBuyerSquad?.includes(clause.playerId);
      if (!ok) reasonCodes.push('unknown_player_exchange');
    }
  }

  const cash = computeUpfrontCash(offer.clauses);
  if (cash > buyer.coinsAvailable) reasonCodes.push('insufficient_budget');

  const wageLoad = player.weeklyWage;
  if (wageLoad > buyer.wageBudgetRemainingWeekly) reasonCodes.push('wage_budget_exceeded');

  if (!loan && buyer.squadSize >= buyer.maxSquadSize) reasonCodes.push('squad_limit_reached');

  const unique = [...new Set(reasonCodes)];
  return { valid: unique.length === 0, reasonCodes: unique };
}
