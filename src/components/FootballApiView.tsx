/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Real Football API Explorer View
 * Live player and club search powered by TheSportsDB Football API.
 * Allows viewing real statistics, team badges, real photos, and signing players to squad!
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  searchRealPlayersApi, 
  searchRealTeamsApi, 
  convertApiPlayerToGamePlayer, 
  POPULAR_REAL_TEAMS,
  ApiPlayerResult,
  ApiTeamResult
} from '../services/footballApi';
import { useGameStore } from '../state/useGameStore';
import { useFirebase } from '../firebase/FirebaseContext';
import { 
  Search, 
  Sparkles, 
  Shield, 
  UserPlus, 
  Gem, 
  Coins, 
  Check, 
  Trophy, 
  MapPin, 
  Users, 
  ExternalLink,
  Flame,
  Globe,
  Loader2
} from 'lucide-react';
import { REAL_INITIAL_PLAYER_CLUB, REAL_OPPONENT_CLUBS } from '../data/realFootballData';
import { REAL_LEAGUES, RealClubConfig } from '../data/realLeaguesData';

const POPULAR_SEARCH_PLAYERS = [
  'Erling Haaland',
  'Kylian Mbappe',
  'Mohamed Salah',
  'Vinicius Junior',
  'Jude Bellingham',
  'Lamine Yamal',
  'Cristiano Ronaldo',
  'Lionel Messi',
  'Kevin De Bruyne',
  'Bukayo Saka'
];

