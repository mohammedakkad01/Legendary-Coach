/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * 2D Live Match Simulator & Coach's Tablet
 * Real-time tactical radar, animated pitch, interactive decisions, commentary feed, and match stats.
 */

import React, { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../state/useGameStore';
import { 
  Play, 
  Pause, 
  FastForward, 
  Zap, 
  RotateCcw, 
  Trophy, 
  Activity, 
  FileText, 
  AlertCircle,
  MessageSquare,
  Crown,
  Lock,
  Sparkles,
  Coins,
  Gem,
  X
} from 'lucide-react';
import { generatePostMatchCharacter } from '../data/matchAnalystData';
import { VIP_LEVELS } from '../data/vipData';
import { NextMatchCard } from './NextMatchCard';

export const LiveMatchView: React.FC = () => {
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

  // Calculate current VIP Tier for tactical boost indicator
  let currentVipTier = VIP_LEVELS[0];
  for (const tier of VIP_LEVELS) {
    if ((vipPoints || 0) >= tier.pointsRequired) {
      currentVipTier = tier;
    }
  }

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

  if (!activeMatchRecord && !isMatchLive) {
    return <NextMatchCard />;
  }

  const record = activeMatchRecord!;
  const stats = record.stats;
  const isFinished = record.isFinished;

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-6 space-y-6">
      
      {/* Scoreboard Banner */}
      <div className="relative bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-2xl overflow-hidden">
        {/* Glow behind scoreboard */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(14,165,233,0.14), transparent 55%)' }} />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          
          {/* Home Team */}
          <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-1/3 justify-start sm:justify-end order-1">
            <div className="text-left sm:text-right">
              <h3 className="text-base sm:text-lg font-black font-heading text-white">
                {record.homeClubName}
              </h3>
              <div className="flex items-center gap-1.5 justify-start sm:justify-end">
                <span className="text-[11px] text-sky-400 font-bold">{isAr ? 'المضيف (فريقك)' : 'Home (You)'}</span>
                {currentVipTier.attackBoostPercent > 0 && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-black" title={isAr ? `ميزة تكتيكية VIP: +${currentVipTier.attackBoostPercent}% هجوم ودفاع` : `VIP Tactical Bonus: +${currentVipTier.attackBoostPercent}% atk & def`}>
                    <Crown className="w-2.5 h-2.5 text-amber-400" />
                    <span>VIP {currentVipTier.level} (+{currentVipTier.attackBoostPercent}%)</span>
                  </span>
                )}
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-2xl shadow-lg">
              {club.logoBadge || '🛡️'}
            </div>
          </div>

          {/* Score & Timer Center */}
          <div className="flex flex-col items-center justify-center order-3 sm:order-2 w-full sm:w-auto">
            <div className="flex items-center gap-4 bg-slate-950/80 px-6 py-2 rounded-2xl border border-slate-800 shadow-inner">
              <span className="text-3xl sm:text-5xl font-black font-heading text-white tracking-tight">
                {record.homeScore}
              </span>
              <span className="text-xl sm:text-2xl font-black text-slate-500">-</span>
              <span className="text-3xl sm:text-5xl font-black font-heading text-white tracking-tight">
                {record.awayScore}
              </span>
            </div>

            {/* Minute Badge & Status */}
            <div className="mt-2 flex items-center gap-2">
              {isFinished ? (
                (() => {
                  const isUserHome = record.homeClubId === club.id;
                  const userScore = isUserHome ? record.homeScore : record.awayScore;
                  const oppScore = isUserHome ? record.awayScore : record.homeScore;
                  const won = userScore > oppScore;
                  const drawn = userScore === oppScore;

                  if (won) {
                    return (
                      <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 shadow-sm">
                        <span>🏁</span>
                        <span>{isAr ? 'صافرة النهاية — فوز' : 'Full Time — Win'}</span>
                      </span>
                    );
                  }
                  if (drawn) {
                    return (
                      <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1.5">
                        <span>🏁</span>
                        <span>{isAr ? 'صافرة النهاية — تعادل' : 'Full Time — Draw'}</span>
                      </span>
                    );
                  }
                  return (
                    <span className="px-3 py-1 rounded-full text-xs font-black bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1.5">
                      <span>🏁</span>
                      <span>{isAr ? 'صافرة النهاية — خسارة' : 'Full Time — Defeat'}</span>
                    </span>
                  );
                })()
              ) : (
                <span className="px-3 py-0.5 rounded-full text-xs font-black bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  <span>{currentMatchMinute}' {isAr ? 'دقيقة' : 'Min'}</span>
                </span>
              )}
            </div>
          </div>

          {/* Away Team */}
          <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-1/3 justify-end sm:justify-start order-2 sm:order-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-2xl shadow-lg">
              ⚔️
            </div>
            <div className="text-right sm:text-left">
              <h3 className="text-base sm:text-lg font-black font-heading text-white">
                {record.awayClubName}
              </h3>
              <span className="text-[11px] text-rose-400 font-bold">{isAr ? 'الضيف المنافس' : 'Away Opponent'}</span>
            </div>
          </div>

        </div>

        {/* Coach Tablet Control Bar */}
        {!isFinished && (
          <div className="mt-6 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                id="btn_match_play_pause"
                onClick={toggleMatchPause}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-black text-white transition-colors"
              >
                {isMatchPaused ? <Play className="w-4 h-4 text-emerald-400" /> : <Pause className="w-4 h-4 text-amber-400" />}
                <span>{isMatchPaused ? (isAr ? 'استئناف' : 'Resume') : (isAr ? 'إيقاف مؤقت' : 'Pause')}</span>
              </button>

              {/* Speed Buttons with Lock Badges */}
              <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-black gap-1">
                {/* 1x - Free for everyone */}
                <button
                  key={1}
                  onClick={() => setMatchSpeed(1)}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    matchSpeed === 1 ? 'bg-sky-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  1x
                </button>

                {/* 2x - Paid via Coins or Diamonds */}
                <button
                  key={2}
                  onClick={() => {
                    if (unlockedSpeed2x) {
                      setMatchSpeed(2);
                    } else {
                      setSpeedModalOpen(true);
                    }
                  }}
                  className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                    matchSpeed === 2 
                      ? 'bg-sky-500 text-slate-950 font-black' 
                      : unlockedSpeed2x 
                      ? 'text-slate-400 hover:text-white' 
                      : 'text-amber-400/80 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30'
                  }`}
                  title={unlockedSpeed2x ? (isAr ? 'سرعة 2x مفتوحة' : '2x Unlocked') : (isAr ? 'اضغط لفتح سرعة 2x بالجواهر أو الكوينز' : 'Click to unlock 2x with Gems or Coins')}
                >
                  <span>2x</span>
                  {!unlockedSpeed2x && <Lock className="w-3 h-3 text-amber-400" />}
                </button>

                {/* 4x - VIP 10+ Exclusive */}
                {(() => {
                  const isVip4xUnlocked = !!currentVipTier.unlockedSpeed4x;
                  return (
                    <button
                      key={4}
                      onClick={() => {
                        if (isVip4xUnlocked) {
                          setMatchSpeed(4);
                        } else {
                          setSpeedModalOpen(true);
                        }
                      }}
                      className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                        matchSpeed === 4 
                          ? 'bg-amber-500 text-slate-950 font-black' 
                          : isVip4xUnlocked 
                          ? 'text-slate-400 hover:text-white' 
                          : 'text-purple-400/80 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30'
                      }`}
                      title={isVip4xUnlocked ? (isAr ? 'سرعة 4x متاحة لمستوى VIP الخاص بك' : '4x Unlocked for your VIP') : (isAr ? 'مقفلة: تتطلب رتبة VIP 10 فما فوق' : 'Locked: Requires VIP 10+')}
                    >
                      <span>4x</span>
                      {!isVip4xUnlocked && <Lock className="w-3 h-3 text-purple-400" />}
                    </button>
                  );
                })()}
              </div>
            </div>

            {/* Instant Simulate button */}
            <button
              id="btn_instant_simulate"
              onClick={instantSimulateMatch}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 border border-amber-500/40 text-amber-300 text-xs font-black transition-colors"
            >
              <FastForward className="w-4 h-4" />
              <span>{isAr ? 'محاكاة النتيجة فوراً' : 'Instant Result'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Interactive Key Moment Modal Trigger */}
      {pendingInteractiveEvent && (
        <div className="bg-gradient-to-r from-amber-950/80 via-slate-900 to-amber-950/80 border-2 border-amber-500/60 rounded-3xl p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-300">
          <div className="flex items-center gap-2.5 text-amber-400">
            <AlertCircle className="w-6 h-6 animate-bounce" />
            <h4 className="font-heading font-black text-base sm:text-lg">
              {isAr ? 'تدخل تكتيكي عاجل من المدرب!' : 'Urgent Tactical Decision!'}
            </h4>
          </div>
          <p className="text-sm font-semibold text-slate-200">
            {isAr ? pendingInteractiveEvent.textAr : pendingInteractiveEvent.textEn}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            {pendingInteractiveEvent.interactiveOptions?.map(opt => (
              <button
                key={opt.id}
                onClick={() => submitInteractiveDecision(opt.id)}
                className="p-3.5 rounded-2xl bg-slate-950/80 hover:bg-slate-800 border border-amber-500/40 hover:border-amber-400 text-left sm:text-right space-y-1 transition-all group cursor-pointer shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <span className="font-heading font-black text-xs sm:text-sm text-white group-hover:text-amber-300">
                    {isAr ? opt.titleAr : opt.titleEn}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-black ${
                    opt.tacticEffect.riskLevel === 'high' ? 'bg-rose-500/20 text-rose-400' :
                    opt.tacticEffect.riskLevel === 'medium' ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'
                  }`}>
                    {opt.tacticEffect.riskLevel === 'high' ? (isAr ? 'مخاطرة عالية' : 'High Risk') :
                     opt.tacticEffect.riskLevel === 'medium' ? (isAr ? 'متوسط' : 'Medium') : (isAr ? 'آمن' : 'Safe')}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">
                  {isAr ? opt.descriptionAr : opt.descriptionEn}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 2D Pitch Radar & Stats Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Pitch Animation Radar (7 Cols) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-black font-heading text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-sky-400" />
              <span>{isAr ? 'الرادار التكتيكي وحركة الكرة' : 'Tactical Radar & Ball Tracking'}</span>
            </h4>
            <span className="text-xs text-slate-400 font-bold">
              {isAr ? 'استحواذ:' : 'Possession:'} {stats.homePossession}% - {stats.awayPossession}%
            </span>
          </div>

          {/* 2D Radar Canvas Layout */}
          <div 
            className="relative w-full aspect-[16/9] sm:aspect-[2/1] bg-emerald-950 rounded-2xl overflow-hidden border-2 border-emerald-800/80 shadow-inner flex items-center justify-center"
            style={{
              backgroundImage: `
                repeating-linear-gradient(90deg, rgba(16, 185, 129, 0.07) 0px, rgba(16, 185, 129, 0.07) 40px, rgba(5, 150, 105, 0.02) 40px, rgba(5, 150, 105, 0.02) 80px),
                radial-gradient(ellipse at center, rgba(6, 78, 59, 0.95), rgba(2, 44, 34, 1))
              `
            }}
          >
            {/* Pitch Markings */}
            <div className="absolute inset-3 border border-white/20 rounded-lg pointer-events-none">
              <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-white/20" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 border border-white/20 rounded-full" />
              {/* Left Goal Area */}
              <div className="absolute top-1/2 left-0 -translate-y-1/2 w-14 h-24 border border-l-0 border-white/20" />
              {/* Right Goal Area */}
              <div className="absolute top-1/2 right-0 -translate-y-1/2 w-14 h-24 border border-r-0 border-white/20" />
            </div>

            {/* Dynamic Ball */}
            <div 
              className="absolute w-4 h-4 rounded-full bg-white shadow-lg shadow-white/80 border border-slate-900 transition-all duration-700 animate-bounce"
              style={{
                left: `${Math.min(92, Math.max(8, stats.homePossession + (Math.sin(currentMatchMinute) * 20)))}%`,
                top: `${45 + (Math.cos(currentMatchMinute * 0.8) * 25)}%`,
              }}
            >
              <div className="w-full h-full rounded-full bg-slate-900/40 animate-ping opacity-75" />
            </div>

            {/* Home squad radar nodes */}
            <div className="absolute left-[20%] top-[48%] -translate-y-1/2 flex flex-col items-center">
              <div className="w-6 h-6 rounded-full bg-sky-500 border border-white font-black text-[10px] text-slate-950 flex items-center justify-center shadow-lg">
                10
              </div>
              <span className="text-[9px] font-bold text-white bg-slate-950/80 px-1 rounded mt-0.5">
                {isAr ? 'اليرموك' : 'Home'}
              </span>
            </div>

            {/* Away squad radar nodes */}
            <div className="absolute right-[20%] top-[52%] -translate-y-1/2 flex flex-col items-center">
              <div className="w-6 h-6 rounded-full bg-rose-500 border border-white font-black text-[10px] text-white flex items-center justify-center shadow-lg">
                9
              </div>
              <span className="text-[9px] font-bold text-white bg-slate-950/80 px-1 rounded mt-0.5">
                {isAr ? 'الخصم' : 'Away'}
              </span>
            </div>
          </div>

          {/* Match Stats Comparison - Real Broadcast Styled */}
          <div className="bg-slate-950/90 rounded-2xl p-3.5 border border-slate-800 space-y-2.5 shadow-inner">
            <div className="flex items-center justify-between text-xs font-black text-slate-400 border-b border-slate-800/80 pb-1.5">
              <span className="text-sky-400 truncate max-w-[120px]">{record.homeClubName}</span>
              <span className="text-[11px] uppercase tracking-wider text-slate-500 font-bold">{isAr ? 'إحصائيات اللقاء' : 'Match Stats'}</span>
              <span className="text-rose-400 truncate max-w-[120px] text-right">{record.awayClubName}</span>
            </div>

            {/* Possession Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-sky-400 font-mono">{stats.homePossession}%</span>
                <span className="text-[11px] text-slate-400">{isAr ? 'الاستحواذ' : 'Possession'}</span>
                <span className="text-rose-400 font-mono">{stats.awayPossession}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden flex">
                <div className="bg-sky-500 transition-all duration-500" style={{ width: `${stats.homePossession}%` }} />
                <div className="bg-rose-500 transition-all duration-500" style={{ width: `${stats.awayPossession}%` }} />
              </div>
            </div>

            {/* Shots Total & On Target */}
            <div className="grid grid-cols-3 items-center text-xs py-1 border-t border-slate-900">
              <div className="font-mono font-black text-sky-300">
                {stats.homeShots} <span className="text-[10px] text-sky-400/70">({stats.homeShotsOnTarget})</span>
              </div>
              <div className="text-center text-[11px] text-slate-400 font-medium">
                {isAr ? 'تسديدات (على المرمى)' : 'Shots (On Target)'}
              </div>
              <div className="font-mono font-black text-rose-300 text-right">
                <span className="text-[10px] text-rose-400/70">({stats.awayShotsOnTarget})</span> {stats.awayShots}
              </div>
            </div>

            {/* Expected Goals xG */}
            <div className="grid grid-cols-3 items-center text-xs py-1 border-t border-slate-900">
              <div className="font-mono font-black text-amber-400">
                {stats.homeXg.toFixed(2)}
              </div>
              <div className="text-center text-[11px] text-slate-400 font-medium">
                {isAr ? 'الأهداف المتوقعة xG' : 'Expected Goals (xG)'}
              </div>
              <div className="font-mono font-black text-amber-400 text-right">
                {stats.awayXg.toFixed(2)}
              </div>
            </div>

            {/* Corners & Fouls */}
            <div className="grid grid-cols-3 items-center text-xs py-1 border-t border-slate-900">
              <div className="font-mono font-black text-emerald-400">
                {stats.homeCorners} <span className="text-[10px] text-slate-500">|</span> <span className="text-slate-300">{stats.homeFouls}</span>
              </div>
              <div className="text-center text-[11px] text-slate-400 font-medium">
                {isAr ? 'ركنيات / أخطاء' : 'Corners / Fouls'}
              </div>
              <div className="font-mono font-black text-emerald-400 text-right">
                <span className="text-slate-300">{stats.awayFouls}</span> <span className="text-slate-500">|</span> {stats.awayCorners}
              </div>
            </div>

            {/* Yellow Cards */}
            <div className="grid grid-cols-3 items-center text-xs py-1 border-t border-slate-900">
              <div className="font-mono font-black text-amber-400 flex items-center gap-1">
                <span className="w-2.5 h-3.5 bg-amber-400 rounded-sm inline-block shadow-sm" />
                <span>{stats.homeYellowCards}</span>
              </div>
              <div className="text-center text-[11px] text-slate-400 font-medium">
                {isAr ? 'البطاقات الصفراء' : 'Yellow Cards'}
              </div>
              <div className="font-mono font-black text-amber-400 flex items-center justify-end gap-1">
                <span>{stats.awayYellowCards}</span>
                <span className="w-2.5 h-3.5 bg-amber-400 rounded-sm inline-block shadow-sm" />
              </div>
            </div>
          </div>
        </div>

        {/* Live Commentary Feed (5 Cols) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-4 flex flex-col h-[380px]">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
            <h4 className="text-sm font-black font-heading text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-400" />
              <span>{isAr ? 'شريط التعليق الصوتي واللحظات' : 'Live Commentary Feed'}</span>
            </h4>
            <span className="text-[11px] text-slate-400">{record.events.length} {isAr ? 'أحداث' : 'events'}</span>
          </div>

          {/* Event Stream */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {record.events.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                {isAr ? 'صافرة البداية تنطلق، سنوافيكم بأبرز لقطات اللقاء أولاً بأول...' : 'Kick off underway, match updates will stream here...'}
              </div>
            ) : (
              record.events.map((ev, i) => (
                <div 
                  key={i}
                  className={`p-2.5 rounded-xl text-xs border transition-all ${
                    ev.type === 'goal'
                      ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-200 font-black'
                      : ev.type === 'yellow_card'
                      ? 'bg-amber-950/40 border-amber-500/40 text-amber-200'
                      : ev.type === 'interactive_moment'
                      ? 'bg-sky-950/40 border-sky-500/40 text-sky-200'
                      : 'bg-slate-950/60 border-slate-800/80 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5">
                    <span className="font-black text-amber-400">{ev.minute}'</span>
                    <span>{ev.team === 'home' ? record.homeClubName : record.awayClubName}</span>
                  </div>
                  <p className="leading-relaxed font-semibold">
                    {isAr ? ev.textAr : ev.textEn}
                  </p>
                </div>
              ))
            )}
            <div ref={commentaryEndRef} />
          </div>

          {/* Post match action */}
          {isFinished && (
            <div className="pt-3 border-t border-slate-800 space-y-2">
              <button
                id="btn_view_captain_mansoor_report"
                onClick={() => {
                  const report = postMatchAnalyst || generatePostMatchCharacter(record, club, isAr);
                  setPostMatchAnalyst(report);
                }}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer active:scale-98 transition"
              >
                <MessageSquare className="w-4 h-4 text-blue-200" />
                <span>{isAr ? '🎙️ تقرير الكابتن منصور (رجل المباراة والتحليل الفني)' : '🎙️ Captain Mansoor Report (MVP & Tactical Analysis)'}</span>
              </button>

              {lastRoundSummary && (
                <button
                  onClick={() => setActiveTab('round_summary')}
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-300 font-black text-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>{isAr ? '📋 ملخص الجولة (نتائج الفرق الأخرى ونجوم الجولة)' : '📋 Round Summary (other results & top performers)'}</span>
                </button>
              )}

              <button
                onClick={() => startNewMatch()}
                className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-black text-xs shadow-lg shadow-sky-600/30 flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>{isAr ? 'خوض المباراة القادمة في الجدول' : 'Play Next Match in Fixtures'}</span>
              </button>
            </div>
          )}
        </div>

      </div>

      {/* Speed Unlock & VIP Privileges Modal */}
      {speedModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-amber-400">
                <Zap className="w-5 h-5 text-amber-400" />
                <h3 className="font-heading font-black text-lg text-white">
                  {isAr ? 'ترقية سرعة محاكاة المباريات' : 'Match Speed Boost Upgrade'}
                </h3>
              </div>
              <button
                onClick={() => {
                  setSpeedModalOpen(false);
                  setSpeedPurchaseNotice(null);
                }}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Notification message */}
            {speedPurchaseNotice && (
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold leading-relaxed">
                {speedPurchaseNotice}
              </div>
            )}

            {/* Option 1: 2x Speed Unlock */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 font-black text-sm flex items-center justify-center border border-sky-500/30">
                    2x
                  </span>
                  <div>
                    <h4 className="font-heading font-black text-sm text-white">
                      {isAr ? 'السرعة المضاعفة (2x Speed)' : 'Double Speed (2x)'}
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      {isAr ? 'تسريع وقت المباراة بمقدار الضعف لتجربة لعب أكثر حيوية' : 'Doubles simulation tempo permanently for your career'}
                    </p>
                  </div>
                </div>
                {unlockedSpeed2x && (
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-black">
                    {isAr ? 'مفتوحة لديك ✓' : 'Unlocked ✓'}
                  </span>
                )}
              </div>

              {!unlockedSpeed2x ? (
                <div className="pt-2 flex flex-col sm:flex-row gap-2">
                  {/* Pay with Coins */}
                  <button
                    onClick={() => {
                      const res = unlockMatchSpeed2x('coins');
                      setSpeedPurchaseNotice(res.message);
                      if (res.success) {
                        setTimeout(() => setSpeedModalOpen(false), 1200);
                      }
                    }}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-300 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Coins className="w-4 h-4 text-amber-400" />
                    <span>{isAr ? 'فتح بـ 30,000 كوينز' : '30,000 Coins'}</span>
                  </button>

                  {/* Pay with Diamonds */}
                  <button
                    onClick={() => {
                      const res = unlockMatchSpeed2x('diamonds');
                      setSpeedPurchaseNotice(res.message);
                      if (res.success) {
                        setTimeout(() => setSpeedModalOpen(false), 1200);
                      }
                    }}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-sky-500/20 transition cursor-pointer"
                  >
                    <Gem className="w-4 h-4 text-slate-950" />
                    <span>{isAr ? 'فتح بـ 50 جوهرة 💎' : '50 Diamonds 💎'}</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setMatchSpeed(2);
                    setSpeedModalOpen(false);
                  }}
                  className="w-full py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs transition cursor-pointer"
                >
                  {isAr ? 'تفعيل سرعة 2x الآن' : 'Activate 2x Speed Now'}
                </button>
              )}
            </div>

            {/* Option 2: 4x Speed - VIP 10+ */}
            <div className="bg-slate-950/80 border border-purple-500/30 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 font-black text-sm flex items-center justify-center border border-purple-500/30">
                    4x
                  </span>
                  <div>
                    <h4 className="font-heading font-black text-sm text-white flex items-center gap-1.5">
                      <span>{isAr ? 'السرعة الفائقة (4x Ultra Speed)' : 'Ultra Speed (4x)'}</span>
                      <Crown className="w-3.5 h-3.5 text-amber-400" />
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      {isAr ? 'ميزة حصرية لأعضاء نادي الأساطير رتبة VIP 10 فما فوق' : 'Exclusive VIP privilege for Glory Makers (VIP 10+)'}
                    </p>
                  </div>
                </div>

                {currentVipTier.unlockedSpeed4x ? (
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-black">
                    {isAr ? 'مفتوحة لمستواك ✓' : 'VIP Unlocked ✓'}
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[10px] font-black">
                    {isAr ? `مستواك الحالي: VIP ${currentVipTier.level}` : `Current: VIP ${currentVipTier.level}`}
                  </span>
                )}
              </div>

              {currentVipTier.unlockedSpeed4x ? (
                <button
                  onClick={() => {
                    setMatchSpeed(4);
                    setSpeedModalOpen(false);
                  }}
                  className="w-full py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-black text-xs shadow-md transition cursor-pointer"
                >
                  {isAr ? 'تفعيل سرعة 4x الفائقة' : 'Activate 4x Ultra Speed'}
                </button>
              ) : (
                <div className="space-y-2 pt-1">
                  <p className="text-[11px] text-purple-300 leading-relaxed">
                    {isAr 
                      ? 'لفتح سرعة 4x، قم بترقية حسابك في نادي الـ VIP حتى تصل للمستوى 10 (صانع المجد).' 
                      : 'To unlock 4x Ultra Speed, advance your VIP tier to Level 10 (Glory Maker).'}
                  </p>
                  <button
                    onClick={() => {
                      setSpeedModalOpen(false);
                      setActiveTab('vip');
                    }}
                    className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-purple-600/30 transition cursor-pointer"
                  >
                    <Crown className="w-4 h-4 text-amber-300" />
                    <span>{isAr ? 'الانتقال إلى نادي VIP للترقية' : 'Go to VIP Club & Upgrade'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Balances Status */}
            <div className="flex items-center justify-between text-xs text-slate-400 bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="font-bold">{isAr ? 'رصيدك الحالي:' : 'Your Balances:'}</span>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 text-amber-400 font-mono font-bold">
                  <Coins className="w-3.5 h-3.5" />
                  <span>{(club.finances.coins || 0).toLocaleString()}</span>
                </span>
                <span className="flex items-center gap-1 text-sky-400 font-mono font-bold">
                  <Gem className="w-3.5 h-3.5" />
                  <span>{(club.finances.diamonds || 0).toLocaleString()}</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};