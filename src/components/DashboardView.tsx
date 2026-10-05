/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Club Hub / Dashboard View
 * Refactored modular view with separated domain hook and presentation components.
 */

import React from 'react';
import { useDashboardData } from '../hooks/useDashboardData';
import { DashboardHeaderCard } from './dashboard/DashboardHeaderCard';
import { DashboardPromotionBanners } from './dashboard/DashboardPromotionBanners';
import { DashboardDailyActivities } from './dashboard/DashboardDailyActivities';
import { DashboardStoryAndTiles } from './dashboard/DashboardStoryAndTiles';
import { UnifiedDashboardHub } from './dashboard/unified/UnifiedDashboardHub';

export const DashboardView: React.FC = () => {
  const {
    club,
    isAr,
    user,
    setAuthModalOpen,
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
    hasSelectedInitialClub,
    isLoadingMatch,
    setSeasonFinaleModalOpen,
  } = useDashboardData();

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-6 space-y-6 overflow-x-hidden">
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

      <DashboardPromotionBanners
        club={club}
        isAr={isAr}
        hasSelectedInitialClub={hasSelectedInitialClub}
        user={user}
        onOpenClubSelect={() => setClubSelectionModalOpen(true)}
        onOpenAuth={() => setAuthModalOpen(true)}
      />

      <UnifiedDashboardHub />

      <DashboardDailyActivities
        isAr={isAr}
        checkInStreak={checkInStreak}
        checkInClaimedToday={checkInClaimedToday}
        onClaimCheckIn={claimDailyCheckIn}
        vipClaimedToday={vipClaimedToday}
        currentTier={currentTier}
        onClaimVipReward={claimDailyVIPReward}
      />

      <DashboardStoryAndTiles
        isAr={isAr}
        nextMission={nextMission}
        completedMissionsCount={completedMissionsCount}
        onNavigateTab={(tab) => setActiveTab(tab)}
      />
    </div>
  );
};
