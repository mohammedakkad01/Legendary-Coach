/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Shared next-fixture + insight summary (used by NextMatchCard and unified dashboard).
 */

import { useEffect, useMemo } from 'react';
import { useGameStore } from '../state/useGameStore';

export function useNextMatchSummary() {
  const {
    club,
    leagueFixtures,
    leagueStandings,
    nextMatchInsight,
    loadNextMatchInsight,
    isLoadingMatch,
    language,
    vipPoints,
  } = useGameStore();

  const isAr = language === 'ar';
  const squadLineupKey = club.footballLineup?.join(',') ?? '';

  const nextFixture = useMemo(
    () => leagueFixtures.find((f) => !f.played),
    [leagueFixtures],
  );

  const lastPlayed = useMemo(
    () => [...leagueFixtures].reverse().find((f) => f.played),
    [leagueFixtures],
  );

  const seasonFinished = leagueFixtures.length > 0 && !nextFixture;

  useEffect(() => {
    loadNextMatchInsight();
  }, [leagueFixtures, club.id, squadLineupKey, vipPoints, loadNextMatchInsight]);

  const rank = useMemo(() => {
    const sorted = [...leagueStandings].sort(
      (a, b) =>
        b.points - a.points ||
        b.goalDifference - a.goalDifference ||
        b.goalsFor - a.goalsFor,
    );
    const idx = sorted.findIndex((s) => s.clubId === club.id);
    return idx >= 0 ? { pos: idx + 1, total: sorted.length } : null;
  }, [leagueStandings, club.id]);

  const insight = useMemo(() => {
    if (!nextFixture || !nextMatchInsight) return null;
    if (nextMatchInsight.fixture.matchday !== nextFixture.matchday) return null;
    return nextMatchInsight;
  }, [nextFixture, nextMatchInsight]);

  const gap = insight?.technicalGap ?? 0;

  const gapSummaryEn = !insight
    ? ''
    : gap > 1
      ? `You lead by ${gap} rating points`
      : gap < -1
        ? `Opponent leads by ${Math.abs(gap)} rating points`
        : 'Teams are evenly matched';

  const gapSummaryAr = !insight
    ? ''
    : gap > 1
      ? `أفضلية فنية لك بفارق ${gap}`
      : gap < -1
        ? `الخصم أقوى فنياً بفارق ${Math.abs(gap)}`
        : 'مستوى الفريقين متقارب جداً';

  return {
    isAr,
    club,
    nextFixture,
    lastPlayed,
    seasonFinished,
    insight,
    isLoadingMatch,
    rank,
    gap,
    gapSummaryEn,
    gapSummaryAr,
  };
}
