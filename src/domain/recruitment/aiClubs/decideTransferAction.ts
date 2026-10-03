/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { clamp } from '../../shared/math';
import { RECRUITMENT_TUNING as T } from '../config/recruitmentTuning';
import { recruitmentRng } from '../rng/recruitmentRng';
import type {
  AiTransferActionKind,
  DecideTransferActionInput,
  DecideTransferActionResult,
} from './clubProfileTypes';
import {
  budgetFitScore,
  maxAffordableFee,
  scoreObservedFit,
  uncertaintyPenalty,
  willingnessModifier,
} from './scoreCandidate';

function decideBuy(input: Extract<DecideTransferActionInput, { mode: 'buy' }>): DecideTransferActionResult {
  const {
    profile,
    finances,
    squadNeeds,
    observedPlayer,
    playerWillingness,
    worldSeed,
    gameWeek,
    actingClubId,
  } = input;
  const reasonCodes: string[] = [];
  const observed = observedPlayer;

  if (finances.squadSize >= finances.maxSquadSize) {
    return { action: 'pass', interestLevel: 0, reasonCodes: ['squad_full'] };
  }

  if (!input.transferWindowOpen) {
    return { action: 'wait', interestLevel: 0, reasonCodes: ['window_closed'] };
  }

  const fit = scoreObservedFit(profile, squadNeeds, observed);
  const budgetFit = budgetFitScore(observed, profile, finances);
  const uncertainty = uncertaintyPenalty(observed);
  const willingness = willingnessModifier(playerWillingness);

  let interest = clamp(fit * 0.45 + budgetFit * 0.35 + willingness - uncertainty, 0, 100);

  if (playerWillingness.band === 'refuse') {
    return { action: 'pass', interestLevel: clamp(interest, 0, 35), reasonCodes: ['player_unwilling'] };
  }

  if (observed.confidencePct < profile.minScoutConfidenceToBid) {
    return {
      action: 'scout_longer',
      interestLevel: interest,
      reasonCodes: ['insufficient_scout_confidence'],
    };
  }

  const affordable = maxAffordableFee(profile, finances);
  const suggestedMaxFee = Math.min(affordable, observed.valueRange.max);

  if (affordable < observed.valueRange.min) {
    if (
      profile.loanPreference >= T.aiClubs.loanPreferenceThreshold &&
      input.permanentTransferAllowed
    ) {
      return {
        action: 'offer_loan',
        interestLevel: interest,
        reasonCodes: ['budget_prefers_loan'],
        suggestedMaxFee,
      };
    }
    return { action: 'pass', interestLevel: interest, reasonCodes: ['budget_exceeded'], suggestedMaxFee };
  }

  if (fit < T.aiClubs.minFitToRegisterInterest) {
    return { action: 'pass', interestLevel: interest, reasonCodes: ['poor_squad_fit'] };
  }

  const rng = recruitmentRng(
    worldSeed,
    gameWeek,
    actingClubId,
    observed.playerId,
    'ai_transfer_decision',
  );
  const riskJitter = profile.riskTolerance === 'high' ? 8 : profile.riskTolerance === 'low' ? -6 : 0;
  interest = clamp(interest + riskJitter + rng.nextRange(-3, 3), 0, 100);

  if (interest >= T.aiClubs.interestThresholds.bidImmediately && budgetFit >= 85) {
    reasonCodes.push('high_interest_and_budget');
    return { action: 'bid_immediately', interestLevel: interest, reasonCodes, suggestedMaxFee };
  }

  if (interest >= T.aiClubs.interestThresholds.negotiate) {
    reasonCodes.push('strong_interest');
    return { action: 'negotiate', interestLevel: interest, reasonCodes, suggestedMaxFee };
  }

  if (interest >= T.aiClubs.interestThresholds.registerInterest) {
    reasonCodes.push('moderate_interest');
    return { action: 'register_interest', interestLevel: interest, reasonCodes, suggestedMaxFee };
  }

  if (
    profile.loanPreference >= T.aiClubs.loanPreferenceThreshold &&
    budgetFit < 70 &&
    budgetFit >= 40
  ) {
    return { action: 'offer_loan', interestLevel: interest, reasonCodes: ['loan_shortlist'], suggestedMaxFee };
  }

  return { action: 'pass', interestLevel: interest, reasonCodes: ['below_interest_threshold'], suggestedMaxFee };
}

function decideSell(input: Extract<DecideTransferActionInput, { mode: 'sell' }>): DecideTransferActionResult {
  const { profile, observedPlayer, playerMotivation, finances, hasReplacementReady } = input;
  const desire = playerMotivation.projectedTransferDesire;
  let interest = clamp(desire * 0.6 + profile.financialPressure * 0.35, 0, 100);

  if (profile.philosophy === 'youth_development' && observedPlayer.estimatedPotential >= 78) {
    return {
      action: 'hold_asset',
      interestLevel: interest,
      reasonCodes: ['youth_policy_protects_prospect'],
    };
  }

  if (!hasReplacementReady && profile.riskTolerance === 'low') {
    return { action: 'hold_asset', interestLevel: interest, reasonCodes: ['no_replacement_ready'] };
  }

  const sellThreshold =
    profile.sellWillingnessBase +
    profile.financialPressure * 0.25 +
    (hasReplacementReady ? 12 : 0) +
    (desire >= T.motivation.highDesireThreshold ? 15 : 0);

  if (input.inboundOfferFee !== undefined && input.inboundOfferFee >= observedPlayer.valueRange.min) {
    return {
      action: desire >= T.motivation.lowDesireThreshold ? 'list_for_sale' : 'hold_asset',
      interestLevel: interest,
      reasonCodes: ['inbound_offer_considered'],
    };
  }

  if (interest >= sellThreshold || finances.transferBudget < T.aiClubs.sellPressureBudgetFloor) {
    return {
      action: 'list_for_sale',
      interestLevel: interest,
      reasonCodes: ['sell_strategy_or_pressure'],
    };
  }

  return { action: 'hold_asset', interestLevel: interest, reasonCodes: ['hold_preferred'] };
}

export function decideTransferAction(input: DecideTransferActionInput): DecideTransferActionResult {
  if (input.mode === 'buy') return decideBuy(input);
  return decideSell(input);
}

export function isAggressiveBuyAction(action: AiTransferActionKind): boolean {
  return action === 'bid_immediately' || action === 'negotiate';
}
