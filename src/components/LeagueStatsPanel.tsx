/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * League Player Statistics (إحصائيات الدوري)
 * Leaderboards built from `tournamentStats`: scorers, assists, average rating,
 * yellow cards and red cards for every player in the league.
 */

import React, { useMemo, useState } from 'react';
import { useGameStore } from '../state/useGameStore';
import { PlayerStats } from '../types/game';

type StatKey = 'goals' | 'assists' | 'rating' | 'yellow' | 'red';

const avg = (r: number[]) => (r.length ? r.reduce((a, b) => a + b, 0) / r.length : 0);

export const LeagueStatsPanel: React.FC = () => {
  const { tournamentStats, leagueStandings, club, language } = useGameStore();
  const isAr = language === 'ar';
  const [stat, setStat] = useState<StatKey>('goals');

  const tabs: { id: StatKey; ar: string; en: string; icon: string }[] = [
    { id: 'goals', ar: 'الهدافون', en: 'Scorers', icon: '⚽' },
    { id: 'assists', ar: 'صناع الأهداف', en: 'Assists', icon: '🅰️' },
    { id: 'rating', ar: 'التقييم', en: 'Ratings', icon: '⭐' },
    { id: 'yellow', ar: 'الصفراء', en: 'Yellow', icon: '🟨' },
    { id: 'red', ar: 'الحمراء', en: 'Red', icon: '🟥' },
  ];

  const nameOf = (clubId: string) =>
    clubId === club.id
      ? club.name
      : (leagueStandings.find(s => s.clubId === clubId)?.clubName || clubId).replace(' (فريقك)', '');

  const rows = useMemo(() => {
    const maxApps = tournamentStats.reduce((m, s) => Math.max(m, s.matchRatings.length), 0);
    const minApps = Math.min(3, Math.max(1, maxApps)); // avoid one-game wonders topping the rating list
    const value = (s: PlayerStats) =>
      stat === 'goals' ? s.goals
      : stat === 'assists' ? s.assists
      : stat === 'yellow' ? s.yellowCards
      : stat === 'red' ? s.redCards
      : avg(s.matchRatings);

    return [...tournamentStats]
      .filter(s => (stat === 'rating' ? s.matchRatings.length >= minApps : value(s) > 0))
      .sort((a, b) => value(b) - value(a) || (b.goals + b.assists) - (a.goals + a.assists) || a.matchRatings.length - b.matchRatings.length)
      .slice(0, 15)
      .map(s => ({ s, v: value(s) }));
  }, [tournamentStats, stat]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar p-3 border-b border-slate-800 bg-slate-950/60">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setStat(t.id)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black whitespace-nowrap transition cursor-pointer ${
              stat === t.id ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30' : 'bg-slate-800/70 text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>{t.icon}</span>
            <span>{isAr ? t.ar : t.en}</span>
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="p-8 text-center text-xs text-slate-500">
          {isAr ? 'لا توجد إحصائيات بعد — العب جولة لتظهر الأرقام.' : 'No stats yet — play a matchday to populate them.'}
        </div>
      ) : (
        <table className="w-full text-xs">
          <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-bold">
            <tr>
              <th className="py-3 px-3 w-10 text-center">#</th>
              <th className="py-3 px-3 text-start">{isAr ? 'اللاعب' : 'Player'}</th>
              <th className="py-3 px-3 text-center hidden sm:table-cell">{isAr ? 'لعب' : 'Apps'}</th>
              <th className="py-3 px-3 text-center hidden sm:table-cell">{isAr ? 'أهداف' : 'G'}</th>
              <th className="py-3 px-3 text-center hidden sm:table-cell">{isAr ? 'صناعة' : 'A'}</th>
              <th className="py-3 px-3 text-center font-black text-white">
                {stat === 'rating' ? (isAr ? 'المعدل' : 'Avg') : (tabs.find(t => t.id === stat)?.icon)}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-semibold">
            {rows.map(({ s, v }, i) => (
              <tr key={s.playerId} className={s.clubId === club.id ? 'bg-sky-950/40' : 'hover:bg-slate-800/40'}>
                <td className="py-3 px-3 text-center text-slate-500 font-black">{i + 1}</td>
                <td className="py-3 px-3">
                  <div className="font-black text-white truncate max-w-[180px]">{s.name}</div>
                  <div className="text-[11px] text-slate-500 truncate max-w-[180px]">{nameOf(s.clubId)}</div>
                </td>
                <td className="py-3 px-3 text-center text-slate-400 hidden sm:table-cell">{s.matchRatings.length}</td>
                <td className="py-3 px-3 text-center text-slate-400 hidden sm:table-cell">{s.goals}</td>
                <td className="py-3 px-3 text-center text-slate-400 hidden sm:table-cell">{s.assists}</td>
                <td className="py-3 px-3 text-center font-black text-base text-amber-300 tabular-nums">
                  {stat === 'rating' ? v.toFixed(2) : v}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};