export const FootballApiView: React.FC = () => {
  const { club, language, addPlayerToSquad, chooseClub, selectLeagueAndClub, setClubSelectionModalOpen } = useGameStore();
  const { setAuthModalOpen, user } = useFirebase();

  const [activeSubTab, setActiveSubTab] = useState<'players' | 'teams'>('players');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [playerResults, setPlayerResults] = useState<ApiPlayerResult[]>([]);
  const [teamResults, setTeamResults] = useState<ApiTeamResult[]>([]);
  const [signedPlayerNames, setSignedPlayerNames] = useState<string[]>([]);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const isAr = language === 'ar';

  // Run initial search on mount to populate view immediately
  useEffect(() => {
    executePlayerSearch('Haaland');
  }, []);

  const executePlayerSearch = async (query: string) => {
    if (!query.trim()) return;
    setIsSearching(true);
    setFeedbackMessage(null);
    try {
      const results = await searchRealPlayersApi(query);
      setPlayerResults(results);
    } catch (err) {
      console.error('Error searching players:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const executeTeamSearch = async (query: string) => {
    if (!query.trim()) return;
    setIsSearching(true);
    setFeedbackMessage(null);
    try {
      const results = await searchRealTeamsApi(query);
      setTeamResults(results);
    } catch (err) {
      console.error('Error searching teams:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeSubTab === 'players') {
      executePlayerSearch(searchQuery);
    } else {
      executeTeamSearch(searchQuery);
    }
  };

  const handleSignPlayerWithDiamonds = (apiP: ApiPlayerResult) => {
    const diamondsCost = 50;
    const currentDiamonds = club.finances.diamonds || 0;

    if (currentDiamonds < diamondsCost) {
      if (!user) {
        setFeedbackMessage(isAr ? 'ليس لديك جواهر كافية! سجل دخولك الآن للحصول على 300 جوهرة 💎 مجاناً!' : 'Not enough diamonds! Sign in now to get 300 free diamonds 💎!');
        setAuthModalOpen(true);
      } else {
        setFeedbackMessage(isAr ? `تحتاج إلى ${diamondsCost} جوهرة للتعاقد الفوري مع هذا اللاعب.` : `You need ${diamondsCost} diamonds for instant signing.`);
      }
      return;
    }

    // Deduct diamonds and add player
    const gamePlayer = convertApiPlayerToGamePlayer(apiP);
    useGameStore.setState((state) => ({
      club: {
        ...state.club,
        finances: {
          ...state.club.finances,
          diamonds: (state.club.finances.diamonds || 0) - diamondsCost,
        },
      },
    }));

    addPlayerToSquad(gamePlayer);
    setSignedPlayerNames((prev) => [...prev, apiP.strPlayer]);
    setFeedbackMessage(isAr ? `🎉 تم التعاقد بنجاح مع ${apiP.strPlayer} وإضافته إلى قائمة ناديك!` : `🎉 Successfully signed ${apiP.strPlayer} to your squad!`);
  };

  const handleSignPlayerWithCoins = (apiP: ApiPlayerResult) => {
    const gamePlayer = convertApiPlayerToGamePlayer(apiP);
    if (club.finances.coins < gamePlayer.marketValue) {
      setFeedbackMessage(isAr ? `أموال النادي لا تكفي! القيمة السوقية: ${gamePlayer.marketValue.toLocaleString()} $` : `Insufficient club funds! Market value: $${gamePlayer.marketValue.toLocaleString()}`);
      return;
    }

    useGameStore.setState((state) => ({
      club: {
        ...state.club,
        finances: {
          ...state.club.finances,
          coins: state.club.finances.coins - gamePlayer.marketValue,
        },
      },
    }));

    addPlayerToSquad(gamePlayer);
    setSignedPlayerNames((prev) => [...prev, apiP.strPlayer]);
    setFeedbackMessage(isAr ? `🎉 تم إتمام صفقة الشراء للاعب ${apiP.strPlayer}!` : `🎉 Completed transfer for ${apiP.strPlayer}!`);
  };

  const handleSelectClubAsManaged = (apiTeam: ApiTeamResult) => {
    // Check if team is in REAL_LEAGUES clubs
    let matchedConfig: RealClubConfig | null = null;
    for (const league of REAL_LEAGUES) {
      const c = league.clubs.find(
        club => club.nameEn.toLowerCase() === apiTeam.strTeam.toLowerCase() ||
                club.name.toLowerCase() === apiTeam.strTeam.toLowerCase()
      );
      if (c) {
        matchedConfig = c;
        break;
      }
    }

    if (matchedConfig) {
      const res = selectLeagueAndClub(matchedConfig);
      setFeedbackMessage(res.message);
      return;
    }

    // Otherwise check opponent clubs or create
    const match = REAL_OPPONENT_CLUBS.find(c => c.nameEn.toLowerCase() === apiTeam.strTeam.toLowerCase());
    if (match) {
      chooseClub(match);
      setFeedbackMessage(isAr ? `تم تعيين نادي "${match.name}" كـ ناديك الأساسي! ستبدأ المسيرة من الصفر.` : `Assigned "${match.nameEn}" as your club! Starting career from zero.`);
    } else {
      chooseClub({
        ...REAL_INITIAL_PLAYER_CLUB,
        name: apiTeam.strTeam,
        nameEn: apiTeam.strTeam,
        logoBadge: '🛡️',
        logoUrl: apiTeam.strBadge,
        stadiumName: apiTeam.strStadium || 'الملعب الرئيسي',
        divisionName: apiTeam.strLeague || 'دوري النخبة',
      });
      setFeedbackMessage(isAr ? `تم اختيار نادي ${apiTeam.strTeam}! بدأت مسيرتك كمدرب من الصفر.` : `Selected ${apiTeam.strTeam}! Your career started from zero.`);
    }
  };

  return (
    <div className="space-y-6" id="football_scout_explorer">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-sky-950 border border-slate-800 p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-sky-400 font-bold text-xs uppercase tracking-wider">
              <Globe className="w-4 h-4" />
              <span>{isAr ? 'كشاف النجوم وقاعدة البيانات العالمية' : 'World Football Database & Scouting Network'}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black font-heading text-white">
              {isAr ? 'سوق النجوم والأندية العالمية' : 'World Stars & Official Clubs'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              {isAr 
                ? 'استعرض نجوم كرة القدم العالميين بصورهم وبطاقاتهم الحقيقية، وتعاقد معهم فوراً لدعم تشكيلتك، أو اختر النادي الذي تريد تدريبه!' 
                : 'Explore world superstars with authentic player cards and genuine photos, sign them to your squad, or appoint yourself as manager of your favorite team!'}
            </p>
          </div>

          {/* Quick Stats / Gem balance */}
          <div className="flex items-center gap-3 bg-slate-950/70 p-3 rounded-xl border border-slate-800 self-start md:self-auto">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-fuchsia-950/50 border border-fuchsia-500/30 text-fuchsia-300 font-bold text-sm">
              <Gem className="w-4 h-4 text-fuchsia-400" />
              <span>{club.finances.diamonds || 0} 💎</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-950/50 border border-amber-500/30 text-amber-300 font-bold text-sm">
              <Coins className="w-4 h-4 text-amber-400" />
              <span>{club.finances.coins.toLocaleString()} $</span>
            </div>
          </div>
        </div>

        {/* Sub-tabs: Players vs Teams */}
        <div className="flex items-center gap-2 mt-6 border-b border-slate-800/80 pb-2">
          <button
            onClick={() => {
              setActiveSubTab('players');
              if (playerResults.length === 0) executePlayerSearch('Haaland');
            }}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
              activeSubTab === 'players'
                ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/25'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>{isAr ? 'البحث عن لاعبين حقيقيين' : 'Search Real Players'}</span>
          </button>
          <button
            onClick={() => {
              setActiveSubTab('teams');
              if (teamResults.length === 0) setTeamResults(POPULAR_REAL_TEAMS.map(t => ({
                idTeam: t.id,
                strTeam: t.nameEn,
                strBadge: t.badge,
                strStadium: t.stadium,
                strCountry: t.country,
                strLeague: t.league
              })));
            }}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
              activeSubTab === 'teams'
                ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/25'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>{isAr ? 'الأندية والفرق العالمية' : 'World Clubs & Crests'}</span>
          </button>
        </div>
      </div>

      {/* Search Input Bar */}
      <form onSubmit={handleSearchSubmit} className="relative">
        <div className="relative flex items-center">
          <Search className="absolute right-4 rtl:right-4 ltr:left-4 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              activeSubTab === 'players'
                ? (isAr ? 'ابحث بالاسم: مثلاً Haaland, Salah, Mbappe, Yamal...' : 'Search by player name: Haaland, Salah, Mbappe...')
                : (isAr ? 'ابحث عن نادٍ: Real Madrid, Barcelona, Man City, Al Hilal...' : 'Search club: Real Madrid, Barcelona, Man City...')
            }
            className="w-full py-3.5 px-12 rounded-xl bg-slate-900 border border-slate-700/80 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-sky-500 shadow-inner"
          />
          <button
            type="submit"
            disabled={isSearching}
            className="absolute left-2.5 rtl:left-2.5 ltr:right-2.5 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-md transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            <span>{isAr ? 'بحث فوري' : 'Search'}</span>
          </button>
        </div>
      </form>

      {/* Popular Chips Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
        <span className="text-slate-400 shrink-0 font-medium">{isAr ? 'أشهر النجوم:' : 'Trending:'}</span>
        {POPULAR_SEARCH_PLAYERS.map((name) => (
          <button
            key={name}
            onClick={() => {
              setSearchQuery(name);
              setActiveSubTab('players');
              executePlayerSearch(name);
            }}
            className="px-3 py-1 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 shrink-0 transition-colors"
          >
            {name}
          </button>
        ))}
      </div>

      {/* Feedback Toast */}
      {feedbackMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-200 text-sm font-semibold flex items-center justify-between"
        >
          <span>{feedbackMessage}</span>
          <button onClick={() => setFeedbackMessage(null)} className="text-emerald-400 hover:text-white text-xs">
            ✕
          </button>
        </motion.div>
      )}

      {/* RESULTS GRID */}
      {isSearching ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-sky-400" />
          <p className="text-sm font-medium">{isAr ? 'جاري البحث في قاعدة بيانات اللاعبين العالمية...' : 'Searching world football database...'}</p>
        </div>
      ) : activeSubTab === 'players' ? (
        <div>
          {playerResults.length === 0 ? (
            <div className="p-12 text-center bg-slate-900/50 border border-slate-800 rounded-2xl">
              <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-300">
                {isAr ? 'لم يتم العثور على لاعبين' : 'No players found'}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {isAr ? 'جرب البحث باسم نجم مثل Salah أو Bellingham أو Mbappe' : 'Try searching for Salah, Bellingham, or Mbappe'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {playerResults.map((p) => {
                const gamePlayer = convertApiPlayerToGamePlayer(p);
                const isSigned = signedPlayerNames.includes(p.strPlayer) || club.footballSquad.some(sp => sp.nameEn.toLowerCase() === p.strPlayer.toLowerCase());

                return (
                  <motion.div
                    key={p.idPlayer || p.strPlayer}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-slate-850 to-slate-900 border border-slate-800 hover:border-slate-700 p-4 shadow-lg flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Player Meta */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          {/* Photo cutout or fallback */}
                          <div className="relative w-16 h-16 rounded-xl bg-slate-800 overflow-hidden border border-slate-700 flex items-center justify-center shrink-0 shadow-md">
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
                              {gamePlayer.position}
                            </span>
                          </div>

                          <div>
                            <div className="flex items-center gap-1.5">
                              <h4 className="font-bold text-base text-white leading-snug">
                                {p.strPlayer}
                              </h4>
                              {gamePlayer.overall >= 88 && (
                                <Flame className="w-4 h-4 text-amber-400 shrink-0" />
                              )}
                            </div>
                            <p className="text-xs text-slate-400">
                              {p.strTeam || 'نادي عالمي'} • {p.strNationality || 'دولي'}
                            </p>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              {isAr ? `العمر: ${gamePlayer.age} سنة` : `Age: ${gamePlayer.age}`}
                            </p>
                          </div>
                        </div>

                        {/* Overall Badge */}
                        <div className="flex flex-col items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-600 text-slate-950 font-black shadow-md shadow-amber-500/20">
                          <span className="text-sm leading-none">{gamePlayer.overall}</span>
                          <span className="text-[9px] uppercase font-bold opacity-80">OVR</span>
                        </div>
                      </div>

                      {/* Attributes Radar Bars */}
                      <div className="grid grid-cols-3 gap-2 mt-4 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs">
                        <div className="text-center">
                          <span className="text-[10px] text-slate-500 block uppercase">PAC</span>
                          <span className="font-bold text-emerald-400">{gamePlayer.attributes.pace}</span>
                        </div>
                        <div className="text-center">
                          <span className="text-[10px] text-slate-500 block uppercase">SHO</span>
                          <span className="font-bold text-amber-400">{gamePlayer.attributes.shooting}</span>
                        </div>
                        <div className="text-center">
                          <span className="text-[10px] text-slate-500 block uppercase">PAS</span>
                          <span className="font-bold text-sky-400">{gamePlayer.attributes.passing}</span>
                        </div>
                        <div className="text-center">
                          <span className="text-[10px] text-slate-500 block uppercase">DRI</span>
                          <span className="font-bold text-indigo-400">{gamePlayer.attributes.dribbling}</span>
                        </div>
                        <div className="text-center">
                          <span className="text-[10px] text-slate-500 block uppercase">DEF</span>
                          <span className="font-bold text-slate-300">{gamePlayer.attributes.defending}</span>
                        </div>
                        <div className="text-center">
                          <span className="text-[10px] text-slate-500 block uppercase">PHY</span>
                          <span className="font-bold text-purple-400">{gamePlayer.attributes.physical}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions: Sign with Coins or Diamonds */}
                    <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center gap-2">
                      {isSigned ? (
                        <div className="w-full py-2 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs font-bold text-center flex items-center justify-center gap-1.5">
                          <Check className="w-4 h-4" />
                          <span>{isAr ? 'في تشكيلة فريقك' : 'In Your Squad'}</span>
                        </div>
                      ) : (
                        <>
                          {/* Sign with Diamonds */}
                          <button
                            onClick={() => handleSignPlayerWithDiamonds(p)}
                            className="flex-1 py-2 px-2.5 rounded-xl bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-500 hover:to-pink-500 text-white font-bold text-xs shadow-md shadow-fuchsia-600/20 flex items-center justify-center gap-1.5 transition-all"
                            title="تعاقد فوري باستخدام الجواهر"
                          >
                            <Gem className="w-3.5 h-3.5 text-fuchsia-200" />
                            <span>50 💎 {isAr ? 'تعاقد' : 'Sign'}</span>
                          </button>

                          {/* Sign with Coins */}
                          <button
                            onClick={() => handleSignPlayerWithCoins(p)}
                            className="flex-1 py-2 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 flex items-center justify-center gap-1.5 transition-colors"
                          >
                            <Coins className="w-3.5 h-3.5 text-amber-400" />
                            <span>{(gamePlayer.marketValue / 1000).toFixed(0)}k $</span>
                          </button>
                        </>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* CLUBS LISTING */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teamResults.map((t) => (
            <motion.div
              key={t.idTeam}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 flex flex-col justify-between shadow-lg"
            >
              <div className="space-y-3">
                <div className="flex items-center gap-3.5">
                  <div className="w-16 h-16 rounded-xl bg-slate-800/80 p-2 border border-slate-700 flex items-center justify-center shrink-0">
                    {t.strBadge ? (
                      <img src={t.strBadge} alt={t.strTeam} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                    ) : (
                      <Shield className="w-8 h-8 text-sky-400" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-lg text-white leading-tight">{t.strTeam}</h4>
                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      <span>{t.strCountry || 'العالم'}</span>
                    </p>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-500/10 text-sky-300 border border-sky-500/20">
                      {t.strLeague || 'الدوري الممتاز'}
                    </span>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400 space-y-1">
                  <p>
                    <strong className="text-slate-300">{isAr ? 'الملعب: ' : 'Stadium: '}</strong>
                    {t.strStadium || 'الملعب الدولي'}
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800">
                <button
                  onClick={() => handleSelectClubAsManaged(t)}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all"
                >
                  <Trophy className="w-4 h-4 text-amber-300" />
                  <span>{isAr ? 'اختر كـ ناديك (ابدأ مسيرتك معه)' : 'Manage this Club (Start Career)'}</span>
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};
