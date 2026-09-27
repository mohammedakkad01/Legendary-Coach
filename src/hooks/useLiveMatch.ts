/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Custom hook to control live match timer, speed modes, commentary feed, and VIP boosts.
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { useGameStore } from '../state/useGameStore';
import { VIP_LEVELS } from '../data/vipData';
import { VIPPrivilege } from '../types/game';

export function useLiveMatch() {
  const { 
    club, 
    activeMatchRecord, 
    isMatchLive, 
    isMatchPaused, 
    matchSpeed, 
    unlockedSpeed2x,
    currentMatchMinute, 
    pendingInteractiveEvent,
    stepMatchMinute, 
    toggleMatchPause, 
    setMatchSpeed, 
    unlockMatchSpeed2x,
    submitInteractiveDecision, 
    instantSimulateMatch,
    startNewMatch,
    isLoadingMatch,
    postMatchAnalyst,
    setPostMatchAnalyst,
    vipPoints,
    setActiveTab,
    lastRoundSummary,
    language 
  } = useGameStore();

  const isAr = language === 'ar';
  const commentaryEndRef = useRef<HTMLDivElement>(null);
  const [speedModalOpen, setSpeedModalOpen] = useState(false);
  const [speedPurchaseNotice, setSpeedPurchaseNotice] = useState<string | null>(null);

  const currentVipTier: VIPPrivilege = useMemo(() => {
    let tier = VIP_LEVELS[0];
    for (const t of VIP_LEVELS) {
      if ((vipPoints || 0) >= t.pointsRequired) {
        tier = t;
      }
    }
    return tier;
  }, [vipPoints]);

  // Auto-step timer when match is live and unpaused
  useEffect(() => {
    if (!isMatchLive || isMatchPaused) return;

    const intervalMs = Math.max(120, 900 / matchSpeed);
    const timer = setInterval(() => {
      stepMatchMinute();
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isMatchLive, isMatchPaused, matchSpeed, stepMatchMinute]);

  // Auto-scroll commentary feed
  useEffect(() => {
    commentaryEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeMatchRecord?.events.length]);

  return {
    club,
    record: activeMatchRecord,
    isMatchLive,
    isMatchPaused,
    matchSpeed,
    unlockedSpeed2x,
    currentMatchMinute,
    pendingInteractiveEvent,
    stepMatchMinute,
    toggleMatchPause,
    setMatchSpeed,
    unlockMatchSpeed2x,
    submitInteractiveDecision,
    instantSimulateMatch,
    startNewMatch,
    isLoadingMatch,
    postMatchAnalyst,
    setPostMatchAnalyst,
    vipPoints,
    setActiveTab,
    lastRoundSummary,
    language,
    isAr,
    commentaryEndRef,
    speedModalOpen,
    setSpeedModalOpen,
    speedPurchaseNotice,
    setSpeedPurchaseNotice,
    currentVipTier
  };
}
