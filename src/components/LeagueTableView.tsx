/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * League Table & Competition Standings View
 * Ranks, promotion zone, goal differences, recent form guide, and fixture kick-off.
 */

import React, { useState } from 'react';
import { useGameStore } from '../state/useGameStore';
import { Trophy, Flame, ChevronRight, Database, Sparkles, Calendar } from 'lucide-react';
import { LeagueStatsPanel } from './LeagueStatsPanel';

export const LeagueTableView: React.FC = () => {
  const { leagueStandings, club, startNewMatch, language, setActiveTab } = useGameStore();
  const isAr = language === 'ar';
  const [view, setView] = useState<'table' | 'stats'>('table');
  const currentRound = leagueStandings.find(s => s.clubId === club.id)?.played ?? 0;

  // Sort standings by points desc, then GD desc, then GF desc
  const sorted = [...leagueStandings].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    return b.goalsFor - a.goalsFor;
  });

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-6 space-y-6">
      
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-purple-950 border border-slate-800 rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-purple-400 text-xs font-bold mb-1">
            <Trophy className="w-4 h-4" />
            <span>{isAr ? 'المسابقات الرسمية والمنافسات' : 'Official Competitions'}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black font-heading text-white">
            {club.divisionName || (isAr ? 'جدول ترتيب دوري التحدي للدرجة الثانية' : 'Challenge Division 2 Table')}
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            {isAr ? 'بيانات المنافسات وجداول الترتيب الرسمية متزامنة مع المصدر الواقعي.' : 'Official standings synchronized with real source.'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setActiveTab('calendar')}
            className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/80 text-amber-300 font-bold text-xs sm:text-sm transition cursor-pointer"
          >
            <Calendar className="w-4 h-4 text-amber-400" />
            <span>{isAr ? 'تقويم المباريات' : 'Fixtures Calendar'}</span>
          </button>

          <button
            onClick={() => setActiveTab('football_api')}
            className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-indigo-900/60 hover:bg-indigo-800/80 border border-indigo-500/40 text-indigo-200 font-bold text-xs sm:text-sm transition cursor-pointer"
          >
            <Database className="w-4 h-4 text-indigo-400" />
            <span>{isAr ? 'مزامنة الدوري (API)' : 'API Sync'}</span>
          </button>

          <button
            onClick={() => startNewMatch()}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs sm:text-sm shadow-xl shadow-purple-600/30 cursor-pointer"
          >
            <Flame className="w-4 h-4" />
            <span>{isAr ? 'خوض الجولة القادمة' : 'Play Next Matchday'}</span>
          </button>
        </div>
      </div>

      {/* Table / Player stats switch */}
      <div className="flex gap-2">
        {([
          { id: 'table', ar: 'جدول الترتيب', en: 'Standings' },
          { id: 'stats', ar: 'إحصائيات اللاعبين', en: 'Player Stats' },
        ] as const).map(t => (
          <button
            key={t.id}
            onClick={() => setView(t.id)}
            className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
              view === t.id ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30' : 'bg-slate-800/70 text-slate-400 hover:text-slate-200'
            }`}
          >
            {isAr ? t.ar : t.en}
          </button>
        ))}
      </div>

      {view === 'stats' && <LeagueStatsPanel />}

      {/* Standings Table */}
      {view === 'table' && (
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-bold">
              <tr>
                <th className="py-3.5 px-4 text-center w-12">#</th>
                <th className="py-3.5 px-4">{isAr ? 'النادي' : 'Club'}</th>
                <th className="py-3.5 px-3 text-center">{isAr ? 'لعب' : 'P'}</th>
                <th className="py-3.5 px-3 text-center">{isAr ? 'فوز' : 'W'}</th>
                <th className="py-3.5 px-3 text-center">{isAr ? 'تعادل' : 'D'}</th>
                <th className="py-3.5 px-3 text-center">{isAr ? 'خسارة' : 'L'}</th>
                <th className="py-3.5 px-3 text-center hidden sm:table-cell">{isAr ? 'له' : 'GF'}</th>
                <th className="py-3.5 px-3 text-center hidden sm:table-cell">{isAr ? 'عليه' : 'GA'}</th>
                <th className="py-3.5 px-3 text-center">{isAr ? 'الفارق' : 'GD'}</th>
                <th className="py-3.5 px-4 text-center font-black text-white">{isAr ? 'النقاط' : 'Pts'}</th>
                <th className="py-3.5 px-4 text-center hidden md:table-cell">{isAr ? 'آخر 5 مباريات' : 'Form'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-semibold">
              {sorted.map((item, index) => {
                const rank = index + 1;
                const isPlayerClub = item.clubId === club.id;
                const isPromotionZone = rank <= 2;
                const isRelegationZone = rank >= 7;

                return (
                  <tr 
                    key={item.clubId}
                    className={`transition-colors ${
                      isPlayerClub 
                        ? 'bg-sky-950/40 hover:bg-sky-950/60 font-black' 
                        : 'hover:bg-slate-800/40'
                    }`}
                  >
                    {/* Rank */}
                    <td className="py-3.5 px-4 text-center">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-lg text-xs font-black ${
                        isPromotionZone ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                        isRelegationZone ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' :
                        'text-slate-400'
                      }`}>
                        {rank}
                      </span>
                    </td>

                    {/* Club */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-heading font-black text-sm text-white">
                          {isAr ? item.clubName : item.clubName}
                        </span>
                        {isPlayerClub && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-sky-500 text-slate-950 font-black">
                            {isAr ? 'فريقك' : 'You'}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-3 text-center text-slate-300">{item.played}</td>
                    <td className="py-3.5 px-3 text-center text-emerald-400">{item.won}</td>
                    <td className="py-3.5 px-3 text-center text-amber-400">{item.drawn}</td>
                    <td className="py-3.5 px-3 text-center text-rose-400">{item.lost}</td>
                    <td className="py-3.5 px-3 text-center text-slate-400 hidden sm:table-cell">{item.goalsFor}</td>
                    <td className="py-3.5 px-3 text-center text-slate-400 hidden sm:table-cell">{item.goalsAgainst}</td>
                    <td className={`py-3.5 px-3 text-center font-bold ${item.goalDifference > 0 ? 'text-emerald-400' : item.goalDifference < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                      {item.goalDifference > 0 ? `+${item.goalDifference}` : item.goalDifference}
                    </td>
                    <td className="py-3.5 px-4 text-center font-black text-base text-amber-300">
                      {item.points}
                    </td>

                    {/* Form indicator pills */}
                    <td className="py-3.5 px-4 text-center hidden md:table-cell">
                      <div className="flex items-center justify-center gap-1">
                        {item.form.map((f, fi) => (
                          <span
                            key={fi}
                            className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-black ${
                              f === 'W' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' :
                              f === 'D' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' :
                              'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                            }`}
                          >
                            {f}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="p-4 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-emerald-500/20 border border-emerald-500/40" />
              <span>{isAr ? 'منطقة الصعود للدوري الممتاز (1-2)' : 'Promotion Zone (1-2)'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-rose-500/20 border border-rose-500/40" />
              <span>{isAr ? 'منطقة الهبوط (7-8)' : 'Relegation Zone (7-8)'}</span>
            </div>
          </div>

          <span>{isAr ? `الجولة ${currentRound}` : `Round ${currentRound}`}</span>
        </div>
      </div>
      )}

    </div>
  );
};
