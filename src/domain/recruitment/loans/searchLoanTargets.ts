/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { RECRUITMENT_TUNING as T } from '../config/recruitmentTuning';
import { recruitmentRng } from '../rng/recruitmentRng';
import { applyLoanHardFilters, defaultLoanTerms, scoreLoanDestination } from './loanScore';
import type {
  LoanRecommendation,
  SearchLoanTargetsInput,
  SearchLoanTargetsResult,
} from './loanTypes';

function tieBreakScore(
  worldSeed: number,
  gameWeek: number,
  borrowerClubId: string,
  playerId: string,
  destinationClubId: string,
  baseScore: number,
): number {
  const rng = recruitmentRng(
    worldSeed,
    gameWeek,
    borrowerClubId,
    `${playerId}|${destinationClubId}`,
    'loan_search_rank',
  );
  return baseScore + rng.nextRange(0, 99) / 1000;
}

export function searchLoanTargets(input: SearchLoanTargetsInput): SearchLoanTargetsResult {
  const cap = input.maxDestinationsEvaluated ?? T.loans.maxDestinationsPerSearch;
  const destinations = input.destinations.slice(0, cap);
  const maxResults = input.filters.maxResults ?? T.loans.defaultMaxResults;

  const scored: LoanRecommendation[] = destinations.map((destination) => {
    const filter = applyLoanHardFilters(input.player, destination, input.filters);
    const terms = defaultLoanTerms(destination);
    if (!filter.passed) {
      return {
        destinationClubId: destination.clubId,
        score: 0,
        rank: 0,
        passedFilters: false,
        rejectReasons: filter.rejectReasons,
        scoreReasons: [],
        suggestedWageSplitPercent: terms.wageSplitPercent,
        suggestedDurationWeeks: terms.durationWeeks,
      };
    }

    const { score, scoreReasons } = scoreLoanDestination(input.player, destination);
    return {
      destinationClubId: destination.clubId,
      score,
      rank: 0,
      passedFilters: score >= T.loans.minRecommendScore,
      rejectReasons:
        score < T.loans.minRecommendScore ? (['score_below_recommend_threshold'] as const) : [],
      scoreReasons,
      suggestedWageSplitPercent: terms.wageSplitPercent,
      suggestedDurationWeeks: terms.durationWeeks,
    };
  });

  const passing = scored
    .filter((r) => r.passedFilters && r.score > 0)
    .sort(
      (a, b) =>
        tieBreakScore(
          input.worldSeed,
          input.gameWeek,
          input.borrowerClubId,
          input.player.playerId,
          b.destinationClubId,
          b.score,
        ) -
        tieBreakScore(
          input.worldSeed,
          input.gameWeek,
          input.borrowerClubId,
          input.player.playerId,
          a.destinationClubId,
          a.score,
        ),
    )
    .slice(0, maxResults)
    .map((row, index) => ({ ...row, rank: index + 1 }));

  const failing = scored.filter((r) => !r.passedFilters);

  return {
    recommendations: [...passing, ...failing],
    evaluatedCount: destinations.length,
    capApplied: cap,
  };
}
