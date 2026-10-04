/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ClubHistoryView — Club records, season timeline, trophy honours, and milestones.
 * Consumes read-only slice livingWorld.phaseF.clubHistory.
 */

import React, { useState } from 'react';
import { useGameStore } from '../../state/useGameStore';
import { confidenceBadge } from './helpers/resolveEntity';
import { 
  Trophy, 
  History, 
  Calendar, 
  Award, 
  ShieldCheck, 
  ArrowUpRight, 
  TrendingUp, 
  CheckCircle2,
  Medal,
  ChevronDown
} from 'lucide-react';

interface ClubHistoryViewProps {
  isAr: boolean;
}

export const ClubHistoryView: React.FC<ClubHistoryViewProps> = ({ isAr }) => {
  const { livingWorld, club } = useGameStore();
  const history = livingWorld.phaseF?.clubHistory;

  const [activeTab, setActiveTab] = useState<'timeline' | 'honours' | 'records' | 'transfers'>('timeline');

  if (!history) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-10 text-center text-slate-500">
        <History className="w-8 h-8 mx-auto mb-2 opacity-40" />
        <p className="text-xs">{isAr ? 'لا يوجد سجل تاريخي للنادي بعد.' : 'No club history recorded yet.'}</p>
      </div>
    );
  }

  const summaries = history.seasonSummaries || [];
  const honours = history.honours || [];
  const milestones = history.milestones || [];
  const records = history.records || {};
  const transfers = history.transferHighlights || [];
  const aggregated = history.aggregatedOlderSeasons;
  const backfillBadge = confidenceBadge(history.backfillConfidence, isAr);

  return (
    <div className="space-y-5" id="club_history_view">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/30 border border-amber-500/20 rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${backfillBadge.className}`}>
                {backfillBadge.text}
              </span>
              <span className="text-xs text-amber-400 font-bold flex items-center gap-1">
                <Trophy className="w-3.5 h-3.5" />
                {honours.length} {isAr ? 'ألقاب وبطولات' : 'Honours Won'}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white font-heading">
              {isAr ? club.name : club.nameEn} — {isAr ? 'أرشيف وتاريخ النادي' : 'Club Archive & History'}
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-xl">
              {isAr
                ? 'سجل المواسم السابقة، الإنجازات والبطولات الكبرى، الأرقام القياسية المسجلة، وأبرز الصفقات التاريخية.'
                : 'Historical record of past campaigns, silverware honours, all-time record scorelines, and transfer highlights.'}
            </p>
          </div>

          {/* Quick Counter */}
          <div className="flex items-center gap-3">
            <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800 text-center min-w-[90px]">
              <span className="text-[10px] text-slate-400 block font-bold">{isAr ? 'المواسم' : 'Seasons'}</span>
              <span className="text-base sm:text-lg font-black text-white">{summaries.length}</span>
            </div>
            <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800 text-center min-w-[90px]">
              <span className="text-[10px] text-slate-400 block font-bold">{isAr ? 'المحطات' : 'Milestones'}</span>
              <span className="text-base sm:text-lg font-black text-indigo-400">{milestones.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('timeline')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
            activeTab === 'timeline'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>{isAr ? 'جدول المواسم' : 'Seasons Timeline'}</span>
        </button>

        <button
          onClick={() => setActiveTab('honours')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
            activeTab === 'honours'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Trophy className="w-3.5 h-3.5" />
          <span>{isAr ? 'خزانة الكؤوس' : 'Trophy Cabinet'}</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-900 text-amber-300 font-mono">
            {honours.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('records')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
            activeTab === 'records'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Award className="w-3.5 h-3.5" />
          <span>{isAr ? 'الأرقام القياسية' : 'Club Records'}</span>
        </button>

        <button
          onClick={() => setActiveTab('transfers')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
            activeTab === 'transfers'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <ArrowUpRight className="w-3.5 h-3.5" />
          <span>{isAr ? 'أبرز الصفقات' : 'Transfer Highlights'}</span>
        </button>
      </div>

      {/* Sub-view: Timeline */}
      {activeTab === 'timeline' && (
        <div className="space-y-3">
          {summaries.length === 0 ? (
            <div className="bg-slate-900/60 p-8 rounded-2xl text-center text-slate-500 text-xs">
              {isAr ? 'الموسم الحالي لا يزال قيد التنفيذ، ستظهر خلاصة المواسم عند الختام.' : 'Current campaign is active; season summaries will populate on season finale.'}
            </div>
          ) : (
            summaries.map((summary) => {
              const conf = confidenceBadge(summary.confidence, isAr);
              return (
                <div
                  key={summary.season}
                  className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-black text-white font-heading">
                        {isAr ? `الموسم ${summary.season}` : `Season ${summary.season}`}
                      </span>
                      {summary.leaguePosition && (
                        <span className="text-xs font-black px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          {isAr ? `المركز ${summary.leaguePosition}` : `Finish: #${summary.leaguePosition}`}
                        </span>
                      )}
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${conf.className}`}>
                        {conf.text}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400 block">
                      {summary.competitionId} • {summary.source === 'live' ? (isAr ? 'بيانات حية' : 'Live Engine') : (isAr ? 'أرشيف تقديري' : 'Backfilled')}
                    </span>
                  </div>

                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 text-center text-xs">
                    <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-500 block">{isAr ? 'لعب' : 'P'}</span>
                      <strong className="text-slate-200">{summary.played}</strong>
                    </div>
                    <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-emerald-400 block">{isAr ? 'فوز' : 'W'}</span>
                      <strong className="text-emerald-300">{summary.won}</strong>
                    </div>
                    <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-amber-400 block">{isAr ? 'تعادل' : 'D'}</span>
                      <strong className="text-amber-300">{summary.drawn}</strong>
                    </div>
                    <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-rose-400 block">{isAr ? 'خسارة' : 'L'}</span>
                      <strong className="text-rose-300">{summary.lost}</strong>
                    </div>
                    <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">{isAr ? 'له' : 'GF'}</span>
                      <strong className="text-sky-300">{summary.goalsFor}</strong>
                    </div>
                    <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">{isAr ? 'عليه' : 'GA'}</span>
                      <strong className="text-slate-400">{summary.goalsAgainst}</strong>
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {/* Aggregated Older Seasons */}
          {aggregated && (
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/60 text-xs text-slate-400 flex items-center justify-between">
              <span>
                {isAr
                  ? `مواسم مدمجة سابقة (حتى الموسم ${aggregated.throughSeason})`
                  : `Aggregated older campaigns (through Season ${aggregated.throughSeason})`}
              </span>
              <span className="font-mono text-slate-300">
                {aggregated.totalPlayed}P • {aggregated.totalWon}W • {aggregated.totalDrawn}D • {aggregated.totalLost}L
              </span>
            </div>
          )}
        </div>
      )}

      {/* Sub-view: Honours */}
      {activeTab === 'honours' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {honours.length === 0 ? (
            <div className="col-span-full p-8 text-center text-slate-500 text-xs bg-slate-900/60 rounded-2xl">
              {isAr ? 'لا توجد بطولات رسمية مسجلة بعد في الخزانة.' : 'No trophy honours in the cabinet yet.'}
            </div>
          ) : (
            honours.map((honour) => (
              <div
                key={honour.id}
                className="p-4 rounded-2xl bg-slate-900/90 border border-amber-500/30 flex items-center gap-3.5 shadow-md shadow-amber-500/5"
              >
                <div className="w-11 h-11 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-2xl border border-amber-500/30 shrink-0">
                  🏆
                </div>
                <div>
                  <h4 className="text-sm font-black text-white font-heading">
                    {honour.kind === 'league_title' ? (isAr ? 'لقب الدوري' : 'League Champions') : (isAr ? 'بطولة الكأس' : 'Cup Winner')}
                  </h4>
                  <p className="text-xs text-amber-400/80">
                    {isAr ? `الموسم ${honour.season}` : `Season ${honour.season}`}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Sub-view: Records */}
      {activeTab === 'records' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1">
            <span className="text-xs text-emerald-400 font-bold flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4" />
              {isAr ? 'أكبر فوز تاريخي' : 'Biggest Victory'}
            </span>
            <div className="text-xl sm:text-2xl font-black text-white font-mono">
              {records.biggestWinScoreline || '—'}
            </div>
            <p className="text-[11px] text-slate-500">
              {records.biggestWinMargin !== undefined
                ? (isAr ? `بفارق ${records.biggestWinMargin} أهداف` : `+${records.biggestWinMargin} goal margin`)
                : (isAr ? 'لم يُسجل بعد' : 'Not recorded yet')}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1">
            <span className="text-xs text-rose-400 font-bold flex items-center gap-1.5">
              <History className="w-4 h-4" />
              {isAr ? 'أثقل هزيمة مسجلة' : 'Heaviest Defeat'}
            </span>
            <div className="text-xl sm:text-2xl font-black text-white font-mono">
              {records.heaviestDefeatScoreline || '—'}
            </div>
            <p className="text-[11px] text-slate-500">
              {records.heaviestDefeatMargin !== undefined
                ? (isAr ? `بفارق ${records.heaviestDefeatMargin} أهداف` : `-${records.heaviestDefeatMargin} goal margin`)
                : (isAr ? 'لم يُسجل بعد' : 'Not recorded yet')}
            </p>
          </div>
        </div>
      )}

      {/* Sub-view: Transfers */}
      {activeTab === 'transfers' && (
        <div className="space-y-2.5">
          {transfers.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs bg-slate-900/60 rounded-2xl">
              {isAr ? 'لا توجد صفقات تاريخية بارزة مسجلة حالياً.' : 'No landmark transfer highlights recorded.'}
            </div>
          ) : (
            transfers.map((tr) => (
              <div
                key={tr.id}
                className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={`px-2 py-0.5 rounded-lg text-xs font-black ${
                      tr.direction === 'in' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                    }`}
                  >
                    {tr.direction === 'in' ? (isAr ? 'شراء' : 'IN') : (isAr ? 'بيع' : 'OUT')}
                  </span>
                  <div>
                    <h5 className="text-sm font-black text-white">{tr.playerId}</h5>
                    <span className="text-xs text-slate-400">{isAr ? `الموسم ${tr.season}` : `Season ${tr.season}`}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-sm font-black text-amber-400">
                    {tr.feeAmount ? `${tr.feeAmount.toLocaleString()} 💰` : (isAr ? 'قيمة غير معلنة' : 'Undisclosed')}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
