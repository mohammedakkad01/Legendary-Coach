/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * LeagueCalendarView.tsx
 * شاشة تقويم مباريات الموسم (Season Fixtures & Calendar View)
 * تعرض كامل جولات الدوري (ذهاب وإياب):
 * - فلترة سريعة (الكل / الملعوبة / المتبقية)
 * - تمييز الجولة القادمة (أول جولة غير ملعوبة) بصرياً مع زر سريع لخوضها
 * - إبراز نتائج المباريات المنتهية (فوز باللون الأخضر، تعادل بالأصفر، خسارة بالأحمر)
 * - تحديد مباريات الأرض والجمهور ومباريات الذهاب
 */

import React, { useState } from 'react';
import { useGameStore } from '../state/useGameStore';
import { 
  Calendar, 
  Trophy, 
  Flame, 
  CheckCircle2, 
  Clock, 
  Home, 
  Plane, 
  ChevronRight,
  Filter,
  ShieldAlert
} from 'lucide-react';
import { countdownLabel, formatFixtureDate } from '../utils/fixtureDate';

export const LeagueCalendarView: React.FC = () => {
  const { 
    club, 
    leagueFixtures, 
    startNewMatch, 
    isLoadingMatch, 
    language,
    setActiveTab
  } = useGameStore();

  const [filter, setFilter] = useState<'all' | 'unplayed' | 'played'>('all');
  const isAr = language === 'ar';

  const fixtures = leagueFixtures || [];
  const nextFixture = fixtures.find(f => !f.played);

  const filteredFixtures = fixtures.filter(f => {
    if (filter === 'unplayed') return !f.played;
    if (filter === 'played') return f.played;
    return true;
  });

  const playedCount = fixtures.filter(f => f.played).length;
  const totalCount = fixtures.length;
  const progressPercent = totalCount > 0 ? Math.round((playedCount / totalCount) * 100) : 0;

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-6 space-y-6 animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/60 border border-slate-800 rounded-3xl p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-amber-400 text-xs font-bold">
            <Calendar className="w-4 h-4" />
            <span>{isAr ? 'تقويم مباريات الموسم الرسمي' : 'Official Season Calendar'}</span>
          </div>
          <h2 className="text-xl sm:text-3xl font-black font-heading text-white">
            {club.divisionName || (isAr ? 'دوري التحدي للدرجة الثانية' : 'League Division')}
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            {isAr 
              ? `إجمالي الجولات: ${totalCount} جولة • تم لعب ${playedCount} جولة • متبقي ${totalCount - playedCount}`
              : `Total Matchdays: ${totalCount} • Played: ${playedCount} • Remaining: ${totalCount - playedCount}`}
          </p>
        </div>

        {/* Quick Action & Progress */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800 flex flex-col justify-center min-w-[140px]">
            <div className="flex justify-between text-xs font-bold mb-1">
              <span className="text-slate-400">{isAr ? 'تقدم الموسم' : 'Season Progress'}</span>
              <span className="text-amber-400 font-mono">{progressPercent}%</span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <button
            onClick={() => setActiveTab('league')}
            className="px-4 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-purple-300 border border-purple-500/30 font-bold text-xs sm:text-sm transition cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Trophy className="w-4 h-4 text-purple-400" />
            <span>{isAr ? 'جدول الترتيب' : 'Standings'}</span>
          </button>

          {nextFixture && (
            <button
              disabled={isLoadingMatch}
              onClick={() => startNewMatch()}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 disabled:opacity-50 text-slate-950 font-black text-xs sm:text-sm shadow-xl shadow-emerald-500/30 transition cursor-pointer"
            >
              <Flame className="w-4 h-4 text-slate-950" />
              <span>{isAr ? `خوض الجولة #${nextFixture.matchday}` : `Play Matchday #${nextFixture.matchday}`}</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between gap-2 flex-wrap border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-1.5 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setFilter('all')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              filter === 'all' 
                ? 'bg-amber-500 text-slate-950 shadow-md' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {isAr ? `جميع المباريات (${fixtures.length})` : `All Matches (${fixtures.length})`}
          </button>
          <button
            onClick={() => setFilter('unplayed')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              filter === 'unplayed' 
                ? 'bg-amber-500 text-slate-950 shadow-md' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {isAr ? `القادمة (${totalCount - playedCount})` : `Upcoming (${totalCount - playedCount})`}
          </button>
          <button
            onClick={() => setFilter('played')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              filter === 'played' 
                ? 'bg-amber-500 text-slate-950 shadow-md' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {isAr ? `المنتهية (${playedCount})` : `Finished (${playedCount})`}
          </button>
        </div>

        <div className="text-xs text-slate-400 flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500 inline-block" />
            <span>{isAr ? 'ذهاب وإياب' : 'Home & Away'}</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
            <span>{isAr ? 'الجولة القادمة' : 'Next Up'}</span>
          </span>
        </div>
      </div>

      {/* Fixtures Grid / Cards */}
      {filteredFixtures.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center text-slate-400 space-y-3">
          <Calendar className="w-12 h-12 text-slate-600 mx-auto" />
          <p className="text-sm font-bold">
            {isAr ? 'لا توجد مباريات مطابقة للفلتر المحدد' : 'No fixtures match the selected filter'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFixtures.map((fix) => {
            const isNext = !fix.played && nextFixture?.matchday === fix.matchday;
            
            // Score styling
            let outcome: 'win' | 'loss' | 'draw' | 'unplayed' = 'unplayed';
            if (fix.played && fix.homeScore !== undefined && fix.awayScore !== undefined) {
              const myScore = fix.isHome ? fix.homeScore : fix.awayScore;
              const oppScore = fix.isHome ? fix.awayScore : fix.homeScore;
              if (myScore > oppScore) outcome = 'win';
              else if (myScore < oppScore) outcome = 'loss';
              else outcome = 'draw';
            }

            return (
              <div
                key={`fixture_${fix.matchday}_${fix.opponentClubId}`}
                className={`relative rounded-2xl border transition-all p-4 flex flex-col justify-between overflow-hidden shadow-lg ${
                  isNext
                    ? 'bg-gradient-to-b from-slate-900 to-emerald-950/30 border-emerald-500/60 ring-2 ring-emerald-500/30'
                    : fix.played
                    ? 'bg-slate-900/80 border-slate-800/80'
                    : 'bg-slate-950/90 border-slate-800'
                }`}
              >
                {/* Top Badge Tag */}
                <div className="flex items-center justify-between text-xs mb-3 pb-2 border-b border-slate-800/60">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-black text-amber-400">
                      {isAr ? `الجولة #${fix.matchday}` : `MD #${fix.matchday}`}
                    </span>
                    {isNext && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-black animate-pulse">
                        {isAr ? 'الجولة القادمة' : 'Next Match'}
                      </span>
                    )}
                  </div>

                  <span className={`flex items-center gap-1 text-[11px] font-bold ${
                    fix.isHome ? 'text-sky-400' : 'text-slate-400'
                  }`}>
                    {fix.isHome ? <Home className="w-3.5 h-3.5" /> : <Plane className="w-3.5 h-3.5" />}
                    <span>{fix.isHome ? (isAr ? 'على أرضك' : 'Home') : (isAr ? 'خارج أرضك' : 'Away')}</span>
                  </span>
                </div>

                {/* Real calendar date */}
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 -mt-1 mb-1">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-sky-400" />
                    <span>{formatFixtureDate(fix.date, isAr)}</span>
                  </span>
                  {!fix.played && (
                    <span className={isNext ? 'text-emerald-400' : 'text-slate-500'}>{countdownLabel(fix.date, isAr)}</span>
                  )}
                </div>

                {/* Match Opponent & Club Clash Info */}
                <div className="flex items-center justify-between gap-3 py-2">
                  {/* Player Club */}
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 p-1.5 flex items-center justify-center shrink-0">
                      {club.logoUrl ? (
                        <img 
                          src={club.logoUrl} 
                          alt={club.name} 
                          className="w-full h-full object-contain"
                          referrerPolicy="no-referrer"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                        />
                      ) : (
                        <span className="text-lg">{club.logoBadge || '🛡️'}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-black text-white truncate block">
                        {isAr ? club.name : club.nameEn}
                      </span>
                      <span className="text-[10px] text-slate-500 font-bold block">
                        {fix.isHome ? (isAr ? 'المستضيف' : 'Host') : (isAr ? 'الضيف' : 'Visitor')}
                      </span>
                    </div>
                  </div>

                  {/* Score / VS Center Area */}
                  <div className="flex flex-col items-center justify-center px-2 shrink-0">
                    {fix.played && fix.homeScore !== undefined && fix.awayScore !== undefined ? (
                      <div className="flex flex-col items-center">
                        <span className="font-mono text-base font-black text-white px-2 py-0.5 rounded-lg bg-slate-950 border border-slate-800">
                          {fix.isHome ? `${fix.homeScore} - ${fix.awayScore}` : `${fix.awayScore} - ${fix.homeScore}`}
                        </span>
                        <span className={`text-[9px] font-black uppercase mt-1 px-1.5 py-0.2 rounded ${
                          outcome === 'win'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : outcome === 'loss'
                            ? 'bg-rose-500/20 text-rose-400'
                            : 'bg-amber-500/20 text-amber-400'
                        }`}>
                          {outcome === 'win' 
                            ? (isAr ? 'فوز' : 'WIN') 
                            : outcome === 'loss' 
                            ? (isAr ? 'خسارة' : 'LOSS') 
                            : (isAr ? 'تعادل' : 'DRAW')}
                        </span>
                      </div>
                    ) : (
                      <div className="text-center">
                        <span className="text-xs font-black text-slate-500 tracking-widest block uppercase">VS</span>
                        <span className="text-[10px] text-slate-500 flex items-center gap-0.5 justify-center mt-0.5">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span>{isAr ? 'لم تلعب' : 'Pending'}</span>
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Opponent Club */}
                  <div className="flex items-center justify-end gap-2 min-w-0 flex-1 text-right">
                    <div className="min-w-0">
                      <span className="text-xs font-black text-white truncate block">
                        {fix.opponentClubName}
                      </span>
                      <span className="text-[10px] text-slate-500 font-bold block">
                        {!fix.isHome ? (isAr ? 'المستضيف' : 'Host') : (isAr ? 'الضيف' : 'Visitor')}
                      </span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 p-1.5 flex items-center justify-center shrink-0">
                      {fix.opponentBadge ? (
                        <img 
                          src={fix.opponentBadge} 
                          alt={fix.opponentClubName} 
                          className="w-full h-full object-contain"
                          referrerPolicy="no-referrer"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                        />
                      ) : (
                        <span className="text-lg">⚔️</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Action / Footer */}
                {isNext && (
                  <div className="mt-3 pt-3 border-t border-emerald-500/20 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-emerald-400">
                      {isAr ? 'جاهز للانطلاق والتحدي' : 'Ready for Kickoff'}
                    </span>
                    <button
                      disabled={isLoadingMatch}
                      onClick={() => startNewMatch()}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-md transition cursor-pointer"
                    >
                      <Flame className="w-3.5 h-3.5" />
                      <span>{isAr ? 'خوض المباراة' : 'Play Match'}</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
