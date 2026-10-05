/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Dashboard Quick Actions & Readiness Trio: Tactical Duel, Daily Missions, Squad Recovery.
 */

import React from 'react';
import { Swords, Trophy, HeartPulse } from 'lucide-react';

interface DashboardReadinessTrioProps {
  isAr: boolean;
  completedDaily: number;
  totalDaily: number;
  claimedDaily: number;
  avgFatigue: number;
  onStartDuel: () => void;
  onOpenMissions: () => void;
  onSquadRecovery: () => void;
}

export const DashboardReadinessTrio: React.FC<DashboardReadinessTrioProps> = ({
  isAr,
  completedDaily,
  totalDaily,
  claimedDaily,
  avgFatigue,
  onStartDuel,
  onOpenMissions,
  onSquadRecovery,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Card 1: Simultaneous Reveal Tactical Duel (صانع المعارك) */}
      <div className="bg-gradient-to-br from-purple-950/60 via-slate-900 to-indigo-950/60 border border-purple-500/30 rounded-3xl p-5 shadow-xl flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between">
            <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-bold border border-purple-500/30">
              {isAr ? 'كشف متزامن 1v1' : 'Simultaneous 1v1'}
            </span>
            <span className="text-xl">⚔️</span>
          </div>
          <h3 className="text-base font-black text-white mt-2">
            {isAr ? 'صانع المعارك التكتيكي' : 'Battle Maker PvP Duel'}
          </h3>
          <p className="text-xs text-slate-300 mt-1 leading-relaxed">
            {isAr 
              ? 'مواجهة تكتيكية سريعة (5-8 دقائق) بنظام الكشف المتزامن والأوامر السرية. لا أفضلية للدفع، التكتيك وحده يحسم الموقعة!' 
              : 'Rapid 5-8 min tactical clash with simultaneous order reveal. Pure strategy, zero pay-to-win!'}
          </p>
        </div>

        <div className="mt-4 pt-3 border-t border-purple-500/20 flex items-center justify-between">
          <span className="text-[11px] text-purple-300 font-medium">
            {isAr ? 'جوائز كوينز وجواهر وVIP' : 'Earn Coins, Gems & VIP'}
          </span>
          <button
            id="dashboard_play_duel_btn"
            onClick={onStartDuel}
            className="touch-target-row px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1 cursor-pointer"
          >
            <Swords className="w-3.5 h-3.5" />
            <span>{isAr ? 'بدء المواجهة' : 'Start Duel'}</span>
          </button>
        </div>
      </div>

      {/* Card 2: Daily Missions */}
      <div className="bg-gradient-to-br from-amber-950/60 via-slate-900 to-yellow-950/40 border border-amber-500/30 rounded-3xl p-5 shadow-xl flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30">
              {isAr ? 'تجدد يومي 24h' : '24h Reset'}
            </span>
            <span className="text-xs font-bold text-amber-400">
              {completedDaily} / {totalDaily} {isAr ? 'مكتمل' : 'Done'}
            </span>
          </div>
          <h3 className="text-base font-black text-white mt-2">
            {isAr ? 'المهام اليومية الرسمية' : 'Official Daily Missions'}
          </h3>
          <p className="text-xs text-slate-300 mt-1 leading-relaxed">
            {isAr 
              ? 'خض مباريات، وسجل أهدافاً، وحافظ على شباكك نظيفة لجمع الكوينز والجواهر ونقاط ترقية VIP.' 
              : 'Play matches, score goals, and manage your squad to unlock rewards and VIP points.'}
          </p>
        </div>

        <div className="mt-4 pt-3 border-t border-amber-500/20 flex items-center justify-between">
          <div className="w-24 bg-slate-800 h-2 rounded-full overflow-hidden">
            <div 
              className="h-full bg-amber-400 rounded-full"
              style={{ width: `${totalDaily > 0 ? (claimedDaily / totalDaily) * 100 : 0}%` }}
            />
          </div>
          <button
            id="dashboard_open_missions_btn"
            onClick={onOpenMissions}
            className="touch-target-row px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs shadow-md transition-all flex items-center gap-1 cursor-pointer"
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>{isAr ? 'فتح المهام' : 'Open Tasks'}</span>
          </button>
        </div>
      </div>

      {/* Card 3: Squad Fatigue & Readiness */}
      <div className="bg-gradient-to-br from-emerald-950/60 via-slate-900 to-teal-950/40 border border-emerald-500/30 rounded-3xl p-5 shadow-xl flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between">
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${avgFatigue > 45 ? 'bg-red-500/20 text-red-300 border-red-500/30' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'}`}>
              {avgFatigue > 45 ? (isAr ? 'إجهاد مرتفع' : 'Fatigued') : (isAr ? 'جاهزية ممتازة' : 'Match Ready')}
            </span>
            <span className={`text-sm font-black ${avgFatigue > 45 ? 'text-red-400' : 'text-emerald-400'}`}>
              %{avgFatigue}
            </span>
          </div>
          <h3 className="text-base font-black text-white mt-2">
            {isAr ? 'جاهزية واستشفاء التشكيلة' : 'Squad Fatigue & Recovery'}
          </h3>
          <p className="text-xs text-slate-300 mt-1 leading-relaxed">
            {isAr 
              ? 'استنزاف لياقة اللاعبين في المباريات يرفع الإجهاد. قم بتدوير التشكيلة أو إجراء استشفاء بدني لتفادي الإصابات.' 
              : 'Match minutes accumulate fatigue. Rotate starters or conduct physical recovery sessions.'}
          </p>
        </div>

        <div className="mt-4 pt-3 border-t border-emerald-500/20 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            {isAr ? 'تكلفة الاستشفاء: 500 كوينز' : 'Cost: 500 Coins'}
          </span>
          <button
            id="dashboard_squad_recovery_btn"
            onClick={onSquadRecovery}
            className="touch-target-row px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1 cursor-pointer"
          >
            <HeartPulse className="w-3.5 h-3.5" />
            <span>{isAr ? 'جلسة استشفاء' : 'Recovery'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
