/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NextMatchCard.tsx
 * The "match" tab when no match is running: instead of an empty "no active match" message it
 * shows the NEXT real fixture — opponent, date & countdown, venue, league position, AI prediction
 * (odds, expected score, technical gap) — with the kick-off button.
 */

import React, { useEffect, useMemo } from 'react';
import { useGameStore } from '../state/useGameStore';
import { Calendar, Flame, Sliders, Swords, Trophy, Home, Plane, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { countdownLabel, formatFixtureDate } from '../utils/fixtureDate';

export const NextMatchCard: React.FC = () => {
  const {
    club,
    leagueFixtures,
    leagueStandings,
    nextMatchInsight,
    loadNextMatchInsight,
    startNewMatch,
    isLoadingMatch,
    setActiveTab,
    vipPoints,
    language,
  } = useGameStore();
  const isAr = language === 'ar';

  const nextFixture = leagueFixtures.find(f => !f.played);
  const lastPlayed = [...leagueFixtures].reverse().find(f => f.played);
  const seasonFinished = leagueFixtures.length > 0 && !nextFixture;

  // Recompute the prediction whenever something that affects it changes.
  useEffect(() => {
    loadNextMatchInsight();
  }, [leagueFixtures, club.id, club.footballLineup, vipPoints, loadNextMatchInsight]);

  const rank = useMemo(() => {
    const sorted = [...leagueStandings].sort(
      (a, b) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor,
    );
    const idx = sorted.findIndex(s => s.clubId === club.id);
    return idx >= 0 ? { pos: idx + 1, total: sorted.length } : null;
  }, [leagueStandings, club.id]);

  if (seasonFinished) {
    return (
      <div className="max-w-3xl mx-auto p-4 sm:p-6">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-4 shadow-2xl">
          <div className="text-4xl">🏆</div>
          <h2 className="text-xl font-black font-heading text-white">
            {isAr ? 'انتهى موسمك!' : 'Your season is complete!'}
          </h2>
          <p className="text-sm text-slate-400">
            {isAr ? 'راجع جدول الترتيب النهائي، ثم ابدأ موسماً جديداً بتقويم جديد.' : 'Check the final table, then start a new season with a fresh calendar.'}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button onClick={() => setActiveTab('league')} className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-purple-300 border border-purple-500/30 text-sm font-bold cursor-pointer">
              {isAr ? 'جدول الترتيب' : 'Standings'}
            </button>
            <button disabled={isLoadingMatch} onClick={() => startNewMatch()} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 text-sm font-black cursor-pointer disabled:opacity-50">
              {isAr ? 'ابدأ موسماً جديداً' : 'Start New Season'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!nextFixture) {
    return (
      <div className="max-w-3xl mx-auto p-4 sm:p-6">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-3">
          <div className="text-4xl">⚽</div>
          <h2 className="text-lg font-black text-white">{isAr ? 'اختر ناديك لتبدأ المسيرة' : 'Pick your club to begin'}</h2>
          <p className="text-sm text-slate-400">{isAr ? 'بعد اختيار النادي ستظهر هنا مباراتك القادمة مع موعدها وتوقعات المواجهة.' : 'Once you pick a club, your next fixture and its prediction appear here.'}</p>
        </div>
      </div>
    );
  }

  const insight = nextMatchInsight && nextMatchInsight.fixture.matchday === nextFixture.matchday ? nextMatchInsight : null;
  const gap = insight?.technicalGap ?? 0;
  const GapIcon = gap > 1 ? TrendingUp : gap < -1 ? TrendingDown : Minus;
  const gapColor = gap > 1 ? 'text-emerald-400' : gap < -1 ? 'text-rose-400' : 'text-amber-400';
  const gapText = !insight
    ? ''
    : gap > 1
    ? (isAr ? `أفضلية فنية لك بفارق ${gap}` : `You lead by ${gap} rating points`)
    : gap < -1
    ? (isAr ? `الخصم أقوى فنياً بفارق ${Math.abs(gap)}` : `Opponent leads by ${Math.abs(gap)} rating points`)
    : (isAr ? 'مستوى الفريقين متقارب جداً' : 'Teams are evenly matched');

  return (
    <div className="max-w-3xl mx-auto p-3 sm:p-6 space-y-4 animate-fadeIn">
      <div className="relative bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-2xl overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(circle at 20% 0%, rgba(14,165,233,0.12), transparent 45%), radial-gradient(circle at 80% 0%, rgba(244,63,94,0.10), transparent 45%)' }} />

        {/* Competition + date */}
        <div className="relative flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-4 mb-5">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-amber-400 block">{club.divisionName}</span>
              <span className="text-sm font-black text-white">{isAr ? `الجولة #${nextFixture.matchday}` : `Matchday #${nextFixture.matchday}`}</span>
            </div>
          </div>
          <div className="text-right">
            <span className="flex items-center gap-1.5 text-xs font-bold text-slate-300 justify-end">
              <Calendar className="w-3.5 h-3.5 text-sky-400" />
              {formatFixtureDate(nextFixture.date, isAr)}
            </span>
            <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black animate-pulse">
              {countdownLabel(nextFixture.date, isAr)}
            </span>
          </div>
        </div>

        {/* Versus */}
        <div className="relative grid grid-cols-3 items-center gap-3 bg-slate-950/80 p-4 rounded-2xl border border-slate-800">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-sky-500/10 border-2 border-sky-500/40 p-2 flex items-center justify-center">
              {club.logoUrl ? (
                <img src={club.logoUrl} alt={club.name} className="w-full h-full object-contain" referrerPolicy="no-referrer" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
              ) : (
                <span className="text-3xl">{club.logoBadge || '🛡️'}</span>
              )}
            </div>
            <h3 className="text-sm font-black text-white mt-2">{isAr ? club.name : club.nameEn}</h3>
            <span className="text-[10px] font-bold text-sky-400">{isAr ? 'فريقك' : 'You'}</span>
          </div>

          <div className="flex flex-col items-center text-center">
            <div className="w-11 h-11 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-amber-400">
              <Swords className="w-5 h-5" />
            </div>
            <span className="mt-2 flex items-center gap-1 text-[11px] font-bold text-slate-300">
              {nextFixture.isHome ? <Home className="w-3.5 h-3.5 text-sky-400" /> : <Plane className="w-3.5 h-3.5 text-slate-400" />}
              {nextFixture.isHome ? (isAr ? 'على أرضك' : 'Home') : (isAr ? 'خارج أرضك' : 'Away')}
            </span>
          </div>

          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border-2 border-rose-500/40 p-2 flex items-center justify-center">
              {nextFixture.opponentBadge ? (
                <img src={nextFixture.opponentBadge} alt={nextFixture.opponentClubName} className="w-full h-full object-contain" referrerPolicy="no-referrer" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
              ) : (
                <span className="text-3xl">⚔️</span>
              )}
            </div>
            <h3 className="text-sm font-black text-white mt-2">{nextFixture.opponentClubName}</h3>
            <span className="text-[10px] font-bold text-rose-400">{isAr ? 'الخصم' : 'Opponent'}</span>
          </div>
        </div>

        {/* Context chips */}
        <div className="relative mt-4 flex flex-wrap items-center gap-2 text-[11px] font-bold">
          {rank && (
            <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-200 border border-slate-700">
              {isAr ? `مركزك: ${rank.pos} من ${rank.total}` : `Your position: ${rank.pos}/${rank.total}`}
            </span>
          )}
          {lastPlayed && lastPlayed.homeScore !== undefined && lastPlayed.awayScore !== undefined && (
            <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-200 border border-slate-700">
              {isAr ? 'آخر مباراة: ' : 'Last: '}
              {lastPlayed.isHome ? `${lastPlayed.homeScore}-${lastPlayed.awayScore}` : `${lastPlayed.awayScore}-${lastPlayed.homeScore}`} {isAr ? 'ضد' : 'vs'} {lastPlayed.opponentClubName}
            </span>
          )}
        </div>

        {/* Prediction */}
        <div className="relative mt-4 bg-slate-900/60 border border-slate-800 p-4 rounded-2xl">
          {!insight ? (
            <div className="space-y-2 animate-pulse">
              <div className="h-3 bg-slate-800 rounded w-1/3" />
              <div className="h-3 bg-slate-800 rounded-full w-full" />
              <span className="text-[11px] text-slate-500 block text-center">{isAr ? 'جاري تحليل التشكيلتين…' : 'Analysing both line-ups…'}</span>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between text-xs font-black mb-2">
                <span className="text-emerald-400">{isAr ? 'فوزك' : 'Win'} <span className="font-mono text-sm">{insight.winProbability}%</span></span>
                <span className="text-amber-400">{isAr ? 'تعادل' : 'Draw'} <span className="font-mono text-sm">{insight.drawProbability}%</span></span>
                <span className="text-rose-400">{isAr ? 'خسارة' : 'Loss'} <span className="font-mono text-sm">{insight.lossProbability}%</span></span>
              </div>
              <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden flex border border-slate-800">
                <div className="h-full bg-emerald-500 transition-all duration-700" style={{ width: `${insight.winProbability}%` }} />
                <div className="h-full bg-amber-500 transition-all duration-700" style={{ width: `${insight.drawProbability}%` }} />
                <div className="h-full bg-rose-500 transition-all duration-700" style={{ width: `${insight.lossProbability}%` }} />
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3 text-center">
                <div className="bg-slate-950/70 rounded-xl border border-slate-800 p-2.5">
                  <span className="text-[10px] text-slate-500 font-bold block">{isAr ? 'النتيجة الأرجح' : 'Most likely score'}</span>
                  <span className="font-mono text-lg font-black text-white">{insight.mostLikelyScore}</span>
                  <span className="text-[10px] text-slate-500 block">{isAr ? `متوسط الأهداف ${insight.expectedUserGoals} - ${insight.expectedOpponentGoals}` : `xG ${insight.expectedUserGoals} - ${insight.expectedOpponentGoals}`}</span>
                </div>
                <div className="bg-slate-950/70 rounded-xl border border-slate-800 p-2.5">
                  <span className="text-[10px] text-slate-500 font-bold block">{isAr ? 'الفارق الفني' : 'Technical gap'}</span>
                  <span className={`flex items-center justify-center gap-1 font-mono text-lg font-black ${gapColor}`}>
                    <GapIcon className="w-4 h-4" />
                    {gap > 0 ? `+${gap}` : gap}
                  </span>
                  <span className={`text-[10px] block font-bold ${gapColor}`}>{gapText}</span>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3 text-[11px] font-bold">
                <div className="bg-slate-950/70 rounded-xl border border-sky-500/20 p-2.5 space-y-1">
                  <span className="text-sky-400 block">{isAr ? 'قوة فريقك' : 'Your power'}{insight.userVipAttackBoost > 0 ? ` · VIP +${insight.userVipAttackBoost}%` : ''}</span>
                  <span className="text-slate-300 block">⚔️ {insight.userAttackPower} &nbsp; 🛡️ {insight.userDefensePower}</span>
                </div>
                <div className="bg-slate-950/70 rounded-xl border border-rose-500/20 p-2.5 space-y-1">
                  <span className="text-rose-400 block">{isAr ? 'قوة الخصم' : 'Opponent power'}</span>
                  <span className="text-slate-300 block">⚔️ {insight.opponentAttackPower} &nbsp; 🛡️ {insight.opponentDefensePower}</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="relative mt-5 flex flex-wrap items-center justify-between gap-3">
          <button onClick={() => setActiveTab('tactics')} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-bold border border-slate-700 cursor-pointer">
            <Sliders className="w-4 h-4 text-sky-400" />
            <span>{isAr ? 'التشكيلة والتكتيك' : 'Lineup & Tactics'}</span>
          </button>
          <button
            id="btn_start_match_main"
            disabled={isLoadingMatch}
            onClick={() => startNewMatch()}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 disabled:opacity-50 text-slate-950 text-sm font-black shadow-xl shadow-emerald-500/30 cursor-pointer transition-all"
          >
            <Flame className="w-4 h-4" />
            <span>{isLoadingMatch ? (isAr ? 'جاري التحضير…' : 'Preparing…') : (isAr ? 'معاينة وخوض المباراة' : 'Preview & Play')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};