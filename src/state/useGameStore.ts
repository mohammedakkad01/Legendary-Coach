/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Central Game State Store (Zustand + LocalPersistence)
 * Offline-first, multi-sport, deterministic simulation links, and VIP state.
 */

import { create } from 'zustand';
import { 
  Club, 
  Player, 
  FootballTactics, 
  BasketballTactics, 
  StoryMission, 
  LeagueStanding, 
  MatchRecord, 
  MatchEvent, 
  SportType,
  ClubFacilities,
  DailyMission,
  MatchResultsCharacter,
  TacticalDuelState,
  TacticalStance,
  DuelPiece,
  TacticalDuelOrder,
  Fixture,
  PreMatchData,
  DuelRoom,
  PlayerStats,
  RoundSummary,
  RoundMatchResult,
  RoundPerformer
} from '../types/game';
import { 
  REAL_INITIAL_PLAYER_CLUB, 
  REAL_OPPONENT_CLUBS, 
  REAL_INITIAL_STANDINGS, 
  REAL_INITIAL_SCOUT_MARKET 
} from '../data/realFootballData';
import {
  RealClubConfig,
  generateStandingsForLeague,
  generateFixturesForLeague,
  generateSyntheticOpponentSquad,
  findClubConfig,
  buildFallbackClubConfig,
  getLeagueById,
  ensureFixtureDates,
} from '../data/realLeaguesData';
import { hydrateLiveLeagues } from '../services/liveLeaguesService';
import { predictMatch, calcAttackPower, calcDefensePower } from '../engine/matchPrediction';
import { fetchClubSquadCache } from '../services/realFootballDataService';
import { convertCachedSquadPlayerToGamePlayer } from '../services/footballApi';
import { STORY_CHAPTER_1_MISSIONS } from '../data/storyChapter1';
import { VIP_LEVELS } from '../data/vipData';
import { INITIAL_DAILY_MISSIONS } from '../data/dailyMissionsData';
import { generatePostMatchCharacter } from '../data/matchAnalystData';
import { 
  getRandomDuelDraft, 
  getBotDuelOrder, 
  resolveSimultaneousDuelRound,
  DUEL_PIECES_CATALOG 
} from '../data/tacticalDuelData';
import { FootballMatchEngine } from '../engine/footballEngine';
import { SeededRandom } from '../engine/prng';
import {
  SimTeam,
  PlayerMatchDelta,
  registerClubSquad,
  getCachedClubSquad,
  hasClubSquad,
  withStableIds,
  pickStartingXI,
  simulateAiMatch,
  deltasFromUserMatch,
  applyDeltasToStats,
  applyResultToStandings,
  getOtherPairings,
} from '../engine/matchdaySimulator';
import { BasketballMatchEngine } from '../engine/basketballEngine';
import { soundEffects } from '../audio/soundFX';
import confetti from 'canvas-confetti';

const STORAGE_KEY = 'MODAREB_LEGEND_REAL_V2';

export type GameTab = 
  | 'dashboard' 
  | 'tactics' 
  | 'match' 
  | 'story' 
  | 'squad'
  | 'training' 
  | 'transfers' 
  | 'club' 
  | 'league' 
  | 'calendar'
  | 'vip' 
  | 'editor'
  | 'scout'
  | 'football_api'
  | 'tactical_duel'
  | 'round_summary';

interface GameState {
  currentSport: SportType;
  language: 'ar' | 'en';
  activeTab: GameTab;
  soundEnabled: boolean;
  
  // Auth & Guest state
  isGuest: boolean;
  hasClaimedLoginBonus: boolean;
  hasSelectedInitialClub: boolean;
  clubSelectionModalOpen: boolean;

  // Club & Career
  club: Club;
  energy: number; // 0-100
  lastEnergyUpdate: number;
  vipPoints: number;
  vipClaimedToday: boolean;
  lastVipClaimDate: string | null;
  checkInStreak: number;
  checkInClaimedToday: boolean;
  lastCheckInDate: string | null;

  // Daily Missions System
  dailyMissions: DailyMission[];
  isDailyMissionsModalOpen: boolean;

  // Match Results Character & Tactical Analyst
  postMatchAnalyst: MatchResultsCharacter | null;

  // Simultaneous Reveal Tactical Duel (صانع المعارك)
  tacticalDuel: TacticalDuelState;
  isTacticalDuelModalOpen: boolean;

  // Story & Campaign
  storyMissions: StoryMission[];
  selectedMissionId: number | null;

  // League & Competitions
  leagueStandings: LeagueStanding[];
  leagueFixtures: Fixture[]; // full season calendar for the player's league — consumed in order by startNewMatch()
  matchHistory: MatchRecord[];

  // Matchday simulation & league-wide player statistics
  tournamentStats: PlayerStats[];      // season totals for EVERY player in the league
  simulatedMatchdays: number[];        // matchdays whose non-user games were already played
  lastRoundSummary: RoundSummary | null; // shown by RoundSummaryView

  // Live Match Simulation
  activeEngine: FootballMatchEngine | null;
  activeMatchRecord: MatchRecord | null;
  isMatchLive: boolean;
  isMatchPaused: boolean;
  isLoadingMatch: boolean;
  preMatchPreview: PreMatchData | null;
  nextMatchInsight: PreMatchData | null; // live preview of the next fixture, shown on the idle match screen
  preMatchModalOpen: boolean;
  matchSpeed: number; // 1, 2, 4
  unlockedSpeed2x: boolean; // Purchased via Coins or Diamonds
  currentMatchMinute: number;
  pendingInteractiveEvent: MatchEvent | null;

  // Market & Scouts
  scoutMarket: Player[];

  // Actions
  setSport: (sport: SportType) => void;
  setLanguage: (lang: 'ar' | 'en') => void;
  setActiveTab: (tab: GameTab) => void;
  toggleSound: () => void;
  setIsGuest: (val: boolean) => void;
  claimLoginBonus: () => { success: boolean; message: string };
  chooseClub: (club: Club) => void;
  setClubSelectionModalOpen: (open: boolean) => void;
  selectLeagueAndClub: (clubConfig: RealClubConfig, realSquad?: Player[]) => { success: boolean; message: string };
  
  // Daily Missions & Squad Fatigue Actions
  claimDailyMission: (missionId: string) => { success: boolean; message: string };
  runSquadRecoverySession: () => { success: boolean; message: string };
  setDailyMissionsModalOpen: (open: boolean) => void;
  setPostMatchAnalyst: (analyst: MatchResultsCharacter | null) => void;

  // Tactical Duel Actions
  startTacticalDuel: (difficulty?: 'novice' | 'tactical') => void;
  selectDuelPieceAndStance: (pieceId: string, stance: TacticalStance) => void;
  submitDuelRoundOrder: () => void;
  syncPvPRoomToDuelState: (room: DuelRoom, currentUid: string) => void;
  closeTacticalDuel: () => void;
  setTacticalDuelModalOpen: (open: boolean) => void;
  
  // Tactics & Lineup
  updateFootballTactics: (newTactics: Partial<FootballTactics>) => void;
  updateBasketballTactics: (newTactics: Partial<BasketballTactics>) => void;
  swapFootballLineup: (lineupIndex: number, benchPlayerId: string) => void;
  setFootballRoles: (roles: { captainId?: string; penaltyTakerId?: string; freeKickTakerId?: string; cornerTakerId?: string }) => void;

  // Training & Facilities
  runTrainingDrill: (drillType: 'stamina' | 'technical' | 'finishing') => boolean;
  upgradeFacility: (facility: keyof ClubFacilities) => boolean;

  // Transfers & Academy
  buyPlayer: (player: Player) => boolean;
  addPlayerToSquad: (player: Player) => boolean;
  sellPlayer: (playerId: string) => void;
  promoteAcademyTalent: () => void;
  refreshScoutMarket: () => void;

  // Narrative
  chooseMissionOption: (missionId: number, choiceId: string) => void;
  selectMission: (id: number | null) => void;

  // Match Operations
  openPreMatchPreview: () => Promise<void>;
  loadNextMatchInsight: () => Promise<void>;
  closePreMatchPreview: () => void;
  startNewMatch: () => Promise<void>;
  confirmStartMatch: () => void;
  stepMatchMinute: () => void;
  toggleMatchPause: () => void;
  setMatchSpeed: (speed: number) => void;
  unlockMatchSpeed2x: (currency: 'coins' | 'diamonds') => { success: boolean; message: string };
  submitInteractiveDecision: (optionId: string) => void;
  instantSimulateMatch: () => void;
  simulateMatchday: (matchday: number) => RoundSummary | null;

  // Daily & VIP
  claimedVipUpgradeChests: number[]; // VIP levels where the one-time upgrade chest was opened
  upgradeVipWithDiamonds: () => { success: boolean; message: string };
  claimVipUpgradeChest: (level: number) => { success: boolean; message: string };
  claimDailyVIPReward: () => { success: boolean; message: string };
  claimDailyCheckIn: () => void;

  // Custom Data Pack Editor
  exportGameData: () => string;
  importCustomDataPack: (jsonText: string) => { success: boolean; message: string };
  resetCareer: () => void;
}

