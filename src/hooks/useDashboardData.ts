/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Custom hook to prepare Dashboard statistics, VIP info, and season/match progression.
 */

import { useMemo } from 'react';
import { useGameStore } from '../state/useGameStore';
import { useFirebase } from '../firebase/FirebaseContext';
import { VIP_LEVELS } from '../data/vipData';

export function useDashboardData() {
  const { 
    club, 
    vipPoints, 
    vipClaimedToday, 
    claimDailyVIPReward, 
    checkInStreak, 
    checkInClaimedToday, 
    claimDailyCheckIn,
    storyMissions, 
    setActiveTab, 
    startNewMatch, 
    skipAndSimulateNextMatch,
    setClubSelectionModalOpen,
    dailyMissions,
    setDailyMissionsModalOpen,
    startTacticalDuel,
    runSquadRecoverySession,
    hasSelectedInitialClub,
    isLoadingMatch,
    leagueStandings,
    leagueFixtures,
    matchHistory,
    setSeasonFinaleModalOpen,
    language 
  } = useGameStore();

  const { user, setAuthModalOpen } = useFirebase();
  const isAr = language === 'ar';

  const squad = club.footballSquad || [];
  const avgFatigue = useMemo(() => {
    return squad.length > 0 
      ? Math.round(squad.reduce((acc, p) => acc + (p.fatigue || 0), 0) / squad.length)
      : 0;
  }, [squad]);

  const totalDaily = dailyMissions?.length || 0;
  const completedDaily = useMemo(() => {
    return (dailyMissions || []).filter(m => m.current >= m.target).length;
  }, [dailyMissions]);

  const claimedDaily = useMemo(() => {
    return (dailyMissions || []).filter(m => m.isClaimed).length;
  }, [dailyMissions]);

  // VIP Tier calculation
  const { currentTier, nextTier } = useMemo(() => {
    let current = VIP_LEVELS[0];
    let next = VIP_LEVELS[1];
    for (let i = 0; i < VIP_LEVELS.length; i++) {
      if (vipPoints >= VIP_LEVELS[i].pointsRequired) {
        current = VIP_LEVELS[i];
        next = VIP_LEVELS[i + 1] || VIP_LEVELS[i];
      }
    }
    return { currentTier: current, nextTier: next };
  }, [vipPoints]);

  const nextMission = useMemo(() => {
    return storyMissions.find(m => !m.isCompleted);
  }, [storyMissions]);

  const completedMissionsCount = useMemo(() => {
    return storyMissions.filter(m => m.isCompleted).length;
  }, [storyMissions]);

  const nextFixture = useMemo(() => {
    return (leagueFixtures || []).find(f => !f.played);
  }, [leagueFixtures]);

  const currentRound = nextFixture ? nextFixture.matchday : ((leagueFixtures || []).length > 0 ? leagueFixtures.length : 1);
  const totalRounds = (leagueFixtures || []).length > 0 ? leagueFixtures[leagueFixtures.length - 1].matchday : 38;
  const seasonFinished = (leagueFixtures || []).length > 0 && !nextFixture;

  const standing = useMemo(() => {
    return (leagueStandings || []).find(s => s.clubId === club.id);
  }, [leagueStandings, club.id]);

  const last3Form: ('W' | 'D' | 'L')[] = useMemo(() => {
    if (standing?.form && standing.form.length > 0) {
      return standing.form.slice(0, 3);
    }
    return (matchHistory || []).slice(0, 3).map(m => {
      const isHome = m.homeClubId === club.id;
      const myScore = isHome ? m.homeScore : m.awayScore;
      const oppScore = isHome ? m.awayScore : m.homeScore;
      return myScore > oppScore ? 'W' : myScore < oppScore ? 'L' : 'D';
    });
  }, [standing, matchHistory, club.id]);

  return {
    club,
    isAr,
    user,
    setAuthModalOpen,
    avgFatigue,
    totalDaily,
    completedDaily,
    claimedDaily,
    currentTier,
    nextTier,
    vipPoints,
    vipClaimedToday,
    claimDailyVIPReward,
    checkInStreak,
    checkInClaimedToday,
    claimDailyCheckIn,
    nextMission,
    completedMissionsCount,
    nextFixture,
    currentRound,
    totalRounds,
    seasonFinished,
    standing,
    last3Form,
    setActiveTab,
    startNewMatch,
    skipAndSimulateNextMatch,
    setClubSelectionModalOpen,
    setDailyMissionsModalOpen,
    startTacticalDuel,
    runSquadRecoverySession,
    hasSelectedInitialClub,
    isLoadingMatch,
    setSeasonFinaleModalOpen
  };
}
