/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * 2D Live Match Simulator & Coach's Tablet
 * Refactored modular view with separated domain hook and presentation components.
 */

import React from 'react';
import { NextMatchCard } from './NextMatchCard';
import { generatePostMatchCharacter } from '../data/matchAnalystData';
import { useLiveMatch } from '../hooks/useLiveMatch';
import { MatchScoreboard } from './live-match/MatchScoreboard';
import { MatchRadarAndStats } from './live-match/MatchRadarAndStats';
import { MatchCommentaryFeed } from './live-match/MatchCommentaryFeed';
import { InteractiveDecisionBanner, SpeedUpgradeModal } from './live-match/SpeedAndTacticalModals';

export const LiveMatchView: React.FC = () => {
  const {
    club,
    record,
    isMatchLive,
    isMatchPaused,
    matchSpeed,
    unlockedSpeed2x,
    currentMatchMinute,
    pendingInteractiveEvent,
    toggleMatchPause,
    setMatchSpeed,
    unlockMatchSpeed2x,
    submitInteractiveDecision,
    instantSimulateMatch,
    startNewMatch,
    postMatchAnalyst,
    setPostMatchAnalyst,
    setActiveTab,
    lastRoundSummary,
    isAr,
    commentaryEndRef,
    speedModalOpen,
    setSpeedModalOpen,
    speedPurchaseNotice,
    setSpeedPurchaseNotice,
    currentVipTier,
  } = useLiveMatch();

  if (!record && !isMatchLive) {
    return <NextMatchCard />;
  }

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-6 space-y-6">
      {/* Scoreboard Banner */}
      <MatchScoreboard
        record={record!}
        club={club}
        isAr={isAr}
        currentVipTier={currentVipTier}
        currentMatchMinute={currentMatchMinute}
        isMatchPaused={isMatchPaused}
        matchSpeed={matchSpeed}
        unlockedSpeed2x={unlockedSpeed2x}
        onTogglePause={toggleMatchPause}
        onSetSpeed={setMatchSpeed}
        onOpenSpeedModal={() => setSpeedModalOpen(true)}
        onInstantSimulate={instantSimulateMatch}
      />

      {/* Interactive Key Moment Modal Trigger */}
      {pendingInteractiveEvent && (
        <InteractiveDecisionBanner
          pendingEvent={pendingInteractiveEvent}
          isAr={isAr}
          onSubmitDecision={submitInteractiveDecision}
        />
      )}

      {/* 2D Pitch Radar & Stats Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <MatchRadarAndStats
          record={record!}
          isAr={isAr}
          currentMatchMinute={currentMatchMinute}
        />

        <MatchCommentaryFeed
          record={record!}
          isAr={isAr}
          commentaryEndRef={commentaryEndRef}
          onCaptainMansoorReport={() => {
            const report = postMatchAnalyst || generatePostMatchCharacter(record!, club, isAr);
            setPostMatchAnalyst(report);
          }}
          onOpenRoundSummary={() => setActiveTab('round_summary')}
          onPlayNextMatch={startNewMatch}
          hasRoundSummary={!!lastRoundSummary}
        />
      </div>

      {/* Speed Unlock & VIP Privileges Modal */}
      <SpeedUpgradeModal
        isOpen={speedModalOpen}
        isAr={isAr}
        onClose={() => {
          setSpeedModalOpen(false);
          setSpeedPurchaseNotice(null);
        }}
        club={club}
        unlockedSpeed2x={unlockedSpeed2x}
        currentVipTier={currentVipTier}
        speedPurchaseNotice={speedPurchaseNotice}
        onUnlock2x={(currency) => {
          const res = unlockMatchSpeed2x(currency);
          setSpeedPurchaseNotice(res.message);
          if (res.success) {
            setTimeout(() => setSpeedModalOpen(false), 1200);
          }
        }}
        onSetSpeed={setMatchSpeed}
        onNavigateVip={() => setActiveTab('vip')}
      />
    </div>
  );
};
