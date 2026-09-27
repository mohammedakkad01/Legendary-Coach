/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * League Step Selector & Filter Toolbar.
 */

import React from 'react';
import { Check, Search } from 'lucide-react';
import { RealLeague } from '../../data/realLeaguesData';

interface LeagueStepSelectorProps {
  isAr: boolean;
  leagues: RealLeague[];
  selectedLeagueId: string;
  onSelectLeague: (leagueId: string) => void;
  selectedLeague: RealLeague;
  filterTier: 'all' | 'top' | 'free';
  setFilterTier: (tier: 'all' | 'top' | 'free') => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export const LeagueStepSelector: React.FC<LeagueStepSelectorProps> = ({
  isAr,
  leagues,
  selectedLeagueId,
  onSelectLeague,
  selectedLeague,
  filterTier,
  setFilterTier,
  searchQuery,
  setSearchQuery,
}) => {
  return (
    <div className="space-y-6">
      {/* STEP 1: LEAGUE SELECTION */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-sky-500/20 text-sky-400 text-xs font-black flex items-center justify-center border border-sky-500/30">
              1
            </span>
            <h3 className="font-heading font-black text-sm sm:text-base text-white">
              {isAr ? 'الخطوة الأولى: اختر الدوري' : 'Step 1: Choose League'}
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-medium">
            {isAr ? `${leagues.length} دوريات عالمية رسمية` : `${leagues.length} Official World Leagues`}
          </span>
        </div>

        {/* League Cards Carousel / Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {leagues.map((league) => {
            const isSelected = selectedLeagueId === league.id;
            return (
              <button
                key={league.id}
                onClick={() => onSelectLeague(league.id)}
                className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-between gap-2 relative overflow-hidden cursor-pointer ${
                  isSelected 
                    ? 'bg-sky-950/60 border-sky-400 shadow-lg shadow-sky-500/20 ring-2 ring-sky-400/40' 
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                }`}
              >
                {isSelected && (
                  <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-sky-400 text-slate-950 flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                )}
                <span className="text-2xl">{league.flag}</span>
                <div>
                  <div className="font-heading font-black text-xs text-white leading-tight">
                    {isAr ? league.name : league.nameEn}
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5 font-medium">
                    {league.clubs.length} {isAr ? 'أندية' : 'clubs'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* STEP 2 HEADER & TOOLBAR */}
      <div className="pt-3 border-t border-slate-800/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 text-xs font-black flex items-center justify-center border border-amber-500/30">
              2
            </span>
            <h3 className="font-heading font-black text-sm sm:text-base text-white">
              {isAr ? `الخطوة الثانية: أندية ${selectedLeague.name}` : `Step 2: ${selectedLeague.nameEn} Clubs`}
            </h3>
          </div>

          {selectedLeague.isLiveSynced === false && (
            <div className="text-[11px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-lg px-2 py-1">
              {isAr
                ? 'قائمة جزئية مؤقتة — لم تصل بيانات المزامنة الكاملة لهذا الدوري بعد'
                : 'Partial placeholder list — full sync data not received yet for this league'}
            </div>
          )}

          {/* Filter Pills & Search */}
          <div className="flex items-center flex-wrap gap-2">
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-bold">
              <button
                onClick={() => setFilterTier('all')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  filterTier === 'all' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                {isAr ? 'الكل' : 'All'}
              </button>
              <button
                onClick={() => setFilterTier('top')}
                className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                  filterTier === 'top' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>👑</span>
                <span>{isAr ? 'المركز الأول (100 💎)' : 'Top Tier (100 💎)'}</span>
              </button>
              <button
                onClick={() => setFilterTier('free')}
                className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                  filterTier === 'free' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>🚀</span>
                <span>{isAr ? 'مجاناً (0 💎)' : 'Free (0 💎)'}</span>
              </button>
            </div>

            {/* Search bar */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isAr ? 'ابحث عن نادٍ أو نجم...' : 'Search club or star...'}
                className="bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
