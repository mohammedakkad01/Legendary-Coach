/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Transfer Market & Comprehensive Player Search / Filtering System
 * Advanced filters (Position, Overall, Potential, Age, Budget, Sort),
 * Detailed player inspection modal, squad sales, and live world scouting.
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useGameStore } from '../state/useGameStore';
import { Player } from '../types/game';
import { 
  ArrowLeftRight, 
  Coins, 
  Search, 
  UserCheck, 
  ShieldAlert, 
  Sparkles, 
  Filter, 
  SlidersHorizontal, 
  ArrowUpDown, 
  Check, 
  X, 
  Flame, 
  Gem, 
  Shield, 
  Star, 
  Trophy, 
  RefreshCw, 
  ChevronDown, 
  Eye, 
  AlertCircle, 
  Users, 
  CheckCircle2,
  Sliders,
  DollarSign,
  TrendingUp,
  Tag
} from 'lucide-react';
import { searchRealPlayersApi, convertApiPlayerToGamePlayer, ApiPlayerResult } from '../services/footballApi';
import { useFirebase } from '../firebase/FirebaseContext';

type PositionCategory = 'all' | 'ATT' | 'MID' | 'DEF' | 'GK';
type SpecificPosition = 'all' | 'ST' | 'LW' | 'RW' | 'CAM' | 'CM' | 'CDM' | 'CB' | 'LB' | 'RB' | 'GK';
type SortOption = 'rating_desc' | 'rating_asc' | 'potential_desc' | 'price_asc' | 'price_desc' | 'pace_desc' | 'age_asc';
type AgeFilterOption = 'all' | 'u21' | '21_25' | '26_29' | '30plus';

