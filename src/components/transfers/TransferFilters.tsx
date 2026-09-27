/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Transfers Filter Bar: Search, Category chips, Specific positions, Ratings, Price and Sorting.
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { PositionCategory, SpecificPosition, AgeFilterOption, SortOption } from '../../hooks/useTransferMarket';

interface TransferFiltersProps {
  isAr: boolean;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  categoryPos: PositionCategory;
  setCategoryPos: (cat: PositionCategory) => void;
  specificPos: SpecificPosition;
  setSpecificPos: (pos: SpecificPosition) => void;
  minRating: number;
  setMinRating: (val: number) => void;
  minPotential: number;
  setMinPotential: (val: number) => void;
  ageGroup: AgeFilterOption;
  setAgeGroup: (val: AgeFilterOption) => void;
  maxPrice: number;
  setMaxPrice: (val: number) => void;
  affordableOnly: boolean;
  setAffordableOnly: (val: boolean) => void;
  sortOption: SortOption;
  setSortOption: (val: SortOption) => void;
  showAdvancedFilters: boolean;
  setShowAdvancedFilters: (val: boolean) => void;
  hasActiveFilters: boolean;
  totalFiltered: number;
}

export const TransferFilters: React.FC<TransferFiltersProps> = ({
  isAr,
  searchQuery,
  setSearchQuery,
  categoryPos,
  setCategoryPos,
  specificPos,
  setSpecificPos,
  minRating,
  setMinRating,
  minPotential,
  setMinPotential,
  ageGroup,
  setAgeGroup,
  maxPrice,
  setMaxPrice,
  affordableOnly,
  setAffordableOnly,
  sortOption,
  setSortOption,
  showAdvancedFilters,
  setShowAdvancedFilters,
  hasActiveFilters,
  totalFiltered,
}) => {
  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xl space-y-4">
      {/* Primary Search & Position Categories */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Text Search Input */}
        <div className="relative flex-1">
          <Search className="absolute right-3.5 rtl:right-3.5 ltr:left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isAr ? 'ابحث بالاسم، النادي، أو الجنسية...' : 'Search by name, club, nationality...'}
            className="w-full py-2.5 px-10 rounded-2xl bg-slate-950 border border-slate-700/80 text-white text-xs sm:text-sm placeholder:text-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute left-3 rtl:left-3 ltr:right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* Position Category Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs font-bold">
          {[
            { id: 'all', labelAr: 'الكل', labelEn: 'All' },
            { id: 'ATT', labelAr: 'هجوم', labelEn: 'Attack' },
            { id: 'MID', labelAr: 'وسط', labelEn: 'Midfield' },
            { id: 'DEF', labelAr: 'دفاع', labelEn: 'Defense' },
            { id: 'GK', labelAr: 'حراسة', labelEn: 'Goalkeeper' }
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setCategoryPos(cat.id as PositionCategory);
                setSpecificPos('all');
              }}
              className={`px-3 py-2 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                categoryPos === cat.id
                  ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {isAr ? cat.labelAr : cat.labelEn}
            </button>
          ))}
        </div>

        {/* Advanced Filter Toggle Button */}
        <button
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-2 cursor-pointer ${
            showAdvancedFilters || hasActiveFilters
              ? 'bg-sky-500/20 border-sky-400 text-sky-300'
              : 'bg-slate-950 border-slate-700 text-slate-400 hover:text-white'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span>{isAr ? 'فلاتر متقدمة' : 'Advanced Filters'}</span>
          {hasActiveFilters && (
            <span className="w-2 h-2 rounded-full bg-amber-400" />
          )}
        </button>
      </div>

      {/* Expanded Advanced Filters Panel */}
      <AnimatePresence>
        {showAdvancedFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="pt-4 border-t border-slate-800/90 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs"
          >
            {/* Specific Position */}
            <div className="space-y-1.5">
              <label className="text-slate-400 font-bold block">{isAr ? 'المركز المحدد:' : 'Specific Position:'}</label>
              <select
                value={specificPos}
                onChange={(e) => setSpecificPos(e.target.value as SpecificPosition)}
                className="w-full py-2 px-3 rounded-xl bg-slate-950 border border-slate-700 text-white font-bold focus:outline-none focus:border-amber-500"
              >
                <option value="all">{isAr ? 'أي مركز' : 'Any Position'}</option>
                <option value="ST">ST (مهاجم صريح)</option>
                <option value="LW">LW (جناح أيسر)</option>
                <option value="RW">RW (جناح أيمن)</option>
                <option value="CAM">CAM (صانع ألعاب هجومي)</option>
                <option value="CM">CM (لاعب وسط)</option>
                <option value="CDM">CDM (وسط دفاعي / ارتكاز)</option>
                <option value="CB">CB (قلب دفاع)</option>
                <option value="LB">LB (ظهير أيسر)</option>
                <option value="RB">RB (ظهير أيمن)</option>
                <option value="GK">GK (حارس مرمى)</option>
              </select>
            </div>

            {/* Min Rating */}
            <div className="space-y-1.5">
              <label className="text-slate-400 font-bold block">{isAr ? 'التقييم الأدنى (OVR):' : 'Min Overall Rating:'}</label>
              <select
                value={minRating}
                onChange={(e) => setMinRating(Number(e.target.value))}
                className="w-full py-2 px-3 rounded-xl bg-slate-950 border border-slate-700 text-white font-bold focus:outline-none focus:border-amber-500"
              >
                <option value={0}>{isAr ? 'الكل (أي تقييم)' : 'Any Rating'}</option>
                <option value={75}>75+ {isAr ? 'نجم صاعد' : 'Rising Star'}</option>
                <option value={80}>80+ {isAr ? 'مستوى مميز' : 'Top Tier'}</option>
                <option value={85}>85+ {isAr ? 'نجم عالمي' : 'World Class'}</option>
                <option value={88}>88+ {isAr ? 'أسطورة سوبر' : 'Superstar'}</option>
              </select>
            </div>

            {/* Min Potential */}
            <div className="space-y-1.5">
              <label className="text-slate-400 font-bold block">{isAr ? 'إمكانية التطور (Potential):' : 'Min Potential:'}</label>
              <select
                value={minPotential}
                onChange={(e) => setMinPotential(Number(e.target.value))}
                className="w-full py-2 px-3 rounded-xl bg-slate-950 border border-slate-700 text-white font-bold focus:outline-none focus:border-amber-500"
              >
                <option value={0}>{isAr ? 'الكل (أي إمكانية)' : 'Any Potential'}</option>
                <option value={85}>85+ {isAr ? 'إمكانية واعدة' : 'High Potential'}</option>
                <option value={88}>88+ {isAr ? 'نجم المستقبل' : 'Future Star'}</option>
                <option value={90}>90+ {isAr ? 'موهبة خارقة (Wonderkid 🌟)' : 'Wonderkid (90+ 🌟)'}</option>
              </select>
            </div>

            {/* Age Filter */}
            <div className="space-y-1.5">
              <label className="text-slate-400 font-bold block">{isAr ? 'الفئة العمرية:' : 'Age Category:'}</label>
              <select
                value={ageGroup}
                onChange={(e) => setAgeGroup(e.target.value as AgeFilterOption)}
                className="w-full py-2 px-3 rounded-xl bg-slate-950 border border-slate-700 text-white font-bold focus:outline-none focus:border-amber-500"
              >
                <option value="all">{isAr ? 'جميع الأعمار' : 'All Ages'}</option>
                <option value="u21">{isAr ? 'أقل من 21 سنة (مواهب شابة)' : 'Under 21 (Young Talent)'}</option>
                <option value="21_25">{isAr ? '21 - 25 سنة (مرحلة التطور)' : '21 - 25 yrs (Developing)'}</option>
                <option value="26_29">{isAr ? '26 - 29 سنة (قمة العطاء)' : '26 - 29 yrs (Prime)'}</option>
                <option value="30plus">{isAr ? '30 سنة فأكثر (خبرة مخضرمة)' : '30+ yrs (Veterans)'}</option>
              </select>
            </div>

            {/* Max Price */}
            <div className="space-y-1.5">
              <label className="text-slate-400 font-bold block">{isAr ? 'الحد الأقصى للسعر:' : 'Max Price Limit:'}</label>
              <select
                value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                className="w-full py-2 px-3 rounded-xl bg-slate-950 border border-slate-700 text-white font-bold focus:outline-none focus:border-amber-500"
              >
                <option value={0}>{isAr ? 'بلا حدود' : 'No Limit'}</option>
                <option value={200000}>&lt; 200,000 $</option>
                <option value={300000}>&lt; 300,000 $</option>
                <option value={500000}>&lt; 500,000 $</option>
                <option value={1000000}>&lt; 1,000,000 $</option>
              </select>
            </div>

            {/* Sorting */}
            <div className="space-y-1.5">
              <label className="text-slate-400 font-bold block">{isAr ? 'ترتيب النتائج حسب:' : 'Sort By:'}</label>
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as SortOption)}
                className="w-full py-2 px-3 rounded-xl bg-slate-950 border border-slate-700 text-white font-bold focus:outline-none focus:border-amber-500"
              >
                <option value="rating_desc">{isAr ? 'التقييم (من الأعلى للأدنى)' : 'Rating (High to Low)'}</option>
                <option value="potential_desc">{isAr ? 'الإمكانية (الأعلى مستقبلاً)' : 'Potential (Highest First)'}</option>
                <option value="price_asc">{isAr ? 'السعر (الأرخص أولاً)' : 'Price (Lowest First)'}</option>
                <option value="price_desc">{isAr ? 'السعر (الأعلى قيمة)' : 'Price (Highest First)'}</option>
                <option value="pace_desc">{isAr ? 'السرعة (الأسرع أولاً)' : 'Pace (Fastest First)'}</option>
                <option value="age_asc">{isAr ? 'العمر (الأصغر أولاً)' : 'Age (Youngest First)'}</option>
              </select>
            </div>

            {/* Affordable Only Checkbox */}
            <div className="sm:col-span-2 flex items-center gap-3 p-3 rounded-xl bg-slate-950/80 border border-slate-800">
              <input
                type="checkbox"
                id="affordable_checkbox"
                checked={affordableOnly}
                onChange={(e) => setAffordableOnly(e.target.checked)}
                className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 border-slate-700 bg-slate-900 cursor-pointer"
              />
              <label htmlFor="affordable_checkbox" className="text-xs font-bold text-slate-300 cursor-pointer">
                {isAr ? 'إظهار اللاعبين المتاحين لميزانية النادي الحالية فقط' : 'Show only players within current club balance'}
              </label>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results Header Info */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-xs text-slate-400">
        <span>
          {isAr ? `تم العثور على ${totalFiltered} لاعب يطابق الفلاتر` : `Found ${totalFiltered} players matching filters`}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-medium">
            {isAr ? 'الترتيب الحالي: ' : 'Sorted: '}
          </span>
          <span className="text-amber-400 font-bold">
            {sortOption === 'rating_desc' && (isAr ? 'التقييم الأعلى' : 'Highest Rating')}
            {sortOption === 'potential_desc' && (isAr ? 'الإمكانية القصوى' : 'Highest Potential')}
            {sortOption === 'price_asc' && (isAr ? 'الأرخص سعراً' : 'Lowest Price')}
            {sortOption === 'price_desc' && (isAr ? 'الأعلى قيمة' : 'Highest Price')}
            {sortOption === 'pace_desc' && (isAr ? 'الأسرع' : 'Fastest Pace')}
            {sortOption === 'age_asc' && (isAr ? 'الأصغر سناً' : 'Youngest')}
          </span>
        </div>
      </div>
    </div>
  );
};
