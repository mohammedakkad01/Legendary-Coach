/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Round Summary View (ملخص الجولة)
 * Shown right after the user's match: all results of the matchday,
 * top performers of the round, and the updated league leaders.
 */

import React, { useMemo } from 'react';
import { Trophy, Star, Target, Handshake, ChevronRight, BarChart3, Eye, CalendarDays } from 'lucide-react';
import { useGameStore } from '../state/useGameStore';
import { PlayerStats } from '../types/game';

const ratingColor = (r: number) =>
  r >= 8.5 ? 'bg-emerald-500 text-slate-950'
  : r >= 7.5 ? 'bg-green-500/90 text-slate-950'
  : r >= 6.5 ? 'bg-amber-400 text-slate-950'
  : 'bg-rose-500 text-white';

export const RoundSummaryView: React.FC = () => {
  const { lastRoundSummary, tournamentStats, leagueStandings, club, language, setActiveTab } = useGameStore();
  const isAr = language === 'ar';

  const nameOf = (clubId: string) => {
    if (clubId === club.id) return club.name;
    return (leagueStandings.find(s => s.clubId === clubId)?.clubName || clubId).replace(' (فريقك)', '');
  };

  const topScorers = useMemo(
    () => [...tournamentStats]
      .filter(s => s.goals > 0)
      .sort((a, b) => b.goals - a.goals || b.assists - a.assists || a.matchRatings.length - b.matchRatings.length)
      .slice(0, 5),
    [tournamentStats]
  );
  const topAssists = useMemo(
    () => [...tournamentStats]
      .filter(s => s.assists > 0)
      .sort((a, b) => b.assists - a.assists || b.goals - a.goals || a.matchRatings.length - b.matchRatings.length)
      .slice(0, 5),
    [tournamentStats]
  );

  if (!lastRoundSummary) {
    return (
      <div className="max-w-3xl mx-auto p-6 text-center space-y-4">
        <p className="text-slate-400 text-sm">{isAr ? 'لا يوجد ملخص جولة بعد. العب مباراة أولاً.' : 'No round summary yet. Play a match first.'}</p>
        <button
          onClick={() => setActiveTab('dashboard')}
          className="px-6 py-3 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white font-black text-sm cursor-pointer"
        >
          {isAr ? 'متابعة' : 'Continue'}
        </button>
      </div>
    );
  }

  const { matchday, results, topPerformers } = lastRoundSummary;

  const LeaderList = ({ title, icon, rows, field }: {
    title: string;
    icon: React.ReactNode;
    rows: PlayerStats[];
    field: 'goals' | 'assists';
  }) => (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-black text-white">{icon}<span>{title}</span></div>
      {rows.length === 0 ? (
        <p className="text-xs text-slate-500 py-2">{isAr ? 'لا بيانات بعد' : 'No data yet'}</p>
      ) : (
        <ol className="space-y-1.5">
          {rows.map((r, i) => (
            <li
              key={r.playerId}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs ${
                r.clubId === club.id ? 'bg-sky-950/50 border border-sky-800/60' : 'bg-slate-950/60'
              }`}
            >
              <span className="w-5 text-center font-black text-slate-500">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-white truncate">{r.name}</div>
                <div className="text-[11px] text-slate-500 truncate">{nameOf(r.clubId)}</div>
              </div>
              <span className="font-black text-lg text-amber-300 tabular-nums">{r[field]}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-3 sm:p-6 space-y-5">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-sky-950 border border-slate-800 rounded-3xl p-5 shadow-xl">
        <div className="flex items-center gap-2 text-sky-400 text-xs font-bold mb-1">
          <CalendarDays className="w-4 h-4" />
          <span>{isAr ? 'ملخص الجولة' : 'Matchday Summary'}</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-black text-white">
          {isAr ? `نتائج الجولة ${matchday}` : `Matchday ${matchday} Results`}
        </h2>
      </div>

      {/* Section 1: Matchday Results */}
      <section className="bg-slate-900 border border-slate-800 rounded-3xl p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-black text-white">
          <Trophy className="w-4 h-4 text-amber-400" />
          <span>{isAr ? 'نتائج الجولة' : 'Matchday Results'}</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {results.map((r, i) => {
            const userScore = r.homeClubId === club.id ? r.homeScore : r.awayScore;
            const oppScore = r.homeClubId === club.id ? r.awayScore : r.homeScore;
            const badge = r.isUserMatch
              ? (userScore > oppScore ? { t: isAr ? 'فوز' : 'W', c: 'bg-emerald-500 text-slate-950' }
                : userScore < oppScore ? { t: isAr ? 'خسارة' : 'L', c: 'bg-rose-500 text-white' }
                : { t: isAr ? 'تعادل' : 'D', c: 'bg-amber-400 text-slate-950' })
              : null;
            return (
              <div
                key={`${r.homeClubId}_${r.awayClubId}_${i}`}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-2xl text-xs font-bold ${
                  r.isUserMatch ? 'bg-sky-950/60 border border-sky-600/60' : 'bg-slate-950/60 border border-slate-800'
                }`}
              >
                <span className="flex-1 text-white truncate text-start">{r.homeClubName}</span>
                <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-amber-300 font-black tabular-nums" dir="ltr">
                  {r.homeScore} - {r.awayScore}
                </span>
                <span className="flex-1 text-white truncate text-end">{r.awayClubName}</span>
                {badge && <span className={`px-1.5 py-0.5 rounded text-[10px] font-black ${badge.c}`}>{badge.t}</span>}
              </div>
            );
          })}
        </div>
      </section>

      {/* Section 2: Top Performers */}
      <section className="bg-slate-900 border border-slate-800 rounded-3xl p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-black text-white">
          <Star className="w-4 h-4 text-amber-400" />
          <span>{isAr ? 'نجوم الجولة' : 'Top Performers'}</span>
        </div>
        <ol className="space-y-2">
          {topPerformers.map((p, i) => (
            <li
              key={p.playerId}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl ${
                p.clubId === club.id ? 'bg-sky-950/50 border border-sky-800/60' : 'bg-slate-950/60 border border-slate-800'
              }`}
            >
              <span className="w-5 text-center font-black text-slate-500 text-xs">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-black text-sm text-white truncate">{p.name}</span>
                  <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300 font-bold">{p.position}</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                  <span className="truncate">{p.clubName}</span>
                  {p.goals > 0 && <span className="text-emerald-400 font-bold">⚽ {p.goals}</span>}
                  {p.assists > 0 && <span className="text-sky-400 font-bold">🅰️ {p.assists}</span>}
                  {p.yellowCards > 0 && <span>🟨</span>}
                  {p.redCards > 0 && <span>🟥</span>}
                </div>
              </div>
              <span className={`px-2.5 py-1 rounded-xl font-black text-sm tabular-nums ${ratingColor(p.rating)}`}>
                {p.rating.toFixed(1)}
              </span>
            </li>
          ))}
        </ol>
      </section>

      {/* Section 3: League Leaders */}
      <section className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-black text-white px-1">
          <BarChart3 className="w-4 h-4 text-purple-400" />
          <span>{isAr ? 'متصدرو الدوري' : 'League Leaders'}</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <LeaderList
            title={isAr ? 'الهدافون' : 'Top Scorers'}
            icon={<Target className="w-4 h-4 text-emerald-400" />}
            rows={topScorers}
            field="goals"
          />
          <LeaderList
            title={isAr ? 'صناع الأهداف' : 'Top Assists'}
            icon={<Handshake className="w-4 h-4 text-sky-400" />}
            rows={topAssists}
            field="assists"
          />
        </div>
      </section>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-2 pt-1">
        <button
          id="btn_round_summary_continue"
          onClick={() => setActiveTab('dashboard')}
          className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-black text-sm shadow-lg shadow-sky-600/30 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] transition"
        >
          <span>{isAr ? 'متابعة' : 'Continue'}</span>
          <ChevronRight className={`w-4 h-4 ${isAr ? 'rotate-180' : ''}`} />
        </button>
        <button
          onClick={() => setActiveTab('league')}
          className="py-3.5 px-5 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-300 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
        >
          <Trophy className="w-4 h-4" />
          <span>{isAr ? 'الترتيب والإحصائيات' : 'Table & Stats'}</span>
        </button>
        <button
          onClick={() => setActiveTab('match')}
          className="py-3.5 px-5 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
        >
          <Eye className="w-4 h-4" />
          <span>{isAr ? 'تفاصيل مباراتي' : 'My Match Details'}</span>
        </button>
      </div>
    </div>
  );
};
