/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Player } from '../../../types/game';
import type { GameEvent } from '../../livingWorld/types';
import { recruitmentRng } from '../../recruitment/rng/recruitmentRng';
import { searchLoanTargets } from '../../recruitment/loans/searchLoanTargets';
import type {
  LoanDestinationClubContext,
  LoanSearchFilters,
} from '../../recruitment/loans/loanTypes';
import { getObservedPlayerView } from '../../recruitment/knowledge/observedView';
import type { RecruitmentPatch, RecruitmentWorldState } from '../../recruitment/types';
import { RECRUITMENT_TUNING as T } from '../../recruitment/config/recruitmentTuning';

export interface DelegatedLoanSearchResult {
  patches: RecruitmentPatch[];
  events: GameEvent[];
  reasonCodes: string[];
  summaryCode: string;
  ok: boolean;
}

function pickLoanCandidate(
  squad: readonly Player[],
  worldSeed: number,
  gameWeek: number,
  clubId: string,
): Player | undefined {
  const youth = squad.filter((p) => p.age <= 23);
  const pool = youth.length > 0 ? youth : [...squad];
  if (pool.length === 0) return undefined;
  const rng = recruitmentRng(worldSeed, gameWeek, clubId, 'delegation_loan_player', 'loan_search_rank');
  return pool[rng.nextRange(0, pool.length - 1)];
}

export function runDelegatedLoanSearch(params: {
  world: RecruitmentWorldState;
  userClubId: string;
  squad: readonly Player[];
  destinations: readonly LoanDestinationClubContext[];
  gameWeek: number;
  season: number;
  timestampIso: string;
  quality: number;
}): DelegatedLoanSearchResult {
  const reasonCodes: string[] = [];
  const patches: RecruitmentPatch[] = [];
  const events: GameEvent[] = [];

  if (params.destinations.length === 0) {
    reasonCodes.push('no_passing_destinations');
    return {
      patches,
      events,
      reasonCodes,
      summaryCode: 'delegation_loan_degraded',
      ok: false,
    };
  }

  const player = pickLoanCandidate(
    params.squad,
    params.world.worldSeed,
    params.gameWeek,
    params.userClubId,
  );
  if (!player) {
    reasonCodes.push('no_loan_candidate');
    return {
      patches,
      events,
      reasonCodes,
      summaryCode: 'delegation_loan_degraded',
      ok: false,
    };
  }

  reasonCodes.push(`player_${player.id}`);

  const observed =
    getObservedPlayerView(params.world, params.userClubId, player.id) ?? {
      playerId: player.id,
      observerClubId: params.userClubId,
      confidencePct: 90,
      ratingRange: { min: player.overall - 2, max: player.overall + 2 },
      potentialBand: { min: player.potential - 3, max: player.potential + 3 },
      valueRange: { min: player.marketValue, max: player.marketValue },
      revealedGroups: ['technical', 'physical'],
      estimatedRating: player.overall,
      estimatedPotential: player.potential,
      estimatedValue: player.marketValue,
    };

  const strictness = params.quality;
  const filters: LoanSearchFilters = {
    minExpectedPlayingTimePct: Math.round(45 + strictness * 20),
    minLeagueLevel: strictness >= 0.85 ? 2 : 3,
    minTrainingFacilitiesLevel: Math.round(4 + strictness * 3),
    minClubReputation: Math.round(35 + strictness * 25),
    minTacticalCompatibility: Math.round(50 + strictness * 15),
    minEstimatedRating: Math.round(48 + strictness * 12),
    requiresStarterRole: strictness >= 0.9,
    maxResults: T.loans.defaultMaxResults,
  };

  const search = searchLoanTargets({
    worldSeed: params.world.worldSeed,
    gameWeek: params.gameWeek,
    borrowerClubId: params.userClubId,
    player: {
      playerId: player.id,
      position: player.position,
      observed,
      weeklyWage: player.wage,
    },
    filters,
    destinations: params.destinations,
  });

  reasonCodes.push(`evaluated_${search.evaluatedCount}`);

  const passing = search.recommendations.filter((r) => r.passedFilters && r.rank > 0);
  if (passing.length === 0) {
    reasonCodes.push('no_passing_destinations');
    return {
      patches,
      events,
      reasonCodes,
      summaryCode: 'delegation_loan_degraded',
      ok: false,
    };
  }

  const top = passing[0]!;
  reasonCodes.push(`top_destination_${top.destinationClubId}`, `rank_score_${Math.round(top.score)}`);

  const interestId = `delegation_loan_interest_${params.world.worldSeed}_${params.gameWeek}_${player.id}`;
  patches.push({
    kind: 'appendClubInterest',
    interest: {
      id: interestId,
      interestedClubId: top.destinationClubId,
      playerId: player.id,
      sellerClubId: params.userClubId,
      interestLevel: Math.min(100, Math.max(1, Math.round(top.score))),
      createdWeek: params.gameWeek,
    },
  });

  events.push({
    id: `evt_delegation_loan_${params.gameWeek}_${player.id}`,
    type: 'staff.report',
    timestamp: params.timestampIso,
    season: params.season,
    clubId: params.userClubId,
    playerId: player.id,
    severity: 'low',
    context: {
      task: 'loan_search',
      summaryCode: 'delegation_loan_recommendations',
      destinationClubId: top.destinationClubId,
      score: Math.round(top.score),
      rank: top.rank,
      scoreReasons: top.scoreReasons.join(','),
    },
  });

  return {
    patches,
    events,
    reasonCodes,
    summaryCode: 'delegation_loan_recommendations',
    ok: true,
  };
}
