/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ObservedPlayerView } from '../types';

export interface LoanSearchFilters {
  /** Minimum expected minutes share at destination (0–100). */
  minExpectedPlayingTimePct: number;
  /** League tier 1 (top) – 5 (lower). */
  minLeagueLevel: number;
  positions?: readonly string[];
  minTrainingFacilitiesLevel: number;
  minClubReputation: number;
  /** Minimum tactical fit score (0–100, caller/scout estimate). */
  minTacticalCompatibility: number;
  minEstimatedRating: number;
  requiresStarterRole: boolean;
  maxResults?: number;
}

/** Observed/caller-provided destination club (no hidden squad data). */
export interface LoanDestinationClubContext {
  clubId: string;
  leagueLevel: number;
  clubReputation: number;
  trainingFacilitiesLevel: number;
  expectedPlayingTimePct: number;
  tacticalCompatibility: number;
  starterOpportunity: boolean;
  wageSplitPercentOffered?: number;
  durationWeeksOffered?: number;
}

export interface LoanPlayerSearchContext {
  playerId: string;
  position: string;
  observed: ObservedPlayerView;
  weeklyWage?: number;
}

export type LoanRejectReason =
  | 'below_min_rating'
  | 'league_too_low'
  | 'playing_time_too_low'
  | 'facilities_too_low'
  | 'reputation_too_low'
  | 'tactical_fit_too_low'
  | 'position_mismatch'
  | 'starter_required'
  | 'confidence_too_low'
  | 'score_below_recommend_threshold';

export type LoanScoreReason =
  | 'strong_playing_time'
  | 'strong_development_league'
  | 'facilities_boost'
  | 'reputation_fit'
  | 'tactical_match'
  | 'starter_path'
  | 'youth_potential'
  | 'uncertainty_discount';

export interface LoanRecommendation {
  destinationClubId: string;
  score: number;
  rank: number;
  passedFilters: boolean;
  rejectReasons: readonly LoanRejectReason[];
  scoreReasons: readonly LoanScoreReason[];
  suggestedWageSplitPercent: number;
  suggestedDurationWeeks: number;
}

export interface SearchLoanTargetsInput {
  worldSeed: number;
  gameWeek: number;
  borrowerClubId: string;
  player: LoanPlayerSearchContext;
  filters: LoanSearchFilters;
  destinations: readonly LoanDestinationClubContext[];
  maxDestinationsEvaluated?: number;
}

export interface SearchLoanTargetsResult {
  recommendations: LoanRecommendation[];
  evaluatedCount: number;
  capApplied: number;
}
