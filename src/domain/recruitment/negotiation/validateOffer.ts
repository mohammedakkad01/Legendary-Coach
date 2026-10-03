/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { RECRUITMENT_TUNING as T } from '../config/recruitmentTuning';
import { checkPermanentTransferAllowed, isTransferWindowOpen } from '../world/transferWindow';
import type { ClubNegotiationContext, OfferValidationCode, OfferValidationResult, PlayerNegotiationContext } from './contextTypes';
import type { TransferOffer, TransferOfferClause } from './offerTypes';
import { computeUpfrontCash, isLoanOffer } from './offerTypes';

const MAX_CALENDAR_WEEK = 52;

function isValidWageSplit(percent: number): boolean {
  return Number.isFinite(percent) && percent > 0 && percent <= 100;
}

function isValidDurationWeeks(weeks: number): boolean {
  return Number.isFinite(weeks) && weeks > 0 && weeks <= MAX_CALENDAR_WEEK * 3;
}

function validateClause(clause: TransferOfferClause): OfferValidationCode[] {
  const codes: OfferValidationCode[] = [];
  switch (clause.kind) {
    case 'fee':
      if (clause.amount <= 0) codes.push('invalid_clause_amount');
      break;
    case 'installments': {
      if (clause.upfront < 0) codes.push('invalid_clause_amount');
      if (clause.installments.length === 0) {
        codes.push('invalid_installment_schedule');
        break;
      }
      let installmentTotal = 0;
      for (const i of clause.installments) {
        if (i.amount <= 0 || i.dueWeek < 0 || i.dueWeek > MAX_CALENDAR_WEEK) {
          codes.push('invalid_installment_schedule');
        }
        installmentTotal += i.amount;
      }
      if (clause.upfront + installmentTotal <= 0) codes.push('invalid_clause_amount');
      break;
    }
    case 'bonus':
      if (clause.amount <= 0) codes.push('invalid_clause_amount');
      if (!clause.label.trim()) codes.push('invalid_bonus_fields');
      if (!['appearance', 'goal', 'promotion'].includes(clause.condition)) {
        codes.push('invalid_bonus_fields');
      }
      break;
    case 'sell_on':
      if (clause.percent <= 0 || clause.percent > T.negotiation.maxSellOnPercent) {
        codes.push('invalid_sell_on_percent');
      }
      break;
    case 'player_exchange':
      if (!clause.playerId.trim()) codes.push('invalid_player_exchange');
      if (clause.valuedAt <= 0) codes.push('invalid_clause_amount');
      break;
    case 'loan':
      if (!isValidDurationWeeks(clause.durationWeeks) || !isValidWageSplit(clause.wageSplitPercent)) {
        codes.push('invalid_loan_terms');
      }
      break;
    case 'loan_with_option':
      if (
        !isValidDurationWeeks(clause.durationWeeks) ||
        !isValidWageSplit(clause.wageSplitPercent) ||
        clause.optionFee <= 0
      ) {
        codes.push('invalid_loan_terms');
      }
      break;
    case 'loan_with_obligation':
      if (
        !isValidDurationWeeks(clause.durationWeeks) ||
        !isValidWageSplit(clause.wageSplitPercent) ||
        clause.obligationFee <= 0
      ) {
        codes.push('invalid_loan_terms');
      }
      break;
    case 'performance_bonus':
      if (clause.amount <= 0) codes.push('invalid_clause_amount');
      if (!clause.metric.trim() || !Number.isFinite(clause.threshold) || clause.threshold < 0) {
        codes.push('invalid_performance_bonus');
      }
      break;
    case 'release_clause':
      if (clause.amount <= 0) codes.push('invalid_clause_amount');
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

  if (player.availableForTransfer === false) reasonCodes.push('player_unavailable');

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
      if (!clause.playerId.trim()) {
        reasonCodes.push('invalid_player_exchange');
      } else {
        const ok = options?.exchangePlayerIdsInBuyerSquad?.includes(clause.playerId);
        if (options?.exchangePlayerIdsInBuyerSquad && !ok) reasonCodes.push('unknown_player_exchange');
      }
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
