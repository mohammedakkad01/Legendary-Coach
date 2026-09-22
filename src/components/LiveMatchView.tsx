/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * 2D Live Match Simulator & Coach's Tablet
 * Real-time tactical radar, animated pitch, interactive decisions, commentary feed, and match stats.
 */

import React, { useEffect, useRef } from 'react';
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
  MessageSquare
} from 'lucide-react';
import { generatePostMatchCharacter } from '../data/matchAnalystData';

export const LiveMatchView: React.FC = () => {
  const { 
    club, 
    activeMatchRecord, 
    isMatchLive, 
    isMatchPaused, 
    matchSpeed, 
    currentMatchMinute, 
    pendingInteractiveEvent,
    stepMatchMinute, 
    toggleMatchPause, 
    setMatchSpeed, 
    submitInteractiveDecision, 
    instantSimulateMatch,
    startNewMatch,
    postMatchAnalyst,
    setPostMatchAnalyst,
    language 
  } = useGameStore();

  const isAr = language === 'ar';
  const commentaryEndRef = useRef<HTMLDivElement>(null);

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
    return (
      <div className="max-w-4xl mx-auto p-6 text-center space-y-6">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-10 space-y-4 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-sky-500/20 text-sky-400 mx-auto flex items-center justify-center text-3xl">
            ⚽
          </div>
          <h2 className="text-2xl font-black font-heading text-white">
            {isAr ? 'لا توجد مباراة جارية حالياً' : 'No Active Match Currently'}
          </h2>
          <p className="text-slate-400 text-sm max-w-md mx-auto">
            {isAr ? 'الفريق جاهز في غرفة الملابس وينتظر صافرة البداية! انطلق لخوض مباراتك الرسمية في دوري التحدي.' : 'The squad is geared up in the locker room. Kick off your next competitive league clash!'}
          </p>
          <button
            id="btn_start_match_main"
            onClick={() => startNewMatch()}
            className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-base shadow-xl shadow-emerald-500/30 cursor-pointer"
          >
            {isAr ? 'صافرة البداية — انطلاق المباراة الآن' : 'Kick Off — Start Match Now'}
          </button>
        </div>
      </div>
    );
  }

  const record = activeMatchRecord!;
  const stats = record.stats;
  const isFinished = record.isFinished;

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-6 space-y-6">
      
      {/* Scoreboard Banner */}
      <div className="relative bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-2xl overflow-hidden">
        {/* Glow behind scoreboard */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-24 bg-sky-500/10 blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          
          {/* Home Team */}
          <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-1/3 justify-start sm:justify-end order-1">
            <div className="text-left sm:text-right">
              <h3 className="text-base sm:text-lg font-black font-heading text-white">
                {record.homeClubName}
              </h3>
              <span className="text-[11px] text-sky-400 font-bold">{isAr ? 'المضيف (فريقك)' : 'Home (You)'}</span>
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

            {/* Minute Badge */}
            <div className="mt-2 flex items-center gap-2">
              {isFinished ? (
                <span className="px-3 py-0.5 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  {isAr ? 'صافرة النهاية — انتهت المباراة' : 'Full Time — Match Finished'}
                </span>
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

              {/* Speed Buttons */}
              <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-black">
                {[1, 2, 4].map(spd => (
                  <button
                    key={spd}
                    onClick={() => setMatchSpeed(spd)}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      matchSpeed === spd ? 'bg-sky-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {spd}x
                  </button>
                ))}
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

          {/* Match Stats Comparison */}
          <div className="grid grid-cols-3 gap-2 text-xs pt-2">
            <div className="text-center bg-slate-950 p-2 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block">{isAr ? 'التسديدات (على المرمى)' : 'Shots (On Target)'}</span>
              <span className="font-black text-white">
                {stats.homeShots} ({stats.homeShotsOnTarget}) - {stats.awayShots} ({stats.awayShotsOnTarget})
              </span>
            </div>
            <div className="text-center bg-slate-950 p-2 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block">{isAr ? 'الأهداف المتوقعة xG' : 'Expected Goals (xG)'}</span>
              <span className="font-black text-amber-400">
                {stats.homeXg} - {stats.awayXg}
              </span>
            </div>
            <div className="text-center bg-slate-950 p-2 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block">{isAr ? 'الركنيات / الأخطاء' : 'Corners / Fouls'}</span>
              <span className="font-black text-emerald-400">
                {stats.homeCorners} ({stats.homeFouls}) - {stats.awayCorners} ({stats.awayFouls})
              </span>
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

    </div>
  );
};
