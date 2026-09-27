/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Dashboard Coach & Club identity header card, along with vital stat gauges.
 */

import React from 'react';
import { Trophy, Calendar, FastForward, Flame, Crown } from 'lucide-react';
import { Club, VIPPrivilege } from '../../types/game';

interface DashboardHeaderCardProps {
  club: Club;
  isAr: boolean;
  currentRound: number;
  totalRounds: number;
  last3Form: ('W' | 'D' | 'L')[];
  hasSelectedInitialClub: boolean;
  seasonFinished: boolean;
  isLoadingMatch: boolean;
  currentTier: VIPPrivilege;
  nextTier: VIPPrivilege;
  vipPoints: number;
  onSelectClubModal: () => void;
  onSeasonFinale: () => void;
  onSkipMatch: () => void;
  onPlayNextMatch: () => void;
  onVipClick: () => void;
}

export const DashboardHeaderCard: React.FC<DashboardHeaderCardProps> = ({
  club,
  isAr,
  currentRound,
  totalRounds,
  last3Form,
  hasSelectedInitialClub,
  seasonFinished,
  isLoadingMatch,
  currentTier,
  nextTier,
  vipPoints,
  onSelectClubModal,
  onSeasonFinale,
  onSkipMatch,
  onPlayNextMatch,
  onVipClick,
}) => {
  return (
    <div className="relative bg-gradient-to-br from-slate-900 via-slate-900 to-sky-950 border border-slate-800 rounded-3xl p-5 sm:p-8 shadow-2xl overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 85% 0%, rgba(14,165,233,0.12), transparent 45%)',
        }}
      />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-slate-950 border border-slate-800 p-2 flex items-center justify-center shadow-xl shadow-sky-500/10 shrink-0">
            {club.logoUrl ? (
              <img 
                src={club.logoUrl} 
                alt={club.name} 
                className="w-full h-full object-contain" 
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <span className="text-3xl sm:text-4xl">{club.logoBadge || '🛡️'}</span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl sm:text-3xl font-black font-heading text-white">
                {isAr ? club.name : club.nameEn}
              </h2>
              <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                {club.divisionName}
              </span>
              <button
                onClick={onSelectClubModal}
                className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Trophy className="w-3 h-3 text-amber-400" />
                <span>{isAr ? 'تغيير الدوري أو الفريق' : 'Change League/Club'}</span>
              </button>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
              <span>📍 {club.city}</span>
              <span>•</span>
              <span>🏟️ {isAr ? `الملعب: ${club.stadiumName}` : `Stadium: ${club.stadiumName}`}</span>
            </p>

            {/* League Round & Last 3 Matches Status */}
            <div className="flex items-center gap-2 sm:gap-3 mt-2 flex-wrap">
              <span className="px-2.5 py-1 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-black flex items-center gap-1.5 shadow-sm">
                <Calendar className="w-3.5 h-3.5 text-purple-400" />
                <span>{isAr ? `الجولة الحالية: ${currentRound} / ${totalRounds}` : `Matchday: ${currentRound} / ${totalRounds}`}</span>
              </span>

              <div className="flex items-center gap-1.5 bg-slate-950/80 px-2.5 py-1 rounded-xl border border-slate-800 text-xs">
                <span className="text-[11px] text-slate-400 font-bold">{isAr ? 'آخر 3 مباريات:' : 'Last 3:'}</span>
                {last3Form.length === 0 ? (
                  <span className="text-[11px] text-slate-500 font-medium">{isAr ? 'لم تلعب مباريات بعد' : 'No matches yet'}</span>
                ) : (
                  <div className="flex items-center gap-1">
                    {last3Form.map((res, i) => (
                      <span
                        key={i}
                        className={`w-5 h-5 rounded-md text-[10px] font-black flex items-center justify-center ${
                          res === 'W'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                            : res === 'D'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                            : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                        }`}
                      >
                        {isAr ? (res === 'W' ? 'ف' : res === 'D' ? 'ت' : 'خ') : res}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {!hasSelectedInitialClub && (
            <button
              onClick={onSelectClubModal}
              className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-400/30 font-bold text-xs sm:text-sm shadow-lg transition-all cursor-pointer"
            >
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>{isAr ? 'اختر دورياً وفريقاً' : 'Select League & Team'}</span>
            </button>
          )}

          {seasonFinished ? (
            <button
              onClick={onSeasonFinale}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-sm sm:text-base shadow-xl shadow-amber-500/30 cursor-pointer transition-all"
            >
              <Trophy className="w-5 h-5 text-slate-950" />
              <span>{isAr ? '🏆 إنهاء الموسم واستلام الجوائز' : '🏆 Season Finale & Awards'}</span>
            </button>
          ) : (
            <>
              <button
                id="btn_dashboard_skip"
                disabled={isLoadingMatch}
                onClick={onSkipMatch}
                className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 font-black text-xs sm:text-sm shadow-lg transition-all cursor-pointer disabled:opacity-50"
                title={isAr ? 'تخطي المباراة ومحاكاة الجولة فوراً مع خصم 50% من إيرادات التذاكر' : 'Instant simulate round with 50% revenue deduction'}
              >
                <FastForward className="w-4 h-4 text-amber-400" />
                <span>{isAr ? 'تخطي المباراة (-50% إيرادات)' : 'Skip Match (-50% Rev)'}</span>
              </button>

              <button
                id="btn_dashboard_kickoff"
                disabled={isLoadingMatch}
                onClick={onPlayNextMatch}
                className="flex items-center gap-2.5 px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 disabled:opacity-50 text-slate-950 font-black text-sm sm:text-base shadow-xl shadow-emerald-500/30 group transition-all cursor-pointer"
              >
                <Flame className={`w-5 h-5 text-slate-950 ${isLoadingMatch ? 'animate-spin' : 'group-hover:scale-110'} transition-transform`} />
                <span>
                  {isLoadingMatch 
                    ? (isAr ? 'جاري تحضير المعاينة...' : 'Loading Clash...') 
                    : (isAr ? 'خوض المباراة القادمة' : 'Play Next Match')}
                </span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Vital Indicators Bar */}
      <div className="mt-6 pt-6 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Board Trust */}
        <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-slate-400 font-bold">{isAr ? 'ثقة مجلس الإدارة' : 'Board Trust'}</span>
            <span className={`font-black ${club.boardTrust >= 70 ? 'text-emerald-400' : club.boardTrust >= 40 ? 'text-amber-400' : 'text-rose-400'}`}>
              {club.boardTrust}%
            </span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${club.boardTrust >= 70 ? 'bg-emerald-500' : club.boardTrust >= 40 ? 'bg-amber-500' : 'bg-rose-500'}`}
              style={{ width: `${club.boardTrust}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">
            {club.boardTrust >= 70 ? (isAr ? 'إدارة داعمة ومستقرة' : 'Secure & Backed') : (isAr ? 'تحذير: نتائج الفريق تحت المجهر' : 'Under Review')}
          </span>
        </div>

        {/* Fan Mood */}
        <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-slate-400 font-bold">{isAr ? 'حماس الجماهير' : 'Fan Support'}</span>
            <span className="font-black text-sky-400">{club.fanMood}%</span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div 
              className="h-full bg-sky-500 rounded-full transition-all duration-500"
              style={{ width: `${club.fanMood}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">
            {isAr ? 'المدرجات تهتف بحماسة' : 'Crowd in Full Voice'}
          </span>
        </div>

        {/* Club Reputation */}
        <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-slate-400 font-bold">{isAr ? 'الهيبة والسمعة' : 'Prestige'}</span>
            <span className="font-black text-amber-400">{club.finances.reputation}</span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div 
              className="h-full bg-amber-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, (club.finances.reputation / 1000) * 100)}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">
            {isAr ? 'نادي محترم صاعد' : 'Rising Contender'}
          </span>
        </div>

        {/* VIP Level */}
        <div 
          onClick={onVipClick}
          className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800 hover:border-amber-500/50 cursor-pointer transition-colors"
        >
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-amber-400 font-bold flex items-center gap-1">
              <Crown className="w-3.5 h-3.5" />
              <span>{currentTier.nameAr}</span>
            </span>
            <span className="font-black text-white">{vipPoints} XP</span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full"
              style={{ width: `${Math.min(100, (vipPoints / (nextTier.pointsRequired || 1000)) * 100)}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">
            {isAr ? 'تقدم باللعب فقط، لا مدفوعات' : 'Earned purely by gameplay'}
          </span>
        </div>
      </div>
    </div>
  );
};
