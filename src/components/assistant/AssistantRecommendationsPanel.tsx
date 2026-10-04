/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Minimal Phase G entry: pre-match assistant cards with Apply / Ignore / Ask Why.
 */

import React, { useState } from 'react';
import { Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { useGameStore } from '../../state/useGameStore';
import type { AssistantRecommendation } from '../../domain/assistant/types';
import { requestAssistantExplanation } from '../../services/assistantService';

interface AssistantRecommendationsPanelProps {
  isAr: boolean;
  /** When omitted, uses getPreMatchAnalysis(). */
  recommendations?: AssistantRecommendation[];
  compact?: boolean;
}

export const AssistantRecommendationsPanel: React.FC<AssistantRecommendationsPanelProps> = ({
  isAr,
  recommendations: recommendationsProp,
  compact = false,
}) => {
  const {
    language,
    getPreMatchAnalysis,
    applyAssistantRecommendation,
    ignoreAssistantRecommendation,
  } = useGameStore();
  const [expanded, setExpanded] = useState(!compact);
  const [loadingWhy, setLoadingWhy] = useState<string | null>(null);
  const [whyText, setWhyText] = useState<Record<string, string>>({});

  const analysis = getPreMatchAnalysis();
  const recommendations = recommendationsProp ?? analysis?.recommendations ?? [];
  if (recommendations.length === 0) return null;

  const handleWhy = async (rec: AssistantRecommendation) => {
    setLoadingWhy(rec.id);
    try {
      const explanation = await requestAssistantExplanation({
        recommendation: rec,
        locale: language,
      });
      setWhyText((prev) => ({
        ...prev,
        [rec.id]: [explanation.explanation, ...explanation.keyPoints.map((p) => `• ${p}`)].join('\n'),
      }));
    } finally {
      setLoadingWhy(null);
    }
  };

  return (
    <div className="rounded-2xl border border-violet-500/30 bg-violet-950/20 p-4 space-y-3">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between gap-2 min-h-[44px] cursor-pointer text-start"
      >
        <span className="flex items-center gap-2 text-sm font-black text-violet-200">
          <Sparkles className="w-4 h-4" />
          {isAr ? 'توصيات المساعد التكتيكي' : 'Tactical Assistant'}
        </span>
        {compact ? (expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />) : null}
      </button>

      {expanded && (
        <ul className="space-y-3">
          {recommendations.map((rec) => (
            <li
              key={rec.id}
              className="rounded-xl border border-slate-800 bg-slate-950/70 p-3 space-y-2"
            >
              <p className="text-xs font-black text-white">{isAr ? rec.titleAr : rec.titleEn}</p>
              <p className="text-[11px] text-slate-400 line-clamp-3">{isAr ? rec.summaryAr : rec.summaryEn}</p>
              <p className="text-[10px] text-violet-300 font-mono">
                {isAr ? 'ثقة' : 'Confidence'}: {rec.confidence}%
              </p>
              {whyText[rec.id] && (
                <p className="text-[11px] text-slate-300 whitespace-pre-wrap border-t border-slate-800 pt-2">
                  {whyText[rec.id]}
                </p>
              )}
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => applyAssistantRecommendation(rec)}
                  className="min-h-[44px] px-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-black cursor-pointer"
                >
                  {isAr ? 'تطبيق' : 'Apply'}
                </button>
                <button
                  type="button"
                  onClick={() => ignoreAssistantRecommendation(rec.id)}
                  className="min-h-[44px] px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold cursor-pointer"
                >
                  {isAr ? 'تجاهل' : 'Ignore'}
                </button>
                <button
                  type="button"
                  disabled={loadingWhy === rec.id}
                  onClick={() => handleWhy(rec)}
                  className="min-h-[44px] px-3 rounded-xl border border-violet-500/40 text-violet-200 text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  {loadingWhy === rec.id
                    ? isAr
                      ? 'جاري التحليل…'
                      : 'Explaining…'
                    : isAr
                      ? 'لماذا؟'
                      : 'Ask why'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