export const TransfersMarketView: React.FC = () => {
  const { club, scoutMarket, buyPlayer, sellPlayer, addPlayerToSquad, refreshScoutMarket, language } = useGameStore();
  const { setAuthModalOpen, user } = useFirebase();
  const isAr = language === 'ar';

  // Navigation tab inside Transfers Hub
  const [activeTab, setActiveTab] = useState<'market' | 'world_scout' | 'squad'>('market');

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryPos, setCategoryPos] = useState<PositionCategory>('all');
  const [specificPos, setSpecificPos] = useState<SpecificPosition>('all');
  const [minRating, setMinRating] = useState<number>(0);
  const [minPotential, setMinPotential] = useState<number>(0);
  const [ageGroup, setAgeGroup] = useState<AgeFilterOption>('all');
  const [maxPrice, setMaxPrice] = useState<number>(0); // 0 = no limit
  const [affordableOnly, setAffordableOnly] = useState<boolean>(false);
  const [sortOption, setSortOption] = useState<SortOption>('rating_desc');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false);

  // Selected Player for Detailed Inspection Modal
  const [inspectingPlayer, setInspectingPlayer] = useState<Player | null>(null);

  // World Scout Live Search State
  const [worldSearchQuery, setWorldSearchQuery] = useState('');
  const [worldSearching, setWorldSearching] = useState(false);
  const [worldResults, setWorldResults] = useState<ApiPlayerResult[]>([]);
  const [signedWorldNames, setSignedWorldNames] = useState<string[]>([]);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  // Check if any filter is active
  const hasActiveFilters = useMemo(() => {
    return (
      searchQuery.trim() !== '' ||
      categoryPos !== 'all' ||
      specificPos !== 'all' ||
      minRating > 0 ||
      minPotential > 0 ||
      ageGroup !== 'all' ||
      maxPrice > 0 ||
      affordableOnly ||
      sortOption !== 'rating_desc'
    );
  }, [searchQuery, categoryPos, specificPos, minRating, minPotential, ageGroup, maxPrice, affordableOnly, sortOption]);

  const resetAllFilters = () => {
    setSearchQuery('');
    setCategoryPos('all');
    setSpecificPos('all');
    setMinRating(0);
    setMinPotential(0);
    setAgeGroup('all');
    setMaxPrice(0);
    setAffordableOnly(false);
    setSortOption('rating_desc');
  };

  // Filter and sort the scout market
  const filteredAndSortedMarket = useMemo(() => {
    return scoutMarket
      .filter((p) => {
        // Text Search
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchName = p.name.toLowerCase().includes(q);
          const matchNameEn = p.nameEn.toLowerCase().includes(q);
          const matchTeam = (p.realTeam || '').toLowerCase().includes(q);
          const matchNat = p.nationality.toLowerCase().includes(q);
          if (!matchName && !matchNameEn && !matchTeam && !matchNat) return false;
        }

        // Category Position Filter
        if (categoryPos === 'ATT' && !['ST', 'LW', 'RW', 'CF'].includes(p.position)) return false;
        if (categoryPos === 'MID' && !['CM', 'CAM', 'CDM', 'LM', 'RM'].includes(p.position)) return false;
        if (categoryPos === 'DEF' && !['CB', 'LB', 'RB', 'LWB', 'RWB'].includes(p.position)) return false;
        if (categoryPos === 'GK' && p.position !== 'GK') return false;

        // Specific Position Filter
        if (specificPos !== 'all' && p.position !== specificPos) return false;

        // Min Rating
        if (minRating > 0 && p.overall < minRating) return false;

        // Min Potential
        if (minPotential > 0 && p.potential < minPotential) return false;

        // Age Group
        if (ageGroup === 'u21' && p.age >= 21) return false;
        if (ageGroup === '21_25' && (p.age < 21 || p.age > 25)) return false;
        if (ageGroup === '26_29' && (p.age < 26 || p.age > 29)) return false;
        if (ageGroup === '30plus' && p.age < 30) return false;

        // Max Price
        if (maxPrice > 0 && p.marketValue > maxPrice) return false;

        // Affordable Only
        if (affordableOnly && p.marketValue > club.finances.coins) return false;

        return true;
      })
      .sort((a, b) => {
        switch (sortOption) {
          case 'rating_desc':
            return b.overall - a.overall;
          case 'rating_asc':
            return a.overall - b.overall;
          case 'potential_desc':
            return b.potential - a.potential;
          case 'price_asc':
            return a.marketValue - b.marketValue;
          case 'price_desc':
            return b.marketValue - a.marketValue;
          case 'pace_desc':
            return (b.attributes.pace || 0) - (a.attributes.pace || 0);
          case 'age_asc':
            return a.age - b.age;
          default:
            return b.overall - a.overall;
        }
      });
  }, [scoutMarket, searchQuery, categoryPos, specificPos, minRating, minPotential, ageGroup, maxPrice, affordableOnly, sortOption, club.finances.coins]);

  // Handle Buy
  const handleBuyPlayer = (player: Player) => {
    if (club.finances.coins < player.marketValue) {
      setFeedbackToast(isAr ? '⚠️ رصيد النادي غير كافٍ لإتمام الصفقة!' : '⚠️ Insufficient funds to sign this player!');
      return;
    }
    const success = buyPlayer(player);
    if (success) {
      setFeedbackToast(isAr ? `🎉 مبروك! تم التوقيع رسمياً مع ${player.name} وانضمامه لقائمة الفريق!` : `🎉 Successfully signed ${player.nameEn} to your squad!`);
      if (inspectingPlayer?.id === player.id) {
        setInspectingPlayer(null);
      }
    }
  };

  // Handle World Scout Search
  const handleWorldScoutSearch = async (query: string) => {
    if (!query.trim()) return;
    setWorldSearching(true);
    try {
      const results = await searchRealPlayersApi(query);
      setWorldResults(results);
    } catch (err) {
      console.error('Scout search failed:', err);
    } finally {
      setWorldSearching(false);
    }
  };

  // Handle Sign from World Scout
  const handleSignFromWorldScoutCoins = (apiP: ApiPlayerResult) => {
    const gameP = convertApiPlayerToGamePlayer(apiP);
    if (club.finances.coins < gameP.marketValue) {
      setFeedbackToast(isAr ? `⚠️ ميزانية النادي لا تكفي! القيمة السوقية: ${gameP.marketValue.toLocaleString()} $` : `⚠️ Insufficient funds! Market value: $${gameP.marketValue.toLocaleString()}`);
      return;
    }

    useGameStore.setState((state) => ({
      club: {
        ...state.club,
        finances: {
          ...state.club.finances,
          coins: state.club.finances.coins - gameP.marketValue,
        },
      },
    }));

    addPlayerToSquad(gameP);
    setSignedWorldNames((prev) => [...prev, apiP.strPlayer]);
    setFeedbackToast(isAr ? `🎉 تم إتمام صفقة الشراء للاعب العالمي ${apiP.strPlayer}!` : `🎉 Successfully signed world star ${apiP.strPlayer}!`);
  };

  const handleSignFromWorldScoutDiamonds = (apiP: ApiPlayerResult) => {
    const cost = 50;
    const diamonds = club.finances.diamonds || 0;
    if (diamonds < cost) {
      if (!user) {
        setFeedbackToast(isAr ? 'ليس لديك جواهر كافية! سجل دخولك الآن للحصول على 300 جوهرة 💎 مجاناً!' : 'Not enough diamonds! Sign in now for 300 free diamonds 💎!');
        setAuthModalOpen(true);
      } else {
        setFeedbackToast(isAr ? `تحتاج إلى ${cost} جوهرة للتوقيع الفوري.` : `You need ${cost} diamonds for instant signing.`);
      }
      return;
    }

    useGameStore.setState((state) => ({
      club: {
        ...state.club,
        finances: {
          ...state.club.finances,
          diamonds: (state.club.finances.diamonds || 0) - cost,
        },
      },
    }));

    const gameP = convertApiPlayerToGamePlayer(apiP);
    addPlayerToSquad(gameP);
    setSignedWorldNames((prev) => [...prev, apiP.strPlayer]);
    setFeedbackToast(isAr ? `🎉 تم التوقيع الفوري بالجواهر مع ${apiP.strPlayer}!` : `🎉 Signed ${apiP.strPlayer} instantly using Diamonds!`);
  };

  // Helper for position color
  const getPositionBadgeColor = (pos: string) => {
    if (['ST', 'CF', 'LW', 'RW'].includes(pos)) return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
    if (['CAM', 'CM', 'CDM', 'LM', 'RM'].includes(pos)) return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
    if (['CB', 'LB', 'RB', 'LWB', 'RWB'].includes(pos)) return 'bg-sky-500/20 text-sky-300 border-sky-500/30';
    return 'bg-amber-500/20 text-amber-300 border-amber-500/30'; // GK
  };

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-6 space-y-6" id="transfer_market_view">
      
      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-amber-950/80 via-slate-900 to-indigo-950/80 border border-amber-500/30 rounded-3xl p-5 sm:p-7 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
              <ArrowLeftRight className="w-4 h-4" />
              <span>{isAr ? 'سوق الانتقالات وشبكة الكشافة' : 'Transfer Market & Scouting Network'}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black font-heading text-white">
              {isAr ? 'إدارة التعاقدات وتدعيم الصفوف' : 'Transfers Hub & Squad Reinforcements'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {isAr 
                ? 'ابحث وفلتر بين أفضل المواهب الصاعدة والنجوم العالميين. استخدم الفلاتر الشاملة لاكتشاف اللاعب المناسب لتكتيك ناديك!' 
                : 'Scout, filter, and sign prospect wonderkids and global stars. Utilize comprehensive filtering to find the perfect fit for your tactics!'}
            </p>
          </div>

          {/* Finances & Refresh Action */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-slate-950/90 p-3.5 rounded-2xl border border-slate-800 text-center min-w-[140px] shadow-lg">
              <span className="text-[10px] text-slate-400 block font-bold uppercase">{isAr ? 'ميزانية النادي' : 'Transfer Budget'}</span>
              <span className="text-lg sm:text-xl font-black text-amber-400 flex items-center justify-center gap-1">
                <Coins className="w-4 h-4 text-amber-400" />
                <span>{club.finances.coins.toLocaleString()} $</span>
              </span>
            </div>

            <div className="bg-slate-950/90 p-3.5 rounded-2xl border border-slate-800 text-center min-w-[110px] shadow-lg">
              <span className="text-[10px] text-slate-400 block font-bold uppercase">{isAr ? 'الجواهر 💎' : 'Diamonds 💎'}</span>
              <span className="text-lg sm:text-xl font-black text-fuchsia-400 flex items-center justify-center gap-1">
                <Gem className="w-4 h-4 text-fuchsia-400" />
                <span>{club.finances.diamonds || 0}</span>
              </span>
            </div>

            <button
              onClick={() => {
                refreshScoutMarket();
                setFeedbackToast(isAr ? '🔄 تم تحديث تقارير الكشافة وأهداف السوق بنجاح!' : '🔄 Scouting reports and market targets refreshed!');
              }}
              className="p-3.5 rounded-2xl bg-slate-800/90 hover:bg-slate-700 text-amber-300 border border-slate-700 font-bold text-xs flex items-center gap-2 shadow-lg transition-all cursor-pointer hover:border-amber-400/40"
              title={isAr ? 'إرسال كشافين لتجديد السوق' : 'Refresh scout targets'}
            >
              <RefreshCw className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">{isAr ? 'تجديد تقارير الكشافة' : 'Refresh Scouts'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Switcher: Scout Market vs World Search vs Squad Sales */}
      <div className="flex items-center justify-between flex-wrap gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 shadow-inner">
          <button
            onClick={() => setActiveTab('market')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'market' 
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>{isAr ? 'سوق الانتقالات المتاح' : 'Available Targets'}</span>
            <span className="px-1.5 py-0.5 text-[10px] rounded-md bg-slate-950/60 text-slate-300">
              {filteredAndSortedMarket.length}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveTab('world_scout');
              if (worldResults.length === 0) handleWorldScoutSearch('Haaland');
            }}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'world_scout' 
                ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Trophy className="w-4 h-4" />
            <span>{isAr ? 'كشاف النجوم العالمي' : 'World Star Scout'}</span>
          </button>

          <button
            onClick={() => setActiveTab('squad')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'squad' 
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <ArrowLeftRight className="w-4 h-4" />
            <span>{isAr ? 'بيع لاعبي الفريق' : 'Sell Squad'}</span>
            <span className="px-1.5 py-0.5 text-[10px] rounded-md bg-slate-950/60 text-slate-300">
              {club.footballSquad.length}
            </span>
          </button>
        </div>

        {/* Quick Active Filter Pill & Reset */}
        {activeTab === 'market' && hasActiveFilters && (
          <button
            onClick={resetAllFilters}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 transition-all cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>{isAr ? 'إعادة ضبط كل الفلاتر' : 'Reset All Filters'}</span>
          </button>
        )}
      </div>

      {/* Feedback Toast */}
      {feedbackToast && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="p-4 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 text-sm font-bold flex items-center justify-between shadow-xl"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{feedbackToast}</span>
          </div>
          <button onClick={() => setFeedbackToast(null)} className="text-emerald-400 hover:text-white text-xs p-1">
            ✕
          </button>
        </motion.div>
      )}

      {/* TAB 1: MAIN SCOUT MARKET WITH FULL FILTERING SYSTEM */}
      {activeTab === 'market' && (
        <div className="space-y-5">
          
          {/* COMPREHENSIVE FILTERING BAR */}
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

            {/* EXPANDED ADVANCED FILTERS PANEL */}
            <AnimatePresence>
              {showAdvancedFilters && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="pt-4 border-t border-slate-800/90 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs"
                >
                  {/* Filter 1: Granular Specific Position */}
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

                  {/* Filter 2: Minimum Rating & Potential */}
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

                  {/* Filter 3: Minimum Potential (Wonderkids) */}
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

                  {/* Filter 4: Age Filter */}
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

                  {/* Filter 5: Price Limit */}
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

                  {/* Filter 6: Sorting */}
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

                  {/* Filter 7: Affordable Only Checkbox */}
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
                {isAr ? `تم العثور على ${filteredAndSortedMarket.length} لاعب يطابق الفلاتر` : `Found ${filteredAndSortedMarket.length} players matching filters`}
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

          {/* PLAYERS CARDS GRID */}
          {filteredAndSortedMarket.length === 0 ? (
            <div className="p-12 bg-slate-900/90 border border-slate-800 rounded-3xl text-center space-y-3">
              <Users className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="text-base font-bold text-slate-300">
                {isAr ? 'لا يوجد لاعبون يطابقون هذه الفلاتر' : 'No players match your filters'}
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                {isAr 
                  ? 'جرب تقليل شروط الفلترة أو إعادة ضبط الفلاتر لاستعراض جميع المواهب المعروضة في السوق.' 
                  : 'Try relaxing filter criteria or reset filters to explore all available market targets.'}
              </p>
              <button
                onClick={resetAllFilters}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                {isAr ? 'إعادة ضبط كل الفلاتر' : 'Reset All Filters'}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAndSortedMarket.map((player) => {
                const canAfford = club.finances.coins >= player.marketValue;
                const isWonderkid = player.age <= 21 && player.potential >= 88;
                const isElite = player.overall >= 85;

                return (
                  <motion.div
                    key={player.id}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 hover:border-slate-700 rounded-3xl p-5 shadow-xl flex flex-col justify-between transition-all group"
                  >
                    <div className="space-y-4">
                      
                      {/* Top Player Card Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          {/* Photo / Avatar */}
                          <div className="relative w-14 h-14 rounded-2xl bg-slate-800 overflow-hidden border border-slate-700 flex items-center justify-center shrink-0 shadow-md">
                            {player.photoUrl ? (
                              <img
                                src={player.photoUrl}
                                alt={player.nameEn}
                                className="w-full h-full object-cover object-top"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <Users className="w-7 h-7 text-slate-600" />
                            )}
                            <span className="absolute bottom-0 right-0 bg-slate-950/80 px-1 text-[9px] font-black text-amber-300 rounded-tl">
                              {player.nationalityFlag}
                            </span>
                          </div>

                          {/* Name & Club */}
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h3 className="font-heading font-black text-sm sm:text-base text-white">
                                {isAr ? player.name : player.nameEn}
                              </h3>
                            </div>
                            <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                              <span>{player.realTeam || (isAr ? 'نادي محلي' : 'Free Agent')}</span>
                              <span>•</span>
                              <span>{player.age} {isAr ? 'سنة' : 'yrs'}</span>
                            </p>
                            
                            {/* Badges */}
                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-black border ${getPositionBadgeColor(player.position)}`}>
                                {player.position}
                              </span>
                              {isWonderkid && (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-0.5">
                                  <Sparkles className="w-2.5 h-2.5 text-purple-300" />
                                  <span>{isAr ? 'موهبة خارقة' : 'Wonderkid'}</span>
                                </span>
                              )}
                              {isElite && (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-0.5">
                                  <Star className="w-2.5 h-2.5 text-amber-400" />
                                  <span>{isAr ? 'نجم عالمي' : 'Elite'}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Overall & Potential Pill */}
                        <div className="flex flex-col items-center justify-center min-w-[46px] p-1.5 rounded-2xl bg-slate-950 border border-slate-800 text-center shadow-inner">
                          <span className="text-base font-black text-amber-400 leading-none">
                            {player.overall}
                          </span>
                          <span className="text-[9px] uppercase font-bold text-slate-400 mt-0.5">
                            OVR
                          </span>
                          <span className="text-[10px] font-bold text-emerald-400 mt-1 border-t border-slate-800 pt-0.5 w-full">
                            POT {player.potential}
                          </span>
                        </div>
                      </div>

                      {/* Attributes Quick Bar */}
                      <div className="grid grid-cols-4 gap-1.5 text-center text-[10px] font-bold bg-slate-950/80 p-2.5 rounded-2xl border border-slate-800/80">
                        <div>
                          <span className="text-slate-500 block uppercase">{isAr ? 'سرعة' : 'PAC'}</span>
                          <span className="text-emerald-400 font-black text-xs">{player.attributes.pace}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block uppercase">{isAr ? 'تسديد' : 'SHO'}</span>
                          <span className="text-amber-400 font-black text-xs">{player.attributes.shooting}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block uppercase">{isAr ? 'تمرير' : 'PAS'}</span>
                          <span className="text-sky-400 font-black text-xs">{player.attributes.passing}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block uppercase">{isAr ? 'دفاع' : 'DEF'}</span>
                          <span className="text-indigo-400 font-black text-xs">{player.attributes.defending}</span>
                        </div>
                      </div>

                      {/* Traits & Specialties */}
                      {player.traits.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {player.traits.slice(0, 2).map((t) => (
                            <span key={t} className="text-[10px] bg-slate-800/90 text-slate-300 px-2 py-0.5 rounded-md font-semibold border border-slate-700/50">
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Action & Price Footer */}
                    <div className="mt-5 pt-3.5 border-t border-slate-800/80 flex items-center justify-between gap-2">
                      <div>
                        <span className="text-[10px] text-slate-500 block font-medium">{isAr ? 'قيمة الصفقة' : 'Transfer Fee'}</span>
                        <span className="text-sm font-black text-amber-400">
                          {player.marketValue.toLocaleString()} $
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Inspect Details Button */}
                        <button
                          onClick={() => setInspectingPlayer(player)}
                          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
                          title={isAr ? 'فحص كامل إحصائيات اللاعب' : 'Inspect player stats'}
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Sign Player Button */}
                        <button
                          onClick={() => handleBuyPlayer(player)}
                          disabled={!canAfford}
                          className={`px-3.5 py-2 rounded-xl text-xs font-black shadow-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                            canAfford
                              ? 'bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 shadow-amber-500/20 active:scale-95'
                              : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-60'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>{canAfford ? (isAr ? 'إتمام التعاقد' : 'Sign Player') : (isAr ? 'الميزانية لا تكفي' : 'No Budget')}</span>
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: LIVE WORLD STAR SCOUT SEARCH (NO API MENTION) */}
      {activeTab === 'world_scout' && (
        <div className="space-y-6">
          <div className="p-5 rounded-3xl bg-gradient-to-r from-sky-950/70 via-slate-900 to-indigo-950/70 border border-sky-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
            <div>
              <div className="flex items-center gap-2 text-sky-400 font-bold text-xs">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span>{isAr ? 'كشاف النجوم وقاعدة البيانات العالمية' : 'World Star Scouting Network'}</span>
              </div>
              <h3 className="text-xl font-black text-white mt-1 font-heading">
                {isAr ? 'استقطاب نجوم كرة القدم العالمية' : 'Sign International Superstars'}
              </h3>
              <p className="text-xs text-slate-300 mt-1 max-w-xl">
                {isAr 
                  ? 'ابحث بالاسم عن أي نجم كرة قدم في العالم (Haaland, Salah, Mbappe, Yamal, Vinicius, De Bruyne) واستعرض بطاقته الواقعية وتعاقد معه فوراً.' 
                  : 'Search for any international football player (Haaland, Salah, Mbappe, Yamal) to view their authentic card and sign them to your squad.'}
              </p>
            </div>

            {/* Quick Balance */}
            <div className="flex items-center gap-3">
              <div className="px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 block">{isAr ? 'الجواهر المتاحة' : 'Gems'}</span>
                <span className="text-sm font-black text-fuchsia-400">{club.finances.diamonds || 0} 💎</span>
              </div>
            </div>
          </div>

          {/* Search Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleWorldScoutSearch(worldSearchQuery);
            }}
            className="relative"
          >
            <div className="relative flex items-center">
              <Search className="absolute right-4 rtl:right-4 ltr:left-4 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={worldSearchQuery}
                onChange={(e) => setWorldSearchQuery(e.target.value)}
                placeholder={isAr ? 'ابحث باسم اللاعب: مثلاً Haaland, Salah, Mbappe, Bellingham, Yamal...' : 'Search player name: Haaland, Salah, Mbappe...'}
                className="w-full py-3.5 px-12 rounded-2xl bg-slate-900 border border-slate-700/80 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-sky-500 shadow-inner"
              />
              <button
                type="submit"
                disabled={worldSearching}
                className="absolute left-2.5 rtl:left-2.5 ltr:right-2.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                {worldSearching ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                <span>{isAr ? 'بحث كشفي' : 'Scout'}</span>
              </button>
            </div>
          </form>

          {/* Popular Search Suggestions */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
            <span className="text-slate-400 shrink-0 font-medium">{isAr ? 'أشهر النجوم:' : 'Popular:'}</span>
            {['Erling Haaland', 'Kylian Mbappe', 'Mohamed Salah', 'Lamine Yamal', 'Vinicius Junior', 'Jude Bellingham', 'Cristiano Ronaldo', 'Lionel Messi'].map((name) => (
              <button
                key={name}
                onClick={() => {
                  setWorldSearchQuery(name);
                  handleWorldScoutSearch(name);
                }}
                className="px-3 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 shrink-0 transition-colors cursor-pointer"
              >
                {name}
              </button>
            ))}
          </div>

          {/* World Scout Results Grid */}
          {worldSearching ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
              <RefreshCw className="w-8 h-8 animate-spin text-sky-400" />
              <p className="text-sm font-medium">{isAr ? 'جاري البحث في قاعدة البيانات الكروية العالمية...' : 'Scouting international database...'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {worldResults.map((p) => {
                const gameP = convertApiPlayerToGamePlayer(p);
                const isSigned = signedWorldNames.includes(p.strPlayer) || club.footballSquad.some(sp => sp.nameEn.toLowerCase() === p.strPlayer.toLowerCase());
                const canAffordCoins = club.finances.coins >= gameP.marketValue;
                const canAffordDiamonds = (club.finances.diamonds || 0) >= 50;

                return (
                  <div
                    key={p.idPlayer || p.strPlayer}
                    className="relative overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 p-5 shadow-xl flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="relative w-16 h-16 rounded-2xl bg-slate-800 overflow-hidden border border-slate-700 flex items-center justify-center shrink-0">
                            {p.strCutout || p.strThumb ? (
                              <img
                                src={p.strCutout || p.strThumb}
                                alt={p.strPlayer}
                                className="w-full h-full object-cover object-top"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <Users className="w-8 h-8 text-slate-600" />
                            )}
                            <span className="absolute bottom-0 right-0 bg-slate-950/80 px-1 py-0.5 text-[9px] font-bold text-sky-300 rounded-tl">
                              {gameP.position}
                            </span>
                          </div>

                          <div>
                            <h4 className="font-bold text-base text-white leading-snug">{p.strPlayer}</h4>
                            <p className="text-xs text-slate-400 mt-0.5">{p.strTeam || 'نادي عالمي'} • {p.strNationality || 'دولي'}</p>
                            <p className="text-[11px] text-slate-500 mt-0.5">{isAr ? `العمر: ${gameP.age} سنة` : `Age: ${gameP.age}`}</p>
                          </div>
                        </div>

                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-600 text-slate-950 font-black flex flex-col items-center justify-center shadow-lg">
                          <span className="text-base leading-none">{gameP.overall}</span>
                          <span className="text-[9px] font-bold uppercase opacity-80">OVR</span>
                        </div>
                      </div>

                      {/* Attributes */}
                      <div className="grid grid-cols-3 gap-2 mt-4 p-2.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs text-center font-bold">
                        <div>
                          <span className="text-[10px] text-slate-500 block">PAC</span>
                          <span className="text-emerald-400">{gameP.attributes.pace}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block">SHO</span>
                          <span className="text-amber-400">{gameP.attributes.shooting}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block">PAS</span>
                          <span className="text-sky-400">{gameP.attributes.passing}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="mt-5 pt-3.5 border-t border-slate-800 space-y-2">
                      {isSigned ? (
                        <div className="w-full py-2.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 font-bold text-xs text-center flex items-center justify-center gap-1.5">
                          <Check className="w-4 h-4 text-emerald-400" />
                          <span>{isAr ? 'اللاعب متواجد في تشكيلة ناديك' : 'Signed to Squad'}</span>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => handleSignFromWorldScoutDiamonds(p)}
                            className="py-2.5 px-2 rounded-xl bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-500 hover:to-pink-500 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Gem className="w-3.5 h-3.5 text-yellow-300" />
                            <span>50 💎 {isAr ? 'توقيع فوري' : 'Sign'}</span>
                          </button>

                          <button
                            onClick={() => handleSignFromWorldScoutCoins(p)}
                            disabled={!canAffordCoins}
                            className={`py-2.5 px-2 rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1 cursor-pointer ${
                              canAffordCoins
                                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            }`}
                          >
                            <Coins className="w-3.5 h-3.5" />
                            <span>{gameP.marketValue.toLocaleString()} $</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: SQUAD SALES WITH FILTERING */}
      {activeTab === 'squad' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="text-base font-black text-white">
                {isAr ? 'بيع لاعبي الفريق وتوفير السيولة المالية' : 'Sell Squad Members for Liquidity'}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {isAr 
                  ? 'يمكنك بيع اللاعبين غير الأساسيين للحصول على 90% من قيمتهم السوقية فوراً.' 
                  : 'Sell non-essential players to instantly claim 90% of their transfer value in club cash.'}
              </p>
            </div>
            <span className="text-xs font-bold text-slate-400 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
              {isAr ? `إجمالي القائمة: ${club.footballSquad.length} لاعب` : `Squad Size: ${club.footballSquad.length} players`}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {club.footballSquad.map((player) => {
              const sellPrice = Math.round(player.marketValue * 0.9);
              const isProtected = club.footballSquad.length <= 11;

              return (
                <div key={player.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-md">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-slate-800 border border-slate-700 flex flex-col items-center justify-center font-black text-white shrink-0">
                      <span className="text-xs leading-none text-amber-400">{player.overall}</span>
                      <span className="text-[8px] uppercase text-slate-400">OVR</span>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white block">
                        {isAr ? player.name : player.nameEn}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {player.position} • {player.age} {isAr ? 'سنة' : 'yrs'}
                      </span>
                    </div>
                  </div>

                  <div className="text-right space-y-1">
                    <span className="text-xs font-black text-emerald-400 block">
                      +{sellPrice.toLocaleString()} $
                    </span>
                    <button
                      onClick={() => {
                        if (isProtected) {
                          setFeedbackToast(isAr ? '⚠️ لا يمكن بيع اللاعب! يجب الإبقاء على 11 لاعباً على الأقل في تشكيلة النادي.' : '⚠️ Cannot sell! Must maintain at least 11 players in your squad.');
                          return;
                        }
                        sellPlayer(player.id);
                        setFeedbackToast(isAr ? `💰 تم بيع ${player.name} وحصلت على ${sellPrice.toLocaleString()} $ في خزينة النادي!` : `💰 Sold ${player.nameEn} for $${sellPrice.toLocaleString()}!`);
                      }}
                      disabled={isProtected}
                      className={`px-3 py-1.5 rounded-xl text-[10px] font-black border transition-all cursor-pointer ${
                        isProtected
                          ? 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed'
                          : 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border-rose-500/40'
                      }`}
                    >
                      {isProtected ? (isAr ? 'أساسي' : 'Locked') : (isAr ? 'عرض للبيع' : 'Sell')}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* DETAILED PLAYER INSPECTION MODAL */}
      <AnimatePresence>
        {inspectingPlayer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden text-slate-100"
            >
              {/* Modal Header */}
              <div className="relative p-6 bg-gradient-to-r from-amber-950 via-slate-900 to-indigo-950 border-b border-slate-800">
                <button
                  onClick={() => setInspectingPlayer(null)}
                  className="absolute top-4 left-4 sm:left-auto sm:right-4 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-slate-800 overflow-hidden border border-slate-700 shrink-0 flex items-center justify-center shadow-lg">
                    {inspectingPlayer.photoUrl ? (
                      <img
                        src={inspectingPlayer.photoUrl}
                        alt={inspectingPlayer.nameEn}
                        className="w-full h-full object-cover object-top"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <Users className="w-8 h-8 text-slate-600" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-black font-heading text-white">
                        {isAr ? inspectingPlayer.name : inspectingPlayer.nameEn}
                      </h3>
                      <span>{inspectingPlayer.nationalityFlag}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {inspectingPlayer.realTeam || 'النادي'} • {inspectingPlayer.age} {isAr ? 'سنة' : 'years old'}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className={`px-2.5 py-0.5 rounded-lg text-xs font-black border ${getPositionBadgeColor(inspectingPlayer.position)}`}>
                        {inspectingPlayer.position}
                      </span>
                      <span className="text-xs font-bold text-emerald-400">
                        {isAr ? `إمكانية الوصول: ${inspectingPlayer.potential}` : `Potential: ${inspectingPlayer.potential}`}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Body: Attributes Breakdown */}
              <div className="p-6 space-y-5">
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                    {isAr ? 'القدرات والإحصائيات الفنية' : 'Detailed Attributes'}
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    {[
                      { labelAr: 'السرعة والانطلاق', labelEn: 'Pace & Acceleration', val: inspectingPlayer.attributes.pace, color: 'bg-emerald-500' },
                      { labelAr: 'التسديد وإنهاء الهجمات', labelEn: 'Shooting & Finishing', val: inspectingPlayer.attributes.shooting, color: 'bg-amber-500' },
                      { labelAr: 'التمرير وصناعة اللعب', labelEn: 'Passing & Vision', val: inspectingPlayer.attributes.passing, color: 'bg-sky-500' },
                      { labelAr: 'المراوغة والتحكم', labelEn: 'Dribbling & Control', val: inspectingPlayer.attributes.dribbling, color: 'bg-purple-500' },
                      { labelAr: 'الدفاع وافتكاك الكرة', labelEn: 'Defending & Tackling', val: inspectingPlayer.attributes.defending, color: 'bg-indigo-500' },
                      { labelAr: 'القوة البدنية والالتحامات', labelEn: 'Physical & Stamina', val: inspectingPlayer.attributes.physical, color: 'bg-rose-500' },
                    ].map((attr) => (
                      <div key={attr.labelEn} className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 font-medium text-[11px]">{isAr ? attr.labelAr : attr.labelEn}</span>
                          <span className="font-black text-white">{attr.val}</span>
                        </div>
                        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${attr.color} rounded-full`}
                            style={{ width: `${Math.min(100, attr.val || 0)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Traits */}
                {inspectingPlayer.traits.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                      {isAr ? 'السمات والمميزات الخاصة' : 'Traits & Specialties'}
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {inspectingPlayer.traits.map((t) => (
                        <span key={t} className="px-2.5 py-1 rounded-lg bg-slate-800 text-amber-300 font-bold text-xs border border-slate-700">
                          ⚡ {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Contract & Action */}
                <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] text-slate-400 block">{isAr ? 'قيمة الصفقة' : 'Signing Fee'}</span>
                    <span className="text-lg font-black text-amber-400">
                      {inspectingPlayer.marketValue.toLocaleString()} $
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setInspectingPlayer(null)}
                      className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors cursor-pointer"
                    >
                      {isAr ? 'إلغاء' : 'Cancel'}
                    </button>
                    <button
                      onClick={() => handleBuyPlayer(inspectingPlayer)}
                      disabled={club.finances.coins < inspectingPlayer.marketValue}
                      className={`px-5 py-2.5 rounded-xl font-black text-xs shadow-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                        club.finances.coins >= inspectingPlayer.marketValue
                          ? 'bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 shadow-amber-500/30'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-60'
                      }`}
                    >
                      <Check className="w-4 h-4" />
                      <span>{club.finances.coins >= inspectingPlayer.marketValue ? (isAr ? 'تأكيد التعاقد' : 'Confirm Signing') : (isAr ? 'الميزانية لا تكفي' : 'Insufficient Budget')}</span>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
