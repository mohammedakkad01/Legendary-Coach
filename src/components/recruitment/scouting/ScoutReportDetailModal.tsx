/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ScoutReportDetailModal — Deep-dive inspection of a scouted player.
 * Strictly uses ObservedPlayerView and domain ScoutingReport data.
 */

import React, { useState } from 'react';
import { X, Eye, ShieldCheck, AlertCircle, FileText, UserPlus } from 'lucide-react';
import type { ObservedPlayerView } from '../../../domain/recruitment/types';
import type { ScoutingReport } from '../../../domain/recruitment/scouting/types';
import type { Player } from '../../../types/game';
import { ScoutConfidenceMeter } from '../shared/ScoutConfidenceMeter';
import { RangeDisplay } from '../shared/RangeDisplay';
import { RevealedAttributesTable } from '../shared/RevealedAttributesTable';

interface ScoutReportDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: Player | null;
  observedView: ObservedPlayerView | null;
  latestReport?: ScoutingReport | null;
  onRequestDeeperReport: (playerId: string) => { ok: boolean; message: string };
  onStartNegotiation: (player: Player) => void;
  isAr?: boolean;
}

export const ScoutReportDetailModal: React.FC<ScoutReportDetailModalProps> = ({
  isOpen,
  onClose,
  player,
  observedView,
  latestReport,
  onRequestDeeperReport,
  onStartNegotiation,
  isAr = false,
}) => {
  const [requestFeedback, setRequestFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  if (!isOpen || !player || !observedView) return null;

  const handleRequestDeeper = () => {
    const res = onRequestDeeperReport(player.id);
    setRequestFeedback({ ok: res.ok, msg: res.message });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl p-5 sm:p-6 shadow-2xl space-y-5 my-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl sm:text-2xl font-black text-white">{player.name}</span>
              <span className="px-2 py-0.5 rounded-lg bg-sky-500/20 text-sky-300 font-extrabold text-xs">
                {player.position}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {player.realTeam ?? 'Free Agent'} • {player.age} {isAr ? 'سنة' : 'yrs'} • {player.nationality}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Confidence Banner */}
        <div className="p-3.5 bg-slate-950/70 border border-slate-800/80 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-bold">
              {isAr ? 'دقة وموثوقية تقرير الكشافة:' : 'Scouting Knowledge Depth:'}
            </span>
            <span className="font-mono text-xs text-sky-400 font-semibold">
              {observedView.confidencePct}%
            </span>
          </div>
          <ScoutConfidenceMeter confidencePct={observedView.confidencePct} size="md" isAr={isAr} />
        </div>

        {/* Observed Ranges Card (Never true scalars!) */}
        <div className="grid grid-cols-3 gap-2.5">
          <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 text-center">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">
              {isAr ? 'المستوى التقديري' : 'Estimated Rating'}
            </div>
            <RangeDisplay
              min={observedView.ratingRange.min}
              max={observedView.ratingRange.max}
              type="rating"
              className="text-base sm:text-lg text-amber-400"
            />
          </div>

          <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 text-center">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">
              {isAr ? 'نطاق الإمكانية' : 'Potential Band'}
            </div>
            <RangeDisplay
              min={observedView.potentialBand.min}
              max={observedView.potentialBand.max}
              type="rating"
              className="text-base sm:text-lg text-emerald-400"
            />
          </div>

          <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 text-center">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">
              {isAr ? 'القيمة السوقية' : 'Estimated Value'}
            </div>
            <RangeDisplay
              min={observedView.valueRange.min}
              max={observedView.valueRange.max}
              type="currency"
              isAr={isAr}
              className="text-xs sm:text-sm text-sky-400"
            />
          </div>
        </div>

        {/* Attribute Stages & Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-300">
            <span className="flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-amber-400" />
              <span>{isAr ? 'مجموعات الخصائص المرصودة' : 'Observed Attribute Groups'}</span>
            </span>
            <span className="text-[10px] text-slate-500">
              {observedView.revealedGroups.length} / 7 {isAr ? 'مكتشفة' : 'unlocked'}
            </span>
          </div>

          <RevealedAttributesTable
            revealedGroups={observedView.revealedGroups}
            personalityIndicators={observedView.personalityIndicators}
            injuryConcernLevel={observedView.injuryConcernLevel}
            isAr={isAr}
          />
        </div>

        {/* Latest Scout Observation notes if available */}
        {latestReport && (
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs space-y-1">
            <div className="text-slate-400 font-bold flex items-center justify-between">
              <span>{isAr ? 'ملاحظة الكشاف الميداني:' : 'Scout Observation Log:'}</span>
              <span className="text-[10px] text-slate-500 font-mono">
                {isAr ? `أسبوع ${latestReport.gameWeek}` : `Week ${latestReport.gameWeek}`}
              </span>
            </div>
            <p className="text-slate-300">
              {isAr
                ? `الكشاف رقم ${latestReport.scoutId} قام بمراقبة اللاعب وقدر مستواه الحالي بـ ${latestReport.statedOverall} تقريباً (دقة الكشاف: ${latestReport.scoutQualityScore}).`
                : `Scout ${latestReport.scoutId} observed the player and reported an overall around ${latestReport.statedOverall} (Scout quality score: ${latestReport.scoutQualityScore}).`}
            </p>
          </div>
        )}

        {/* Action feedback */}
        {requestFeedback && (
          <div
            className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
              requestFeedback.ok
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
            }`}
          >
            {requestFeedback.ok ? (
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{requestFeedback.msg}</span>
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={handleRequestDeeper}
            className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Eye className="w-4 h-4 text-sky-400" />
            <span>{isAr ? 'طلب تقرير كشافة أعمق' : 'Request Deeper Report'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onStartNegotiation(player);
              onClose();
            }}
            className="flex-1 py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>{isAr ? 'بدء مفاوضات التعاقد' : 'Start Negotiations'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
