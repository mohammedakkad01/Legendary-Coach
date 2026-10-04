/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo } from 'react';
import { useGameStore } from '../state/useGameStore';
import {
  collectDismissedDedupeKeys,
  filterRecommendationsByIgnore,
  runPreMatchAnalyst,
  runPostMatchAnalyst,
  wrapBestTacticsAsRecommendation,
  computeInformationConfidence,
  type Recommendation,
} from '../domain/assistant';
import { buildBestTacticsInput } from './bestTactics/bestTacticsInput';
import { deriveOpponentProfile } from '../domain/tactics/bestTactics';
import { getMaxBenchSlots } from '../domain/vip/vipCalculations';

export function useAssistantRecommendations(): {
  preMatchAnalysis: ReturnType<typeof runPreMatchAnalyst> | null;
  preMatchRecommendations: Recommendation[];
  postMatchRecommendations: Recommendation[];
  dashboardTop: Recommendation[];
} {
  const state = useGameStore();
  const {
    preMatchPreview,
    nextMatchInsight,
    livingWorld,
    club,
    leagueStandings,
    clubManagement,
    matchHistory,
    activeMatchRecord,
    vipPoints,
  } = state;

  const dismissed = useMemo(
    () => collectDismissedDedupeKeys(livingWorld?.eventLog ?? []),
    [livingWorld?.eventLog],
  );

  const preMatch = preMatchPreview ?? nextMatchInsight;

  const analyticsLevel = clubManagement?.facilities.analyticsDepartmentLevel ?? 1;

  const preMatchAnalysis = useMemo(() => {
    if (!preMatch) return null;
    const oppScout = livingWorld?.opponentTacticalScouting?.[preMatch.fixture.opponentClubId];
    const oppStanding = leagueStandings.find((s) => s.clubId === preMatch.fixture.opponentClubId);
    const assignedRef = activeMatchRecord?.referee ?? null;
    return runPreMatchAnalyst({
      preMatch,
      analyticsDepartmentLevel: analyticsLevel,
      opponentScouting: oppScout,
      opponentStanding: oppStanding,
      assignedReferee: assignedRef,
    });
  }, [preMatch, analyticsLevel, livingWorld?.opponentTacticalScouting, leagueStandings, activeMatchRecord?.referee]);

  const preMatchRecommendations = useMemo(() => {
    if (!preMatch || !preMatchAnalysis) return [];
    const infoConf = preMatchAnalysis.overallConfidence;
    const input = buildBestTacticsInput(
      club,
      deriveOpponentProfile(preMatch.opponentClub),
      getMaxBenchSlots(vipPoints),
    );
    const { recommendation } = wrapBestTacticsAsRecommendation(input, infoConf);
    const recs = recommendation ? [recommendation] : [];
    return filterRecommendationsByIgnore(recs, dismissed);
  }, [preMatch, preMatchAnalysis, club, vipPoints, dismissed]);

  const postMatchRecommendations = useMemo(() => {
    const last = matchHistory[0];
    if (!last?.isFinished) return [];
    const { recommendations } = runPostMatchAnalyst({
      record: last,
      clubId: club.id,
      analyticsDepartmentLevel: analyticsLevel,
    });
    return filterRecommendationsByIgnore(recommendations, dismissed);
  }, [matchHistory, club, analyticsLevel, dismissed]);

  const dashboardTop = useMemo(() => {
    const merged = [...preMatchRecommendations, ...postMatchRecommendations].slice(0, 3);
    return merged;
  }, [preMatchRecommendations, postMatchRecommendations]);

  return {
    preMatchAnalysis,
    preMatchRecommendations,
    postMatchRecommendations,
    dashboardTop,
  };
}
