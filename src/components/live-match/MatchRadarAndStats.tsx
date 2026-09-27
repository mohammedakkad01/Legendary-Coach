/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * 2D Pitch Radar & Broadcast Match Statistics.
 */

import React from 'react';
import { Activity } from 'lucide-react';
import { MatchRecord } from '../../types/game';

interface MatchRadarAndStatsProps {
  record: MatchRecord;
  isAr: boolean;
  currentMatchMinute: number;
}

export const MatchRadarAndStats: React.FC<MatchRadarAndStatsProps> = ({
  record,
  isAr,
  currentMatchMinute,
}) => {
  const stats = record.stats;

  return (
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

      {/* 2D Radar Canvas */}
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
          <div className="absolute top-1/2 left-0 -translate-y-1/2 w-14 h-24 border border-l-0 border-white/20" />
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

        {/* Home squad node */}
        <div className="absolute left-[20%] top-[48%] -translate-y-1/2 flex flex-col items-center">
          <div className="w-6 h-6 rounded-full bg-sky-500 border border-white font-black text-[10px] text-slate-950 flex items-center justify-center shadow-lg">
            10
          </div>
          <span className="text-[9px] font-bold text-white bg-slate-950/80 px-1 rounded mt-0.5">
            {isAr ? 'اليرموك' : 'Home'}
          </span>
        </div>

        {/* Away squad node */}
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
      <div className="bg-slate-950/90 rounded-2xl p-3.5 border border-slate-800 space-y-2.5 shadow-inner">
        <div className="flex items-center justify-between text-xs font-black text-slate-400 border-b border-slate-800/80 pb-1.5">
          <span className="text-sky-400 truncate max-w-[120px]">{record.homeClubName}</span>
          <span className="text-[11px] uppercase tracking-wider text-slate-500 font-bold">{isAr ? 'إحصائيات اللقاء' : 'Match Stats'}</span>
          <span className="text-rose-400 truncate max-w-[120px] text-right">{record.awayClubName}</span>
        </div>

        {/* Possession */}
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

        {/* xG */}
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
  );
};
