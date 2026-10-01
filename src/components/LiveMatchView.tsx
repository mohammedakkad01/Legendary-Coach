/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * 2D Live Match Simulator & Coach's Tablet
 * Refactored modular view with separated domain hook and presentation components.
 */

import React, { useState } from 'react';
import { Sliders } from 'lucide-react';
import { NextMatchCard } from './NextMatchCard';
import { generatePostMatchCharacter } from '../data/matchAnalystData';
import { useLiveMatch } from '../hooks/useLiveMatch';
import { MatchScoreboard } from './live-match/MatchScoreboard';
import { MatchRadarAndStats } from './live-match/MatchRadarAndStats';
import { MatchCommentaryFeed } from './live-match/MatchCommentaryFeed';
import { InteractiveDecisionBanner, SpeedUpgradeModal } from './live-match/SpeedAndTacticalModals';
import { LiveTacticsPanel } from './live-match/LiveTacticsPanel';
import { LIVE_TACTICS_TEXT, pick } from '../i18n/liveTactics';

export const LiveMatchView: React.FC = () => {
  const {
    club,
    record,
    activeMatchHomeTactics,
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
    applyLiveTactics,
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
  const [tacticsPanelOpen, setTacticsPanelOpen] = useState(false);

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

      {/* Live Tactics Panel trigger — only while the match is actually in progress */}
      {isMatchLive && !record!.isFinished && activeMatchHomeTactics && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setTacticsPanelOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-sky-500/60 text-xs font-bold text-sky-300"
          >
            <Sliders className="w-3.5 h-3.5" />
            {pick(LIVE_TACTICS_TEXT.panelTitle, isAr)}
          </button>
        </div>
      )}
      <LiveTacticsPanel
        isOpen={tacticsPanelOpen}
        onClose={() => setTacticsPanelOpen(false)}
        tactics={activeMatchHomeTactics ?? club.footballTactics}
        isAr={isAr}
        onApply={(changes) => {
          applyLiveTactics(changes);
          setTimeout(() => setTacticsPanelOpen(false), 900);
        }}
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