export const useGameStore = create<GameState>((set, get) => {
  // Calendar-day string (YYYY-MM-DD) used to gate "once per day" claims
  // (VIP daily chest, coach daily check-in) against real day changes
  // instead of an in-memory flag that resets on every page refresh.
  const getTodayStr = () => new Date().toISOString().split('T')[0];

  // Load saved state if present
  const loadSavedState = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // ignore
    }
    return null;
  };

  const saveToStorage = (state: Partial<GameState>) => {
    try {
      const current = get();
      const payload = {
        currentSport: state.currentSport || current.currentSport,
        language: state.language || current.language,
        club: state.club || current.club,
        energy: state.energy !== undefined ? state.energy : current.energy,
        vipPoints: state.vipPoints !== undefined ? state.vipPoints : current.vipPoints,
        lastVipClaimDate: state.lastVipClaimDate !== undefined ? state.lastVipClaimDate : current.lastVipClaimDate,
        checkInStreak: state.checkInStreak !== undefined ? state.checkInStreak : current.checkInStreak,
        lastCheckInDate: state.lastCheckInDate !== undefined ? state.lastCheckInDate : current.lastCheckInDate,
        dailyMissions: state.dailyMissions || current.dailyMissions,
        hasClaimedLoginBonus: state.hasClaimedLoginBonus !== undefined ? state.hasClaimedLoginBonus : current.hasClaimedLoginBonus,
        isGuest: state.isGuest !== undefined ? state.isGuest : current.isGuest,
        hasSelectedInitialClub: state.hasSelectedInitialClub !== undefined ? state.hasSelectedInitialClub : current.hasSelectedInitialClub,
        leagueStandings: state.leagueStandings || current.leagueStandings,
        leagueFixtures: state.leagueFixtures || current.leagueFixtures,
        matchHistory: state.matchHistory || current.matchHistory,
        tournamentStats: state.tournamentStats || current.tournamentStats,
        simulatedMatchdays: state.simulatedMatchdays || current.simulatedMatchdays,
        storyMissions: state.storyMissions || current.storyMissions,
        scoutMarket: state.scoutMarket || current.scoutMarket,
        claimedVipUpgradeChests: state.claimedVipUpgradeChests || current.claimedVipUpgradeChests,
        unlockedSpeed2x: state.unlockedSpeed2x !== undefined ? state.unlockedSpeed2x : current.unlockedSpeed2x,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // ignore
    }
  };

  // ---------------------------------------------------------------------
  // Matchday simulation helpers (see src/engine/matchdaySimulator.ts)
  // ---------------------------------------------------------------------
  const stripYouSuffix = (name: string) => name.replace(' (فريقك)', '');
  const clubNameOf = (clubId: string): string => {
    const st = get();
    if (clubId === st.club.id) return st.club.name;
    return stripYouSuffix(st.leagueStandings.find(x => x.clubId === clubId)?.clubName || clubId);
  };

  // Squad for any non-user club: cached real squad, else a deterministic synthetic one.
  const resolveAiTeam = (clubId: string): SimTeam => {
    let squad = getCachedClubSquad(clubId);
    if (!squad) {
      // Look the club up in the ACTIVE (live-merged) league list; if it's still unknown
      // (older save), build a config from its standings name so it gets its OWN squad.
      const st = get();
      const cfg = findClubConfig(clubId) || buildFallbackClubConfig(clubId, clubNameOf(clubId), '', st.club.divisionId);
      squad = withStableIds(clubId, generateSyntheticOpponentSquad(cfg));
      registerClubSquad(clubId, squad);
    }
    return { clubId, clubName: clubNameOf(clubId), xi: pickStartingXI(squad || []) };
  };

  const resolveUserTeam = (): SimTeam => {
    const st = get();
    const byId = new Map(st.club.footballSquad.map(p => [p.id, p]));
    const lineup = st.club.footballLineup.map(id => byId.get(id)).filter((p): p is Player => !!p);
    return {
      clubId: st.club.id,
      clubName: st.club.name,
      xi: lineup.length >= 11 ? lineup : pickStartingXI(st.club.footballSquad),
    };
  };

  // The live engine fields the opponent as: first GK + first 10 outfielders.
  const resolveOpponentTeam = (clubId: string, clubName: string): SimTeam => {
    const squad = getCachedClubSquad(clubId);
    if (!squad) return resolveAiTeam(clubId);
    const gk = squad.find(p => p.position === 'GK');
    const outfield = squad.filter(p => p.position !== 'GK').slice(0, 10);
    return { clubId, clubName, xi: [gk, ...outfield].filter((p): p is Player => !!p) };
  };

  // Background-load real squads for the rest of the league (once per session)
  // so AI clubs keep real names/ids from round to round.
  const checkedSquadIds = new Set<string>();
  let squadPrefetchPromise: Promise<void> = Promise.resolve();
  const prefetchLeagueSquads = () => {
    const st = get();
    const queue = st.leagueStandings
      .map(x => x.clubId)
      .filter(id => id !== st.club.id && !hasClubSquad(id) && !checkedSquadIds.has(id));
    if (queue.length === 0) return;
    queue.forEach(id => checkedSquadIds.add(id));
    const worker = async () => {
      while (queue.length > 0) {
        const id = queue.shift() as string;
        try {
          const cached = await fetchClubSquadCache(id);
          if (cached && cached.players.length > 0) {
            const name = clubNameOf(id);
            registerClubSquad(id, withStableIds(id, cached.players.map(p => convertCachedSquadPlayerToGamePlayer(p, name))));
          }
        } catch {
          // fall back to synthetic squad
        }
      }
    };
    squadPrefetchPromise = Promise.all([worker(), worker(), worker()]).then(() => undefined);
  };

  // -----------------------------------------------------------------------
  // Pre-match data: opponent from the REAL calendar, squads from both clubs,
  // powers from the starting XIs (+ VIP), odds from a Poisson model.
  // -----------------------------------------------------------------------
  const buildPreMatchData = async (allowSeasonRollover: boolean): Promise<PreMatchData | null> => {
    // Full live club lists first (a saved game reloads without going through the club picker).
    await hydrateLiveLeagues();

    let state = get();
    if (!state.hasSelectedInitialClub) return null;

    // Old careers that started from the small fallback list and haven't played anything yet
    // are rebuilt on the complete league (nothing to lose: no matches, no stats).
    const liveLeague = getLeagueById(state.club.divisionId);
    const wantedTeams = liveLeague.clubs.filter(c => c.id !== state.club.id).length + 1;
    const noProgress = !state.leagueFixtures.some(f => f.played) && state.simulatedMatchdays.length === 0;
    if (noProgress && liveLeague.id === state.club.divisionId && wantedTeams > state.leagueStandings.length) {
      const rebuiltStandings = generateStandingsForLeague(state.club.divisionId, state.club.id, state.club.name);
      const rebuiltFixtures = generateFixturesForLeague(state.club.divisionId, state.club.id);
      set({ leagueStandings: rebuiltStandings, leagueFixtures: rebuiltFixtures });
      saveToStorage({ leagueStandings: rebuiltStandings, leagueFixtures: rebuiltFixtures });
      state = get();
    }

    let fixtures = state.leagueFixtures;
    if (!fixtures || fixtures.length === 0 || fixtures.every(f => f.played)) {
      if (!allowSeasonRollover && fixtures && fixtures.length > 0) return null; // season finished
      const isSeasonRollover = !!fixtures && fixtures.length > 0;
      fixtures = generateFixturesForLeague(state.club.divisionId, state.club.id);
      set({ leagueFixtures: fixtures });
      if (isSeasonRollover) {
        // New season: matchdays restart at 1, so table, stats and the
        // "already simulated" list must restart with them.
        const freshStandings = generateStandingsForLeague(state.club.divisionId, state.club.id, state.club.name);
        set({ leagueStandings: freshStandings, tournamentStats: [], simulatedMatchdays: [], lastRoundSummary: null });
        saveToStorage({ leagueFixtures: fixtures, leagueStandings: freshStandings, tournamentStats: [], simulatedMatchdays: [] });
      } else {
        saveToStorage({ leagueFixtures: fixtures });
      }
    }
    const nextFixture = fixtures.find(f => !f.played);
    if (!nextFixture) return null;

    // Opponent config: live-merged list first; unknown clubs get a per-club fallback config
    // (NEVER a shared squad — that was why every team had the same 11 + 4 players).
    const opponentConfig: RealClubConfig =
      findClubConfig(nextFixture.opponentClubId) ||
      buildFallbackClubConfig(nextFixture.opponentClubId, nextFixture.opponentClubName, nextFixture.opponentBadge, state.club.divisionId);

    let opponentSquad: Player[] | null = null;
    try {
      const cached = await fetchClubSquadCache(nextFixture.opponentClubId);
      if (cached && cached.players.length > 0) {
        opponentSquad = cached.players.map(p => convertCachedSquadPlayerToGamePlayer(p, nextFixture.opponentClubName));
      }
    } catch (e) {
      console.warn('Could not fetch opponent squad cache, using generated squad:', e);
    }
    if (!opponentSquad) {
      opponentSquad = generateSyntheticOpponentSquad(opponentConfig);
    }
    // Stable ids so this opponent's stats stay attached to the same players across rounds/sessions.
    const finalSquad = withStableIds(nextFixture.opponentClubId, opponentSquad);
    registerClubSquad(nextFixture.opponentClubId, finalSquad);
    prefetchLeagueSquads(); // load the rest of the league's squads in the background
    const oGk = finalSquad.find(p => p.position === 'GK');
    const oOutfield = finalSquad.filter(p => p.position !== 'GK').slice(0, 10);
    const opponentLineup = [oGk, ...oOutfield].filter((p): p is Player => !!p).map(p => p.id);

    const opponent: Club = {
      ...REAL_INITIAL_PLAYER_CLUB,
      id: nextFixture.opponentClubId,
      name: nextFixture.opponentClubName,
      nameEn: opponentConfig.nameEn || nextFixture.opponentClubName,
      city: opponentConfig.city ? `${opponentConfig.city}، ${opponentConfig.country}` : '',
      colors: opponentConfig.colors,
      logoUrl: nextFixture.opponentBadge,
      footballSquad: finalSquad,
      footballLineup: opponentLineup,
    };

    // Team power from the starting XIs
    const userLineupPlayers = state.club.footballSquad.filter(p => state.club.footballLineup.includes(p.id));
    const userEffectiveSquad = userLineupPlayers.length > 0 ? userLineupPlayers : state.club.footballSquad.slice(0, 11);
    const oppLineupPlayers = opponent.footballSquad.filter(p => opponent.footballLineup.includes(p.id));
    const oppEffectiveSquad = oppLineupPlayers.length > 0 ? oppLineupPlayers : opponent.footballSquad.slice(0, 11);

    let activeVipTier = VIP_LEVELS[0];
    for (const tier of VIP_LEVELS) {
      if (state.vipPoints >= tier.pointsRequired) activeVipTier = tier;
    }
    const vipAttackBoost = activeVipTier.attackBoostPercent || 0;
    const vipDefenseBoost = activeVipTier.defenseBoostPercent || 0;

    const userAtk = Math.round(calcAttackPower(userEffectiveSquad) * (1 + vipAttackBoost / 100));
    const userDef = Math.round(calcDefensePower(userEffectiveSquad) * (1 + vipDefenseBoost / 100));
    const oppAtk = calcAttackPower(oppEffectiveSquad);
    const oppDef = calcDefensePower(oppEffectiveSquad);

    const odds = predictMatch(userAtk, userDef, oppAtk, oppDef, nextFixture.isHome);
    const userOverall = Math.round((userAtk + userDef) / 2);
    const opponentOverall = Math.round((oppAtk + oppDef) / 2);

    return {
      fixture: nextFixture,
      competition: state.club.divisionName || getLeagueById(state.club.divisionId).name || 'الدوري',
      opponentClub: opponent,
      userAttackPower: userAtk,
      userDefensePower: userDef,
      userVipAttackBoost: vipAttackBoost,
      userVipDefenseBoost: vipDefenseBoost,
      opponentAttackPower: oppAtk,
      opponentDefensePower: oppDef,
      winProbability: odds.win,
      drawProbability: odds.draw,
      lossProbability: odds.loss,
      userOverall,
      opponentOverall,
      technicalGap: userOverall - opponentOverall,
      expectedUserGoals: odds.expectedUserGoals,
      expectedOpponentGoals: odds.expectedOpponentGoals,
      mostLikelyScore: odds.mostLikelyScore,
      opponentStarters: oppEffectiveSquad.length,
    };
  };

  const runSimulateMatchday = (matchday: number): RoundSummary | null => {
    const state = get();
    const done = new Set(state.simulatedMatchdays);
    if (done.has(matchday)) {
      return state.lastRoundSummary?.matchday === matchday ? state.lastRoundSummary : null;
    }

    const clubIds = state.leagueStandings.map(x => x.clubId);
    const fixtures = state.leagueFixtures;
    let standings = state.leagueStandings;
    let stats = state.tournamentStats;

    // Older saves: user matchdays played before this feature never had the rest
    // of their round played. Catch those up first (standings/stats only).
    const catchUp = fixtures
      .filter(f => f.played && f.matchday < matchday && !done.has(f.matchday))
      .map(f => f.matchday)
      .sort((a, b) => a - b);

    let summary: RoundSummary | null = null;

    for (const m of [...catchUp, matchday]) {
      const isCurrent = m === matchday;
      const rng = new SeededRandom((Date.now() ^ Math.imul(m + 1, 2654435761)) >>> 0);
      const results: RoundMatchResult[] = [];
      const roundDeltas: PlayerMatchDelta[] = [];

      // The user's own game (standings were already updated when it finished).
      if (isCurrent) {
        const fx = fixtures.find(f => f.matchday === m);
        const rec = state.activeMatchRecord;
        const hasRecord = !!rec && rec.isFinished && rec.matchDay === m;
        if (hasRecord && rec) {
          const deltas = deltasFromUserMatch(rec, resolveUserTeam(), resolveOpponentTeam(rec.awayClubId, rec.awayClubName), rng);
          stats = applyDeltasToStats(stats, deltas);
          roundDeltas.push(...deltas);
        }
        const oppId = hasRecord && rec ? rec.awayClubId : fx?.opponentClubId;
        const userScore = hasRecord && rec ? rec.homeScore : fx?.homeScore;
        const oppScore = hasRecord && rec ? rec.awayScore : fx?.awayScore;
        if (oppId && userScore !== undefined && oppScore !== undefined) {
          const userHome = fx ? fx.isHome : true;
          results.push({
            homeClubId: userHome ? state.club.id : oppId,
            homeClubName: userHome ? state.club.name : clubNameOf(oppId),
            awayClubId: userHome ? oppId : state.club.id,
            awayClubName: userHome ? clubNameOf(oppId) : state.club.name,
            homeScore: userHome ? userScore : oppScore,
            awayScore: userHome ? oppScore : userScore,
            isUserMatch: true,
          });
        }
      }

      // Every other match of the round.
      for (const [homeId, awayId] of getOtherPairings(clubIds, state.club.id, fixtures, m)) {
        const out = simulateAiMatch(resolveAiTeam(homeId), resolveAiTeam(awayId), rng);
        standings = applyResultToStandings(standings, homeId, awayId, out.homeScore, out.awayScore);
        stats = applyDeltasToStats(stats, out.deltas);
        roundDeltas.push(...out.deltas);
        results.push({
          homeClubId: homeId,
          homeClubName: clubNameOf(homeId),
          awayClubId: awayId,
          awayClubName: clubNameOf(awayId),
          homeScore: out.homeScore,
          awayScore: out.awayScore,
          isUserMatch: false,
        });
      }

      done.add(m);

      if (isCurrent) {
        const topPerformers: RoundPerformer[] = [...roundDeltas]
          .sort((a, b) => b.rating - a.rating || (b.goals + b.assists) - (a.goals + a.assists))
          .slice(0, 5)
          .map(d => ({
            playerId: d.playerId,
            name: d.name,
            clubId: d.clubId,
            clubName: clubNameOf(d.clubId),
            position: d.position,
            rating: d.rating,
            goals: d.goals,
            assists: d.assists,
            yellowCards: d.yellowCards,
            redCards: d.redCards,
          }));
        summary = { matchday: m, results, topPerformers };
      }
    }

    const simulatedMatchdays = [...done].sort((a, b) => a - b);
    set({ leagueStandings: standings, tournamentStats: stats, simulatedMatchdays, lastRoundSummary: summary });
    saveToStorage({ leagueStandings: standings, tournamentStats: stats, simulatedMatchdays });
    return summary;
  };

  // Called when the user's match ends: play the rest of the round, then show the summary.
  const finishRound = async (matchday: number) => {
    try {
      await Promise.race([squadPrefetchPromise, new Promise<void>(resolve => setTimeout(resolve, 2500))]);
      get().simulateMatchday(matchday);
    } catch (err) {
      console.error('Matchday simulation failed:', err);
    }
    if (get().lastRoundSummary?.matchday === matchday) {
      set({ activeTab: 'round_summary' });
    }
  };

  const initialSave = loadSavedState();
  const initialClubSelected = initialSave?.hasSelectedInitialClub ?? false;

  return {
    currentSport: initialSave?.currentSport || 'football',
    language: initialSave?.language || 'ar',
    activeTab: 'dashboard',
    soundEnabled: initialSave?.soundEnabled ?? true,

    // Auth & Guest
    isGuest: initialSave?.isGuest ?? true,
    hasClaimedLoginBonus: initialSave?.hasClaimedLoginBonus ?? false,
    hasSelectedInitialClub: initialClubSelected,
    clubSelectionModalOpen: !initialClubSelected,
    
    // Club & Career Starts from ZERO
    club: initialSave?.club || REAL_INITIAL_PLAYER_CLUB,
    energy: initialSave?.energy || 100,
    lastEnergyUpdate: Date.now(),
    vipPoints: initialSave?.vipPoints || 0, // Starts from ZERO!
    lastVipClaimDate: initialSave?.lastVipClaimDate || null,
    vipClaimedToday: !!initialSave?.lastVipClaimDate && initialSave.lastVipClaimDate === getTodayStr(),
    claimedVipUpgradeChests: initialSave?.claimedVipUpgradeChests || [1], // Level 1 is claimed initially or claimable
    checkInStreak: initialSave?.checkInStreak || 0, // Starts from ZERO!
    lastCheckInDate: initialSave?.lastCheckInDate || null,
    checkInClaimedToday: !!initialSave?.lastCheckInDate && initialSave.lastCheckInDate === getTodayStr(),

    dailyMissions: initialSave?.dailyMissions || INITIAL_DAILY_MISSIONS,
    isDailyMissionsModalOpen: false,

    postMatchAnalyst: null,

    tacticalDuel: {
      isActive: false,
      matchId: '',
      opponentName: 'القائد ألكسندر',
      opponentAvatar: '🛡️',
      opponentIsBot: true,
      round: 1,
      maxRounds: 4,
      playerHp: 100,
      opponentHp: 100,
      draftedPieces: DUEL_PIECES_CATALOG.slice(0, 3),
      selectedPieceId: DUEL_PIECES_CATALOG[0].id,
      selectedStance: 'attack',
      isOrderSubmitted: false,
      isRevealing: false,
      history: [],
      winner: null,
    },
    isTacticalDuelModalOpen: false,

    storyMissions: initialSave?.storyMissions || STORY_CHAPTER_1_MISSIONS,
    selectedMissionId: null,

    leagueStandings: initialSave?.leagueStandings || REAL_INITIAL_STANDINGS,
    leagueFixtures: ensureFixtureDates(initialSave?.leagueFixtures || []),
    matchHistory: initialSave?.matchHistory || [],
    tournamentStats: initialSave?.tournamentStats || [],
    simulatedMatchdays: initialSave?.simulatedMatchdays || [],
    lastRoundSummary: null,

    activeEngine: null,
    activeMatchRecord: null,
    isMatchLive: false,
    isMatchPaused: false,
    isLoadingMatch: false,
    preMatchPreview: null,
    nextMatchInsight: null,
    preMatchModalOpen: false,
    matchSpeed: 1,
    unlockedSpeed2x: initialSave?.unlockedSpeed2x ?? false,
    currentMatchMinute: 0,
    pendingInteractiveEvent: null,

    scoutMarket: initialSave?.scoutMarket || REAL_INITIAL_SCOUT_MARKET,

    setIsGuest: (val: boolean) => {
      set({ isGuest: val });
      saveToStorage({ isGuest: val });
    },

    claimLoginBonus: () => {
      const state = get();
      if (state.hasClaimedLoginBonus) {
        return { success: false, message: 'تم استلام مكافأة تسجيل الدخول (300 جوهرة 💎) مسبقاً.' };
      }
      soundEffects.playLevelUp();
      confetti({ particleCount: 120, spread: 90, origin: { y: 0.6 } });
      const updatedClub = {
        ...state.club,
        finances: {
          ...state.club.finances,
          diamonds: (state.club.finances.diamonds || 0) + 300,
        },
      };
      set({
        hasClaimedLoginBonus: true,
        isGuest: false,
        club: updatedClub,
      });
      saveToStorage({ hasClaimedLoginBonus: true, isGuest: false, club: updatedClub });
      return { success: true, message: '🎉 تهانينا! حصلت على مكافأة تسجيل الدخول: 300 جوهرة 💎 في خزينة ناديك!' };
    },

    chooseClub: (chosenClub: Club) => {
      soundEffects.playFanfare();
      const currentDiamonds = get().club.finances.diamonds || 0;
      const updatedClub = {
        ...chosenClub,
        finances: {
          ...chosenClub.finances,
          diamonds: currentDiamonds,
          reputation: 0, // Reset to zero!
        },
      };
      set({
        club: updatedClub,
        leagueStandings: REAL_INITIAL_STANDINGS,
        matchHistory: [],
        tournamentStats: [],
        simulatedMatchdays: [],
        lastRoundSummary: null,
      });
      saveToStorage({ club: updatedClub, leagueStandings: REAL_INITIAL_STANDINGS, matchHistory: [], tournamentStats: [], simulatedMatchdays: [] });
    },

    setClubSelectionModalOpen: (open: boolean) => {
      set({ clubSelectionModalOpen: open });
    },

    selectLeagueAndClub: (clubConfig: RealClubConfig, realSquad?: Player[]) => {
      const state = get();
      const currentDiamonds = state.club.finances.diamonds || 0;
      const isAr = state.language === 'ar';

      const isSwitchingClub = state.hasSelectedInitialClub && state.club.id !== clubConfig.id;
      const SWITCH_FEE_DIAMONDS = 50;
      const SWITCH_FEE_COINS = 25000;
      const currentCoins = state.club.finances.coins || 0;

      // If user already chose a club and is switching to a different club/league
      if (isSwitchingClub) {
        const canPayDiamonds = currentDiamonds >= (clubConfig.gemCost + SWITCH_FEE_DIAMONDS);
        const canPayCoins = currentCoins >= SWITCH_FEE_COINS && currentDiamonds >= clubConfig.gemCost;

        if (!canPayDiamonds && !canPayCoins) {
          return {
            success: false,
            message: isAr
              ? `تغيير النادي والدوري بعد بدء المسيرة يتطلب دفع رسوم انتقال رسمية: (${SWITCH_FEE_DIAMONDS} جوهرة 💎 أو ${SWITCH_FEE_COINS.toLocaleString()} عملة كروية 🪙). رصيدك: ${currentDiamonds} 💎 و ${currentCoins.toLocaleString()} 🪙.`
              : `Changing your club/league mid-career requires a transfer release fee: (${SWITCH_FEE_DIAMONDS} Diamonds 💎 or ${SWITCH_FEE_COINS.toLocaleString()} Coins 🪙). Balance: ${currentDiamonds} 💎 and ${currentCoins.toLocaleString()} 🪙.`
          };
        }
      }

      // Check gem requirement for Top Tier clubs
      const totalDiamondsNeeded = (clubConfig.isTopTier && clubConfig.gemCost > 0 ? clubConfig.gemCost : 0) + (isSwitchingClub && currentCoins < SWITCH_FEE_COINS ? SWITCH_FEE_DIAMONDS : 0);
      if (currentDiamonds < totalDiamondsNeeded) {
        return {
          success: false,
          message: isAr
            ? `نادي ${clubConfig.name} من أندية المركز الأول والنخبة ويتطلب ${clubConfig.gemCost} جوهرة 💎. رصيدك الحالي: ${currentDiamonds} 💎. سجّل الدخول مجاناً لتحصل على 300 💎 فوراً، أو اختر نادياً مجانياً (0 💎)!`
            : `${clubConfig.nameEn} is a Tier-1 club requiring ${clubConfig.gemCost} 💎. You have ${currentDiamonds} 💎. Sign in to get 300 💎 for free or pick a free challenger club!`
        };
      }

      let remainingDiamonds = currentDiamonds - (clubConfig.gemCost > 0 ? clubConfig.gemCost : 0);
      let remainingCoins = isSwitchingClub ? currentCoins : 100000;

      if (isSwitchingClub) {
        if (remainingCoins >= SWITCH_FEE_COINS) {
          remainingCoins -= SWITCH_FEE_COINS;
        } else {
          remainingDiamonds -= SWITCH_FEE_DIAMONDS;
        }
      }

      soundEffects.playFanfare();
      confetti({ particleCount: 140, spread: 90, origin: { y: 0.5 } });

      const updatedClub: Club = {
        ...REAL_INITIAL_PLAYER_CLUB,
        id: clubConfig.id,
        name: clubConfig.name,
        nameEn: clubConfig.nameEn,
        city: `${clubConfig.city}، ${clubConfig.country}`,
        stadiumName: clubConfig.stadiumName,
        logoBadge: '🛡️',
        logoUrl: clubConfig.badge,
        divisionId: clubConfig.leagueId,
        divisionName: clubConfig.leagueName,
        colors: clubConfig.colors,
        boardTrust: 85,
        fanMood: 85,
        facilities: isSwitchingClub ? state.club.facilities : REAL_INITIAL_PLAYER_CLUB.facilities,
        finances: {
          ...state.club.finances,
          diamonds: Math.max(0, remainingDiamonds),
          coins: Math.max(0, remainingCoins),
          trainingPoints: Math.max(50, state.club.finances.trainingPoints || 100),
          reputation: isSwitchingClub ? Math.max(0, state.club.finances.reputation - 20) : 0,
          totalSeasonRevenue: 0,
          totalSeasonExpenses: 0,
        },
        // Prefer the club's REAL, pre-synced squad (scripts/syncSquadsData.ts ->
        // squads_cache, fetched & converted by the caller). Only falls back to the
        // generic starter roster when that club hasn't been synced yet.
        footballSquad: (realSquad && realSquad.length > 0)
          ? realSquad
          // No synced squad yet: give this club its OWN deterministic squad (names by league region,
          // strength by club) instead of the shared starter roster every club used to get.
          : withStableIds(clubConfig.id, generateSyntheticOpponentSquad(clubConfig))
      };

      // Bug fix: footballLineup used to stay as the 11 hard-coded 'rp_*' ids
      // from REAL_INITIAL_PLAYER_CLUB even when a real synced squad (with its
      // own 'squad_*' ids) was loaded above, so the lineup->squad lookup in
      // the match engine silently matched nothing. Rebuild it from whatever
      // squad the club actually has: first goalkeeper + first 10 outfielders.
      const gk = updatedClub.footballSquad.find(p => p.position === 'GK');
      const outfield = updatedClub.footballSquad.filter(p => p.position !== 'GK').slice(0, 10);
      updatedClub.footballLineup = [gk, ...outfield].filter((p): p is Player => !!p).map(p => p.id);
      updatedClub.footballBench = updatedClub.footballSquad
        .filter(p => !updatedClub.footballLineup.includes(p.id))
        .slice(0, 4)
        .map(p => p.id);

      const newStandings = generateStandingsForLeague(clubConfig.leagueId, clubConfig.id, clubConfig.name);
      const newFixtures = generateFixturesForLeague(clubConfig.leagueId, clubConfig.id);

      set({
        club: updatedClub,
        leagueStandings: newStandings,
        leagueFixtures: newFixtures,
        matchHistory: [],
        tournamentStats: [],
        simulatedMatchdays: [],
        lastRoundSummary: null,
        hasSelectedInitialClub: true,
        clubSelectionModalOpen: false,
      });

      saveToStorage({
        club: updatedClub,
        leagueStandings: newStandings,
        leagueFixtures: newFixtures,
        matchHistory: [],
        tournamentStats: [],
        simulatedMatchdays: [],
        hasSelectedInitialClub: true,
      });

      return {
        success: true,
        message: isAr
          ? `🎉 تم تولي منصب المدير الفني لنادي ${clubConfig.name} بنجاح! تبدأ مسيرتك الرسمية في ${clubConfig.leagueName} من اليوم الأول.`
          : `🎉 Officially appointed as Manager of ${clubConfig.nameEn}! Your career in ${clubConfig.leagueNameEn} begins today.`
      };
    },

    setSport: (sport) => {
      soundEffects.playTap();
      set({ currentSport: sport });
    },

    setLanguage: (lang) => {
      soundEffects.playTap();
      set({ language: lang });
      document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
      document.documentElement.lang = lang;
    },

    setActiveTab: (tab) => {
      soundEffects.playTap();
      set({ activeTab: tab });
    },

    toggleSound: () => {
      const newState = !get().soundEnabled;
      soundEffects.enabled = newState;
      set({ soundEnabled: newState });
    },

    updateFootballTactics: (newTactics) => {
      soundEffects.playTap();
      set((state) => ({
        club: {
          ...state.club,
          footballTactics: {
            ...state.club.footballTactics,
            ...newTactics,
          },
        },
      }));
    },

    updateBasketballTactics: (newTactics) => {
      soundEffects.playTap();
      set((state) => ({
        club: {
          ...state.club,
          basketballTactics: {
            ...state.club.basketballTactics,
            ...newTactics,
          },
        },
      }));
    },

    swapFootballLineup: (lineupIndex, benchPlayerId) => {
      soundEffects.playTap();
      const club = get().club;
      const oldPlayerId = club.footballLineup[lineupIndex];
      const newLineup = [...club.footballLineup];
      newLineup[lineupIndex] = benchPlayerId;

      const newBench = club.footballBench.map(id => id === benchPlayerId ? oldPlayerId : id);
      set({
        club: {
          ...club,
          footballLineup: newLineup,
          footballBench: newBench,
        },
      });
    },

    setFootballRoles: (roles) => {
      soundEffects.playTap();
      set((state) => ({
        club: {
          ...state.club,
          footballTactics: {
            ...state.club.footballTactics,
            ...roles,
          },
        },
      }));
    },

    runTrainingDrill: (drillType) => {
      const state = get();
      const cost = drillType === 'stamina' ? 30 : 40;
      if (state.club.finances.trainingPoints < cost) {
        return false;
      }

      soundEffects.playWhistle(true);
      const updatedSquad = state.club.footballSquad.map(p => {
        if (drillType === 'stamina') {
          return { ...p, stamina: Math.min(100, p.stamina + 8), fatigue: Math.max(0, p.fatigue - 5) };
        } else if (drillType === 'technical') {
          return { ...p, form: Math.min(10, p.form + 1), morale: Math.min(100, p.morale + 4) };
        } else {
          return { ...p, overall: Math.min(p.potential, p.overall + (Math.random() < 0.25 ? 1 : 0)) };
        }
      });

      set({
        vipPoints: state.vipPoints + 15,
        club: {
          ...state.club,
          footballSquad: updatedSquad,
          finances: {
            ...state.club.finances,
            trainingPoints: state.club.finances.trainingPoints - cost,
          },
        },
      });
      return true;
    },

    upgradeFacility: (facility) => {
      const state = get();
      const currentLevel = state.club.facilities[facility];
      if (currentLevel >= 10) return false;

      const upgradeCost = currentLevel * 35000;
      if (state.club.finances.coins < upgradeCost) return false;

      soundEffects.playFanfare();
      confetti({ particleCount: 40, spread: 60 });

      set({
        vipPoints: state.vipPoints + 50,
        club: {
          ...state.club,
          facilities: {
            ...state.club.facilities,
            [facility]: currentLevel + 1,
          },
          finances: {
            ...state.club.finances,
            coins: state.club.finances.coins - upgradeCost,
            reputation: state.club.finances.reputation + 40,
          },
        },
      });
      return true;
    },

    buyPlayer: (player) => {
      const state = get();
      if (state.club.finances.coins < player.marketValue) return false;

      soundEffects.playFanfare();
      confetti({ particleCount: 50, spread: 70 });

      set({
        vipPoints: state.vipPoints + 40,
        club: {
          ...state.club,
          footballSquad: [...state.club.footballSquad, player],
          footballBench: [...state.club.footballBench, player.id],
          fanMood: Math.min(100, state.club.fanMood + 5),
          finances: {
            ...state.club.finances,
            coins: state.club.finances.coins - player.marketValue,
            reputation: state.club.finances.reputation + 25,
          },
        },
        scoutMarket: state.scoutMarket.filter(p => p.id !== player.id),
      });
      return true;
    },

    addPlayerToSquad: (player) => {
      const state = get();
      soundEffects.playFanfare();
      confetti({ particleCount: 75, spread: 80 });

      set({
        vipPoints: state.vipPoints + 50,
        club: {
          ...state.club,
          footballSquad: [...state.club.footballSquad.filter(p => p.id !== player.id), player],
          footballBench: [...state.club.footballBench.filter(id => id !== player.id), player.id],
          fanMood: Math.min(100, state.club.fanMood + 10),
          finances: {
            ...state.club.finances,
            reputation: state.club.finances.reputation + 40,
          },
        },
      });
      return true;
    },

    sellPlayer: (playerId) => {
      const state = get();
      const player = state.club.footballSquad.find(p => p.id === playerId);
      if (!player) return;

      soundEffects.playTap();
      set({
        vipPoints: state.vipPoints + 20,
        club: {
          ...state.club,
          footballSquad: state.club.footballSquad.filter(p => p.id !== playerId),
          footballLineup: state.club.footballLineup.filter(id => id !== playerId),
          footballBench: state.club.footballBench.filter(id => id !== playerId),
          finances: {
            ...state.club.finances,
            coins: state.club.finances.coins + Math.round(player.marketValue * 0.9),
          },
        },
      });
    },

    promoteAcademyTalent: () => {
      const state = get();
      soundEffects.playFanfare();
      confetti({ particleCount: 60, spread: 80 });

      const newTalent: Player = {
        id: `academy_gen_${Date.now()}`,
        sport: state.currentSport,
        name: state.currentSport === 'football' ? 'حمزة الشبل الذهبي' : 'أيهم الموهوب الصاعد',
        nameEn: state.currentSport === 'football' ? 'Hamza The Golden Cub' : 'Ayham The Prodigy',
        age: 17,
        nationality: 'السعودية',
        nationalityFlag: '🇸🇦',
        position: state.currentSport === 'football' ? 'CAM' : 'PG',
        secondaryPositions: [],
        overall: 65,
        potential: 85,
        attributes: {
          pace: 81,
          dribbling: 76,
          passing: 74,
          shooting: 68,
          physical: 62,
          defending: 40,
          goalkeeping: 10,
          speed: 82,
          playmaking: 78,
          shootingThree: 74,
        },
        rarity: 'prospect',
        personality: 'ambitious',
        traits: ['خريج الأكاديمية الذهبي', 'مهارات فطرية'],
        morale: 95,
        form: 8,
        stamina: 95,
        fatigue: 0,
        injuredWeeks: 0,
        suspendedMatches: 0,
        contractYears: 4,
        wage: 850,
        marketValue: 180000,
        matchesPlayed: 0,
        goalsOrPoints: 0,
        assists: 0,
        cleanSheetsOrRebounds: 0,
        averageRating: 0,
      };

      if (state.currentSport === 'football') {
        set({
          vipPoints: state.vipPoints + 50,
          club: {
            ...state.club,
            footballSquad: [...state.club.footballSquad, newTalent],
            footballBench: [...state.club.footballBench, newTalent.id],
            fanMood: Math.min(100, state.club.fanMood + 6),
          },
        });
      } else {
        set({
          vipPoints: state.vipPoints + 50,
          club: {
            ...state.club,
            basketballSquad: [...state.club.basketballSquad, newTalent],
            basketballBench: [...state.club.basketballBench, newTalent.id],
            fanMood: Math.min(100, state.club.fanMood + 6),
          },
        });
      }
    },

    refreshScoutMarket: () => {
      const state = get();
      soundEffects.playTap();
      const squadNames = new Set(state.club.footballSquad.map(p => p.nameEn.toLowerCase()));
      const availableReal = REAL_INITIAL_SCOUT_MARKET.filter(p => !squadNames.has(p.nameEn.toLowerCase()));
      
      set({
        scoutMarket: availableReal,
      });
      saveToStorage({ scoutMarket: availableReal });
    },

    selectMission: (id) => {
      soundEffects.playTap();
      set({ selectedMissionId: id });
    },

    chooseMissionOption: (missionId, choiceId) => {
      const state = get();
      const mission = state.storyMissions.find(m => m.id === missionId);
      if (!mission) return;

      const choice = mission.choices.find(c => c.id === choiceId);
      if (!choice) return;

      soundEffects.playFanfare();
      confetti({ particleCount: 35, spread: 60 });

      const c = choice.consequence;
      const club = state.club;

      const updatedMissions = state.storyMissions.map(m => 
        m.id === missionId ? { ...m, isCompleted: true } : m
      );

      set({
        vipPoints: state.vipPoints + (c.vipPoints || mission.reward.vipPoints),
        storyMissions: updatedMissions,
        selectedMissionId: null,
        club: {
          ...club,
          boardTrust: Math.max(0, Math.min(100, club.boardTrust + (c.boardTrustChange || 0))),
          fanMood: Math.max(0, Math.min(100, club.fanMood + (c.fanMoodChange || 0))),
          finances: {
            ...club.finances,
            coins: club.finances.coins + (c.coinsChange || 0) + mission.reward.coins,
            reputation: club.finances.reputation + (c.reputationChange || 0) + mission.reward.reputation,
            trainingPoints: club.finances.trainingPoints + mission.reward.trainingPoints,
          },
        },
      });
    },

    openPreMatchPreview: async () => {
      set({ isLoadingMatch: true });
      const previewData = await buildPreMatchData(true);
      if (!previewData) {
        set({ isLoadingMatch: false });
        return;
      }
      set({
        isLoadingMatch: false,
        preMatchPreview: previewData,
        nextMatchInsight: previewData,
        preMatchModalOpen: true,
      });
    },

    // Lightweight version used by the idle match screen: same numbers as the pre-match
    // preview, but never opens the modal and never starts a new season by itself.
    loadNextMatchInsight: async () => {
      const data = await buildPreMatchData(false);
      set({ nextMatchInsight: data });
    },

    closePreMatchPreview: () => {
      set({ preMatchModalOpen: false, preMatchPreview: null });
    },

    confirmStartMatch: () => {
      const state = get();
      if (!state.preMatchPreview) return;
      const opponent = state.preMatchPreview.opponentClub;
      const nextFixture = state.preMatchPreview.fixture;
      const competition = state.preMatchPreview.competition;
      const vipAttackBoost = state.preMatchPreview.userVipAttackBoost;
      const vipDefenseBoost = state.preMatchPreview.userVipDefenseBoost;

      set({ preMatchModalOpen: false, preMatchPreview: null, isLoadingMatch: false });
      soundEffects.playWhistle(false);

      if (state.currentSport === 'football') {
        const engine = new FootballMatchEngine(
          state.club, 
          opponent, 
          Date.now(), 
          state.club.footballTactics,
          undefined,
          vipAttackBoost,
          vipDefenseBoost
        );
        set({
          activeEngine: engine,
          isMatchLive: true,
          isMatchPaused: false,
          currentMatchMinute: 0,
          pendingInteractiveEvent: null,
          activeTab: 'match',
          activeMatchRecord: {
            id: `match_${Date.now()}`,
            sport: 'football',
            seed: Date.now(),
            homeClubId: state.club.id,
            homeClubName: state.club.name,
            awayClubId: opponent.id,
            awayClubName: opponent.name,
            homeScore: 0,
            awayScore: 0,
            events: [],
            stats: {
              homePossession: 50,
              awayPossession: 50,
              homeShots: 0,
              awayShots: 0,
              homeShotsOnTarget: 0,
              awayShotsOnTarget: 0,
              homeCorners: 0,
              awayCorners: 0,
              homeFouls: 0,
              awayFouls: 0,
              homeYellowCards: 0,
              awayYellowCards: 0,
              homeXg: 0,
              awayXg: 0,
            },
            isFinished: false,
            competition,
            matchDay: nextFixture.matchday,
            date: new Date().toISOString().split('T')[0],
          },
        });
      }
    },

    startNewMatch: async () => {
      const state = get();
      if (state.currentSport === 'football') {
        await state.openPreMatchPreview();
        return;
      }

      // Basketball match
      let fixtures = state.leagueFixtures;
      if (!fixtures || fixtures.length === 0 || fixtures.every(f => f.played)) {
        fixtures = generateFixturesForLeague(state.club.divisionId, state.club.id);
        set({ leagueFixtures: fixtures });
      }
      const nextFixture = fixtures.find(f => !f.played) || fixtures[0];
      const opponent: Club = {
        ...REAL_INITIAL_PLAYER_CLUB,
        id: nextFixture.opponentClubId,
        name: nextFixture.opponentClubName,
        logoUrl: nextFixture.opponentBadge,
      };

      const bballEngine = new BasketballMatchEngine(state.club, opponent, Date.now(), state.club.basketballTactics);
      const record = bballEngine.simulateFullGame();
      soundEffects.playFanfare();
      confetti({ particleCount: 70, spread: 80 });

      set({
        activeMatchRecord: record,
        isMatchLive: false,
        activeTab: 'match',
        matchHistory: [record, ...state.matchHistory],
        vipPoints: state.vipPoints + 60,
        club: {
          ...state.club,
          finances: {
            ...state.club.finances,
            coins: state.club.finances.coins + 22000,
            reputation: state.club.finances.reputation + 45,
          },
        },
      });
    },

    stepMatchMinute: () => {
      const state = get();
      if (!state.activeEngine || !state.isMatchLive || state.isMatchPaused) return;

      const res = state.activeEngine.stepMinute();

      // Sound events on goals / saves
      const latestEvent = res.events[res.events.length - 1];
      if (latestEvent && latestEvent.minute === res.currentMinute) {
        if (latestEvent.type === 'goal') {
          soundEffects.playGoalCelebration();
          confetti({ particleCount: 50, spread: 80 });
        } else if (latestEvent.type === 'save') {
          soundEffects.playKick();
        }
      }

      const isFinished = res.isFinished;
      if (isFinished) {
        soundEffects.playWhistle(false);
        soundEffects.playFanfare();
        confetti({ particleCount: 80, spread: 90 });

        // Update standings & finances
        const won = res.homeScore > res.awayScore;
        const drawn = res.homeScore === res.awayScore;
        const pts = won ? 3 : (drawn ? 1 : 0);
        const matchIncome = state.club.finances.ticketPrice * 5200 + state.club.finances.sponsorIncomePerMatch;

        const updatedStandings = state.leagueStandings.map(s => {
          if (s.clubId === state.club.id) {
            return {
              ...s,
              played: s.played + 1,
              won: s.won + (won ? 1 : 0),
              drawn: s.drawn + (drawn ? 1 : 0),
              lost: s.lost + (!won && !drawn ? 1 : 0),
              goalsFor: s.goalsFor + res.homeScore,
              goalsAgainst: s.goalsAgainst + res.awayScore,
              goalDifference: s.goalDifference + (res.homeScore - res.awayScore),
              points: s.points + pts,
              form: [(won ? 'W' : (drawn ? 'D' : 'L')) as ('W'|'D'|'L'), ...s.form.slice(0, 4)],
            };
          }
          // Also update the opponent's own row, so the table reflects this
          // result on both sides instead of only ever moving the player's row.
          if (s.clubId === state.activeMatchRecord?.awayClubId) {
            const oppWon = !won && !drawn;
            const oppDrawn = drawn;
            const oppPts = oppWon ? 3 : (oppDrawn ? 1 : 0);
            return {
              ...s,
              played: s.played + 1,
              won: s.won + (oppWon ? 1 : 0),
              drawn: s.drawn + (oppDrawn ? 1 : 0),
              lost: s.lost + (won ? 1 : 0),
              goalsFor: s.goalsFor + res.awayScore,
              goalsAgainst: s.goalsAgainst + res.homeScore,
              goalDifference: s.goalDifference + (res.awayScore - res.homeScore),
              points: s.points + oppPts,
              form: [(oppWon ? 'W' : (oppDrawn ? 'D' : 'L')) as ('W'|'D'|'L'), ...s.form.slice(0, 4)],
            };
          }
          return s;
        });

        // Mark this fixture as played on the season calendar with its final
        // score, so startNewMatch() moves on to the next real opponent
        // instead of replaying the same one.
        const finishedMatchday = state.activeMatchRecord?.matchDay;
        const updatedFixtures = state.leagueFixtures.map(f =>
          f.matchday === finishedMatchday && f.opponentClubId === state.activeMatchRecord?.awayClubId
            ? { ...f, played: true, homeScore: res.homeScore, awayScore: res.awayScore }
            : f
        );

        const finalRecord: MatchRecord = {
          id: `match_${Date.now()}`,
          sport: 'football',
          seed: Date.now(),
          homeClubId: state.club.id,
          homeClubName: state.club.name,
          awayClubId: state.activeMatchRecord?.awayClubId || REAL_OPPONENT_CLUBS[0].id,
          awayClubName: state.activeMatchRecord?.awayClubName || REAL_OPPONENT_CLUBS[0].name,
          homeScore: res.homeScore,
          awayScore: res.awayScore,
          events: res.events,
          stats: res.stats,
          isFinished: true,
          competition: state.activeMatchRecord?.competition || 'الدوري',
          matchDay: state.activeMatchRecord?.matchDay || state.matchHistory.length + 1,
          date: new Date().toISOString().split('T')[0],
        };

        // Squad Fatigue Simulation: starters drain energy, bench recovers
        const lineupIds = new Set(state.club.footballLineup);
        const updatedSquad = state.club.footballSquad.map((p) => {
          if (lineupIds.has(p.id)) {
            return {
              ...p,
              fatigue: Math.min(100, (p.fatigue || 0) + 20),
              stamina: Math.max(10, (p.stamina || 100) - 22),
            };
          } else {
            return {
              ...p,
              fatigue: Math.max(0, (p.fatigue || 0) - 15),
              stamina: Math.min(100, (p.stamina || 100) + 15),
            };
          }
        });

        // Daily & Weekly Missions Progress
        const currentMissions = state.dailyMissions || INITIAL_DAILY_MISSIONS;
        const updatedMissions = currentMissions.map((m) => {
          if (m.isClaimed) return m;
          if (m.id === 'mission_play_matches') {
            return { ...m, current: Math.min(m.target, m.current + 1) };
          }
          if (m.id === 'mission_score_goals') {
            return { ...m, current: Math.min(m.target, m.current + res.homeScore) };
          }
          if (m.id === 'mission_clean_sheet' && res.awayScore === 0) {
            return { ...m, current: Math.min(m.target, m.current + 1) };
          }
          if (m.id === 'weekly_win_matches' && won) {
            return { ...m, current: Math.min(m.target, m.current + 1) };
          }
          return m;
        });

        // Determine VIP loss mitigation
        let activeVipTier = VIP_LEVELS[0];
        for (const tier of VIP_LEVELS) {
          if (state.vipPoints >= tier.pointsRequired) {
            activeVipTier = tier;
          }
        }
        const mitigationFactor = 1 - ((activeVipTier.lossMitigationPercent || 0) / 100);
        const boardPenalty = Math.round(3 * mitigationFactor);
        const fanPenalty = Math.round(4 * mitigationFactor);

        const updatedClub = {
          ...state.club,
          footballSquad: updatedSquad,
          boardTrust: Math.min(100, Math.max(0, state.club.boardTrust + (won ? 4 : (drawn ? 0 : -boardPenalty)))),
          fanMood: Math.min(100, Math.max(0, state.club.fanMood + (won ? 6 : (drawn ? 1 : -fanPenalty)))),
          finances: {
            ...state.club.finances,
            coins: state.club.finances.coins + matchIncome,
            reputation: state.club.finances.reputation + (won ? 35 : 10),
          },
        };

        // Generate Post Match Character Analyst Feedback
        const analystFeedback = generatePostMatchCharacter(finalRecord, updatedClub, state.language === 'ar');

        set({
          isMatchLive: false,
          activeMatchRecord: finalRecord,
          matchHistory: [finalRecord, ...state.matchHistory],
          leagueStandings: updatedStandings,
          leagueFixtures: updatedFixtures,
          vipPoints: state.vipPoints + (won ? 80 : 35),
          dailyMissions: updatedMissions,
          postMatchAnalyst: analystFeedback,
          club: updatedClub,
        });
        saveToStorage({
          club: updatedClub,
          dailyMissions: updatedMissions,
          leagueStandings: updatedStandings,
          leagueFixtures: updatedFixtures,
          vipPoints: state.vipPoints + (won ? 80 : 35),
        });

        // Play the rest of this matchday, then open the round summary.
        void finishRound(finalRecord.matchDay);
        return;
      }

      set({
        currentMatchMinute: res.currentMinute,
        pendingInteractiveEvent: res.interactivePrompt || null,
        isMatchPaused: !!res.interactivePrompt,
        activeMatchRecord: {
          ...(state.activeMatchRecord || {
            id: 'live_match',
            sport: 'football',
            seed: 0,
            homeClubId: state.club.id,
            homeClubName: state.club.name,
            awayClubId: REAL_OPPONENT_CLUBS[0].id,
            awayClubName: REAL_OPPONENT_CLUBS[0].name,
            competition: 'دوري أبطال الأساطير',
            matchDay: 1,
            date: '',
          }),
          homeScore: res.homeScore,
          awayScore: res.awayScore,
          events: res.events,
          stats: res.stats,
          isFinished: false,
        },
      });
    },

    toggleMatchPause: () => {
      soundEffects.playTap();
      set((s) => ({ isMatchPaused: !s.isMatchPaused }));
    },

    setMatchSpeed: (speed) => {
      const state = get();
      const isAr = state.language === 'ar';

      // Check access permission for 2x
      if (speed === 2 && !state.unlockedSpeed2x) {
        soundEffects.playBuzz();
        return;
      }

      // Check access permission for 4x (VIP 10+)
      if (speed === 4) {
        let currentVipTier = VIP_LEVELS[0];
        for (const tier of VIP_LEVELS) {
          if (state.vipPoints >= tier.pointsRequired) {
            currentVipTier = tier;
          }
        }
        if (!currentVipTier.unlockedSpeed4x) {
          soundEffects.playBuzz();
          return;
        }
      }

      soundEffects.playTap();
      set({ matchSpeed: speed });
    },

    unlockMatchSpeed2x: (currency) => {
      const state = get();
      const isAr = state.language === 'ar';

      if (state.unlockedSpeed2x) {
        return {
          success: true,
          message: isAr ? 'سرعة 2x مفتوحة بالفعل!' : '2x speed is already unlocked!'
        };
      }

      const DIAMOND_COST = 50;
      const COIN_COST = 30000;

      if (currency === 'diamonds') {
        const userDiamonds = state.club.finances.diamonds || 0;
        if (userDiamonds < DIAMOND_COST) {
          soundEffects.playBuzz();
          return {
            success: false,
            message: isAr 
              ? `رصيد الجواهر غير كافٍ! تحتاج إلى ${DIAMOND_COST} جوهرة 💎 (رصيدك: ${userDiamonds} 💎).`
              : `Insufficient diamonds! Need ${DIAMOND_COST} 💎 (You have: ${userDiamonds} 💎).`
          };
        }

        const updatedClub = {
          ...state.club,
          finances: {
            ...state.club.finances,
            diamonds: userDiamonds - DIAMOND_COST,
          }
        };

        soundEffects.playFanfare();
        confetti({ particleCount: 60, spread: 70 });

        set({
          unlockedSpeed2x: true,
          matchSpeed: 2,
          club: updatedClub,
        });

        saveToStorage({
          unlockedSpeed2x: true,
          club: updatedClub,
        });

        return {
          success: true,
          message: isAr 
            ? `تم فتح ميزة تسريع المباراة 2x بنجاح مقابل ${DIAMOND_COST} جوهرة 💎!`
            : `Successfully unlocked 2x Match Speed for ${DIAMOND_COST} Diamonds 💎!`
        };
      } else {
        const userCoins = state.club.finances.coins || 0;
        if (userCoins < COIN_COST) {
          soundEffects.playBuzz();
          return {
            success: false,
            message: isAr 
              ? `رصيد الكوينز غير كافٍ! تحتاج إلى ${COIN_COST.toLocaleString()} كوينز 🪙 (رصيدك: ${userCoins.toLocaleString()} 🪙).`
              : `Insufficient coins! Need ${COIN_COST.toLocaleString()} coins 🪙 (You have: ${userCoins.toLocaleString()} 🪙).`
          };
        }

        const updatedClub = {
          ...state.club,
          finances: {
            ...state.club.finances,
            coins: userCoins - COIN_COST,
          }
        };

        soundEffects.playFanfare();
        confetti({ particleCount: 60, spread: 70 });

        set({
          unlockedSpeed2x: true,
          matchSpeed: 2,
          club: updatedClub,
        });

        saveToStorage({
          unlockedSpeed2x: true,
          club: updatedClub,
        });

        return {
          success: true,
          message: isAr 
            ? `تم فتح ميزة تسريع المباراة 2x بنجاح مقابل ${COIN_COST.toLocaleString()} كوينز 🪙!`
            : `Successfully unlocked 2x Match Speed for ${COIN_COST.toLocaleString()} Coins 🪙!`
        };
      }
    },

    submitInteractiveDecision: (optionId) => {
      const state = get();
      if (!state.activeEngine) return;
      soundEffects.playWhistle(true);
      state.activeEngine.applyInteractiveDecision(optionId);
      set({
        pendingInteractiveEvent: null,
        isMatchPaused: false,
      });
    },

    instantSimulateMatch: () => {
      const state = get();
      if (!state.activeEngine || !state.isMatchLive) return;

      // Simulate directly to completion using the engine without triggering synchronous UI loops or duplicate confetti freezes
      const res = state.activeEngine.simulateToCompletion();

      // Sound and visual effects for full-time completion
      soundEffects.playWhistle(false);
      soundEffects.playFanfare();
      confetti({ particleCount: 80, spread: 90 });

      // Update standings & finances
      const won = res.homeScore > res.awayScore;
      const drawn = res.homeScore === res.awayScore;
      const pts = won ? 3 : (drawn ? 1 : 0);
      const matchIncome = state.club.finances.ticketPrice * 5200 + state.club.finances.sponsorIncomePerMatch;

      const updatedStandings = state.leagueStandings.map(s => {
        if (s.clubId === state.club.id) {
          return {
            ...s,
            played: s.played + 1,
            won: s.won + (won ? 1 : 0),
            drawn: s.drawn + (drawn ? 1 : 0),
            lost: s.lost + (!won && !drawn ? 1 : 0),
            goalsFor: s.goalsFor + res.homeScore,
            goalsAgainst: s.goalsAgainst + res.awayScore,
            goalDifference: s.goalDifference + (res.homeScore - res.awayScore),
            points: s.points + pts,
            form: [(won ? 'W' : (drawn ? 'D' : 'L')) as ('W'|'D'|'L'), ...s.form.slice(0, 4)],
          };
        }
        if (s.clubId === state.activeMatchRecord?.awayClubId) {
          const oppWon = !won && !drawn;
          const oppDrawn = drawn;
          const oppPts = oppWon ? 3 : (oppDrawn ? 1 : 0);
          return {
            ...s,
            played: s.played + 1,
            won: s.won + (oppWon ? 1 : 0),
            drawn: s.drawn + (oppDrawn ? 1 : 0),
            lost: s.lost + (won ? 1 : 0),
            goalsFor: s.goalsFor + res.awayScore,
            goalsAgainst: s.goalsAgainst + res.homeScore,
            goalDifference: s.goalDifference + (res.awayScore - res.homeScore),
            points: s.points + oppPts,
            form: [(oppWon ? 'W' : (oppDrawn ? 'D' : 'L')) as ('W'|'D'|'L'), ...s.form.slice(0, 4)],
          };
        }
        return s;
      });

      // Update fixture played status on season calendar
      const finishedMatchday = state.activeMatchRecord?.matchDay;
      const updatedFixtures = state.leagueFixtures.map(f =>
        f.matchday === finishedMatchday && f.opponentClubId === state.activeMatchRecord?.awayClubId
          ? { ...f, played: true, homeScore: res.homeScore, awayScore: res.awayScore }
          : f
      );

      const finalRecord: MatchRecord = {
        id: `match_${Date.now()}`,
        sport: 'football',
        seed: Date.now(),
        homeClubId: state.club.id,
        homeClubName: state.club.name,
        awayClubId: state.activeMatchRecord?.awayClubId || REAL_OPPONENT_CLUBS[0].id,
        awayClubName: state.activeMatchRecord?.awayClubName || REAL_OPPONENT_CLUBS[0].name,
        homeScore: res.homeScore,
        awayScore: res.awayScore,
        events: res.events,
        stats: res.stats,
        isFinished: true,
        competition: state.activeMatchRecord?.competition || 'الدوري',
        matchDay: state.activeMatchRecord?.matchDay || state.matchHistory.length + 1,
        date: new Date().toISOString().split('T')[0],
      };

      // Squad Fatigue Simulation
      const lineupIds = new Set(state.club.footballLineup);
      const updatedSquad = state.club.footballSquad.map((p) => {
        if (lineupIds.has(p.id)) {
          return {
            ...p,
            fatigue: Math.min(100, (p.fatigue || 0) + 20),
            stamina: Math.max(10, (p.stamina || 100) - 22),
          };
        } else {
          return {
            ...p,
            fatigue: Math.max(0, (p.fatigue || 0) - 15),
            stamina: Math.min(100, (p.stamina || 100) + 15),
          };
        }
      });

      // Missions Progress
      const currentMissions = state.dailyMissions || INITIAL_DAILY_MISSIONS;
      const updatedMissions = currentMissions.map((m) => {
        if (m.isClaimed) return m;
        if (m.id === 'mission_play_matches') {
          return { ...m, current: Math.min(m.target, m.current + 1) };
        }
        if (m.id === 'mission_score_goals') {
          return { ...m, current: Math.min(m.target, m.current + res.homeScore) };
        }
        if (m.id === 'mission_clean_sheet' && res.awayScore === 0) {
          return { ...m, current: Math.min(m.target, m.current + 1) };
        }
        if (m.id === 'weekly_win_matches' && won) {
          return { ...m, current: Math.min(m.target, m.current + 1) };
        }
        return m;
      });

      // VIP loss mitigation
      let activeVipTier = VIP_LEVELS[0];
      for (const tier of VIP_LEVELS) {
        if (state.vipPoints >= tier.pointsRequired) {
          activeVipTier = tier;
        }
      }
      const mitigationFactor = 1 - ((activeVipTier.lossMitigationPercent || 0) / 100);
      const boardPenalty = Math.round(3 * mitigationFactor);
      const fanPenalty = Math.round(4 * mitigationFactor);

      const updatedClub = {
        ...state.club,
        footballSquad: updatedSquad,
        boardTrust: Math.min(100, Math.max(0, state.club.boardTrust + (won ? 4 : (drawn ? 0 : -boardPenalty)))),
        fanMood: Math.min(100, Math.max(0, state.club.fanMood + (won ? 6 : (drawn ? 1 : -fanPenalty)))),
        finances: {
          ...state.club.finances,
          coins: state.club.finances.coins + matchIncome,
          reputation: state.club.finances.reputation + (won ? 35 : 10),
        },
      };

      const analystFeedback = generatePostMatchCharacter(finalRecord, updatedClub, state.language === 'ar');

      set({
        isMatchLive: false,
        isMatchPaused: false,
        pendingInteractiveEvent: null,
        currentMatchMinute: 90,
        activeMatchRecord: finalRecord,
        matchHistory: [finalRecord, ...state.matchHistory],
        leagueStandings: updatedStandings,
        leagueFixtures: updatedFixtures,
        vipPoints: state.vipPoints + (won ? 80 : 35),
        dailyMissions: updatedMissions,
        postMatchAnalyst: analystFeedback,
        club: updatedClub,
      });

      saveToStorage({
        club: updatedClub,
        dailyMissions: updatedMissions,
        leagueStandings: updatedStandings,
        leagueFixtures: updatedFixtures,
        vipPoints: state.vipPoints + (won ? 80 : 35),
      });

      // Play the rest of this matchday, then open the round summary.
      void finishRound(finalRecord.matchDay);
    },

    simulateMatchday: (matchday) => runSimulateMatchday(matchday),

    upgradeVipWithDiamonds: () => {
      const state = get();
      const isAr = state.language === 'ar';

      // Find current VIP level and next VIP level
      let currentLevel = 1;
      for (const tier of VIP_LEVELS) {
        if (state.vipPoints >= tier.pointsRequired) {
          currentLevel = tier.level;
        }
      }

      if (currentLevel >= 20) {
        return {
          success: false,
          message: isAr ? 'وصلت بالفعل لأعلى مستوى VIP 20 الأسطوري!' : 'Already at maximum VIP 20 Legendary tier!'
        };
      }

      const nextTier = VIP_LEVELS.find(t => t.level === currentLevel + 1);
      if (!nextTier) {
        return { success: false, message: isAr ? 'لا يوجد مستوى تالٍ.' : 'No next tier found.' };
      }

      const cost = nextTier.diamondsCostToUpgrade;
      const playerDiamonds = state.club.finances.diamonds || 0;

      if (playerDiamonds < cost) {
        return {
          success: false,
          message: isAr 
            ? `تحتاج إلى ${cost.toLocaleString()} جوهرة للترقية (رصيدك الحالي: ${playerDiamonds.toLocaleString()}). يمكنك كسب الجواهر من المهام اليومية والأسبوعية!` 
            : `You need ${cost.toLocaleString()} diamonds (Current balance: ${playerDiamonds.toLocaleString()}). Earn diamonds from daily and weekly missions!`
        };
      }

      soundEffects.playLevelUp();
      confetti({ particleCount: 100, spread: 85 });

      const updatedClub = {
        ...state.club,
        finances: {
          ...state.club.finances,
          diamonds: playerDiamonds - cost,
        }
      };

      const newVipPoints = Math.max(state.vipPoints, nextTier.pointsRequired);

      set({
        club: updatedClub,
        vipPoints: newVipPoints,
      });

      saveToStorage({
        club: updatedClub,
        vipPoints: newVipPoints,
      });

      return {
        success: true,
        message: isAr
          ? `🎉 مبروك! تمت الترقية بنجاح إلى VIP ${nextTier.level} (${nextTier.nameAr})! لا تنس فتح صندوق الترقية الخاص بك.`
          : `🎉 Congratulations! Upgraded successfully to VIP ${nextTier.level} (${nextTier.nameEn})! Claim your upgrade chest now.`
      };
    },

    claimVipUpgradeChest: (level: number) => {
      const state = get();
      const isAr = state.language === 'ar';

      let currentLevel = 1;
      for (const tier of VIP_LEVELS) {
        if (state.vipPoints >= tier.pointsRequired) {
          currentLevel = tier.level;
        }
      }

      if (level > currentLevel) {
        return {
          success: false,
          message: isAr ? 'لم تبلغ هذا المستوى بعد لفتح صندوق الترقية.' : 'You have not reached this VIP level yet.'
        };
      }

      const alreadyClaimed = (state.claimedVipUpgradeChests || []).includes(level);
      if (alreadyClaimed) {
        return {
          success: false,
          message: isAr ? 'تم فتح واستلام صندوق الترقية لهذا المستوى مسبقاً.' : 'Upgrade chest already claimed for this level.'
        };
      }

      const tier = VIP_LEVELS.find(t => t.level === level);
      if (!tier) {
        return { success: false, message: isAr ? 'المستوى غير موجود.' : 'Tier not found.' };
      }

      soundEffects.playFanfare();
      confetti({ particleCount: 90, spread: 80 });

      const reward = tier.upgradeChestReward;
      const updatedClaimed = [...(state.claimedVipUpgradeChests || []), level];

      const updatedClub = {
        ...state.club,
        finances: {
          ...state.club.finances,
          coins: state.club.finances.coins + reward.coins,
          trainingPoints: state.club.finances.trainingPoints + reward.trainingPoints,
          diamonds: (state.club.finances.diamonds || 0) + (reward.diamonds || 0),
        }
      };

      set({
        claimedVipUpgradeChests: updatedClaimed,
        club: updatedClub,
      });

      saveToStorage({
        claimedVipUpgradeChests: updatedClaimed,
        club: updatedClub,
      });

      return {
        success: true,
        message: isAr
          ? `🎁 تم فتح صندوق ترقية VIP ${level}! استلمت: ${reward.coins.toLocaleString()} كوينز، ${reward.trainingPoints} نقطة تدريب${reward.diamonds ? `، و ${reward.diamonds} جوهرة` : ''}!`
          : `🎁 Opened VIP ${level} Upgrade Chest! Received: ${reward.coins.toLocaleString()} Coins, ${reward.trainingPoints} Training Pts${reward.diamonds ? `, and ${reward.diamonds} Diamonds` : ''}!`
      };
    },

    claimDailyVIPReward: () => {
      const state = get();
      const isAr = state.language === 'ar';
      if (state.vipClaimedToday) {
        return {
          success: false,
          message: isAr ? 'تم استلام صندوق الـ VIP اليومي مسبقاً لهذا اليوم.' : 'Daily VIP chest already claimed today.'
        };
      }

      soundEffects.playFanfare();
      confetti({ particleCount: 70, spread: 75 });

      // Determine VIP level
      let currentTier = VIP_LEVELS[0];
      for (const tier of VIP_LEVELS) {
        if (state.vipPoints >= tier.pointsRequired) {
          currentTier = tier;
        }
      }

      const dailyReward = currentTier.dailyChestReward;
      const updatedClub = {
        ...state.club,
        finances: {
          ...state.club.finances,
          coins: state.club.finances.coins + dailyReward.coins,
          trainingPoints: state.club.finances.trainingPoints + dailyReward.trainingPoints,
          diamonds: (state.club.finances.diamonds || 0) + (dailyReward.diamonds || 0),
        },
      };

      const todayStr = getTodayStr();

      set({
        vipClaimedToday: true,
        lastVipClaimDate: todayStr,
        club: updatedClub,
      });

      saveToStorage({
        club: updatedClub,
        lastVipClaimDate: todayStr,
      });

      return {
        success: true,
        message: isAr
          ? `🎁 تم استلام صندوق VIP ${currentTier.level} اليومي: ${dailyReward.coins.toLocaleString()} كوينز + ${dailyReward.trainingPoints} نقطة تدريب + ${dailyReward.diamonds || 0} جوهرة!`
          : `🎁 Claimed VIP ${currentTier.level} Daily Chest: ${dailyReward.coins.toLocaleString()} Coins + ${dailyReward.trainingPoints} Training Pts + ${dailyReward.diamonds || 0} Diamonds!`
      };
    },

    claimDailyCheckIn: () => {
      const state = get();
      if (state.checkInClaimedToday) return;

      soundEffects.playFanfare();
      confetti({ particleCount: 70, spread: 80 });

      const newStreak = (state.checkInStreak % 7) + 1;
      const rewardCoins = newStreak * 8000;
      const rewardVip = 30 + newStreak * 15;
      const todayStr = getTodayStr();

      const updatedClub = {
        ...state.club,
        finances: {
          ...state.club.finances,
          coins: state.club.finances.coins + rewardCoins,
        },
      };
      const updatedVipPoints = state.vipPoints + rewardVip;

      set({
        checkInClaimedToday: true,
        lastCheckInDate: todayStr,
        checkInStreak: newStreak,
        vipPoints: updatedVipPoints,
        club: updatedClub,
      });

      saveToStorage({
        club: updatedClub,
        vipPoints: updatedVipPoints,
        checkInStreak: newStreak,
        lastCheckInDate: todayStr,
      });
    },

    claimDailyMission: (missionId: string) => {
      const state = get();
      const isAr = state.language === 'ar';
      const mission = (state.dailyMissions || INITIAL_DAILY_MISSIONS).find((m) => m.id === missionId);
      if (!mission) {
        return { success: false, message: isAr ? 'المهمة غير موجودة' : 'Mission not found' };
      }
      if (mission.current < mission.target) {
        return { success: false, message: isAr ? 'المهمة لم تكتمل بعد' : 'Mission not completed yet' };
      }
      if (mission.isClaimed) {
        return { success: false, message: isAr ? 'تم استلام المكافأة مسبقاً' : 'Reward already claimed' };
      }

      soundEffects.playFanfare();
      confetti({ particleCount: 80, spread: 70 });

      const updatedMissions = (state.dailyMissions || INITIAL_DAILY_MISSIONS).map((m) => {
        if (m.id === missionId) return { ...m, isClaimed: true };
        return m;
      });

      const updatedClub = {
        ...state.club,
        finances: {
          ...state.club.finances,
          coins: state.club.finances.coins + mission.rewardCoins,
          diamonds: (state.club.finances.diamonds || 0) + mission.rewardDiamonds,
          trainingPoints: state.club.finances.trainingPoints + mission.rewardTrainingPoints,
        },
      };

      set({
        dailyMissions: updatedMissions,
        vipPoints: state.vipPoints + mission.rewardVipPoints,
        club: updatedClub,
      });
      saveToStorage({ dailyMissions: updatedMissions, vipPoints: state.vipPoints + mission.rewardVipPoints, club: updatedClub });

      return {
        success: true,
        message: isAr
          ? `🎉 مبروك! استلمت ${mission.rewardCoins.toLocaleString()} كوينز و ${mission.rewardDiamonds} جوهرة و ${mission.rewardTrainingPoints} نقطة تدريب!`
          : `🎉 Claimed ${mission.rewardCoins.toLocaleString()} Coins, ${mission.rewardDiamonds} Diamonds, and ${mission.rewardTrainingPoints} Training Points!`
      };
    },

    runSquadRecoverySession: () => {
      const state = get();
      const isAr = state.language === 'ar';
      const cost = 500;
      if (state.club.finances.coins < cost) {
        return {
          success: false,
          message: isAr ? 'الرصيد المالي غير كافٍ لجلسة الاستشفاء (مطلوب 500 كوينز).' : 'Insufficient coins for recovery session (500 required).'
        };
      }

      soundEffects.playLevelUp();
      confetti({ particleCount: 50, spread: 60 });

      const updatedSquad = state.club.footballSquad.map((p) => ({
        ...p,
        fatigue: Math.max(0, (p.fatigue || 0) - 35),
        stamina: Math.min(100, (p.stamina || 100) + 30),
      }));

      const updatedMissions = (state.dailyMissions || INITIAL_DAILY_MISSIONS).map((m) => {
        if (m.id === 'mission_manage_fatigue' && !m.isClaimed) {
          return { ...m, current: Math.min(m.target, m.current + 1) };
        }
        return m;
      });

      const updatedClub = {
        ...state.club,
        footballSquad: updatedSquad,
        finances: {
          ...state.club.finances,
          coins: state.club.finances.coins - cost,
        },
      };

      set({
        club: updatedClub,
        dailyMissions: updatedMissions,
      });
      saveToStorage({ club: updatedClub, dailyMissions: updatedMissions });

      return {
        success: true,
        message: isAr
          ? 'تمت جلسة الاستشفاء البدني بنجاح! تعافت لياقة جميع اللاعبين وانخفض مؤشر الإجهاد بمقدار 35%.'
          : 'Squad recovery complete! All players restored stamina and reduced fatigue by 35%.'
      };
    },

    setDailyMissionsModalOpen: (open: boolean) => {
      set({ isDailyMissionsModalOpen: open });
    },

    setPostMatchAnalyst: (analyst: MatchResultsCharacter | null) => {
      set({ postMatchAnalyst: analyst });
    },

    setTacticalDuelModalOpen: (open: boolean) => {
      set({ isTacticalDuelModalOpen: open });
    },

    startTacticalDuel: (difficulty = 'tactical') => {
      soundEffects.playWhistle(true);
      const initialPlayerDraft = getRandomDuelDraft(3);
      const botNames = ['القائد ألكسندر', 'سيف الدين المقاتل', 'حارس الأسوار كايوس', 'صقر البادية'];
      const opponentName = botNames[Math.floor(Math.random() * botNames.length)];

      const duelState: TacticalDuelState = {
        isActive: true,
        matchId: `duel_${Date.now()}`,
        opponentName,
        opponentAvatar: '🛡️',
        opponentIsBot: true,
        round: 1,
        maxRounds: 4,
        playerHp: 100,
        opponentHp: 100,
        draftedPieces: initialPlayerDraft,
        selectedPieceId: initialPlayerDraft[0]?.id || null,
        selectedStance: 'attack',
        isOrderSubmitted: false,
        isRevealing: false,
        history: [],
        winner: null,
      };

      set({
        tacticalDuel: duelState,
        isTacticalDuelModalOpen: true,
      });
    },

    selectDuelPieceAndStance: (pieceId, stance) => {
      const state = get();
      if (!state.tacticalDuel) return;
      soundEffects.playTap();
      set({
        tacticalDuel: {
          ...state.tacticalDuel,
          selectedPieceId: pieceId,
          selectedStance: stance,
        },
      });
    },

    submitDuelRoundOrder: () => {
      const state = get();
      const duel = state.tacticalDuel;
      if (!duel || duel.isOrderSubmitted || duel.winner) return;

      const playerPiece = duel.draftedPieces.find((p) => p.id === duel.selectedPieceId) || duel.draftedPieces[0];
      const playerStance = duel.selectedStance || 'attack';

      const playerOrder: TacticalDuelOrder = {
        round: duel.round,
        playerId: 'player',
        pieceId: playerPiece.id,
        stance: playerStance,
        timestamp: Date.now(),
      };

      const botPieceList = getRandomDuelDraft(3);
      const botDecision = getBotDuelOrder(duel.round, botPieceList, duel.draftedPieces, 'tactical');
      const botOrder: TacticalDuelOrder = {
        round: duel.round,
        playerId: 'opponent',
        pieceId: botDecision.piece.id,
        stance: botDecision.stance,
        timestamp: Date.now(),
      };

      soundEffects.playFanfare();

      set({
        tacticalDuel: {
          ...duel,
          isOrderSubmitted: true,
          isRevealing: true,
        },
      });

      setTimeout(() => {
        const curDuel = get().tacticalDuel;
        if (!curDuel) return;

        const roundResult = resolveSimultaneousDuelRound(
          curDuel.round,
          playerOrder,
          botOrder,
          playerPiece,
          botDecision.piece,
          get().club.name,
          curDuel.opponentName
        );

        const newPlayerHp = Math.max(0, curDuel.playerHp - roundResult.damageToPlayer);
        const newOpponentHp = Math.max(0, curDuel.opponentHp - roundResult.damageToOpponent);

        let matchWinner: 'player' | 'opponent' | 'draw' | null = null;
        if (newPlayerHp === 0 && newOpponentHp === 0) matchWinner = 'draw';
        else if (newPlayerHp === 0) matchWinner = 'opponent';
        else if (newOpponentHp === 0) matchWinner = 'player';
        else if (curDuel.round >= curDuel.maxRounds) {
          if (newPlayerHp > newOpponentHp) matchWinner = 'player';
          else if (newOpponentHp > newPlayerHp) matchWinner = 'opponent';
          else matchWinner = 'draw';
        }

        const nextRound = curDuel.round + 1;
        const newDraft = getRandomDuelDraft(3);

        let updatedMissions = get().dailyMissions;
        if (matchWinner === 'player') {
          soundEffects.playFanfare();
          confetti({ particleCount: 100, spread: 80 });
          updatedMissions = (updatedMissions || INITIAL_DAILY_MISSIONS).map((m) => {
            if (m.id === 'mission_tactical_duel' && !m.isClaimed) {
              return { ...m, current: Math.min(m.target, m.current + 1) };
            }
            return m;
          });
        }

        set({
          dailyMissions: updatedMissions,
          tacticalDuel: {
            ...curDuel,
            round: nextRound,
            playerHp: newPlayerHp,
            opponentHp: newOpponentHp,
            draftedPieces: newDraft,
            selectedPieceId: newDraft[0]?.id || null,
            selectedStance: 'attack',
            isOrderSubmitted: false,
            isRevealing: false,
            history: [roundResult, ...curDuel.history],
            winner: matchWinner,
          },
        });
      }, 1000);
    },

    closeTacticalDuel: () => {
      set({
        isTacticalDuelModalOpen: false,
      });
    },

    syncPvPRoomToDuelState: (room: DuelRoom, currentUid: string) => {
      const isHost = room.hostUid === currentUid;
      const opponentName = isHost 
        ? (room.guestClubName || 'المدرب الضيف (في الانتظار...)') 
        : room.hostClubName;

      const playerHp = isHost ? room.hostHp : room.guestHp;
      const opponentHp = isHost ? room.guestHp : room.hostHp;

      // Extract player's drafted pieces from catalog
      const playerPieceIds = isHost ? room.hostDraftedPieceIds : room.guestDraftedPieceIds;
      const draftedPieces = playerPieceIds
        .map(id => DUEL_PIECES_CATALOG.find(p => p.id === id))
        .filter(Boolean) as DuelPiece[];

      // Winner mapping
      let winner: 'player' | 'opponent' | 'draw' | null = null;
      if (room.winner) {
        if (room.winner === 'draw') winner = 'draw';
        else if ((isHost && room.winner === 'host') || (!isHost && room.winner === 'guest')) {
          winner = 'player';
        } else {
          winner = 'opponent';
        }
      }

      const existingDuel = get().tacticalDuel;
      const history = room.lastRoundResult 
        ? (existingDuel?.history?.some(h => h.round === room.lastRoundResult?.round)
            ? existingDuel.history
            : [room.lastRoundResult, ...(existingDuel?.history || [])])
        : (existingDuel?.history || []);

      const isNewRound = existingDuel?.round !== room.round;

      set({
        tacticalDuel: {
          isActive: true,
          matchId: room.id,
          opponentName,
          opponentAvatar: isHost ? '⚔️' : '🛡️',
          opponentIsBot: false,
          round: room.round,
          maxRounds: room.maxRounds,
          playerHp,
          opponentHp,
          draftedPieces: draftedPieces.length > 0 ? draftedPieces : (existingDuel?.draftedPieces || getRandomDuelDraft(4)),
          selectedPieceId: isNewRound ? (draftedPieces[0]?.id || null) : (existingDuel?.selectedPieceId || draftedPieces[0]?.id || null),
          selectedStance: isNewRound ? 'attack' : (existingDuel?.selectedStance || 'attack'),
          isOrderSubmitted: isNewRound ? false : (existingDuel?.isOrderSubmitted || false),
          isRevealing: false,
          history,
          winner,
          roomId: room.id,
          pvpRole: isHost ? 'host' : 'guest',
        },
        isTacticalDuelModalOpen: true,
      });
    },

    exportGameData: () => {
      const state = get();
      const exportObj = {
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        club: state.club,
        vipPoints: state.vipPoints,
        storyMissions: state.storyMissions,
        leagueStandings: state.leagueStandings,
      };
      return JSON.stringify(exportObj, null, 2);
    },

    importCustomDataPack: (jsonText) => {
      try {
        const parsed = JSON.parse(jsonText);
        if (!parsed.club || !parsed.club.name) {
          return { success: false, message: 'ملف البيانات غير صالح — ينقصه كائن النادي الأساسي.' };
        }
        set({
          club: parsed.club,
          vipPoints: parsed.vipPoints || get().vipPoints,
          storyMissions: parsed.storyMissions || get().storyMissions,
          leagueStandings: parsed.leagueStandings || get().leagueStandings,
        });
        soundEffects.playFanfare();
        return { success: true, message: 'تم استيراد حزمة البيانات بنجاح وتطبيقها محلياً!' };
      } catch {
        return { success: false, message: 'خطأ في تنسيق JSON. يرجى التأكد من صحة الملف المرفوع.' };
      }
    },

    resetCareer: () => {
      localStorage.removeItem(STORAGE_KEY);
      set({
        club: REAL_INITIAL_PLAYER_CLUB,
        vipPoints: 0,
        checkInStreak: 0,
        hasClaimedLoginBonus: false,
        isGuest: true,
        storyMissions: STORY_CHAPTER_1_MISSIONS,
        leagueStandings: REAL_INITIAL_STANDINGS,
        matchHistory: [],
        tournamentStats: [],
        simulatedMatchdays: [],
        lastRoundSummary: null,
        activeTab: 'dashboard',
        isMatchLive: false,
      });
    },
  };
});
