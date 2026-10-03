/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { clamp } from '../../shared/math';
import { RECRUITMENT_TUNING as T } from '../config/recruitmentTuning';
import type {
  LoanDestinationClubContext,
  LoanPlayerSearchContext,
  LoanRejectReason,
  LoanScoreReason,
  LoanSearchFilters,
} from './loanTypes';

export interface LoanFilterResult {
  passed: boolean;
  rejectReasons: LoanRejectReason[];
}

export function applyLoanHardFilters(
  player: LoanPlayerSearchContext,
  destination: LoanDestinationClubContext,
  filters: LoanSearchFilters,
): LoanFilterResult {
  const rejectReasons: LoanRejectReason[] = [];

  if (player.observed.estimatedRating < filters.minEstimatedRating) {
    rejectReasons.push('below_min_rating');
  }
  if (destination.leagueLevel > filters.minLeagueLevel) {
    rejectReasons.push('league_too_low');
  }
  if (destination.expectedPlayingTimePct < filters.minExpectedPlayingTimePct) {
    rejectReasons.push('playing_time_too_low');
  }
  if (destination.trainingFacilitiesLevel < filters.minTrainingFacilitiesLevel) {
    rejectReasons.push('facilities_too_low');
  }
  if (destination.clubReputation < filters.minClubReputation) {
    rejectReasons.push('reputation_too_low');
  }
  if (destination.tacticalCompatibility < filters.minTacticalCompatibility) {
    rejectReasons.push('tactical_fit_too_low');
  }
  if (filters.positions && filters.positions.length > 0 && !filters.positions.includes(player.position)) {
    rejectReasons.push('position_mismatch');
  }
  if (filters.requiresStarterRole && !destination.starterOpportunity) {
    rejectReasons.push('starter_required');
  }
  if (player.observed.confidencePct < T.loans.minConfidencePct) {
    rejectReasons.push('confidence_too_low');
  }

  return { passed: rejectReasons.length === 0, rejectReasons };
}

export function scoreLoanDestination(
  player: LoanPlayerSearchContext,
  destination: LoanDestinationClubContext,
): { score: number; scoreReasons: LoanScoreReason[] } {
  const scoreReasons: LoanScoreReason[] = [];
  const w = T.loans.scoreWeights;

  const playingTime = destination.expectedPlayingTimePct * w.playingTime;
  if (destination.expectedPlayingTimePct >= T.loans.strongPlayingTimeThreshold) {
    scoreReasons.push('strong_playing_time');
  }

  const leagueScore = clamp((6 - destination.leagueLevel) * 18, 0, 90) * w.leagueLevel;
  if (destination.leagueLevel <= 2) scoreReasons.push('strong_development_league');

  const facilities = destination.trainingFacilitiesLevel * w.trainingFacilities;
  if (destination.trainingFacilitiesLevel >= T.loans.strongFacilitiesThreshold) {
    scoreReasons.push('facilities_boost');
  }

  const reputation = destination.clubReputation * w.clubReputation;
  if (destination.clubReputation >= 70) scoreReasons.push('reputation_fit');

  const tactical = destination.tacticalCompatibility * w.tacticalCompatibility;
  if (destination.tacticalCompatibility >= 75) scoreReasons.push('tactical_match');

  const ratingFit = clamp(player.observed.estimatedRating, 0, 99) * w.estimatedRating;

  let starterBoost = 0;
  if (destination.starterOpportunity) {
    starterBoost = T.loans.starterRoleBonus * w.starterRole;
    scoreReasons.push('starter_path');
  }

  let potentialBoost = 0;
  if (player.observed.estimatedPotential >= T.loans.highPotentialThreshold) {
    potentialBoost = T.loans.youthPotentialBonus;
    scoreReasons.push('youth_potential');
  }

  const uncertaintyPenalty =
    clamp(100 - player.observed.confidencePct, 0, 100) * T.loans.uncertaintyPenaltyScale;
  if (uncertaintyPenalty > 0) scoreReasons.push('uncertainty_discount');

  const raw =
    playingTime +
    leagueScore +
    facilities +
    reputation +
    tactical +
    ratingFit +
    starterBoost +
    potentialBoost -
    uncertaintyPenalty;

  return { score: clamp(Math.round(raw), 0, 100), scoreReasons };
}

export function defaultLoanTerms(
  destination: LoanDestinationClubContext,
): { wageSplitPercent: number; durationWeeks: number } {
  return {
    wageSplitPercent: destination.wageSplitPercentOffered ?? T.loans.defaultWageSplitPercent,
    durationWeeks: destination.durationWeeksOffered ?? T.loans.defaultDurationWeeks,
  };
}
