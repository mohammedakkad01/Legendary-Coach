/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Official League & Club Selection Modal
 * Step 1: Choose Official Real League
 * Step 2: Choose Official Real Club
 * Top Tier / Champion clubs cost Gems (100 💎), Challengers are Free (0 💎).
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useGameStore } from '../state/useGameStore';
import { useFirebase } from '../firebase/FirebaseContext';
import { RealLeague, RealClubConfig, getActiveLeagues } from '../data/realLeaguesData';
import { hydrateLiveLeagues } from '../services/liveLeaguesService';
import { cloneClubToUserSave, fetchClubSquadCache } from '../services/realFootballDataService';
import { convertCachedSquadPlayerToGamePlayer } from '../services/footballApi';
import { 
  Trophy, 
  Gem, 
  Sparkles, 
  Check, 
  MapPin, 
  Search, 
  X, 
  Shield, 
  Star, 
  UserCheck, 
  Flame,
  ArrowRight,
  Compass,
  AlertCircle,
  Coins
} from 'lucide-react';

export const InitialClubSelectModal: React.FC = () => {
  const { 
    clubSelectionModalOpen, 
    setClubSelectionModalOpen, 
    hasSelectedInitialClub, 
    selectLeagueAndClub, 
    club, 
    language 
  } = useGameStore();

  const { setAuthModalOpen, user } = useFirebase();

  const isAr = language === 'ar';
  const currentDiamonds = club.finances.diamonds || 0;
  const currentCoins = club.finances.coins || 0;
  const isSwitchingMode = hasSelectedInitialClub;
  const SWITCH_FEE_DIAMONDS = 50;
  const SWITCH_FEE_COINS = 25000;

  const [selectedLeagueId, setSelectedLeagueId] = useState<string>('premier_league');
  const [filterTier, setFilterTier] = useState<'all' | 'top' | 'free'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [joiningClubId, setJoiningClubId] = useState<string | null>(null);

  // Live rosters: starts as the static curated list, then enriched in the background with the
  // full real rosters synced into Firestore (leagues_cache/clubs_cache) — see
  // scripts/syncFootballData.ts. Falls back silently to the static list if offline/not synced yet.
  const [leagues, setLeagues] = useState<RealLeague[]>(getActiveLeagues());

  useEffect(() => {
    let cancelled = false;
    // Also publishes the merged list game-wide (standings, fixtures, opponents read it).
    hydrateLiveLeagues().then((merged) => {
      if (!cancelled) setLeagues(merged);
    });
    return () => { cancelled = true; };
  }, []);

  if (!clubSelectionModalOpen) return null;

  const selectedLeague: RealLeague = leagues.find(l => l.id === selectedLeagueId) || leagues[0];

  // Filter clubs by league, search query, and tier
  const filteredClubs: RealClubConfig[] = selectedLeague.clubs.filter(c => {
    if (filterTier === 'top' && !c.isTopTier) return false;
    if (filterTier === 'free' && c.isTopTier) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        c.nameEn.toLowerCase().includes(q) ||
        c.city.toLowerCase().includes(q) ||
        c.keyStars.some(s => s.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handleClubSelection = async (clubConfig: RealClubConfig) => {
    setFeedbackMessage(null);

    // If already current club
    if (isSwitchingMode && club.id === clubConfig.id) {
      setFeedbackMessage({
        type: 'error',
        text: isAr ? `أنت تدرب نادي ${club.name} بالفعل!` : `You already manage ${club.nameEn}!`
      });
      return;
    }

    // Affordability check
    if (isSwitchingMode) {
      const canPayDiamonds = currentDiamonds >= (clubConfig.gemCost + SWITCH_FEE_DIAMONDS);
      const canPayCoins = currentCoins >= SWITCH_FEE_COINS && currentDiamonds >= clubConfig.gemCost;

      if (!canPayDiamonds && !canPayCoins) {
        setFeedbackMessage({
          type: 'error',
          text: isAr
            ? `⚠️ لا تملك ما يكفي لفسخ العقد والانتقال! يتطلب (${SWITCH_FEE_COINS.toLocaleString()} 🪙 أو ${SWITCH_FEE_DIAMONDS} 💎) بالإضافة لتكلفة النادي (${clubConfig.gemCost} 💎).`
            : `⚠️ Insufficient funds for contract termination! Requires (${SWITCH_FEE_COINS.toLocaleString()} 🪙 or ${SWITCH_FEE_DIAMONDS} 💎) plus club fee (${clubConfig.gemCost} 💎).`
        });
        return;
      }
    } else if (clubConfig.isTopTier && clubConfig.gemCost > currentDiamonds) {
      setFeedbackMessage({
        type: 'error',
        text: isAr
          ? `⚠️ نادي ${clubConfig.name} من أندية المركز الأول والنخبة ويتطلب ${clubConfig.gemCost} جوهرة 💎. رصيدك الحالي: ${currentDiamonds} 💎. سجّل الدخول بحسابك لاستلام 300 💎 مجاناً، أو اختر نادياً مجانياً (0 💎)!`
          : `⚠️ ${clubConfig.nameEn} requires ${clubConfig.gemCost} 💎. You currently have ${currentDiamonds} 💎. Sign in to get 300 💎 free, or choose a free challenger club!`
      });
      return;
    }

    setJoiningClubId(clubConfig.id);

    // Make sure the full live club lists are the active ones BEFORE the standings and
    // fixtures of the new career are generated (otherwise they'd use the small fallback list).
    await hydrateLiveLeagues();

    // Try to fetch this club's REAL, pre-synced squad (squads_cache, from
    // scripts/syncSquadsData.ts) so the manager takes over with that club's
    // actual real players instead of a generic starter roster. Silently
    // falls back if the club hasn't been synced yet (see selectLeagueAndClub).
    let realSquad;
    try {
      const cached = await fetchClubSquadCache(clubConfig.id);
      if (cached && cached.players.length > 0) {
        realSquad = cached.players.map(p => convertCachedSquadPlayerToGamePlayer(p, clubConfig.nameEn));
      }
    } catch (e) {
      console.warn('Could not fetch real squad cache, falling back to default roster:', e);
    }

    const res = selectLeagueAndClub(clubConfig, realSquad);
    setJoiningClubId(null);

    if (res.success) {
      // Layer 2 Cloning: If logged in, clone club and squad to user_saves/{userId}
      if (user && user.uid) {
        // Run asynchronously in background without blocking UI
        const stateNow = useGameStore.getState();
        cloneClubToUserSave(user.uid, stateNow.club, clubConfig.leagueId).catch((e) => {
          console.warn('Background clone error:', e);
        });
      }

      setFeedbackMessage({ type: 'success', text: res.message });
      setTimeout(() => {
        setClubSelectionModalOpen(false);
      }, 1200);
    } else {
      setFeedbackMessage({ type: 'error', text: res.message });
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-5xl my-auto bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        >
          {/* Top Decorative Glow */}
          <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-amber-500 via-sky-500 to-indigo-500" />

          {/* Modal Header */}
          <div className="p-4 sm:p-6 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-950/40">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/20 shrink-0">
                <Trophy className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    {isAr ? 'البداية الرسمية للمسيرة' : 'Official Career Kickoff'}
                  </span>
                  {!hasSelectedInitialClub && (
                    <span className="text-[11px] font-bold text-sky-400">
                      {isAr ? '• مرحلة اختيار الفريق' : '• Club Selection Phase'}
                    </span>
                  )}
                </div>
                <h2 className="text-xl sm:text-2xl font-black font-heading text-white mt-0.5">
                  {isSwitchingMode 
                    ? (isAr ? 'الانتقال إلى نادٍ أو دوري جديد' : 'Transfer to a New League / Club') 
                    : (isAr ? 'اختر دوريك وناديك لبدء المسيرة' : 'Select Your League & Club')}
                </h2>
                <p className="text-xs sm:text-sm text-slate-400">
                  {isSwitchingMode
                    ? (isAr 
                        ? `أنت تدرب حالياً: ${club.name}. يتطلب كسر العقد والانتقال رسوم انتقال رسمية (${SWITCH_FEE_DIAMONDS} 💎 أو ${SWITCH_FEE_COINS.toLocaleString()} 🪙) بالإضافة لتكلفة النادي إن وجد.`
                        : `Currently managing: ${club.nameEn}. Transfer release fee is (${SWITCH_FEE_DIAMONDS} 💎 or ${SWITCH_FEE_COINS.toLocaleString()} 🪙) plus tier signing fee.`)
                    : (isAr 
                        ? 'أندية المركز الأول والنخبة تتطلب جواهر 💎، وأندية التحدي والصعود مجانية (0 💎).'
                        : 'Champion clubs require Gems 💎, while Challenger clubs are completely Free (0 💎).')}
                </p>
              </div>
            </div>

            {/* Balances & Close button */}
            <div className="flex items-center gap-2.5 self-end sm:self-center">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-black">
                <Coins className="w-4 h-4 text-amber-400" />
                <span className="text-amber-300 font-mono">{currentCoins.toLocaleString()}</span>
              </div>

              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-black">
                <Gem className="w-4 h-4 text-fuchsia-400" />
                <span className="text-fuchsia-300 font-mono">{currentDiamonds} 💎</span>
              </div>

              {currentDiamonds < 100 && (
                <button
                  onClick={() => setAuthModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 text-xs font-black hover:opacity-90 transition-opacity shadow-md"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isAr ? 'احصل على 300 💎 مجاناً' : 'Get 300 💎 Free'}</span>
                </button>
              )}

              {hasSelectedInitialClub && (
                <button
                  onClick={() => setClubSelectionModalOpen(false)}
                  className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {/* Alert / Feedback message */}
          {feedbackMessage && (
            <div className={`px-5 py-3 border-b flex items-center justify-between gap-3 text-xs sm:text-sm font-bold ${
              feedbackMessage.type === 'error' 
                ? 'bg-rose-950/80 border-rose-800/80 text-rose-200' 
                : 'bg-emerald-950/80 border-emerald-800/80 text-emerald-200'
            }`}>
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{feedbackMessage.text}</span>
              </div>
              {feedbackMessage.type === 'error' && currentDiamonds < 100 && (
                <button
                  onClick={() => setAuthModalOpen(true)}
                  className="px-3 py-1 bg-amber-500 text-slate-950 rounded-lg text-xs font-black shrink-0 hover:bg-amber-400 transition-colors"
                >
                  {isAr ? 'تسجيل الدخول (300 💎)' : 'Sign In for 300 💎'}
                </button>
              )}
            </div>
          )}

          {/* Modal Body */}
          <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
            
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
                      onClick={() => {
                        setSelectedLeagueId(league.id);
                        setFeedbackMessage(null);
                      }}
                      className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-between gap-2 relative overflow-hidden ${
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

            {/* STEP 2: CLUB SELECTION */}
            <div className="space-y-4 pt-3 border-t border-slate-800/80">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 text-xs font-black flex items-center justify-center border border-amber-500/30">
                    2
                  </span>
                  <h3 className="font-heading font-black text-sm sm:text-base text-white">
                    {isAr ? `الخطوة الثانية: أندية ${selectedLeague.name}` : `Step 2: ${selectedLeague.nameEn} Clubs`}
                  </h3>
                </div>

                {/* تنبيه: هذا الدوري لا يزال يعرض القائمة الاحتياطية الجزئية فقط
                    لأن المزامنة الحقيقية (clubs_cache) لم تصل بعد لهذا الدوري */}
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
                      className={`px-3 py-1 rounded-lg transition-all ${
                        filterTier === 'all' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {isAr ? 'الكل' : 'All'}
                    </button>
                    <button
                      onClick={() => setFilterTier('top')}
                      className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1 ${
                        filterTier === 'top' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>👑</span>
                      <span>{isAr ? 'المركز الأول (100 💎)' : 'Top Tier (100 💎)'}</span>
                    </button>
                    <button
                      onClick={() => setFilterTier('free')}
                      className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1 ${
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

              {/* Clubs List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredClubs.length === 0 ? (
                  <div className="col-span-2 p-8 bg-slate-950/60 border border-slate-800 rounded-2xl text-center text-slate-400 text-xs">
                    {isAr ? 'لا توجد أندية تطابق البحث في هذا الدوري.' : 'No clubs match your filter in this league.'}
                  </div>
                ) : (
                  filteredClubs.map((clubConfig) => {
                    const isCurrentClub = isSwitchingMode && club.id === clubConfig.id;
                    const canAffordCoinsSwitch = currentCoins >= SWITCH_FEE_COINS && currentDiamonds >= clubConfig.gemCost;
                    const canAffordDiamondsSwitch = currentDiamonds >= (clubConfig.gemCost + SWITCH_FEE_DIAMONDS);
                    const canAfford = isSwitchingMode
                      ? (isCurrentClub || canAffordCoinsSwitch || canAffordDiamondsSwitch)
                      : (currentDiamonds >= clubConfig.gemCost);

                    return (
                      <div
                        key={clubConfig.id}
                        className={`rounded-3xl border p-4 sm:p-5 flex flex-col justify-between gap-4 transition-all relative overflow-hidden ${
                          isCurrentClub
                            ? 'bg-sky-950/40 border-sky-500/60 shadow-sky-500/10 shadow-xl'
                            : clubConfig.isTopTier
                            ? 'bg-gradient-to-br from-amber-950/30 via-slate-900 to-slate-950 border-amber-500/40 shadow-xl'
                            : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {/* Top Tier Gold Watermark Badge */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-14 h-14 rounded-2xl border p-2 flex items-center justify-center shadow-md shrink-0 relative overflow-hidden"
                              style={{ 
                                backgroundColor: clubConfig.colors?.primary ? `${clubConfig.colors.primary}20` : '#0f172a',
                                borderColor: clubConfig.colors?.primary || '#334155'
                              }}
                            >
                              {clubConfig.badge ? (
                                <img
                                  src={clubConfig.badge}
                                  alt={clubConfig.nameEn}
                                  className="w-full h-full object-contain"
                                  referrerPolicy="no-referrer"
                                  onError={(e) => {
                                    // Hide broken image and reveal styled crest fallback
                                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                                    const fallbackEl = (e.currentTarget as HTMLElement).parentElement?.querySelector('.crest-fallback');
                                    if (fallbackEl) (fallbackEl as HTMLElement).style.display = 'flex';
                                  }}
                                />
                              ) : null}
                              <div 
                                className={`crest-fallback ${clubConfig.badge ? 'hidden' : 'flex'} flex-col items-center justify-center w-full h-full`}
                              >
                                <Shield className="w-7 h-7" style={{ color: clubConfig.colors?.primary || '#38bdf8' }} />
                                <span className="text-[9px] font-black uppercase tracking-tighter" style={{ color: clubConfig.colors?.secondary || '#ffffff' }}>
                                  {clubConfig.nameEn.substring(0, 3)}
                                </span>
                              </div>
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-heading font-black text-base sm:text-lg text-white">
                                  {isAr ? clubConfig.name : clubConfig.nameEn}
                                </h4>
                                {isCurrentClub && (
                                  <span className="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/40 text-[10px] font-black">
                                    {isAr ? 'ناديك الحالي' : 'Current Club'}
                                  </span>
                                )}
                                <div className="flex items-center text-amber-400 text-xs">
                                  {Array.from({ length: Math.floor(clubConfig.starRating) }).map((_, i) => (
                                    <Star key={i} className="w-3 h-3 fill-amber-400" />
                                  ))}
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 text-slate-400 text-xs mt-0.5">
                                <MapPin className="w-3 h-3 text-sky-400" />
                                <span>{clubConfig.stadiumName} • {clubConfig.city}</span>
                              </div>
                            </div>
                          </div>

                          {/* Price Tag Badge */}
                          <div>
                            {isCurrentClub ? (
                              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/40 text-xs font-black">
                                <Check className="w-3.5 h-3.5" />
                                <span>{isAr ? 'فريقك الحالي' : 'Active'}</span>
                              </div>
                            ) : clubConfig.isTopTier ? (
                              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-black shadow-inner">
                                <Gem className="w-3.5 h-3.5 text-amber-400" />
                                <span>{clubConfig.gemCost} 💎</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-black">
                                <Check className="w-3.5 h-3.5" />
                                <span>{isAr ? 'مجاناً 0 💎' : 'Free 0 💎'}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Description & Key Stars */}
                        <div className="space-y-2">
                          <p className="text-xs text-slate-300 leading-relaxed">
                            {isAr ? clubConfig.descriptionAr : clubConfig.descriptionEn}
                          </p>
                          <div className="flex items-center flex-wrap gap-1.5 pt-1">
                            <span className="text-[10px] font-bold text-slate-400">{isAr ? 'أبرز النجوم:' : 'Stars:'}</span>
                            {clubConfig.keyStars.map((star, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 rounded-md bg-slate-900 text-slate-300 border border-slate-800 text-[11px] font-medium"
                              >
                                {star}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Action CTA */}
                        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-3 flex-wrap">
                          <div className="text-[11px] text-slate-400">
                            {isCurrentClub ? (
                              <span className="text-sky-400 font-bold flex items-center gap-1">
                                <Check className="w-3.5 h-3.5" /> {isAr ? 'أنت المدير الفني لهذا الفريق' : 'You are currently managing this team'}
                              </span>
                            ) : isSwitchingMode ? (
                              canAfford ? (
                                <span className="text-emerald-400 font-bold flex items-center gap-1">
                                  <Coins className="w-3.5 h-3.5 text-amber-400" />
                                  <span>{isAr ? `رسوم الانتقال: ${SWITCH_FEE_COINS.toLocaleString()} 🪙 أو ${SWITCH_FEE_DIAMONDS} 💎` : `Transfer fee: ${SWITCH_FEE_COINS.toLocaleString()} 🪙 or ${SWITCH_FEE_DIAMONDS} 💎`}</span>
                                </span>
                              ) : (
                                <span className="text-rose-400 font-bold flex items-center gap-1">
                                  <AlertCircle className="w-3.5 h-3.5" />
                                  <span>{isAr ? `يلزم ${SWITCH_FEE_COINS.toLocaleString()} 🪙 أو ${SWITCH_FEE_DIAMONDS} 💎 لكسر العقد` : `Need ${SWITCH_FEE_COINS.toLocaleString()} 🪙 or ${SWITCH_FEE_DIAMONDS} 💎 release fee`}</span>
                                </span>
                              )
                            ) : clubConfig.isTopTier ? (
                              canAfford ? (
                                <span className="text-emerald-400 font-bold flex items-center gap-1">
                                  <Check className="w-3.5 h-3.5" /> {isAr ? 'يمكنك تولي التدريب فوراً' : 'Available for appointment'}
                                </span>
                              ) : (
                                <span className="text-amber-400 font-bold flex items-center gap-1">
                                  <Gem className="w-3.5 h-3.5" /> {isAr ? 'تحتاج 100 💎 للتعاقد' : 'Requires 100 💎'}
                                </span>
                              )
                            ) : (
                              <span className="text-emerald-400 font-bold flex items-center gap-1">
                                <Sparkles className="w-3.5 h-3.5" /> {isAr ? 'متاح مجاناً لجميع المدربين' : 'Free to manage'}
                              </span>
                            )}
                          </div>

                          <button
                            onClick={() => handleClubSelection(clubConfig)}
                            disabled={joiningClubId === clubConfig.id || isCurrentClub}
                            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 shadow-lg disabled:opacity-60 disabled:cursor-not-allowed ${
                              isCurrentClub
                                ? 'bg-slate-800 text-slate-400 border border-slate-700'
                                : clubConfig.isTopTier
                                ? canAfford
                                  ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 hover:brightness-110'
                                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                : canAfford
                                ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            <span>
                              {joiningClubId === clubConfig.id ? (isAr ? 'جاري تجهيز الفريق...' : 'Preparing club...') : null}
                              {joiningClubId === clubConfig.id ? null : isCurrentClub
                                ? (isAr ? 'فريقك الحالي' : 'Active Club')
                                : isSwitchingMode
                                ? (isAr ? `انتقال رسمي (${SWITCH_FEE_COINS.toLocaleString()} 🪙 / ${SWITCH_FEE_DIAMONDS} 💎)` : `Transfer (${SWITCH_FEE_COINS.toLocaleString()} 🪙 / ${SWITCH_FEE_DIAMONDS} 💎)`)
                                : clubConfig.isTopTier
                                ? canAfford
                                  ? (isAr ? 'تولَّ تدريب النادي (100 💎)' : 'Manage Club (100 💎)')
                                  : (isAr ? 'اختر وتعرّف على المتطلبات' : 'Requires 100 💎')
                                : (isAr ? 'تولَّ تدريب النادي (مجاناً)' : 'Manage Club (Free)')}
                            </span>
                            {!isCurrentClub && <ArrowRight className="w-4 h-4 rtl:rotate-180" />}
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
