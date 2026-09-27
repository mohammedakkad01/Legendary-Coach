/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Custom hook managing Transfer Market state, filters, sorting and actions.
 */

import { useState, useMemo } from 'react';
import { useGameStore } from '../state/useGameStore';
import { Player } from '../types/game';
import { useFirebase } from '../firebase/FirebaseContext';
import { searchRealPlayersApi, convertApiPlayerToGamePlayer, ApiPlayerResult } from '../services/footballApi';

export type PositionCategory = 'all' | 'ATT' | 'MID' | 'DEF' | 'GK';
export type SpecificPosition = 'all' | 'ST' | 'LW' | 'RW' | 'CAM' | 'CM' | 'CDM' | 'CB' | 'LB' | 'RB' | 'GK';
export type SortOption = 'rating_desc' | 'rating_asc' | 'potential_desc' | 'price_asc' | 'price_desc' | 'pace_desc' | 'age_asc';
export type AgeFilterOption = 'all' | 'u21' | '21_25' | '26_29' | '30plus';

export function useTransferMarket() {
  const { club, scoutMarket, buyPlayer, sellPlayer, addPlayerToSquad, refreshScoutMarket, language, activeNegotiations } = useGameStore();
  const { setAuthModalOpen, user } = useFirebase();
  const isAr = language === 'ar';

  const [activeTab, setActiveTab] = useState<'market' | 'world_scout' | 'squad'>('market');

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryPos, setCategoryPos] = useState<PositionCategory>('all');
  const [specificPos, setSpecificPos] = useState<SpecificPosition>('all');
  const [minRating, setMinRating] = useState<number>(0);
  const [minPotential, setMinPotential] = useState<number>(0);
  const [ageGroup, setAgeGroup] = useState<AgeFilterOption>('all');
  const [maxPrice, setMaxPrice] = useState<number>(0);
  const [affordableOnly, setAffordableOnly] = useState<boolean>(false);
  const [sortOption, setSortOption] = useState<SortOption>('rating_desc');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false);

  // Modals & Inspection
  const [inspectingPlayer, setInspectingPlayer] = useState<Player | null>(null);
  const [negotiatingPlayer, setNegotiatingPlayer] = useState<Player | null>(null);

  // World Scout Live Search
  const [worldSearchQuery, setWorldSearchQuery] = useState('');
  const [worldSearching, setWorldSearching] = useState(false);
  const [worldResults, setWorldResults] = useState<ApiPlayerResult[]>([]);
  const [signedWorldNames, setSignedWorldNames] = useState<string[]>([]);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

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

  const filteredAndSortedMarket = useMemo(() => {
    return scoutMarket
      .filter((p) => {
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchName = p.name.toLowerCase().includes(q);
          const matchNameEn = p.nameEn.toLowerCase().includes(q);
          const matchTeam = (p.realTeam || '').toLowerCase().includes(q);
          const matchNat = p.nationality.toLowerCase().includes(q);
          if (!matchName && !matchNameEn && !matchTeam && !matchNat) return false;
        }

        if (categoryPos === 'ATT' && !['ST', 'LW', 'RW', 'CF'].includes(p.position)) return false;
        if (categoryPos === 'MID' && !['CM', 'CAM', 'CDM', 'LM', 'RM'].includes(p.position)) return false;
        if (categoryPos === 'DEF' && !['CB', 'LB', 'RB', 'LWB', 'RWB'].includes(p.position)) return false;
        if (categoryPos === 'GK' && p.position !== 'GK') return false;

        if (specificPos !== 'all' && p.position !== specificPos) return false;
        if (minRating > 0 && p.overall < minRating) return false;
        if (minPotential > 0 && p.potential < minPotential) return false;

        if (ageGroup === 'u21' && p.age >= 21) return false;
        if (ageGroup === '21_25' && (p.age < 21 || p.age > 25)) return false;
        if (ageGroup === '26_29' && (p.age < 26 || p.age > 29)) return false;
        if (ageGroup === '30plus' && p.age < 30) return false;

        if (maxPrice > 0 && p.marketValue > maxPrice) return false;
        if (affordableOnly && p.marketValue > club.finances.coins) return false;

        return true;
      })
      .sort((a, b) => {
        switch (sortOption) {
          case 'rating_desc': return b.overall - a.overall;
          case 'rating_asc': return a.overall - b.overall;
          case 'potential_desc': return b.potential - a.potential;
          case 'price_asc': return a.marketValue - b.marketValue;
          case 'price_desc': return b.marketValue - a.marketValue;
          case 'pace_desc': return (b.attributes.pace || 0) - (a.attributes.pace || 0);
          case 'age_asc': return a.age - b.age;
          default: return b.overall - a.overall;
        }
      });
  }, [scoutMarket, searchQuery, categoryPos, specificPos, minRating, minPotential, ageGroup, maxPrice, affordableOnly, sortOption, club.finances.coins]);

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

  const handleSellSquadPlayer = (playerId: string) => {
    if (club.footballSquad.length <= 11) {
      setFeedbackToast(isAr ? '⚠️ لا يمكن بيع اللاعب! يجب الإبقاء على 11 لاعباً على الأقل في تشكيلة النادي.' : '⚠️ Cannot sell! Must maintain at least 11 players in your squad.');
      return;
    }
    const player = club.footballSquad.find(p => p.id === playerId);
    if (!player) return;
    const sellPrice = Math.round(player.marketValue * 0.9);
    sellPlayer(playerId);
    setFeedbackToast(isAr ? `💰 تم بيع ${player.name} وحصلت على ${sellPrice.toLocaleString()} $ في خزينة النادي!` : `💰 Sold ${player.nameEn} for $${sellPrice.toLocaleString()}!`);
  };

  return {
    club,
    language,
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
    handleBuyPlayer,
    handleWorldScoutSearch,
    handleSignFromWorldScoutCoins,
    handleSignFromWorldScoutDiamonds,
    handleSellSquadPlayer,
    activeNegotiations
  };
}
