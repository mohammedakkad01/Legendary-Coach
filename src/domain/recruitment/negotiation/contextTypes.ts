/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { TransferWindowState } from '../types';

/** Budget / squad checks only (Phase E expands finance). */
export interface ClubNegotiationContext {
  clubId: string;
  coinsAvailable: number;
  wageBudgetRemainingWeekly: number;
  squadSize: number;
  maxSquadSize: number;
  transferWindow: TransferWindowState;
}

/** Player/agent side — no hidden potential; uses values safe for evaluation inputs. */
export interface PlayerNegotiationContext {
  playerId: string;
  personality: string;
  weeklyWage: number;
  /** Agent reference value (from observed estimate or agreed listing). */
  referenceMarketValue: number;
  transferDesire: number;
  contractYearsRemaining: number;
}

export type OfferValidationCode =
  | 'window_closed'
  | 'loan_not_allowed_outside_window'
  | 'insufficient_budget'
  | 'wage_budget_exceeded'
  | 'squad_limit_reached'
  | 'invalid_clause_amount'
  | 'invalid_sell_on_percent'
  | 'invalid_installment_schedule'
  | 'unknown_player_exchange'
  | 'offer_missing_terms'
  | 'wrong_buyer'
  | 'wrong_seller'
  | 'negotiation_not_open';

export interface OfferValidationResult {
  valid: boolean;
  reasonCodes: readonly OfferValidationCode[];
}

export type EvaluateResponseCode =
  | 'accepted'
  | 'counter'
  | 'rejected_insulting'
  | 'rejected_policy'
  | 'rejected_player_unwilling'
  | 'expired_rounds'
  | 'withdrawn';

export interface EvaluateOfferResult {
  response: EvaluateResponseCode;
  reasonCodes: readonly string[];
  counterOffer?: import('./offerTypes').TransferOffer;
}
