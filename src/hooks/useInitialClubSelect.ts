/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Custom hook to manage League & Club Selection, real live rosters hydration, and transfer checks.
 */

import { useState, useEffect } from 'react';
import { useGameStore } from '../state/useGameStore';
import { useFirebase } from '../firebase/FirebaseContext';
import { RealLeague, RealClubConfig, getActiveLeagues } from '../data/realLeaguesData';
import { hydrateLiveLeagues } from '../services/liveLeaguesService';
import { cloneClubToUserSave, fetchClubSquadCache } from '../services/realFootballDataService';
import { convertCachedSquadPlayerToGamePlayer } from '../services/footballApi';

export function useInitialClubSelect() {
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

  const [leagues, setLeagues] = useState<RealLeague[]>(getActiveLeagues());

  useEffect(() => {
    let cancelled = false;
    hydrateLiveLeagues().then((merged) => {
      if (!cancelled) setLeagues(merged);
    });
    return () => { cancelled = true; };
  }, []);

  const selectedLeague: RealLeague = leagues.find(l => l.id === selectedLeagueId) || leagues[0];

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

    if (isSwitchingMode && club.id === clubConfig.id) {
      setFeedbackMessage({
        type: 'error',
        text: isAr ? `أنت تدرب نادي ${club.name} بالفعل!` : `You already manage ${club.nameEn}!`
      });
      return;
    }

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

    await hydrateLiveLeagues();

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
      if (user && user.uid) {
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

  return {
    clubSelectionModalOpen,
    setClubSelectionModalOpen,
    hasSelectedInitialClub,
    club,
    language,
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
    user,
    setAuthModalOpen
  };
}
