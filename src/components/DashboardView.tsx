/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Club Hub / Dashboard View
 * Refactored modular view with separated domain hook and presentation components.
 */

import React from 'react';
import { useDashboardData } from '../hooks/useDashboardData';
import { useFeedback } from '../context/FeedbackContext';
import { DashboardHeaderCard } from './dashboard/DashboardHeaderCard';
import { DashboardPromotionBanners } from './dashboard/DashboardPromotionBanners';
import { DashboardReadinessTrio } from './dashboard/DashboardReadinessTrio';
import { DashboardDailyActivities } from './dashboard/DashboardDailyActivities';
import { DashboardStoryAndTiles } from './dashboard/DashboardStoryAndTiles';

export const DashboardView: React.FC = () => {
  const {
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
    currentRound,
    totalRounds,
    seasonFinished,
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
    setSeasonFinaleModalOpen,
  } = useDashboardData();
  const { toast } = useFeedback();

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-6 space-y-6">
      {/* Top Banner: Club & Coach Identity */}
      <DashboardHeaderCard
        club={club}
        isAr={isAr}
        currentRound={currentRound}
        totalRounds={totalRounds}
        last3Form={last3Form}
        hasSelectedInitialClub={hasSelectedInitialClub}
        seasonFinished={seasonFinished}
        isLoadingMatch={isLoadingMatch}
        currentTier={currentTier}
        nextTier={nextTier}
        vipPoints={vipPoints}
        onSelectClubModal={() => setClubSelectionModalOpen(true)}
        onSeasonFinale={() => setSeasonFinaleModalOpen(true)}
        onSkipMatch={() => skipAndSimulateNextMatch()}
        onPlayNextMatch={() => startNewMatch()}
        onVipClick={() => setActiveTab('vip')}
      />

      {/* Official Leagues & Gems Promotion Banners */}
      <DashboardPromotionBanners
        club={club}
        isAr={isAr}
        hasSelectedInitialClub={hasSelectedInitialClub}
        user={user}
        onOpenClubSelect={() => setClubSelectionModalOpen(true)}
        onOpenAuth={() => setAuthModalOpen(true)}
      />

      {/* PvP Duel, Daily Missions, Squad Readiness Trio */}
      <DashboardReadinessTrio
        isAr={isAr}
        completedDaily={completedDaily}
        totalDaily={totalDaily}
        claimedDaily={claimedDaily}
        avgFatigue={avgFatigue}
        onStartDuel={() => startTacticalDuel('tactical')}
        onOpenMissions={() => setDailyMissionsModalOpen(true)}
        onSquadRecovery={() => {
          const res = runSquadRecoverySession();
          if (res.success) {
            toast.success(res.message, isAr ? 'جلسة الاستشفاء' : 'Squad Recovery');
          } else {
            toast.error(res.message, isAr ? 'تعذر الاستشفاء' : 'Recovery Failed');
          }
        }}
      />

      {/* 7-Day Check-in & Daily VIP Chest */}
      <DashboardDailyActivities
        isAr={isAr}
        checkInStreak={checkInStreak}
        checkInClaimedToday={checkInClaimedToday}
        onClaimCheckIn={claimDailyCheckIn}
        vipClaimedToday={vipClaimedToday}
        currentTier={currentTier}
        onClaimVipReward={claimDailyVIPReward}
      />

      {/* Story Spotlight & Quick Navigation Tiles */}
      <DashboardStoryAndTiles
        isAr={isAr}
        nextMission={nextMission}
        completedMissionsCount={completedMissionsCount}
        club={club}
        onNavigateTab={(tab) => setActiveTab(tab)}
      />
    </div>
  );
};
