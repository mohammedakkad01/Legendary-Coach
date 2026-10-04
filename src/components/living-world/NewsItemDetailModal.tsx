/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NewsItemDetailModal — Deep entity resolution modal for a selected news item.
 * Links to the real player, club, or match referenced in subjectIds.
 */

import React from 'react';
import type { NewsItem } from '../../domain/livingWorld/phaseF/types';
import { renderNewsItem } from '../../domain/livingWorld/news/renderTemplates';
import { useGameStore } from '../../state/useGameStore';
import { resolveSubjectEntity } from './helpers/resolveEntity';
import { X, Sparkles, Calendar, Tag, ShieldAlert, ArrowRight, ExternalLink } from 'lucide-react';

interface NewsItemDetailModalProps {
  item: NewsItem | null;
  onClose: () => void;
  isAr: boolean;
  aiEnhancedText?: { headline?: string; body?: string };
}

export const NewsItemDetailModal: React.FC<NewsItemDetailModalProps> = ({
  item,
  onClose,
  isAr,
  aiEnhancedText,
}) => {
  const { club, leagueStandings, matchHistory } = useGameStore();

  if (!item) return null;

  const fallback = renderNewsItem(item, isAr ? 'ar' : 'en');
  const headline = aiEnhancedText?.headline || fallback.headline;
  const body = aiEnhancedText?.body || fallback.body;
  const hasAi = Boolean(aiEnhancedText?.headline || aiEnhancedText?.body);

  const resolvedSubjects = (item.subjectIds || []).map((id) =>
    resolveSubjectEntity(id, club, leagueStandings, matchHistory, isAr)
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 flex flex-col shadow-2xl space-y-4 overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-label={headline}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                {item.type}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {isAr ? `الأهمية: ${item.importance}/100` : `Importance: ${item.importance}/100`}
              </span>
              {hasAi && (
                <span className="flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/40">
                  <Sparkles className="w-3 h-3 text-sky-400" />
                  {isAr ? 'نص معزز بالذكاء الاصطناعي' : 'AI-Enhanced'}
                </span>
              )}
            </div>
            <h2 className="text-lg sm:text-xl font-black text-white leading-tight font-heading">
              {headline}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            aria-label={isAr ? 'إغلاق' : 'Close'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 text-sm text-slate-300 leading-relaxed space-y-3">
          <p>{body}</p>

          <div className="flex items-center gap-4 text-xs text-slate-500 pt-2 border-t border-slate-800/80">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {isAr ? `الموسم ${item.season}` : `Season ${item.season}`}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Tag className="w-3.5 h-3.5" />
              {isAr ? `نبرة التقرير: ${item.tone}` : `Tone: ${item.tone}`}
            </span>
          </div>
        </div>

        {/* Referenced Entities Section */}
        {resolvedSubjects.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
              {isAr ? 'الكيانات المرتبطة بالخبر' : 'Referenced Entities'}
            </h4>
            <div className="space-y-2">
              {resolvedSubjects.map((entity) => (
                <div
                  key={entity.id}
                  className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/80 border border-slate-800"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{entity.icon}</span>
                    <div>
                      <h5 className="text-sm font-black text-white">{entity.title}</h5>
                      {entity.subtitle && (
                        <p className="text-xs text-slate-400">{entity.subtitle}</p>
                      )}
                    </div>
                  </div>
                  {entity.extra && (
                    <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-1 rounded-xl border border-amber-500/20">
                      {entity.extra}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Fact Key Matrix */}
        {Object.keys(item.facts || {}).length > 0 && (
          <div className="bg-slate-950/40 p-3 rounded-2xl border border-slate-800/60 text-xs text-slate-400 space-y-1.5">
            <span className="font-bold text-[11px] text-slate-300 block">
              {isAr ? 'بيانات الحدث المؤكدة:' : 'Verified Event Facts:'}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(item.facts).map(([k, v]) => (
                <span
                  key={k}
                  className="px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-800 text-[10px] text-slate-300 font-mono"
                >
                  {k}: <strong className="text-indigo-300">{String(v)}</strong>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Close Button */}
        <div className="pt-2">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition cursor-pointer"
          >
            {isAr ? 'إغلاق التفاصيل' : 'Close Details'}
          </button>
        </div>
      </div>
    </div>
  );
};
