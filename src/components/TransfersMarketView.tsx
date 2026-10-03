/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Transfer Market & Comprehensive Player Search / Filtering System
 * Advanced filters (Position, Overall, Potential, Age, Budget, Sort),
 * Detailed player inspection modal, squad sales, and live world scouting.
 */

import React from 'react';
import { motion } from 'motion/react';
import { 
  Users, 
  Trophy, 
  ArrowLeftRight, 
  X, 
  CheckCircle2,
  Compass,
  Newspaper,
  Clock
} from 'lucide-react';
import { RichNegotiationModal } from './recruitment/negotiation/RichNegotiationModal';
import { ScoutingHubView } from './recruitment/scouting/ScoutingHubView';
import { RumorsFeedView } from './recruitment/rumors/RumorsFeedView';
import { LoanCenterView } from './recruitment/loans/LoanCenterView';
import { useTransferMarket } from '../hooks/useTransferMarket';
import { TransferMarketHeader } from './transfers/TransferMarketHeader';
import { TransferFilters } from './transfers/TransferFilters';
import { TransferPlayerCard } from './transfers/TransferPlayerCard';
import { TransferPlayerDetailsModal } from './transfers/TransferPlayerDetailsModal';
import { WorldScoutView, SquadSalesView } from './transfers/WorldScoutAndSquadViews';

export const TransfersMarketView: React.FC = () => {
  const {
    club,
    isAr,
    activeTab,
    setActiveTab,
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
    resetAllFilters,
    filteredAndSortedMarket,
    inspectingPlayer,
    setInspectingPlayer,
    negotiatingPlayer,
    setNegotiatingPlayer,
    worldSearchQuery,
    setWorldSearchQuery,
    worldSearching,
    worldResults,
    signedWorldNames,
    feedbackToast,
    setFeedbackToast,
    refreshScoutMarket,
    handleWorldScoutSearch,
    handleSignFromWorldScoutCoins,
    handleSignFromWorldScoutDiamonds,
    handleSellSquadPlayer,
    activeNegotiations
  } = useTransferMarket();

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-6 space-y-6" id="transfer_market_view">
      
      {/* Top Header Card */}
      <TransferMarketHeader
        isAr={isAr}
        coins={club.finances.coins}
        diamonds={club.finances.diamonds || 0}
        onRefreshScouts={() => {
          refreshScoutMarket();
          setFeedbackToast(isAr ? '🔄 تم تحديث تقارير الكشافة وأهداف السوق بنجاح!' : '🔄 Scouting reports and market targets refreshed!');
        }}
      />

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
            <span>{isAr ? 'سوق الانتقالات' : 'Transfer Market'}</span>
            <span className="px-1.5 py-0.5 text-[10px] rounded-md bg-slate-950/60 text-slate-300">
              {filteredAndSortedMarket.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('scouting_hub')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'scouting_hub' 
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>{isAr ? 'مركز الكشافة' : 'Scouting Hub'}</span>
          </button>

          <button
            onClick={() => setActiveTab('rumors')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'rumors' 
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Newspaper className="w-4 h-4" />
            <span>{isAr ? 'الشائعات والأخبار' : 'Rumors Feed'}</span>
          </button>

          <button
            onClick={() => setActiveTab('loans')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'loans' 
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>{isAr ? 'مركز الإعارات' : 'Loan Center'}</span>
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
          <TransferFilters
            isAr={isAr}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            categoryPos={categoryPos}
            setCategoryPos={setCategoryPos}
            specificPos={specificPos}
            setSpecificPos={setSpecificPos}
            minRating={minRating}
            setMinRating={setMinRating}
            minPotential={minPotential}
            setMinPotential={setMinPotential}
            ageGroup={ageGroup}
            setAgeGroup={setAgeGroup}
            maxPrice={maxPrice}
            setMaxPrice={setMaxPrice}
            affordableOnly={affordableOnly}
            setAffordableOnly={setAffordableOnly}
            sortOption={sortOption}
            setSortOption={setSortOption}
            showAdvancedFilters={showAdvancedFilters}
            setShowAdvancedFilters={setShowAdvancedFilters}
            hasActiveFilters={hasActiveFilters}
            totalFiltered={filteredAndSortedMarket.length}
          />

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
              {filteredAndSortedMarket.map((player) => (
                <TransferPlayerCard
                  key={player.id}
                  player={player}
                  isAr={isAr}
                  canAfford={club.finances.coins >= player.marketValue}
                  isNegotiating={activeNegotiations.some(n => n.playerId === player.id)}
                  onInspect={(p) => setInspectingPlayer(p)}
                  onNegotiate={(p) => setNegotiatingPlayer(p)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SCOUTING HUB (Phase D) */}
      {activeTab === 'scouting_hub' && (
        <ScoutingHubView
          onStartNegotiation={(player) => setNegotiatingPlayer(player)}
        />
      )}

      {/* TAB 3: RUMORS & MEDIA FEED (Phase D) */}
      {activeTab === 'rumors' && (
        <RumorsFeedView
          onInspectPlayer={(player) => setInspectingPlayer(player)}
          onNegotiatePlayer={(player) => setNegotiatingPlayer(player)}
        />
      )}

      {/* TAB 4: LOAN CENTER (Phase D) */}
      {activeTab === 'loans' && (
        <LoanCenterView
          onStartNegotiation={(player) => setNegotiatingPlayer(player)}
        />
      )}

      {/* TAB 5: LIVE WORLD STAR SCOUT SEARCH */}
      {activeTab === 'world_scout' && (
        <WorldScoutView
          isAr={isAr}
          diamonds={club.finances.diamonds || 0}
          coins={club.finances.coins}
          worldSearchQuery={worldSearchQuery}
          setWorldSearchQuery={setWorldSearchQuery}
          worldSearching={worldSearching}
          worldResults={worldResults}
          signedWorldNames={signedWorldNames}
          squad={club.footballSquad}
          onSearch={handleWorldScoutSearch}
          onSignDiamonds={handleSignFromWorldScoutDiamonds}
          onSignCoins={handleSignFromWorldScoutCoins}
        />
      )}

      {/* TAB 6: SQUAD SALES */}
      {activeTab === 'squad' && (
        <SquadSalesView
          isAr={isAr}
          squad={club.footballSquad}
          onSellPlayer={handleSellSquadPlayer}
        />
      )}

      {/* DETAILED PLAYER INSPECTION MODAL */}
      <TransferPlayerDetailsModal
        player={inspectingPlayer}
        isAr={isAr}
        onClose={() => setInspectingPlayer(null)}
        onStartNegotiation={(player) => {
          setNegotiatingPlayer(player);
          setInspectingPlayer(null);
        }}
      />

      {/* RICH NEGOTIATION MODAL (Phase D) */}
      <RichNegotiationModal
        player={negotiatingPlayer}
        onClose={() => setNegotiatingPlayer(null)}
        isAr={isAr}
      />

    </div>
  );
};
