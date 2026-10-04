/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NewsFeedView — Chronological news feed from Living World Phase F.
 * Uses deterministic template text as guaranteed baseline + displays AI-enhancements if cached.
 */

import React, { useState, useMemo } from 'react';
import type { NewsItem, NewsTone } from '../../domain/livingWorld/phaseF/types';
import { renderNewsItem } from '../../domain/livingWorld/news/renderTemplates';
import { useGameStore } from '../../state/useGameStore';
import { lookupNarrativeCache } from '../../domain/livingWorld/narrative/cache';
import { NewsItemDetailModal } from './NewsItemDetailModal';
import { Newspaper, Sparkles, Filter, ChevronRight, Flame, ShieldAlert, Award } from 'lucide-react';

interface NewsFeedViewProps {
  isAr: boolean;
}

const TONE_BADGES: Record<NewsTone, { labelAr: string; labelEn: string; className: string }> = {
  positive: { labelAr: 'إيجابي', labelEn: 'Positive', className: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  negative: { labelAr: 'سلبي', labelEn: 'Negative', className: 'bg-rose-500/20 text-rose-300 border-rose-500/30' },
  dramatic: { labelAr: 'درامي', labelEn: 'Dramatic', className: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  analytical: { labelAr: 'تحليلي', labelEn: 'Analytical', className: 'bg-sky-500/20 text-sky-300 border-sky-500/30' },
  neutral: { labelAr: 'محايد', labelEn: 'Neutral', className: 'bg-slate-700/40 text-slate-300 border-slate-600' },
};

export const NewsFeedView: React.FC<NewsFeedViewProps> = ({ isAr }) => {
  const { livingWorld } = useGameStore();
  const phaseF = livingWorld.phaseF;
  const feed = useMemo(() => phaseF?.newsFeed ?? [], [phaseF?.newsFeed]);
  const cache = useMemo(() => phaseF?.narrativeCache ?? [], [phaseF?.narrativeCache]);

  const [selectedItem, setSelectedItem] = useState<NewsItem | null>(null);
  const [toneFilter, setToneFilter] = useState<'all' | NewsTone>('all');
  const [minImportance, setMinImportance] = useState<number>(0);

  const filteredFeed = useMemo(() => {
    return feed.filter((item) => {
      if (toneFilter !== 'all' && item.tone !== toneFilter) return false;
      if (item.importance < minImportance) return false;
      return true;
    });
  }, [feed, toneFilter, minImportance]);

  // Resolve AI cached text if available
  const getAiEnriched = (item: NewsItem) => {
    const entry = cache.find((e) => e.locale === (isAr ? 'ar' : 'en') && e.contextHash.includes(item.id));
    return entry ? { headline: entry.headline, body: entry.body } : undefined;
  };

  return (
    <div className="space-y-4" id="news_feed_view">
      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 p-3.5 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <span className="text-xs font-bold text-slate-400 flex items-center gap-1 mr-1">
            <Filter className="w-3.5 h-3.5" />
            {isAr ? 'النبرة:' : 'Tone:'}
          </span>
          {(['all', 'positive', 'negative', 'dramatic', 'analytical', 'neutral'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setToneFilter(t)}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                toneFilter === t
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'bg-slate-950/60 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {t === 'all' ? (isAr ? 'الكل' : 'All') : (isAr ? TONE_BADGES[t].labelAr : TONE_BADGES[t].labelEn)}
            </button>
          ))}
        </div>

        {/* Importance threshold quick filter */}
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <button
            onClick={() => setMinImportance(minImportance === 0 ? 60 : 0)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-xl font-bold border transition cursor-pointer ${
              minImportance > 0
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-white'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>{isAr ? 'أخبار كبرى فقط (≥60)' : 'Top News Only (≥60)'}</span>
          </button>
        </div>
      </div>

      {/* News Cards List */}
      {filteredFeed.length === 0 ? (
        <div className="bg-slate-900/50 border border-slate-800/80 rounded-3xl p-12 text-center space-y-3">
          <Newspaper className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-base font-black text-slate-300">
            {isAr ? 'لا توجد أخبار مسجلة حالياً' : 'No news articles available yet'}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {isAr
              ? 'تتولد الأخبار تلقائياً مع خوض المباريات، تحولات السمعة، قرارات مجلس الإدارة، والتحركات في سوق الانتقالات.'
              : 'News items generate dynamically as matches conclude, reputation shifts, and board meetings take place.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredFeed.map((item) => {
            const fallback = renderNewsItem(item, isAr ? 'ar' : 'en');
            const ai = getAiEnriched(item);
            const headline = ai?.headline || fallback.headline;
            const body = ai?.body || fallback.body;
            const toneBadge = TONE_BADGES[item.tone] || TONE_BADGES.neutral;

            return (
              <div
                key={item.id}
                onClick={() => setSelectedItem(item)}
                className="group p-4 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-indigo-500/50 transition-all cursor-pointer shadow-md hover:shadow-indigo-500/5 space-y-2 relative"
              >
                {/* Header Row */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${toneBadge.className}`}>
                      {isAr ? toneBadge.labelAr : toneBadge.labelEn}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-950/70 px-2 py-0.5 rounded-full border border-slate-800">
                      {isAr ? `الموسم ${item.season}` : `S${item.season}`}
                    </span>
                    {item.importance >= 60 && (
                      <span className="flex items-center gap-1 text-[10px] font-black text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                        <Flame className="w-3 h-3" />
                        {item.importance}
                      </span>
                    )}
                    {ai && (
                      <span className="flex items-center gap-1 text-[10px] font-black text-sky-300 bg-sky-500/20 px-2 py-0.5 rounded-full border border-sky-500/30">
                        <Sparkles className="w-3 h-3 text-sky-400" />
                        AI
                      </span>
                    )}
                  </div>

                  <span className="text-xs text-slate-500 group-hover:text-indigo-400 transition flex items-center gap-0.5">
                    {isAr ? 'عرض التفاصيل' : 'Details'}
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>

                {/* Headline & Snippet */}
                <h4 className="text-sm sm:text-base font-black text-white font-heading group-hover:text-indigo-200 transition">
                  {headline}
                </h4>
                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                  {body}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Item Detail Modal */}
      {selectedItem && (
        <NewsItemDetailModal
          item={selectedItem}
          isAr={isAr}
          aiEnhancedText={getAiEnriched(selectedItem)}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </div>
  );
};
