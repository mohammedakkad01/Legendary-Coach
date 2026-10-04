/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import type { Recommendation } from '../../domain/assistant';
import { reasonSentence } from '../../domain/assistant/copy/deterministicCopy';
import { assistantLabel } from '../../i18n/assistant';
import { AssistantPreviewSheet } from './AssistantPreviewSheet';
import { useAssistantWhy } from '../../hooks/useAssistantWhy';

export interface AssistantRecommendationCardProps {
  readonly isAr: boolean;
  readonly recommendation: Recommendation;
  readonly clubTactics: import('../../types/game').FootballTactics;
  readonly onApply: () => void;
  readonly onIgnore: () => void;
  readonly applyError?: string | null;
}

export const AssistantRecommendationCard: React.FC<AssistantRecommendationCardProps> = ({
  isAr,
  recommendation: rec,
  clubTactics,
  onApply,
  onIgnore,
  applyError,
}) => {
  const [previewOpen, setPreviewOpen] = useState(false);
  const { whyText, loadingWhy, fetchWhy } = useAssistantWhy(rec);

  const title = isAr ? rec.titleAr : rec.titleEn;
  const summary = isAr ? rec.summaryAr : rec.summaryEn;

  return (
    <>
      <div className="rounded-2xl border border-cyan-500/30 bg-slate-900/80 p-4 space-y-3 shadow-lg">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-cyan-400 font-bold">{rec.source}</p>
            <h4 className="text-sm font-black text-white">{title}</h4>
          </div>
          <span className="text-xs font-bold text-amber-300 whitespace-nowrap">
            {assistantLabel('confidence', isAr)} {rec.confidence}%
          </span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">{summary}</p>
        <ul className="text-[11px] text-slate-400 space-y-0.5">
          {rec.reasonCodes.slice(0, 4).map((code) => (
            <li key={code}>• {reasonSentence(code, rec.reasonParams, isAr)}</li>
          ))}
        </ul>
        {whyText && (
          <p className="text-[11px] text-cyan-200/90 border-t border-slate-800 pt-2">{whyText}</p>
        )}
        {applyError && <p className="text-[11px] text-rose-400">{applyError}</p>}
        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            className="min-h-[44px] px-3 rounded-xl bg-slate-800 text-white text-xs font-bold border border-slate-700"
            onClick={() => void fetchWhy()}
            disabled={loadingWhy}
          >
            {assistantLabel('why', isAr)}
          </button>
          <button
            type="button"
            className="min-h-[44px] px-3 rounded-xl bg-slate-800 text-white text-xs font-bold border border-slate-700"
            onClick={() => setPreviewOpen(true)}
          >
            {assistantLabel('preview', isAr)}
          </button>
          <button
            type="button"
            className="min-h-[44px] px-4 rounded-xl bg-cyan-600 text-white text-xs font-black"
            onClick={onApply}
          >
            {assistantLabel('apply', isAr)}
          </button>
          <button
            type="button"
            className="min-h-[44px] px-3 rounded-xl text-slate-400 text-xs font-bold"
            onClick={onIgnore}
          >
            {assistantLabel('ignore', isAr)}
          </button>
        </div>
      </div>
      {previewOpen && (
        <AssistantPreviewSheet
          isAr={isAr}
          recommendation={rec}
          clubTactics={clubTactics}
          onClose={() => setPreviewOpen(false)}
        />
      )}
    </>
  );
};
