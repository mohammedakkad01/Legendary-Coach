/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Live Match Commentary Feed and Post-Match Actions.
 */

import React from 'react';
import { FileText, MessageSquare, RotateCcw } from 'lucide-react';
import { MatchRecord } from '../../types/game';

interface MatchCommentaryFeedProps {
  record: MatchRecord;
  isAr: boolean;
  commentaryEndRef: React.RefObject<HTMLDivElement | null>;
  onCaptainMansoorReport: () => void;
  onOpenRoundSummary?: () => void;
  onPlayNextMatch: () => void;
  hasRoundSummary: boolean;
}

export const MatchCommentaryFeed: React.FC<MatchCommentaryFeedProps> = ({
  record,
  isAr,
  commentaryEndRef,
  onCaptainMansoorReport,
  onOpenRoundSummary,
  onPlayNextMatch,
  hasRoundSummary,
}) => {
  const isFinished = record.isFinished;

  return (
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
            onClick={onCaptainMansoorReport}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer active:scale-98 transition"
          >
            <MessageSquare className="w-4 h-4 text-blue-200" />
            <span>{isAr ? '🎙️ تقرير الكابتن منصور (رجل المباراة والتحليل الفني)' : '🎙️ Captain Mansoor Report (MVP & Tactical Analysis)'}</span>
          </button>

          {hasRoundSummary && onOpenRoundSummary && (
            <button
              onClick={onOpenRoundSummary}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-300 font-black text-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{isAr ? '📋 ملخص الجولة (نتائج الفرق الأخرى ونجوم الجولة)' : '📋 Round Summary (other results & top performers)'}</span>
            </button>
          )}

          <button
            onClick={onPlayNextMatch}
            className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-black text-xs shadow-lg shadow-sky-600/30 flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{isAr ? 'خوض المباراة القادمة في الجدول' : 'Play Next Match in Fixtures'}</span>
          </button>
        </div>
      )}
    </div>
  );
};
