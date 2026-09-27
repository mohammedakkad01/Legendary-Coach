/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Official League & Club Selection Modal
 * Refactored modular view with separated domain hook and presentation components.
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Coins, Gem, Sparkles, X, AlertCircle } from 'lucide-react';
import { useInitialClubSelect } from '../hooks/useInitialClubSelect';
import { LeagueStepSelector } from './initial-club/LeagueStepSelector';
import { ClubSelectionCard } from './initial-club/ClubSelectionCard';

export const InitialClubSelectModal: React.FC = () => {
  const {
    clubSelectionModalOpen,
    setClubSelectionModalOpen,
    hasSelectedInitialClub,
    club,
    isAr,
    currentDiamonds,
    currentCoins,
    isSwitchingMode,
    SWITCH_FEE_DIAMONDS,
    SWITCH_FEE_COINS,
    selectedLeagueId,
    setSelectedLeagueId,
    filterTier,
    setFilterTier,
    searchQuery,
    setSearchQuery,
    feedbackMessage,
    setFeedbackMessage,
    joiningClubId,
    leagues,
    selectedLeague,
    filteredClubs,
    handleClubSelection,
    setAuthModalOpen,
  } = useInitialClubSelect();

  if (!clubSelectionModalOpen) return null;

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
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 text-xs font-black hover:opacity-90 transition-opacity shadow-md cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isAr ? 'احصل على 300 💎 مجاناً' : 'Get 300 💎 Free'}</span>
                </button>
              )}

              {hasSelectedInitialClub && (
                <button
                  onClick={() => setClubSelectionModalOpen(false)}
                  className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {/* Feedback message banner */}
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
                  className="px-3 py-1 bg-amber-500 text-slate-950 rounded-lg text-xs font-black shrink-0 hover:bg-amber-400 transition-colors cursor-pointer"
                >
                  {isAr ? 'تسجيل الدخول (300 💎)' : 'Sign In for 300 💎'}
                </button>
              )}
            </div>
          )}

          {/* Modal Body */}
          <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
            <LeagueStepSelector
              isAr={isAr}
              leagues={leagues}
              selectedLeagueId={selectedLeagueId}
              onSelectLeague={(id) => {
                setSelectedLeagueId(id);
                setFeedbackMessage(null);
              }}
              selectedLeague={selectedLeague}
              filterTier={filterTier}
              setFilterTier={setFilterTier}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
            />

            {/* Clubs Grid */}
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
                    <ClubSelectionCard
                      key={clubConfig.id}
                      clubConfig={clubConfig}
                      isAr={isAr}
                      isCurrentClub={isCurrentClub}
                      isSwitchingMode={isSwitchingMode}
                      canAfford={canAfford}
                      joiningClubId={joiningClubId}
                      switchFeeCoins={SWITCH_FEE_COINS}
                      switchFeeDiamonds={SWITCH_FEE_DIAMONDS}
                      onSelect={handleClubSelection}
                    />
                  );
                })
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
