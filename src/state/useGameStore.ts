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
  RoundPerformer,
  MatchScoutReport,
  SavedTacticalPlan,
  PendingFacilityUpgrade,
  PlayerNegotiation,
  NegotiationStatus,
  AcademyDiscovery
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
import { predictMatch, calcAttackPower, calcDefensePower, buildSlotAssignments } from '../engine/matchPrediction';
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
import { createRefereeFromSeed } from '../domain/referee/createRefereeFromSeed';
import { SeededRandom } from '../engine/prng';
import { hashStringToSeed } from '../domain/shared/seed';
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
import { calculateTeamSynergy, TeamSynergyResult } from '../utils/teamSynergy';
import { persistenceService } from '../services/persistenceService';
import {
  mergeAssistantIntoRuntimeState,
  readAiNarrationEnabledFromSave,
} from '../services/persistence/assistantPersist';
import { moveEntity } from '../domain/squad/moveEntity';
import type { MoveResult } from '../domain/squad/moveEntity';
import type { MoveTarget } from '../domain/squad/squadTypes';
import { applySquadState, createSquadState } from '../domain/squad/squadStateAdapter';
import { EMPTY_SLOT } from '../domain/squad/squadTypes';
import { applyRecommendation } from '../domain/tactics/bestTactics/applyRecommendation';
import { buildDismissEvent } from '../domain/assistant/recommendations/filterIgnored';
import type { AssistantState, Recommendation as AssistantRecommendation } from '../domain/assistant/types';
import {
  appendAppliedAssistantId,
  appendIgnoredAssistantId,
} from '../domain/assistant/runtimeState';
import type { ApplyBestTacticsError } from '../domain/tactics/bestTactics/applyRecommendation';
import type { BestTacticsRecommendation } from '../domain/tactics/bestTactics/types';
import type { Result } from '../domain/shared/result';
import { deriveSyntheticOpponentTactics, opponentTacticsWithRoles } from '../domain/tactics/deriveSyntheticOpponentTactics';
import { assignLineupToFormation } from '../domain/squad/assignFormationLineup';
import { migrateClubFootballTactics } from '../domain/tactics/migrateFootballSimulation';
import { buildPostMatchLivingWorldResult } from '../domain/tactics/postMatchLivingWorld';
import { applyStateChanges } from '../domain/livingWorld/reducer';
import { SaveStatus } from '../types/save';
import { hydrateLivingWorldFromClub } from '../domain/livingWorld/migrateLivingWorld';
import { ensurePhaseFState, withPhaseF } from '../domain/livingWorld/phaseF/ensurePhaseF';
import {
  dispatchGameEvent as runLivingWorldDispatch,
  type DispatchResult,
} from '../domain/livingWorld/events/dispatch';
import { ensureDefaultHandlersRegistered } from '../domain/livingWorld/events/registry';
import { ingestGameEvent } from '../domain/livingWorld/events/ingest';
import { applyNotificationPipelineForEvents } from '../domain/livingWorld/notifications/pipeline';
import type { GameEvent, LivingWorldState } from '../domain/livingWorld/types';
import {
  buildMatchCompletedEvent,
  recentUserResultsFromHistory,
  runSeasonEndLivingWorld,
} from '../domain/livingWorld/tick/livingWorldTick';
import { applyUserPostMatchPlayerLife, applyUserWeeklyPlayerLife } from '../domain/playerLife/storeBridge';
import { applyUserWeeklyRecruitment } from '../domain/recruitment/storeBridge';
import { ensureRecruitmentV5 } from '../domain/recruitment/migration/migrateRecruitmentV5';
import type { RecruitmentWorldState } from '../domain/recruitment';
import { ensureClubManagementV6 } from '../domain/clubManagement/migration/migrateClubManagementV6';
import type {
  ClubManagementState,
  ClubManagementChange,
  StaffMember,
  DelegationTask,
  DelegationMode,
} from '../domain/clubManagement/types';
import type { BoardRequestKind } from '../domain/clubManagement/influence/computeInfluence';
import {
  computeStaffWeeklyWages,
  postFinanceTransaction,
} from '../domain/clubManagement/finance/financeLedger';
import { evaluateBoardRequest } from '../domain/clubManagement/influence/computeInfluence';
import type { GameSaveData } from '../types/save';
import {
  applyUserWeeklyClubManagement,
  computeMatchGateReceipt,
  getClubModifiersForSave,
  sharedLegacySpendCheck,
  recordMatchRevenueOnClubManagement,
  recordPlayerSale,
  recordPlayerPurchase,
  applyPostMatchFanUpdate,
} from '../domain/clubManagement/storeBridge';
import { applyClubManagementChanges } from '../domain/clubManagement/reducer';
import { applyResultToBoardTrust } from '../domain/clubManagement/board/boardLogic';
import { syncClubFromClubManagement } from '../domain/clubManagement/syncLegacyClub';
import { deriveGameWeekFromSave } from '../domain/recruitment/world/gameWeek';
import {
  legacyDrillToPlan,
  stateChangesForTrainingSession,
} from '../domain/playerLife/trainingEngine';
import { resolveInteraction } from '../domain/playerLife/integration';
import { captaincyChangeConsequences } from '../domain/playerLife/captaincy';
import { assignMentoringPair } from '../domain/playerLife/mentoring';
import { resolvePressAnswer } from '../domain/livingWorld/press/resolver';
import type { PressQuestion, PressAnswerOption } from '../domain/livingWorld/press/types';
import { mergeNarrativeCache } from '../domain/livingWorld/narrative/cache';
import type { NarrativeCacheEntry } from '../domain/livingWorld/phaseF/types';

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
  | 'admin'
  | 'tactical_duel'
  | 'round_summary'
  | 'living_world'
  | 'settings';

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
  missionSkipUsedDate: string | null; // VIP 10+ one-click mission skip, once per day
  savedTacticalPlans: SavedTacticalPlan[]; // VIP 12+ exclusive: up to 5 saved tactic presets
  pendingFacilityUpgrades: PendingFacilityUpgrade[]; // facilities now take real construction time
  activeNegotiations: PlayerNegotiation[]; // VIP 6+ get an extra simultaneous negotiation slot
  academyDiscoveries: AcademyDiscovery[]; // VIP 13+ get an extra simultaneous academy scout slot
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

  // Match Scouting Reports
  matchScoutReports: Record<number, MatchScoutReport>;

  // Season Finale & Career Transition
  isSeasonFinaleModalOpen: boolean;

  // Live Match Simulation
  activeEngine: FootballMatchEngine | null;
  activeMatchRecord: MatchRecord | null;
  /** The home side's LIVE tactics for the match in progress — a match-only copy, kept in sync with the engine's own (never club.footballTactics). Null when no match is live. */
  activeMatchHomeTactics: FootballTactics | null;
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

  livingWorld: LivingWorldState;
  recruitmentWorld: RecruitmentWorldState;
  clubManagement: ClubManagementState;
  assistant: AssistantState;
  saveId: string;
  savePassthrough: Record<string, unknown>;

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
  /** Validated squad move (XI / substitutes / bench). Returns the typed Result; the store applies it only on success. */
  moveSquadEntity: (playerId: string, target: MoveTarget) => MoveResult;
  /** Applies a Best Tactics recommendation (XI + substitutes + tactics) in ONE update — only from an explicit user "Apply". The store is untouched on Err. */
  applyBestTactics: (rec: BestTacticsRecommendation) => Result<Club, ApplyBestTacticsError>;
  applyAssistantRecommendation: (rec: AssistantRecommendation) => { ok: boolean; error?: string };
  dismissAssistantRecommendation: (rec: AssistantRecommendation) => void;
  setFootballRoles: (roles: { captainId?: string; penaltyTakerId?: string; freeKickTakerId?: string; cornerTakerId?: string }) => void;

  // Training & Facilities
  runTrainingDrill: (drillType: 'stamina' | 'technical' | 'finishing') => boolean;
  upgradeFacility: (facility: keyof ClubFacilities) => boolean;

  // Transfers & Academy
  buyPlayer: (player: Player) => boolean;
  addPlayerToSquad: (player: Player) => boolean;
  sellPlayer: (playerId: string) => void;
  promoteAcademyTalent: () => void; // legacy basketball-only path (kept for basketball; football uses the scouting flow below)
  scoutAcademyTalent: () => { success: boolean; message: string };
  promoteAcademyDiscovery: (discoveryId: string) => { success: boolean; message: string };
  releaseAcademyDiscovery: (discoveryId: string) => void;
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
  /** Live in-match tactics change (formation/mentality/tempo/pressing/width/offsideTrap subset). Returns the resulting 'tactical_change' MatchEvent, or null if no match is live. */
  applyLiveTactics: (changes: Partial<FootballTactics>) => MatchEvent | null;
  instantSimulateMatch: () => void;
  skipAndSimulateNextMatch: () => Promise<void>;
  simulateMatchday: (matchday: number) => RoundSummary | null;
  unlockMatchScout: (method: 'coins' | 'diamonds') => { success: boolean; message: string };
  setSeasonFinaleModalOpen: (open: boolean) => void;
  renewSeasonWithCurrentClub: () => void;

  // Daily & VIP
  claimedVipUpgradeChests: number[]; // VIP levels where the one-time upgrade chest was opened
  upgradeVipWithDiamonds: () => { success: boolean; message: string };
  claimVipUpgradeChest: (level: number) => { success: boolean; message: string };
  claimDailyVIPReward: () => { success: boolean; message: string };
  // VIP 10+: instantly complete & claim one chosen unclaimed daily mission, once per day.
  skipDailyMissionInstant: (missionId: string) => { success: boolean; message: string };
  saveTacticalPlan: (name: string) => { success: boolean; message: string };
  loadTacticalPlan: (id: string) => { success: boolean; message: string };
  deleteTacticalPlan: (id: string) => void;
  // Facility construction: completes any pending upgrades whose timer has elapsed
  // (called on load + on a periodic tick from App.tsx so offline time counts too).
  processFacilityUpgrades: () => void;
  skipFacilityUpgrade: (facility: keyof ClubFacilities) => { success: boolean; message: string };
  // Real transfer negotiations: an initial offer gets accepted, rejected, or
  // countered by the player's agent depending on personality + offer ratio.
  startNegotiation: (playerId: string, initialOfferAmount: number) => { success: boolean; message: string };
  submitCounterOffer: (negotiationId: string, newOfferAmount: number) => { success: boolean; message: string };
  acceptNegotiationCounter: (negotiationId: string) => { success: boolean; message: string };
  cancelNegotiation: (negotiationId: string) => void;
  // Applies a reward that has ALREADY been granted server-side by a redeemed
  // gift code (see FirebaseContext.redeemGiftCode) into local game state.
  applyRedeemReward: (reward: { coins: number; diamonds: number; trainingPoints: number }) => void;
  claimDailyCheckIn: () => void;

  // Custom Data Pack Editor
  exportGameData: () => string;
  importCustomDataPack: (jsonText: string) => { success: boolean; message: string };
  resetCareer: () => void;

  // Squad Synergy & Chemistry feedback for the current football lineup/formation/tactics
  getTeamSynergy: () => TeamSynergyResult;

  // Centralized Persistence & Save Management
  saveStatus: SaveStatus;
  saveCareerImmediate: () => boolean;
  dispatchLivingWorldEvent: (event: GameEvent) => DispatchResult;
  resolvePlayerLifeInteraction: (interactionId: string, responseId: string) => boolean;
  changeCaptainWithConsequences: (newCaptainId: string) => void;
  assignMentoringPairAction: (mentorId: string, menteeId: string) => void;
  removeMentoringPairAction: (menteeId: string) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  runCustomTrainingPlan: (plan: import('../domain/playerLife/types').TrainingSessionPlan) => boolean;

  // Phase E Club Management Actions
  applyClubManagementChanges: (changes: ClubManagementChange[]) => void;
  hireStaffMember: (candidate: StaffMember) => { success: boolean; message: string };
  fireStaffMember: (staffId: string) => { success: boolean; message: string };
  updateDelegationTask: (
    task: DelegationTask,
    mode: DelegationMode,
    assigneeStaffId?: string,
  ) => void;
  submitBoardRequest: (
    request: BoardRequestKind,
  ) => { approved: boolean; message: string; reasonCodes: string[] };
  upgradeAnalyticsDepartment: () => { success: boolean; message: string };

  // Phase F Living World & Narrative Actions
  aiNarrationEnabled: boolean;
  setAiNarrationEnabled: (enabled: boolean) => void;
  submitPressConferenceAnswer: (
    question: PressQuestion,
    answer: PressAnswerOption,
  ) => {
    success: boolean;
    visibleMessageAr: string;
    visibleMessageEn: string;
    cohesionDelta: number;
  };
  storeNarrativeCacheEntry: (entry: NarrativeCacheEntry) => void;
}

export const useGameStore = create<GameState>((set, get) => {
  // Calendar-day string (YYYY-MM-DD) used to gate "once per day" claims
  // (VIP daily chest, coach daily check-in) against real day changes
  // instead of an in-memory flag that resets on every page refresh.
  const getTodayStr = () => new Date().toISOString().split('T')[0];

  // VIP-gated matchday bench capacity (see VIPPrivilege.maxBenchSlots).
  // A newly signed/promoted player only joins the tactical-swap-eligible
  // bench if there's room; otherwise they stay in the squad as a reserve
  // (still sellable/manageable, just not swap-in eligible until a slot frees
  // up or the coach reaches a higher VIP tier).
  const getMaxBenchSlots = (vipPoints: number) => {
    let level = 1;
    for (const tier of VIP_LEVELS) {
      if (vipPoints >= tier.pointsRequired) level = tier.level;
    }
    const tier = VIP_LEVELS.find(t => t.level === level) || VIP_LEVELS[0];
    return tier.maxBenchSlots || 5;
  };

  const getMaxActiveNegotiations = (vipPoints: number) => {
    let level = 1;
    for (const tier of VIP_LEVELS) {
      if (vipPoints >= tier.pointsRequired) level = tier.level;
    }
    const tier = VIP_LEVELS.find(t => t.level === level) || VIP_LEVELS[0];
    return tier.maxActiveNegotiations || 1;
  };

  const getMaxAcademySlots = (vipPoints: number) => {
    let level = 1;
    for (const tier of VIP_LEVELS) {
      if (vipPoints >= tier.pointsRequired) level = tier.level;
    }
    const tier = VIP_LEVELS.find(t => t.level === level) || VIP_LEVELS[0];
    return tier.maxAcademySlots || 1;
  };

  // VIP 14+: 25% less post-match fatigue buildup / stamina drain for starters.
  const getFatigueProtectionMultiplier = (vipPoints: number) => {
    let level = 1;
    for (const tier of VIP_LEVELS) {
      if (vipPoints >= tier.pointsRequired) level = tier.level;
    }
    const tier = VIP_LEVELS.find(t => t.level === level) || VIP_LEVELS[0];
    return tier.fatigueProtectionPercent ? 1 - tier.fatigueProtectionPercent / 100 : 1;
  };

  // Small first/last name pool for freshly-scouted academy prospects — kept
  // local (rather than pulling from realLeaguesData's private NAME_POOLS)
  // to avoid touching that module's exports.
  const ACADEMY_FIRST_NAMES_AR = ['خالد', 'ياسر', 'فيصل', 'سلطان', 'ماجد', 'عبدالعزيز', 'تركي', 'نواف', 'بندر', 'راكان'];
  const ACADEMY_LAST_NAMES_AR = ['الغامدي', 'العتيبي', 'القحطاني', 'الزهراني', 'الشمري', 'الدوسري', 'المطيري', 'الحربي'];
  const ACADEMY_POSITIONS: Array<Player['position']> = ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'RW', 'ST'];

  /**
   * Generates one freshly-scouted academy prospect. Higher youthAcademyLevel
   * shifts the potential distribution upward (better facility = better eye
   * for 5-star talent), with genuine randomness on top so it's never the
   * same guaranteed player twice.
   */
  const generateAcademyTalent = (sport: 'football' | 'basketball', youthAcademyLevel: number): { talent: Player; starRating: number } => {
    const first = ACADEMY_FIRST_NAMES_AR[Math.floor(Math.random() * ACADEMY_FIRST_NAMES_AR.length)];
    const last = ACADEMY_LAST_NAMES_AR[Math.floor(Math.random() * ACADEMY_LAST_NAMES_AR.length)];
    const fullName = `${first} ${last}`;
    const position: Player['position'] = sport === 'football'
      ? ACADEMY_POSITIONS[Math.floor(Math.random() * ACADEMY_POSITIONS.length)]
      : (['PG', 'SG', 'SF', 'PF', 'C'] as Player['position'][])[Math.floor(Math.random() * 5)];

    // Facility level 1-10 nudges the average potential from ~72 up to ~90.
    const facilityBonus = (youthAcademyLevel - 1) * 1.8;
    const potential = Math.max(60, Math.min(96, Math.round(68 + facilityBonus + (Math.random() * 20 - 4))));
    const overall = Math.max(48, Math.round(potential - (12 + Math.random() * 10)));
    const starRating = potential >= 90 ? 5 : potential >= 84 ? 4 : potential >= 76 ? 3 : potential >= 68 ? 2 : 1;
    const rarity: Player['rarity'] = starRating >= 5 ? 'legend' : starRating >= 4 ? 'rare' : 'prospect';

    const talent: Player = {
      id: `academy_gen_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      sport,
      name: fullName,
      nameEn: fullName,
      age: 16 + Math.floor(Math.random() * 3),
      nationality: 'السعودية',
      nationalityFlag: '🇸🇦',
      position,
      secondaryPositions: [],
      overall,
      potential,
      attributes: {
        pace: overall + Math.floor(Math.random() * 6) - 3,
        dribbling: overall + Math.floor(Math.random() * 6) - 3,
        passing: overall + Math.floor(Math.random() * 6) - 3,
        shooting: overall + Math.floor(Math.random() * 6) - 3,
        physical: overall + Math.floor(Math.random() * 6) - 3,
        defending: position === 'GK' ? 30 : overall + Math.floor(Math.random() * 6) - 3,
        goalkeeping: position === 'GK' ? overall : 10,
        speed: overall,
        playmaking: overall,
        shootingThree: overall,
      },
      rarity,
      personality: (['ambitious', 'professional', 'nervous', 'leader'] as const)[Math.floor(Math.random() * 4)],
      traits: starRating >= 5 ? ['خريج الأكاديمية الذهبي', 'مهارات فطرية'] : ['خريج الأكاديمية'],
      morale: 90,
      form: 6 + Math.floor(Math.random() * 3),
      stamina: 95,
      fatigue: 0,
      injuredWeeks: 0,
      suspendedMatches: 0,
      contractYears: 4,
      wage: Math.round(overall * 12),
      marketValue: Math.round(overall * overall * 700),
      matchesPlayed: 0,
      goalsOrPoints: 0,
      assists: 0,
      cleanSheetsOrRebounds: 0,
      averageRating: 0,
    };

    return { talent, starRating };
  };

  // Personality drives how hard an agent haggles: the minimum offer/marketValue
  // ratio they'll accept outright, and how likely they are to blow up a
  // reasonable-looking offer out of unpredictability (temperamental only).
  const getPersonalityDemandFactor = (personality: string): { minAcceptRatio: number; volatile: boolean } => {
    switch (personality) {
      case 'leader': return { minAcceptRatio: 1.08, volatile: false };
      case 'ambitious': return { minAcceptRatio: 1.03, volatile: false };
      case 'temperamental': return { minAcceptRatio: 0.98, volatile: true };
      case 'professional': return { minAcceptRatio: 0.95, volatile: false };
      case 'loyal': return { minAcceptRatio: 0.90, volatile: false };
      case 'nervous': return { minAcceptRatio: 0.88, volatile: false };
      default: return { minAcceptRatio: 0.95, volatile: false };
    }
  };

  /**
   * Resolves one round of a negotiation: accepted / countered / rejected,
   * with a bilingual flavor message. Mutates nothing — pure function.
   */
  const resolveNegotiationRound = (
    player: Player,
    offerAmount: number,
    roundsUsed: number,
    maxRounds: number,
    isAr: boolean
  ): { status: NegotiationStatus; counterAmount?: number; messageAr: string; messageEn: string } => {
    const { minAcceptRatio, volatile } = getPersonalityDemandFactor(player.personality);
    const ratio = offerAmount / player.marketValue;

    // Temperamental players occasionally reject a perfectly fine offer out of pride.
    if (volatile && Math.random() < 0.18 && ratio < 1.15) {
      return {
        status: 'rejected',
        messageAr: `😤 وكيل ${player.name} رفض العرض فجأة ويطلب وقتاً للتفكير — شخصية اللاعب متقلبة المزاج.`,
        messageEn: `😤 ${player.nameEn}'s agent suddenly rejected the offer — his temperamental personality strikes again.`
      };
    }

    if (ratio >= minAcceptRatio) {
      return {
        status: 'accepted',
        messageAr: `✅ وافق ${player.name} ووكيله على الانتقال بهذا العرض!`,
        messageEn: `✅ ${player.nameEn} and his agent accepted the offer!`
      };
    }

    // Too insulting to even counter.
    if (ratio < minAcceptRatio - 0.30) {
      return {
        status: 'rejected',
        messageAr: `❌ اعتبر وكيل ${player.name} العرض مهيناً وأنهى المفاوضات فوراً.`,
        messageEn: `❌ ${player.nameEn}'s agent found the offer insulting and ended talks on the spot.`
      };
    }

    if (roundsUsed >= maxRounds) {
      return {
        status: 'expired',
        messageAr: `⌛ انتهت جولات التفاوض المتاحة دون اتفاق مع ${player.name}.`,
        messageEn: `⌛ Ran out of negotiation rounds with ${player.nameEn} — no deal reached.`
      };
    }

    const counterAmount = Math.round((player.marketValue * (minAcceptRatio - 0.03)) / 5000) * 5000;
    return {
      status: 'countered',
      counterAmount: Math.max(counterAmount, offerAmount + 5000),
      messageAr: `🤝 رفض وكيل ${player.name} العرض الأولي وقدّم طلباً مضاداً.`,
      messageEn: `🤝 ${player.nameEn}'s agent declined the opening bid and made a counter-demand.`
    };
  };

  // Load saved state if present via centralized persistence service
  const loadSavedState = () => {
    return persistenceService.loadFromStorage();
  };

  const saveToStorage = (_state?: Partial<GameState>, immediate = false) => {
    if (immediate) {
      persistenceService.saveImmediate(get());
    } else {
      persistenceService.scheduleAutoSave(get, 600);
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

  const buildPartialSave = (state: GameState): GameSaveData =>
    ({
      saveVersion: 6,
      saveId: state.saveId,
      savedAt: new Date().toISOString(),
      appVersion: '2.1.0',
      currentSport: state.currentSport,
      language: state.language,
      soundEnabled: state.soundEnabled,
      hasSelectedInitialClub: state.hasSelectedInitialClub,
      isGuest: state.isGuest,
      hasClaimedLoginBonus: state.hasClaimedLoginBonus,
      club: state.club,
      energy: state.energy,
      lastEnergyUpdate: state.lastEnergyUpdate,
      vipPoints: state.vipPoints,
      lastVipClaimDate: state.lastVipClaimDate,
      claimedVipUpgradeChests: [],
      missionSkipUsedDate: state.missionSkipUsedDate,
      checkInStreak: state.checkInStreak,
      lastCheckInDate: state.lastCheckInDate,
      savedTacticalPlans: state.savedTacticalPlans,
      pendingFacilityUpgrades: state.pendingFacilityUpgrades,
      activeNegotiations: state.activeNegotiations,
      academyDiscoveries: state.academyDiscoveries,
      scoutMarket: state.scoutMarket,
      dailyMissions: state.dailyMissions,
      storyMissions: state.storyMissions,
      leagueStandings: state.leagueStandings,
      leagueFixtures: state.leagueFixtures,
      matchHistory: state.matchHistory,
      tournamentStats: state.tournamentStats,
      simulatedMatchdays: state.simulatedMatchdays,
      matchScoutReports: state.matchScoutReports,
      unlockedSpeed2x: state.unlockedSpeed2x,
      livingWorld: state.livingWorld,
      recruitmentWorld: state.recruitmentWorld,
      clubManagement: state.clubManagement,
    }) as GameSaveData;

  const computeUserMatchIncome = (state: GameState, scale = 1): number => {
    const sponsor = state.club.finances.sponsorIncomePerMatch;
    if (!state.clubManagement) {
      return Math.round((state.club.finances.ticketPrice * 5200 + sponsor) * scale);
    }
    const mods = getClubModifiersForSave(buildPartialSave(state), state.club);
    const gate = computeMatchGateReceipt({
      ticketPrice: state.club.finances.ticketPrice,
      modifiers: mods,
      isHome: true,
    });
    return Math.round((gate + sponsor) * scale);
  };

  const applyMatchEconomy = (
    state: GameState,
    playerLifeClub: Club,
    matchIncome: number,
    won: boolean,
    drawn: boolean,
    boardPenalty: number,
    fanPenalty: number,
  ): { club: Club; clubManagement: ClubManagementState } => {
    let cm = state.clubManagement;
    const gw = deriveGameWeekFromSave(buildPartialSave(state));
    if (cm) {
      const sponsor = state.club.finances.sponsorIncomePerMatch;
      cm = recordMatchRevenueOnClubManagement(cm, {
        gateReceipt: Math.max(0, matchIncome - sponsor),
        sponsorIncome: sponsor,
        gameWeek: gw,
        season: state.livingWorld.currentSeason,
        timestampIso: new Date().toISOString(),
      });
      cm = applyPostMatchFanUpdate(
        cm,
        won,
        drawn,
        state.club.finances.ticketPrice,
        gw,
        state.livingWorld.currentSeason,
        state.club.id,
      );
      cm = applyClubManagementChanges(cm, [
        { kind: 'patchBoard', patch: applyResultToBoardTrust(cm.board, won, drawn) },
      ]);
      const club = syncClubFromClubManagement(
        {
          ...playerLifeClub,
          finances: {
            ...playerLifeClub.finances,
            reputation: playerLifeClub.finances.reputation + (won ? 35 : 10),
          },
        },
        cm,
      );
      return { club, clubManagement: cm };
    }
    return {
      clubManagement: cm,
      club: {
        ...playerLifeClub,
        boardTrust: Math.min(100, Math.max(0, state.club.boardTrust + (won ? 4 : (drawn ? 0 : -boardPenalty)))),
        fanMood: Math.min(100, Math.max(0, state.club.fanMood + (won ? 6 : (drawn ? 1 : -fanPenalty)))),
        finances: {
          ...playerLifeClub.finances,
          coins: state.club.finances.coins + matchIncome,
          reputation: playerLifeClub.finances.reputation + (won ? 35 : 10),
        },
      },
    };
  };

  const applyPostMatchPlayerLife = (
    state: GameState,
    record: MatchRecord,
    won: boolean,
    drawn: boolean,
  ): { club: Club; livingWorld: LivingWorldState; clubManagement?: ClubManagementState } => {
    const rng = new SeededRandom(record.seed);
    const deltas = deltasFromUserMatch(
      record,
      resolveUserTeam(),
      resolveOpponentTeam(record.awayClubId, record.awayClubName),
      rng,
    );
    const md = record.matchDay ?? 1;
    const recentMatchesIn7Days = state.leagueFixtures.filter(
      (f) => f.played && f.matchday >= md - 3 && f.matchday <= md,
    ).length;
    return applyUserPostMatchPlayerLife({
      club: state.club,
      livingWorld: state.livingWorld,
      saveSnapshot: { clubManagement: state.clubManagement },
      saveId: state.saveId,
      matchday: md,
      won,
      drawn,
      goalsFor: record.homeScore,
      goalsAgainst: record.awayScore,
      deltas,
      fatigueProtectionMult: getFatigueProtectionMultiplier(state.vipPoints),
      recentMatchesIn7Days,
    });
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
    if (!fixtures || fixtures.length === 0) {
      fixtures = generateFixturesForLeague(state.club.divisionId, state.club.id);
      set({ leagueFixtures: fixtures });
      saveToStorage({ leagueFixtures: fixtures });
    } else if (fixtures.every(f => f.played)) {
      // All season fixtures completed! Open season finale modal instead of restarting
      if (allowSeasonRollover) {
        set({ isSeasonFinaleModalOpen: true, isLoadingMatch: false });
      }
      return null;
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
    const opponentTacticsCore = deriveSyntheticOpponentTactics(
      nextFixture.opponentClubId,
      opponentConfig.starRating,
    );
    const opponentLineup = assignLineupToFormation(finalSquad, opponentTacticsCore.formation);
    const opponentTactics = opponentTacticsWithRoles(opponentTacticsCore, opponentLineup);
    const opponentBase: Club = {
      ...REAL_INITIAL_PLAYER_CLUB,
      id: nextFixture.opponentClubId,
      name: nextFixture.opponentClubName,
      nameEn: opponentConfig.nameEn || nextFixture.opponentClubName,
      city: opponentConfig.city ? `${opponentConfig.city}، ${opponentConfig.country}` : '',
      colors: opponentConfig.colors,
      logoUrl: nextFixture.opponentBadge,
      footballSquad: finalSquad,
      footballLineup: opponentLineup,
      footballTactics: opponentTactics,
    };
    const opponent = migrateClubFootballTactics(opponentBase);

    // Team power from the starting XIs — paired with the ACTUAL formation
    // slot each player is in, so an out-of-position starter shows the same
    // reduced power here as he will in the live match (single source of truth).
    const userEffectiveSquad = buildSlotAssignments(state.club);
    const oppEffectiveSquad = buildSlotAssignments(opponent);

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

    const scoutReport = state.matchScoutReports?.[nextFixture.matchday];
    const isScouted = !!scoutReport?.unlocked;
    const scoutAccuracy = scoutReport?.accuracyPercent || Math.min(98, Math.round(70 + (activeVipTier.level - 1) * 1.5));

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
      isScouted,
      scoutAccuracy,
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
    let weeklyClub = state.club;
    let weeklyWorld = state.livingWorld;
    let weeklyRecruitmentWorld = state.recruitmentWorld;
    let weeklyClubManagement = state.clubManagement;
    if (summary) {
      const weekly = applyUserWeeklyPlayerLife({
        club: weeklyClub,
        livingWorld: weeklyWorld,
        saveSnapshot: { clubManagement: weeklyClubManagement },
        saveId: state.saveId,
        matchday: summary.matchday,
      });
      weeklyClub = weekly.club;
      weeklyWorld = weekly.livingWorld;

      const recruitment = applyUserWeeklyRecruitment({
        club: weeklyClub,
        livingWorld: weeklyWorld,
        scoutMarket: state.scoutMarket,
        leagueStandings: standings,
        simulatedMatchdays,
        activeNegotiations: state.activeNegotiations,
        recruitmentWorld: weeklyRecruitmentWorld,
        saveId: state.saveId,
      });
      weeklyClub = recruitment.club;
      weeklyWorld = recruitment.livingWorld;
      weeklyRecruitmentWorld = recruitment.recruitmentWorld;

      const partialSave = buildPartialSave({
        ...state,
        club: weeklyClub,
        livingWorld: weeklyWorld,
        recruitmentWorld: weeklyRecruitmentWorld,
        clubManagement: weeklyClubManagement,
        leagueStandings: standings,
        simulatedMatchdays,
      });
      const cmTick = applyUserWeeklyClubManagement({
        save: partialSave,
        club: weeklyClub,
        livingWorld: weeklyWorld,
        saveId: state.saveId,
        matchday: summary.matchday,
      });
      weeklyClub = cmTick.club;
      weeklyWorld = cmTick.livingWorld;
      weeklyClubManagement = cmTick.clubManagement;
    }
    set({
      leagueStandings: standings,
      tournamentStats: stats,
      simulatedMatchdays,
      lastRoundSummary: summary,
      club: weeklyClub,
      livingWorld: weeklyWorld,
      recruitmentWorld: weeklyRecruitmentWorld,
      clubManagement: weeklyClubManagement,
    });
    saveToStorage({
      leagueStandings: standings,
      tournamentStats: stats,
      simulatedMatchdays,
      club: weeklyClub,
      livingWorld: weeklyWorld,
      recruitmentWorld: weeklyRecruitmentWorld,
      clubManagement: weeklyClubManagement,
    });
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
  const initialRecruitmentWorld: RecruitmentWorldState =
    initialSave?.recruitmentWorld ??
    ensureRecruitmentV5(
      initialSave ?? {
        saveVersion: 5,
        saveId: `save_${Date.now()}`,
        savedAt: new Date().toISOString(),
        appVersion: '2.1.0',
        currentSport: 'football',
        language: 'ar',
        soundEnabled: true,
        hasSelectedInitialClub: false,
        isGuest: true,
        hasClaimedLoginBonus: false,
        club: REAL_INITIAL_PLAYER_CLUB,
        energy: 100,
        lastEnergyUpdate: Date.now(),
        vipPoints: 0,
        lastVipClaimDate: null,
        claimedVipUpgradeChests: [1],
        missionSkipUsedDate: null,
        checkInStreak: 0,
        lastCheckInDate: null,
        savedTacticalPlans: [],
        pendingFacilityUpgrades: [],
        activeNegotiations: [],
        academyDiscoveries: [],
        scoutMarket: REAL_INITIAL_SCOUT_MARKET,
        dailyMissions: INITIAL_DAILY_MISSIONS,
        storyMissions: STORY_CHAPTER_1_MISSIONS,
        leagueStandings: REAL_INITIAL_STANDINGS,
        leagueFixtures: [],
        matchHistory: [],
        tournamentStats: [],
        simulatedMatchdays: [],
        matchScoutReports: {},
        unlockedSpeed2x: false,
      },
    ).recruitmentWorld!;
  const initialClubSelected = initialSave?.hasSelectedInitialClub ?? false;
  const initialHydrated = hydrateLivingWorldFromClub(
    initialSave?.club ?? REAL_INITIAL_PLAYER_CLUB,
    initialSave?.livingWorld
  );
  const initialPhaseF = ensurePhaseFState(initialHydrated.livingWorld, initialHydrated.club.id);
  const initialWorldWithPhaseF = withPhaseF(initialHydrated.livingWorld, initialPhaseF);
  const initialClubManagement: ClubManagementState =
    initialSave?.clubManagement ??
    ensureClubManagementV6(
      ensureRecruitmentV5({
        saveVersion: 6,
        saveId: initialSave?.saveId ?? `save_${Date.now()}`,
        savedAt: new Date().toISOString(),
        appVersion: '2.1.0',
        currentSport: initialSave?.currentSport ?? 'football',
        language: initialSave?.language ?? 'ar',
        soundEnabled: initialSave?.soundEnabled ?? true,
        hasSelectedInitialClub: initialClubSelected,
        isGuest: initialSave?.isGuest ?? true,
        hasClaimedLoginBonus: initialSave?.hasClaimedLoginBonus ?? false,
        club: initialHydrated.club,
        energy: initialSave?.energy ?? 100,
        lastEnergyUpdate: initialSave?.lastEnergyUpdate ?? Date.now(),
        vipPoints: initialSave?.vipPoints ?? 0,
        lastVipClaimDate: initialSave?.lastVipClaimDate ?? null,
        claimedVipUpgradeChests: initialSave?.claimedVipUpgradeChests ?? [1],
        missionSkipUsedDate: initialSave?.missionSkipUsedDate ?? null,
        checkInStreak: initialSave?.checkInStreak ?? 0,
        lastCheckInDate: initialSave?.lastCheckInDate ?? null,
        savedTacticalPlans: initialSave?.savedTacticalPlans ?? [],
        pendingFacilityUpgrades: initialSave?.pendingFacilityUpgrades ?? [],
        activeNegotiations: initialSave?.activeNegotiations ?? [],
        academyDiscoveries: initialSave?.academyDiscoveries ?? [],
        scoutMarket: initialSave?.scoutMarket ?? REAL_INITIAL_SCOUT_MARKET,
        dailyMissions: initialSave?.dailyMissions ?? INITIAL_DAILY_MISSIONS,
        storyMissions: initialSave?.storyMissions ?? STORY_CHAPTER_1_MISSIONS,
        leagueStandings: initialSave?.leagueStandings ?? REAL_INITIAL_STANDINGS,
        leagueFixtures: initialSave?.leagueFixtures ?? [],
        matchHistory: initialSave?.matchHistory ?? [],
        tournamentStats: initialSave?.tournamentStats ?? [],
        simulatedMatchdays: initialSave?.simulatedMatchdays ?? [],
        matchScoutReports: initialSave?.matchScoutReports ?? {},
        unlockedSpeed2x: initialSave?.unlockedSpeed2x ?? false,
        livingWorld: initialHydrated.livingWorld,
        recruitmentWorld: initialRecruitmentWorld,
      }),
    ).clubManagement!;
  const initialClubSynced = syncClubFromClubManagement(initialHydrated.club, initialClubManagement);

  return {
    saveStatus: 'idle',
    saveCareerImmediate: () => {
      return persistenceService.saveImmediate(get());
    },

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
    club: initialClubSynced,
    energy: initialSave?.energy || 100,
    lastEnergyUpdate: Date.now(),
    vipPoints: initialSave?.vipPoints || 0, // Starts from ZERO!
    lastVipClaimDate: initialSave?.lastVipClaimDate || null,
    missionSkipUsedDate: initialSave?.missionSkipUsedDate || null,
    savedTacticalPlans: initialSave?.savedTacticalPlans || [],
    pendingFacilityUpgrades: initialSave?.pendingFacilityUpgrades || [],
    activeNegotiations: initialSave?.activeNegotiations || [],
    academyDiscoveries: initialSave?.academyDiscoveries || [],
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
    matchScoutReports: initialSave?.matchScoutReports || {},
    isSeasonFinaleModalOpen: false,

    activeEngine: null,
    activeMatchRecord: null,
    activeMatchHomeTactics: null,
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

    livingWorld: initialWorldWithPhaseF,
    recruitmentWorld: initialRecruitmentWorld,
    clubManagement: initialClubManagement,
    assistant: mergeAssistantIntoRuntimeState(initialSave?.assistant),
    saveId: initialSave?.saveId ?? `save_${Date.now()}`,
    savePassthrough: initialSave?.savePassthrough ?? {},

    aiNarrationEnabled: initialSave ? readAiNarrationEnabledFromSave(initialSave) : true,
    setAiNarrationEnabled: (enabled: boolean) => {
      set({ aiNarrationEnabled: enabled });
    },

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
        .slice(0, getMaxBenchSlots(0))
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
      saveToStorage();
    },

    saveTacticalPlan: (name: string) => {
      const state = get();
      const isAr = state.language === 'ar';

      let currentLevel = 1;
      for (const tier of VIP_LEVELS) {
        if (state.vipPoints >= tier.pointsRequired) currentLevel = tier.level;
      }
      const currentTier = VIP_LEVELS.find(t => t.level === currentLevel) || VIP_LEVELS[0];
      const maxSlots = currentTier.maxSavedTacticalPlans || 0;

      if (maxSlots <= 0) {
        return {
          success: false,
          message: isAr ? 'حفظ خطط التكتيك ميزة حصرية لأعضاء VIP 12 فما فوق.' : 'Saving tactical plans is exclusive to VIP 12 and above.'
        };
      }
      const trimmedName = name.trim().slice(0, 24);
      if (!trimmedName) {
        return { success: false, message: isAr ? 'يرجى إدخال اسم للخطة' : 'Please enter a plan name' };
      }
      if (state.savedTacticalPlans.length >= maxSlots) {
        return {
          success: false,
          message: isAr
            ? `وصلت للحد الأقصى (${maxSlots} خطط). احذف خطة قديمة لحفظ خطة جديدة.`
            : `You've reached the max (${maxSlots} plans). Delete an old one to save a new plan.`
        };
      }

      const newPlan: SavedTacticalPlan = {
        id: `plan_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        name: trimmedName,
        tactics: { ...state.club.footballTactics },
        savedAt: new Date().toISOString(),
      };
      const updatedPlans = [...state.savedTacticalPlans, newPlan];
      soundEffects.playFanfare();
      set({ savedTacticalPlans: updatedPlans });
      saveToStorage({ savedTacticalPlans: updatedPlans });

      return {
        success: true,
        message: isAr ? `👑 تم حفظ خطة "${trimmedName}" (${updatedPlans.length}/${maxSlots})` : `👑 Saved plan "${trimmedName}" (${updatedPlans.length}/${maxSlots})`
      };
    },

    loadTacticalPlan: (id: string) => {
      const state = get();
      const isAr = state.language === 'ar';
      const plan = state.savedTacticalPlans.find(p => p.id === id);
      if (!plan) {
        return { success: false, message: isAr ? 'الخطة غير موجودة' : 'Plan not found' };
      }
      soundEffects.playTap();
      set((s) => ({
        club: {
          ...s.club,
          footballTactics: { ...plan.tactics },
        },
      }));
      saveToStorage({ club: { ...state.club, footballTactics: { ...plan.tactics } } });
      return {
        success: true,
        message: isAr ? `⚡ تم تفعيل خطة "${plan.name}" فوراً` : `⚡ Switched to plan "${plan.name}" instantly`
      };
    },

    deleteTacticalPlan: (id: string) => {
      const state = get();
      const updatedPlans = state.savedTacticalPlans.filter(p => p.id !== id);
      soundEffects.playTap();
      set({ savedTacticalPlans: updatedPlans });
      saveToStorage({ savedTacticalPlans: updatedPlans });
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
      saveToStorage();
    },

    // Validated squad move — the ONLY way squad placement changes. Replaced
    // the old swapFootballLineup/moveToBench actions once the squad UI
    // (Phase 2) moved onto it.
    moveSquadEntity: (playerId, target) => {
      const { club, vipPoints } = get();
      const { state: squad } = createSquadState(club, { maxSubstitutes: getMaxBenchSlots(vipPoints) });
      const result = moveEntity(squad, playerId, target);
      if (result.ok && result.value.kind !== 'noop') {
        soundEffects.playTap();
        set({ club: applySquadState(club, result.value.state) });
        saveToStorage();
      }
      return result;
    },

    applyBestTactics: (rec) => {
      const { club, vipPoints } = get();
      const result = applyRecommendation(club, rec, { maxSubstitutes: getMaxBenchSlots(vipPoints) });
      if (result.ok) {
        soundEffects.playTap();
        set({ club: result.value });
        saveToStorage();
      }
      return result;
    },

    applyAssistantRecommendation: (rec: AssistantRecommendation) => {
      const state = get();
      const isAr = state.language === 'ar';
      const change = rec.suggestedChanges[0];
      if (!change) {
        return { ok: false, error: isAr ? 'لا توجد تغييرات مقترحة' : 'No suggested changes' };
      }
      if (change.kind === 'best_tactics_apply' && change.bestTacticsRec) {
        const result = get().applyBestTactics(change.bestTacticsRec);
        if (!result.ok) {
          return { ok: false, error: isAr ? 'تعذر تطبيق أفضل تكتيك' : 'Could not apply Best Tactics' };
        }
        set({ assistant: appendAppliedAssistantId(state.assistant, rec.id) });
        saveToStorage(undefined, false);
        return { ok: true };
      }
      if (change.kind === 'tactics' && change.patch) {
        get().updateFootballTactics(change.patch);
        set({ assistant: appendAppliedAssistantId(state.assistant, rec.id) });
        saveToStorage(undefined, false);
        return { ok: true };
      }
      if (change.kind === 'live_tactics' && change.patch) {
        if (!state.isMatchLive) {
          return { ok: false, error: isAr ? 'لا توجد مباراة مباشرة' : 'No live match' };
        }
        const ev = get().applyLiveTactics(change.patch);
        if (!ev) {
          return { ok: false, error: isAr ? 'تعذر تطبيق التكتيك المباشر' : 'Live tactics apply failed' };
        }
        set({ assistant: appendAppliedAssistantId(state.assistant, rec.id) });
        saveToStorage(undefined, false);
        return { ok: true };
      }
      if (change.kind === 'lineup' && change.lineupMoves) {
        for (const m of change.lineupMoves) {
          const res = get().moveSquadEntity(m.playerId, m.target);
          if (!res.ok) {
            return { ok: false, error: isAr ? 'تعذر تحريك اللاعب' : 'Lineup move rejected' };
          }
        }
        set({ assistant: appendAppliedAssistantId(state.assistant, rec.id) });
        saveToStorage(undefined, false);
        return { ok: true };
      }
      return { ok: false, error: isAr ? 'نوع التغيير غير مدعوم' : 'Unsupported change kind' };
    },

    dismissAssistantRecommendation: (rec: AssistantRecommendation) => {
      const state = get();
      const event = buildDismissEvent({
        dedupeKey: rec.dedupeKey,
        clubId: state.club.id,
        season: state.livingWorld?.currentSeason ?? 1,
        nowIso: new Date().toISOString(),
        recommendationId: rec.id,
      });
      const applied = applyStateChanges(
        { livingWorld: state.livingWorld, players: state.club.footballSquad },
        [{ kind: 'appendGameEvent', event }],
      );
      const withNotifications = applyNotificationPipelineForEvents(applied, [event]);
      set({
        livingWorld: withNotifications.livingWorld,
        assistant: appendIgnoredAssistantId(state.assistant, rec.id),
      });
      saveToStorage(undefined, false);
    },

    startNegotiation: (playerId: string, initialOfferAmount: number) => {
      const state = get();
      const isAr = state.language === 'ar';

      const player = state.scoutMarket.find(p => p.id === playerId);
      if (!player) {
        return { success: false, message: isAr ? 'اللاعب غير متاح في السوق' : 'Player not available in the market' };
      }
      if (state.activeNegotiations.some(n => n.playerId === playerId)) {
        return { success: false, message: isAr ? 'يوجد تفاوض جارٍ بالفعل مع هذا اللاعب' : 'A negotiation is already in progress with this player' };
      }
      const maxSlots = getMaxActiveNegotiations(state.vipPoints);
      if (state.activeNegotiations.length >= maxSlots) {
        return {
          success: false,
          message: isAr
            ? `وصلت للحد الأقصى من المفاوضات المتزامنة (${maxSlots}). أنهِ إحداها أو ترقَّ إلى VIP 6 لفتح خانة إضافية.`
            : `You've reached the max simultaneous negotiations (${maxSlots}). Finish one or reach VIP 6 for an extra slot.`
        };
      }
      const openSpend = sharedLegacySpendCheck(state.clubManagement, state.club, initialOfferAmount, {
        addedWeeklyWage: player.wage,
        gameWeek: deriveGameWeekFromSave(buildPartialSave(state)),
      });
      if (initialOfferAmount <= 0 || !openSpend.valid) {
        return { success: false, message: isAr ? 'العرض المبدئي غير صالح أو يتجاوز رصيدك' : 'The opening offer is invalid or exceeds your balance' };
      }

      const maxRounds = 4;
      const result = resolveNegotiationRound(player, initialOfferAmount, 1, maxRounds, isAr);
      soundEffects.playTap();

      const negotiation: PlayerNegotiation = {
        id: `neg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        playerId: player.id,
        playerName: isAr ? player.name : player.nameEn,
        marketValue: player.marketValue,
        currentOfferAmount: initialOfferAmount,
        counterAmount: result.counterAmount,
        roundsUsed: 1,
        maxRounds,
        status: result.status,
        lastMessageAr: result.messageAr,
        lastMessageEn: result.messageEn,
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Accepted on the opening bid: finalize immediately, no need to keep a slot open.
      if (result.status === 'accepted') {
        return get().acceptNegotiationCounter(
          // Temporarily register it so acceptNegotiationCounter can find & finalize it.
          (() => {
            set({ activeNegotiations: [...state.activeNegotiations, { ...negotiation, counterAmount: initialOfferAmount }] });
            return negotiation.id;
          })()
        );
      }

      const updatedNegotiations = [...state.activeNegotiations, negotiation];
      set({ activeNegotiations: updatedNegotiations });
      saveToStorage({ activeNegotiations: updatedNegotiations });

      return { success: true, message: isAr ? result.messageAr : result.messageEn };
    },

    submitCounterOffer: (negotiationId: string, newOfferAmount: number) => {
      const state = get();
      const isAr = state.language === 'ar';
      const negotiation = state.activeNegotiations.find(n => n.id === negotiationId);
      if (!negotiation) {
        return { success: false, message: isAr ? 'لا توجد مفاوضة بهذا المعرّف' : 'Negotiation not found' };
      }
      if (negotiation.status !== 'countered') {
        return { success: false, message: isAr ? 'هذه المفاوضة ليست بانتظار عرض جديد' : 'This negotiation is not awaiting a new offer' };
      }
      const player = state.scoutMarket.find(p => p.id === negotiation.playerId);
      if (!player) {
        return { success: false, message: isAr ? 'اللاعب لم يعد متاحاً' : 'Player is no longer available' };
      }
      if (newOfferAmount <= negotiation.currentOfferAmount) {
        return { success: false, message: isAr ? 'يجب أن يكون العرض الجديد أعلى من السابق' : 'The new offer must be higher than the previous one' };
      }
      const counterSpend = sharedLegacySpendCheck(state.clubManagement, state.club, newOfferAmount, {
        addedWeeklyWage: player.wage,
        gameWeek: deriveGameWeekFromSave(buildPartialSave(state)),
      });
      if (!counterSpend.valid) {
        return { success: false, message: isAr ? 'هذا العرض يتجاوز رصيدك الحالي' : 'This offer exceeds your current balance' };
      }

      const nextRound = negotiation.roundsUsed + 1;
      const result = resolveNegotiationRound(player, newOfferAmount, nextRound, negotiation.maxRounds, isAr);
      soundEffects.playTap();

      const updatedNegotiation: PlayerNegotiation = {
        ...negotiation,
        currentOfferAmount: newOfferAmount,
        counterAmount: result.counterAmount,
        roundsUsed: nextRound,
        status: result.status,
        lastMessageAr: result.messageAr,
        lastMessageEn: result.messageEn,
        updatedAt: new Date().toISOString(),
      };

      if (result.status === 'accepted') {
        const withFinalOffer = { ...updatedNegotiation, counterAmount: newOfferAmount };
        const updatedList = state.activeNegotiations.map(n => n.id === negotiationId ? withFinalOffer : n);
        set({ activeNegotiations: updatedList });
        return get().acceptNegotiationCounter(negotiationId);
      }

      const updatedNegotiations = state.activeNegotiations.map(n => n.id === negotiationId ? updatedNegotiation : n);
      set({ activeNegotiations: updatedNegotiations });
      saveToStorage({ activeNegotiations: updatedNegotiations });

      return { success: true, message: isAr ? result.messageAr : result.messageEn };
    },

    acceptNegotiationCounter: (negotiationId: string) => {
      const state = get();
      const isAr = state.language === 'ar';
      const negotiation = state.activeNegotiations.find(n => n.id === negotiationId);
      if (!negotiation) {
        return { success: false, message: isAr ? 'لا توجد مفاوضة بهذا المعرّف' : 'Negotiation not found' };
      }
      let currentLevel = 1;
      for (const tier of VIP_LEVELS) {
        if (state.vipPoints >= tier.pointsRequired) currentLevel = tier.level;
      }
      const currentTier = VIP_LEVELS.find(t => t.level === currentLevel) || VIP_LEVELS[0];
      const discountMult = 1 - (currentTier.transferDiscountPercent || 0) / 100;
      const finalPrice = Math.round((negotiation.counterAmount ?? negotiation.currentOfferAmount) * discountMult);
      const player = state.scoutMarket.find(p => p.id === negotiation.playerId);
      if (!player) {
        return { success: false, message: isAr ? 'اللاعب لم يعد متاحاً في السوق' : 'Player is no longer available in the market' };
      }
      const finalSpend = sharedLegacySpendCheck(state.clubManagement, state.club, finalPrice, {
        addedWeeklyWage: player.wage,
        gameWeek: deriveGameWeekFromSave(buildPartialSave(state)),
      });
      if (!finalSpend.valid) {
        return { success: false, message: isAr ? 'رصيدك لا يكفي لإتمام هذا الاتفاق الآن' : "You don't have enough funds to close this deal now" };
      }

      soundEffects.playFanfare();
      confetti({ particleCount: 60, spread: 75 });

      const canJoinBench = state.club.footballBench.length < getMaxBenchSlots(state.vipPoints);
      const updatedNegotiations = state.activeNegotiations.filter(n => n.id !== negotiationId);
      let clubManagement = state.clubManagement;
      if (clubManagement) {
        clubManagement = recordPlayerPurchase(
          clubManagement,
          finalPrice,
          deriveGameWeekFromSave(buildPartialSave(state)),
          state.livingWorld.currentSeason,
          new Date().toISOString(),
        );
      }
      const updatedClub = clubManagement
        ? syncClubFromClubManagement(
            {
              ...state.club,
              footballSquad: [...state.club.footballSquad, player],
              footballBench: canJoinBench ? [...state.club.footballBench, player.id] : state.club.footballBench,
              fanMood: Math.min(100, state.club.fanMood + 5),
              finances: {
                ...state.club.finances,
                coins: clubManagement.finance.coins,
                reputation: state.club.finances.reputation + 25,
              },
            },
            clubManagement,
          )
        : {
            ...state.club,
            footballSquad: [...state.club.footballSquad, player],
            footballBench: canJoinBench ? [...state.club.footballBench, player.id] : state.club.footballBench,
            fanMood: Math.min(100, state.club.fanMood + 5),
            finances: {
              ...state.club.finances,
              coins: state.club.finances.coins - finalPrice,
              reputation: state.club.finances.reputation + 25,
            },
          };
      const updatedScoutMarket = state.scoutMarket.filter(p => p.id !== player.id);
      const updatedVipPoints = state.vipPoints + 40;

      set({
        club: updatedClub,
        clubManagement: clubManagement ?? state.clubManagement,
        activeNegotiations: updatedNegotiations,
        scoutMarket: updatedScoutMarket,
        vipPoints: updatedVipPoints,
      });
      saveToStorage({
        club: updatedClub,
        clubManagement: clubManagement ?? state.clubManagement,
        activeNegotiations: updatedNegotiations,
        scoutMarket: updatedScoutMarket,
        vipPoints: updatedVipPoints,
      });

      return {
        success: true,
        message: isAr
          ? `🎉 تم التعاقد مع ${negotiation.playerName} مقابل ${finalPrice.toLocaleString()} 💰!${discountMult < 1 ? ` (خصم VIP ${currentLevel}: ${currentTier.transferDiscountPercent}%)` : ''}`
          : `🎉 Signed ${negotiation.playerName} for ${finalPrice.toLocaleString()} 💰!${discountMult < 1 ? ` (VIP ${currentLevel} discount: ${currentTier.transferDiscountPercent}%)` : ''}`
      };
    },

    cancelNegotiation: (negotiationId: string) => {
      const state = get();
      soundEffects.playTap();
      const updatedNegotiations = state.activeNegotiations.filter(n => n.id !== negotiationId);
      set({ activeNegotiations: updatedNegotiations });
      saveToStorage({ activeNegotiations: updatedNegotiations });
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
      saveToStorage();
    },

    runTrainingDrill: (drillType) => {
      const state = get();
      const cost = drillType === 'stamina' ? 30 : 40;
      if (state.club.finances.trainingPoints < cost) {
        return false;
      }

      soundEffects.playWhistle(true);
      const plan = legacyDrillToPlan(drillType);
      let changes = stateChangesForTrainingSession(
        state.club.footballSquad.map((p) => p.id),
        plan,
      );
      if (drillType === 'finishing') {
        const finishRng = new SeededRandom(hashStringToSeed(`${state.club.id}_finish_${state.leagueFixtures.filter((f) => f.played).length}`));
        for (const p of state.club.footballSquad) {
          if (finishRng.nextChance(0.25)) {
            changes.push({
              kind: 'patchPlayerLife',
              playerId: p.id,
              legacyDelta: { overall: 1 },
            });
          }
        }
      }
      const applied = applyStateChanges(
        { livingWorld: state.livingWorld, players: state.club.footballSquad },
        changes,
      );

      set({
        vipPoints: state.vipPoints + 15,
        livingWorld: applied.livingWorld,
        club: {
          ...state.club,
          footballSquad: applied.players.map((p) => ({
            ...p,
            overall: Math.min(p.potential, p.overall),
          })),
          finances: {
            ...state.club.finances,
            trainingPoints: state.club.finances.trainingPoints - cost,
          },
        },
      });
      saveToStorage();
      return true;
    },

    upgradeFacility: (facility) => {
      const state = get();
      const currentLevel = state.club.facilities[facility] ?? 1;
      if (currentLevel >= 10) return false;
      if (state.pendingFacilityUpgrades.some(p => p.facility === facility)) return false;

      const upgradeCost = currentLevel * 35000;
      if (state.club.finances.coins < upgradeCost) return false;

      soundEffects.playTap();

      const durationMs = currentLevel * 15 * 60 * 1000; // 15 min per current level
      const now = Date.now();
      const newPending: PendingFacilityUpgrade = {
        facility,
        targetLevel: currentLevel + 1,
        startedAt: new Date(now).toISOString(),
        completesAt: new Date(now + durationMs).toISOString(),
      };
      const updatedPending = [...state.pendingFacilityUpgrades, newPending];

      set({
        pendingFacilityUpgrades: updatedPending,
        club: {
          ...state.club,
          finances: {
            ...state.club.finances,
            coins: state.club.finances.coins - upgradeCost,
          },
        },
      });
      saveToStorage({ pendingFacilityUpgrades: updatedPending, club: get().club });
      return true;
    },

    processFacilityUpgrades: () => {
      const state = get();
      if (state.pendingFacilityUpgrades.length === 0) return;

      const now = Date.now();
      const completed = state.pendingFacilityUpgrades.filter(p => new Date(p.completesAt).getTime() <= now);
      if (completed.length === 0) return;

      const stillPending = state.pendingFacilityUpgrades.filter(p => new Date(p.completesAt).getTime() > now);

      let updatedFacilities = { ...state.club.facilities };
      let updatedFinances = { ...state.club.finances };
      let updatedVipPoints = state.vipPoints;

      for (const p of completed) {
        updatedFacilities = { ...updatedFacilities, [p.facility]: p.targetLevel };
        updatedFinances = { ...updatedFinances, reputation: updatedFinances.reputation + 40 };
        updatedVipPoints += 50;
      }

      soundEffects.playFanfare();
      confetti({ particleCount: 40, spread: 60 });

      const updatedClub = { ...state.club, facilities: updatedFacilities, finances: updatedFinances };
      set({
        club: updatedClub,
        pendingFacilityUpgrades: stillPending,
        vipPoints: updatedVipPoints,
      });
      saveToStorage({ club: updatedClub, pendingFacilityUpgrades: stillPending, vipPoints: updatedVipPoints });
    },

    skipFacilityUpgrade: (facility) => {
      const state = get();
      const isAr = state.language === 'ar';
      const pending = state.pendingFacilityUpgrades.find(p => p.facility === facility);
      if (!pending) {
        return { success: false, message: isAr ? 'لا يوجد تطوير جارٍ لهذه المنشأة' : 'No upgrade in progress for this facility' };
      }

      let currentLevel = 1;
      for (const tier of VIP_LEVELS) {
        if (state.vipPoints >= tier.pointsRequired) currentLevel = tier.level;
      }
      const currentTier = VIP_LEVELS.find(t => t.level === currentLevel) || VIP_LEVELS[0];
      const isFreeVip = !!currentTier.hasFreeSkipWaitTimes;

      const remainingMs = Math.max(0, new Date(pending.completesAt).getTime() - Date.now());
      const remainingMinutes = Math.ceil(remainingMs / 60000);
      const diamondCost = Math.max(5, remainingMinutes); // 1 diamond/minute remaining, 5 min

      if (!isFreeVip) {
        if ((state.club.finances.diamonds || 0) < diamondCost) {
          return {
            success: false,
            message: isAr
              ? `تحتاج ${diamondCost} جوهرة لتخطي الوقت المتبقي (أو كن VIP 17 للتخطي المجاني).`
              : `You need ${diamondCost} diamonds to skip the remaining time (or become VIP 17 for free skips).`
          };
        }
      }

      soundEffects.playFanfare();
      confetti({ particleCount: 60, spread: 70 });

      const updatedPending = state.pendingFacilityUpgrades.filter(p => p.facility !== facility);
      const updatedFacilities = { ...state.club.facilities, [facility]: pending.targetLevel };
      const updatedFinances = {
        ...state.club.finances,
        reputation: state.club.finances.reputation + 40,
        diamonds: isFreeVip ? (state.club.finances.diamonds || 0) : (state.club.finances.diamonds || 0) - diamondCost,
      };
      const updatedClub = { ...state.club, facilities: updatedFacilities, finances: updatedFinances };
      const updatedVipPoints = state.vipPoints + 50;

      set({ club: updatedClub, pendingFacilityUpgrades: updatedPending, vipPoints: updatedVipPoints });
      saveToStorage({ club: updatedClub, pendingFacilityUpgrades: updatedPending, vipPoints: updatedVipPoints });

      return {
        success: true,
        message: isFreeVip
          ? (isAr ? '👑 تم التخطي فوراً مجاناً بفضل امتياز VIP 17!' : '👑 Skipped instantly for free with your VIP 17 perk!')
          : (isAr ? `⚡ تم تخطي الوقت المتبقي مقابل ${diamondCost} جوهرة.` : `⚡ Skipped remaining time for ${diamondCost} diamonds.`)
      };
    },

    buyPlayer: (player) => {
      const state = get();
      const buyCheck = sharedLegacySpendCheck(state.clubManagement, state.club, player.marketValue, {
        addedWeeklyWage: player.wage,
        gameWeek: deriveGameWeekFromSave(buildPartialSave(state)),
      });
      if (!buyCheck.valid) return false;

      soundEffects.playFanfare();
      confetti({ particleCount: 50, spread: 70 });

      const canJoinBench = state.club.footballBench.length < getMaxBenchSlots(state.vipPoints);

      set({
        vipPoints: state.vipPoints + 40,
        club: {
          ...state.club,
          footballSquad: [...state.club.footballSquad, player],
          footballBench: canJoinBench ? [...state.club.footballBench, player.id] : state.club.footballBench,
          fanMood: Math.min(100, state.club.fanMood + 5),
          finances: {
            ...state.club.finances,
            coins: state.club.finances.coins - player.marketValue,
            reputation: state.club.finances.reputation + 25,
          },
        },
        scoutMarket: state.scoutMarket.filter(p => p.id !== player.id),
      });
      saveToStorage(undefined, true);
      return true;
    },

    addPlayerToSquad: (player) => {
      const state = get();
      soundEffects.playFanfare();
      confetti({ particleCount: 75, spread: 80 });

      const alreadyOnBench = state.club.footballBench.includes(player.id);
      const canJoinBench = alreadyOnBench || state.club.footballBench.length < getMaxBenchSlots(state.vipPoints);

      set({
        vipPoints: state.vipPoints + 50,
        club: {
          ...state.club,
          footballSquad: [...state.club.footballSquad.filter(p => p.id !== player.id), player],
          footballBench: canJoinBench ? [...state.club.footballBench.filter(id => id !== player.id), player.id] : state.club.footballBench.filter(id => id !== player.id),
          fanMood: Math.min(100, state.club.fanMood + 10),
          finances: {
            ...state.club.finances,
            reputation: state.club.finances.reputation + 40,
          },
        },
      });
      saveToStorage(undefined, true);
      return true;
    },

    sellPlayer: (playerId) => {
      const state = get();
      const player = state.club.footballSquad.find(p => p.id === playerId);
      if (!player) return;

      soundEffects.playTap();
      const proceeds = Math.round(player.marketValue * 0.9);
      let clubManagement = state.clubManagement;
      if (clubManagement) {
        clubManagement = recordPlayerSale(
          clubManagement,
          proceeds,
          deriveGameWeekFromSave(buildPartialSave(state)),
          state.livingWorld.currentSeason,
          new Date().toISOString(),
        );
      }
      const nextClubBase = {
        ...state.club,
        footballSquad: state.club.footballSquad.filter(p => p.id !== playerId),
        footballLineup: state.club.footballLineup.map(id => (id === playerId ? EMPTY_SLOT : id)),
        footballBench: state.club.footballBench.filter(id => id !== playerId),
        finances: {
          ...state.club.finances,
          coins: (clubManagement?.finance.coins ?? state.club.finances.coins + proceeds),
        },
      };
      const updatedClub = clubManagement
        ? syncClubFromClubManagement(nextClubBase, clubManagement)
        : nextClubBase;
      set({
        vipPoints: state.vipPoints + 20,
        club: updatedClub,
        clubManagement: clubManagement ?? state.clubManagement,
      });
      saveToStorage(undefined, true);
    },

    // Basketball still uses the simple instant-promote path (unchanged);
    // football uses the real scouting flow below (scoutAcademyTalent -> promote/release).
    promoteAcademyTalent: () => {
      const state = get();
      if (state.currentSport === 'football') return; // football: use scoutAcademyTalent instead
      soundEffects.playFanfare();
      confetti({ particleCount: 60, spread: 80 });

      const { talent: newTalent } = generateAcademyTalent('basketball', state.club.facilities.youthAcademyLevel);
      set({
        vipPoints: state.vipPoints + 50,
        club: {
          ...state.club,
          basketballSquad: [...state.club.basketballSquad, newTalent],
          basketballBench: [...state.club.basketballBench, newTalent.id],
          fanMood: Math.min(100, state.club.fanMood + 6),
        },
      });
      saveToStorage();
    },

    scoutAcademyTalent: () => {
      const state = get();
      const isAr = state.language === 'ar';
      const SCOUT_COST_TP = 60;

      const maxSlots = getMaxAcademySlots(state.vipPoints);
      if (state.academyDiscoveries.length >= maxSlots) {
        return {
          success: false,
          message: isAr
            ? `دفتر الاكتشافات ممتلئ (${maxSlots}). قرّر بشأن موهبة موجودة (ترقية أو استبعاد) قبل استكشاف موهبة جديدة، أو ترقَّ لـ VIP 13 لفتح خانة إضافية.`
            : `Discovery slots are full (${maxSlots}). Decide on an existing prospect (promote or release) before scouting a new one, or reach VIP 13 for an extra slot.`
        };
      }
      if (state.club.finances.trainingPoints < SCOUT_COST_TP) {
        return {
          success: false,
          message: isAr ? `تحتاج ${SCOUT_COST_TP} نقطة تدريب لإرسال الكشافين` : `You need ${SCOUT_COST_TP} training points to send scouts out`
        };
      }

      soundEffects.playFanfare();
      confetti({ particleCount: 50, spread: 70 });

      const { talent, starRating } = generateAcademyTalent(state.currentSport, state.club.facilities.youthAcademyLevel);
      const discovery: AcademyDiscovery = {
        id: `disc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        talent,
        starRating,
        discoveredAt: new Date().toISOString(),
      };

      const updatedDiscoveries = [...state.academyDiscoveries, discovery];
      const updatedClub = {
        ...state.club,
        finances: { ...state.club.finances, trainingPoints: state.club.finances.trainingPoints - SCOUT_COST_TP },
      };
      set({ academyDiscoveries: updatedDiscoveries, club: updatedClub });
      saveToStorage({ academyDiscoveries: updatedDiscoveries, club: updatedClub });

      const starsStr = '⭐'.repeat(starRating);
      return {
        success: true,
        message: isAr
          ? `🔍 اكتشف الكشافون موهبة: ${talent.name} (${starsStr}) — إمكانية ${talent.potential}!`
          : `🔍 Scouts discovered a prospect: ${talent.nameEn} (${starsStr}) — Potential ${talent.potential}!`
      };
    },

    promoteAcademyDiscovery: (discoveryId: string) => {
      const state = get();
      const isAr = state.language === 'ar';
      const discovery = state.academyDiscoveries.find(d => d.id === discoveryId);
      if (!discovery) {
        return { success: false, message: isAr ? 'هذا الاكتشاف لم يعد موجوداً' : 'This discovery no longer exists' };
      }

      soundEffects.playFanfare();
      confetti({ particleCount: 70, spread: 80 });

      const updatedDiscoveries = state.academyDiscoveries.filter(d => d.id !== discoveryId);
      const updatedVipPoints = state.vipPoints + 50;

      if (discovery.talent.sport === 'football') {
        const canJoinBench = state.club.footballBench.length < getMaxBenchSlots(state.vipPoints);
        const updatedClub = {
          ...state.club,
          footballSquad: [...state.club.footballSquad, discovery.talent],
          footballBench: canJoinBench ? [...state.club.footballBench, discovery.talent.id] : state.club.footballBench,
          fanMood: Math.min(100, state.club.fanMood + 6),
        };
        set({ club: updatedClub, academyDiscoveries: updatedDiscoveries, vipPoints: updatedVipPoints });
        saveToStorage({ club: updatedClub, academyDiscoveries: updatedDiscoveries, vipPoints: updatedVipPoints });
      } else {
        const updatedClub = {
          ...state.club,
          basketballSquad: [...state.club.basketballSquad, discovery.talent],
          basketballBench: [...state.club.basketballBench, discovery.talent.id],
          fanMood: Math.min(100, state.club.fanMood + 6),
        };
        set({ club: updatedClub, academyDiscoveries: updatedDiscoveries, vipPoints: updatedVipPoints });
        saveToStorage({ club: updatedClub, academyDiscoveries: updatedDiscoveries, vipPoints: updatedVipPoints });
      }

      return {
        success: true,
        message: isAr ? `🎉 تمت ترقية ${discovery.talent.name} للفريق الأول!` : `🎉 ${discovery.talent.nameEn} promoted to the senior squad!`
      };
    },

    releaseAcademyDiscovery: (discoveryId: string) => {
      const state = get();
      soundEffects.playTap();
      const updatedDiscoveries = state.academyDiscoveries.filter(d => d.id !== discoveryId);
      set({ academyDiscoveries: updatedDiscoveries });
      saveToStorage({ academyDiscoveries: updatedDiscoveries });
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
      saveToStorage();
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
        // ONE seed for this whole match — the engine, the saved MatchRecord's
        // id and its seed field all use the exact same value, so a saved
        // record can genuinely be re-simulated later (previously each of
        // these called Date.now() separately and could disagree).
        const matchSeed = Date.now();
        const matchReferee = createRefereeFromSeed(matchSeed);
        const engine = new FootballMatchEngine(
          state.club, 
          opponent, 
          matchSeed, 
          state.club.footballTactics,
          undefined,
          vipAttackBoost,
          vipDefenseBoost,
          matchReferee,
          true,
        );
        set({
          activeEngine: engine,
          isMatchLive: true,
          isMatchPaused: false,
          currentMatchMinute: 0,
          pendingInteractiveEvent: null,
          activeTab: 'match',
          activeMatchHomeTactics: engine.getHomeTactics(),
          activeMatchRecord: {
            id: `match_${matchSeed}`,
            sport: 'football',
            seed: matchSeed,
            referee: matchReferee,
            homeClubId: state.club.id,
            homeClubName: state.club.name,
            awayClubId: opponent.id,
            awayClubName: opponent.name,
            homeScore: 0,
            awayScore: 0,
            events: [],
            varReviews: [],
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
              homeRedCards: 0,
              awayRedCards: 0,
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
        } else if (latestEvent.type === 'save') {
          soundEffects.playKick();
        }
      }

      const isFinished = res.isFinished;
      if (isFinished) {
        // Update standings & finances
        const won = res.homeScore > res.awayScore;
        const drawn = res.homeScore === res.awayScore;
        const pts = won ? 3 : (drawn ? 1 : 0);

        soundEffects.playWhistle(false);
        const matchIncome = computeUserMatchIncome(state);

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

        // Reuse the exact seed this match was actually simulated with —
        // state.activeEngine.getSeed() — instead of a fresh Date.now() that
        // would not match the RNG sequence that produced `res`.
        const finishedSeed = state.activeEngine!.getSeed();
        const matchAnalytics = state.activeEngine!.getMatchAnalytics();
        const finalRecord: MatchRecord = {
          id: `match_${finishedSeed}`,
          sport: 'football',
          seed: finishedSeed,
          referee: state.activeMatchRecord?.referee ?? state.activeEngine!.getReferee(),
          homeClubId: state.club.id,
          homeClubName: state.club.name,
          awayClubId: state.activeMatchRecord?.awayClubId || REAL_OPPONENT_CLUBS[0].id,
          awayClubName: state.activeMatchRecord?.awayClubName || REAL_OPPONENT_CLUBS[0].name,
          homeScore: res.homeScore,
          awayScore: res.awayScore,
          events: res.events,
          stats: res.stats,
          analytics: matchAnalytics.analytics,
          analyticsConclusions: matchAnalytics.analyticsConclusions,
          varReviews: state.activeEngine!.getVarReviews(),
          isFinished: true,
          competition: state.activeMatchRecord?.competition || 'الدوري',
          matchDay: state.activeMatchRecord?.matchDay || state.matchHistory.length + 1,
          date: new Date().toISOString().split('T')[0],
        };

        const playerLifePost = applyPostMatchPlayerLife(state, finalRecord, won, drawn);

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

        const economy = applyMatchEconomy(
          state,
          playerLifePost.club,
          matchIncome,
          won,
          drawn,
          boardPenalty,
          fanPenalty,
        );
        let updatedClub = economy.club;
        let clubManagementNext = economy.clubManagement;

        ensureDefaultHandlersRegistered();
        let livingWorldNext = playerLifePost.livingWorld;
        let squadNext = updatedClub.footballSquad;
        const oppMult = state.clubManagement
          ? getClubModifiersForSave(buildPartialSave(state), state.club).oppositionAnalysisMult
          : 1;
        const postLw = buildPostMatchLivingWorldResult(
          livingWorldNext,
          updatedClub,
          finalRecord,
          finalRecord.awayClubId,
          finalRecord.date,
          oppMult,
        );
        const lwApplied = applyStateChanges(
          { livingWorld: livingWorldNext, players: squadNext },
          [...postLw.changes],
        );
        livingWorldNext = lwApplied.livingWorld;
        squadNext = lwApplied.players;
        for (const evt of postLw.events) {
          const dispatched = runLivingWorldDispatch(
            { livingWorld: livingWorldNext, players: squadNext },
            evt,
            {
              clubId: updatedClub.id,
              gameWeek: deriveGameWeekFromSave(buildPartialSave(state)),
              recentUserResults: recentUserResultsFromHistory(updatedClub.id, state.matchHistory),
            },
          );
          if (dispatched.applied) {
            livingWorldNext = dispatched.result.livingWorld;
            squadNext = dispatched.result.players;
          }
        }
        const matchEvt = buildMatchCompletedEvent(
          finalRecord,
          updatedClub,
          finalRecord.date,
          livingWorldNext.currentSeason,
        );
        const matchIngest = ingestGameEvent(
          { livingWorld: livingWorldNext, players: squadNext },
          matchEvt,
          {
            clubId: updatedClub.id,
            gameWeek: deriveGameWeekFromSave(buildPartialSave(state)),
            recentUserResults: recentUserResultsFromHistory(updatedClub.id, [
              finalRecord,
              ...state.matchHistory,
            ]),
          },
        );
        if (matchIngest.applied) {
          livingWorldNext = matchIngest.result.livingWorld;
          squadNext = matchIngest.result.players;
        }
        updatedClub = { ...updatedClub, footballSquad: squadNext };

        // Generate Post Match Character Analyst Feedback
        const analystFeedback = generatePostMatchCharacter(finalRecord, updatedClub, state.language === 'ar');

        set({
          isMatchLive: false,
          activeMatchHomeTactics: null,
          activeMatchRecord: finalRecord,
          matchHistory: [finalRecord, ...state.matchHistory],
          leagueStandings: updatedStandings,
          leagueFixtures: updatedFixtures,
          vipPoints: state.vipPoints + (won ? 80 : 35),
          dailyMissions: updatedMissions,
          postMatchAnalyst: analystFeedback,
          club: updatedClub,
          livingWorld: livingWorldNext,
          clubManagement: clubManagementNext,
        });
        saveToStorage({
          club: updatedClub,
          livingWorld: livingWorldNext,
          clubManagement: clubManagementNext,
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
          varReviews: state.activeEngine.getVarReviews(),
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
        activeMatchHomeTactics: state.activeEngine.getHomeTactics(),
      });
    },

    // Live in-match tactics panel (Formation / Mentality / Tempo / Pressing /
    // Width). Applied to the engine's own copy only — never club.footballTactics
    // — and takes effect starting the next stepMinute() tick, no pause needed.
    // Returns the 'tactical_change' event so the panel can show what changed.
    applyLiveTactics: (changes) => {
      const state = get();
      if (!state.activeEngine || !state.isMatchLive) return null;
      const event = state.activeEngine.applyLiveTactics(changes);
      set({ activeMatchHomeTactics: state.activeEngine.getHomeTactics() });
      return event;
    },

    instantSimulateMatch: () => {
      const state = get();
      if (!state.activeEngine || !state.isMatchLive) return;

      // Simulate directly to completion using the engine without triggering synchronous UI loops or duplicate confetti freezes
      const res = state.activeEngine.simulateToCompletion();

      const won = res.homeScore > res.awayScore;
      const drawn = res.homeScore === res.awayScore;

      // Sound for full-time completion
      soundEffects.playWhistle(false);

      // Update standings & finances (50% revenue deduction for skipping/instant simulate)
      const pts = won ? 3 : (drawn ? 1 : 0);
      let __curLevel = 1; for (const __t of VIP_LEVELS) { if (state.vipPoints >= __t.pointsRequired) __curLevel = __t.level; }
      const __curTier = VIP_LEVELS.find(t => t.level === __curLevel) || VIP_LEVELS[0];
      const matchIncome = computeUserMatchIncome(state, __curTier.hasFullInstantSimRewards ? 1 : 0.5);

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

      // Same fix as stepMatchMinute's finish branch — reuse the engine's own seed.
      const finishedSeed = state.activeEngine!.getSeed();
      const finalRecord: MatchRecord = {
        id: `match_${finishedSeed}`,
        sport: 'football',
        seed: finishedSeed,
        referee: state.activeMatchRecord?.referee ?? state.activeEngine!.getReferee(),
        homeClubId: state.club.id,
        homeClubName: state.club.name,
        awayClubId: state.activeMatchRecord?.awayClubId || REAL_OPPONENT_CLUBS[0].id,
        awayClubName: state.activeMatchRecord?.awayClubName || REAL_OPPONENT_CLUBS[0].name,
        homeScore: res.homeScore,
        awayScore: res.awayScore,
        events: res.events,
        stats: res.stats,
        varReviews: state.activeEngine!.getVarReviews(),
        isFinished: true,
        competition: state.activeMatchRecord?.competition || 'الدوري',
        matchDay: state.activeMatchRecord?.matchDay || state.matchHistory.length + 1,
        date: new Date().toISOString().split('T')[0],
      };

      const playerLifePost = applyPostMatchPlayerLife(state, finalRecord, won, drawn);

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

      const economy = applyMatchEconomy(
        state,
        playerLifePost.club,
        matchIncome,
        won,
        drawn,
        boardPenalty,
        fanPenalty,
      );
      const updatedClub = economy.club;

      const analystFeedback = generatePostMatchCharacter(finalRecord, updatedClub, state.language === 'ar');

      set({
        isMatchLive: false,
        isMatchPaused: false,
        pendingInteractiveEvent: null,
        currentMatchMinute: 90,
        activeMatchHomeTactics: null,
        activeMatchRecord: finalRecord,
        matchHistory: [finalRecord, ...state.matchHistory],
        leagueStandings: updatedStandings,
        leagueFixtures: updatedFixtures,
        vipPoints: state.vipPoints + (won ? 80 : 35),
        dailyMissions: updatedMissions,
        postMatchAnalyst: analystFeedback,
        club: updatedClub,
        livingWorld: playerLifePost.livingWorld,
        clubManagement: economy.clubManagement,
      });

      saveToStorage({
        club: updatedClub,
        clubManagement: economy.clubManagement,
        dailyMissions: updatedMissions,
        leagueStandings: updatedStandings,
        leagueFixtures: updatedFixtures,
        vipPoints: state.vipPoints + (won ? 80 : 35),
      });

      // Play the rest of this matchday, then open the round summary.
      void finishRound(finalRecord.matchDay);
    },

    simulateMatchday: (matchday) => runSimulateMatchday(matchday),

    skipAndSimulateNextMatch: async () => {
      const state = get();
      if (state.isLoadingMatch) return;

      const fixtures = state.leagueFixtures;
      if (fixtures && fixtures.length > 0 && fixtures.every(f => f.played)) {
        set({ isSeasonFinaleModalOpen: true });
        return;
      }

      set({ isLoadingMatch: true });
      const previewData = await buildPreMatchData(false);
      if (!previewData) {
        set({ isLoadingMatch: false });
        return;
      }

      const opponent = previewData.opponentClub;
      const nextFixture = previewData.fixture;
      const vipAttackBoost = previewData.userVipAttackBoost;
      const vipDefenseBoost = previewData.userVipDefenseBoost;

      // One seed for the engine AND the saved record (see confirmStartMatch).
      const matchSeed = Date.now();
      const matchReferee = createRefereeFromSeed(matchSeed);
      const engine = new FootballMatchEngine(
        state.club,
        opponent,
        matchSeed,
        state.club.footballTactics,
        undefined,
        vipAttackBoost,
        vipDefenseBoost,
        matchReferee,
        true,
      );

      const res = engine.simulateToCompletion();
      const won = res.homeScore > res.awayScore;
      const drawn = res.homeScore === res.awayScore;
      const pts = won ? 3 : (drawn ? 1 : 0);

      soundEffects.playWhistle(false);

      // 50% revenue deduction for skipping match
      let __curLevel = 1; for (const __t of VIP_LEVELS) { if (state.vipPoints >= __t.pointsRequired) __curLevel = __t.level; }
      const __curTier = VIP_LEVELS.find(t => t.level === __curLevel) || VIP_LEVELS[0];
      const matchIncome = computeUserMatchIncome(state, __curTier.hasFullInstantSimRewards ? 1 : 0.5);

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
        if (s.clubId === opponent.id) {
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

      const updatedFixtures = state.leagueFixtures.map(f =>
        f.matchday === nextFixture.matchday && f.opponentClubId === opponent.id
          ? { ...f, played: true, homeScore: res.homeScore, awayScore: res.awayScore }
          : f
      );

      const finalRecord: MatchRecord = {
        id: `match_${matchSeed}`,
        sport: 'football',
        seed: matchSeed,
        referee: engine.getReferee(),
        homeClubId: state.club.id,
        homeClubName: state.club.name,
        awayClubId: opponent.id,
        awayClubName: opponent.name,
        homeScore: res.homeScore,
        awayScore: res.awayScore,
        events: res.events,
        stats: res.stats,
        varReviews: engine.getVarReviews(),
        isFinished: true,
        competition: state.club.divisionName || 'الدوري',
        matchDay: nextFixture.matchday,
        date: new Date().toISOString().split('T')[0],
      };

      const playerLifePost = applyPostMatchPlayerLife(state, finalRecord, won, drawn);

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

      let activeVipTier = VIP_LEVELS[0];
      for (const tier of VIP_LEVELS) {
        if (state.vipPoints >= tier.pointsRequired) activeVipTier = tier;
      }
      const mitigationFactor = 1 - ((activeVipTier.lossMitigationPercent || 0) / 100);
      const boardPenalty = Math.round(3 * mitigationFactor);
      const fanPenalty = Math.round(4 * mitigationFactor);

      const economy = applyMatchEconomy(
        state,
        playerLifePost.club,
        matchIncome,
        won,
        drawn,
        boardPenalty,
        fanPenalty,
      );
      const updatedClub = economy.club;

      const analystFeedback = generatePostMatchCharacter(finalRecord, updatedClub, state.language === 'ar');

      set({
        isLoadingMatch: false,
        preMatchModalOpen: false,
        preMatchPreview: null,
        isMatchLive: false,
        activeEngine: null,
        activeMatchHomeTactics: null,
        activeMatchRecord: finalRecord,
        matchHistory: [finalRecord, ...state.matchHistory],
        leagueStandings: updatedStandings,
        leagueFixtures: updatedFixtures,
        vipPoints: state.vipPoints + (won ? 80 : 35),
        dailyMissions: updatedMissions,
        postMatchAnalyst: analystFeedback,
        club: updatedClub,
        livingWorld: playerLifePost.livingWorld,
        clubManagement: economy.clubManagement,
      });

      saveToStorage({
        club: updatedClub,
        clubManagement: economy.clubManagement,
        dailyMissions: updatedMissions,
        leagueStandings: updatedStandings,
        leagueFixtures: updatedFixtures,
        vipPoints: state.vipPoints + (won ? 80 : 35),
      });

      void finishRound(finalRecord.matchDay);
    },

    unlockMatchScout: (method) => {
      const state = get();
      const nextFixture = state.leagueFixtures.find(f => !f.played);
      if (!nextFixture) {
        return { success: false, message: state.language === 'ar' ? 'لا توجد مباراة قادمة' : 'No upcoming fixture' };
      }

      const isAr = state.language === 'ar';
      const COIN_COST = 10000;
      const DIAMOND_COST = 15;

      let activeVipTier = VIP_LEVELS[0];
      for (const tier of VIP_LEVELS) {
        if (state.vipPoints >= tier.pointsRequired) activeVipTier = tier;
      }
      const accuracy = Math.min(98, Math.round(70 + (activeVipTier.level - 1) * 1.5));

      if (method === 'coins') {
        if (state.club.finances.coins < COIN_COST) {
          return {
            success: false,
            message: isAr ? `رصيد الكوينز غير كافٍ! تحتاج ${COIN_COST.toLocaleString()} 🪙` : `Insufficient coins! Need ${COIN_COST.toLocaleString()} 🪙`
          };
        }
      } else {
        if ((state.club.finances.diamonds || 0) < DIAMOND_COST) {
          return {
            success: false,
            message: isAr ? `رصيد الجواهر غير كافٍ! تحتاج ${DIAMOND_COST} 💎` : `Insufficient diamonds! Need ${DIAMOND_COST} 💎`
          };
        }
      }

      soundEffects.playTap();

      const newReports = {
        ...state.matchScoutReports,
        [nextFixture.matchday]: {
          matchday: nextFixture.matchday,
          opponentClubId: nextFixture.opponentClubId,
          unlocked: true,
          unlockedBy: method,
          accuracyPercent: accuracy,
          unlockedAt: Date.now(),
        }
      };

      const updatedClub = {
        ...state.club,
        finances: {
          ...state.club.finances,
          coins: method === 'coins' ? state.club.finances.coins - COIN_COST : state.club.finances.coins,
          diamonds: method === 'diamonds' ? (state.club.finances.diamonds || 0) - DIAMOND_COST : (state.club.finances.diamonds || 0),
        }
      };

      set({
        club: updatedClub,
        matchScoutReports: newReports,
        preMatchPreview: state.preMatchPreview ? {
          ...state.preMatchPreview,
          isScouted: true,
          scoutAccuracy: accuracy,
        } : null,
        nextMatchInsight: state.nextMatchInsight ? {
          ...state.nextMatchInsight,
          isScouted: true,
          scoutAccuracy: accuracy,
        } : null,
      });

      saveToStorage({ club: updatedClub, matchScoutReports: newReports });

      return {
        success: true,
        message: isAr
          ? `🔍 تم استلام التقرير الفني بدقة ${accuracy}% بفضل رتبتك (VIP ${activeVipTier.level})!`
          : `🔍 Scout report received with ${accuracy}% accuracy (VIP ${activeVipTier.level})!`
      };
    },

    setSeasonFinaleModalOpen: (open) => {
      set({ isSeasonFinaleModalOpen: open });
    },

    renewSeasonWithCurrentClub: () => {
      const state = get();
      soundEffects.playFanfare();
      confetti({ particleCount: 120, spread: 90 });

      // Calculate final standing position
      const sorted = [...state.leagueStandings].sort(
        (a, b) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor
      );
      const rankIdx = sorted.findIndex(s => s.clubId === state.club.id);
      const position = rankIdx >= 0 ? rankIdx + 1 : 1;

      ensureDefaultHandlersRegistered();
      const seasonEnd = runSeasonEndLivingWorld({
        livingWorld: state.livingWorld,
        club: state.club,
        leagueStandings: state.leagueStandings,
        finalRank: position,
        timestampIso: new Date().toISOString(),
        players: state.club.footballSquad,
      });

      // Prize money
      const prizeCoins = position === 1 ? 500000 : position <= 4 ? 300000 : 150000;
      const prizeDiamonds = position === 1 ? 100 : position <= 4 ? 50 : 25;

      const freshFixtures = generateFixturesForLeague(state.club.divisionId, state.club.id);
      const freshStandings = generateStandingsForLeague(state.club.divisionId, state.club.id, state.club.name);

      const updatedClub = {
        ...state.club,
        trophies: position === 1 ? (state.club.trophies || 0) + 1 : (state.club.trophies || 0),
        finances: {
          ...state.club.finances,
          coins: state.club.finances.coins + prizeCoins,
          diamonds: (state.club.finances.diamonds || 0) + prizeDiamonds,
          reputation: state.club.finances.reputation + (position === 1 ? 250 : 100),
        }
      };

      set({
        club: updatedClub,
        livingWorld: seasonEnd.livingWorld,
        leagueFixtures: freshFixtures,
        leagueStandings: freshStandings,
        tournamentStats: [],
        simulatedMatchdays: [],
        lastRoundSummary: null,
        matchScoutReports: {},
        isSeasonFinaleModalOpen: false,
        activeTab: 'dashboard',
      });

      saveToStorage({
        club: updatedClub,
        livingWorld: seasonEnd.livingWorld,
        leagueFixtures: freshFixtures,
        leagueStandings: freshStandings,
        tournamentStats: [],
        simulatedMatchdays: [],
        matchScoutReports: {},
      });
    },

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

    applyRedeemReward: (reward) => {
      const state = get();
      soundEffects.playFanfare();
      confetti({ particleCount: 90, spread: 80 });

      const updatedClub = {
        ...state.club,
        finances: {
          ...state.club.finances,
          coins: state.club.finances.coins + (reward.coins || 0),
          trainingPoints: state.club.finances.trainingPoints + (reward.trainingPoints || 0),
          diamonds: (state.club.finances.diamonds || 0) + (reward.diamonds || 0),
        },
      };

      set({ club: updatedClub });
      saveToStorage({ club: updatedClub });
    },

    skipDailyMissionInstant: (missionId: string) => {
      const state = get();
      const isAr = state.language === 'ar';

      let currentLevel = 1;
      for (const tier of VIP_LEVELS) {
        if (state.vipPoints >= tier.pointsRequired) currentLevel = tier.level;
      }
      const currentTier = VIP_LEVELS.find(t => t.level === currentLevel) || VIP_LEVELS[0];

      if (!currentTier.hasOneClickMissionSkip) {
        return {
          success: false,
          message: isAr ? 'هذه الميزة حصرية لأعضاء VIP 10 فما فوق.' : 'This feature is exclusive to VIP 10 and above.'
        };
      }

      const todayStr = getTodayStr();
      if (state.missionSkipUsedDate === todayStr) {
        return {
          success: false,
          message: isAr ? 'استخدمت تخطي المهمة اليومي مسبقاً لهذا اليوم — عُد غداً!' : "You've already used today's mission skip — come back tomorrow!"
        };
      }

      const mission = (state.dailyMissions || INITIAL_DAILY_MISSIONS).find((m) => m.id === missionId);
      if (!mission) {
        return { success: false, message: isAr ? 'المهمة غير موجودة' : 'Mission not found' };
      }
      if (mission.isClaimed) {
        return { success: false, message: isAr ? 'تم استلام هذه المهمة مسبقاً' : 'This mission is already claimed' };
      }

      soundEffects.playFanfare();
      confetti({ particleCount: 90, spread: 75 });

      const updatedMissions = (state.dailyMissions || INITIAL_DAILY_MISSIONS).map((m) =>
        m.id === missionId ? { ...m, current: m.target, isClaimed: true } : m
      );

      const updatedClub = {
        ...state.club,
        finances: {
          ...state.club.finances,
          coins: state.club.finances.coins + mission.rewardCoins,
          diamonds: (state.club.finances.diamonds || 0) + mission.rewardDiamonds,
          trainingPoints: state.club.finances.trainingPoints + mission.rewardTrainingPoints,
        },
      };
      const newVipPoints = state.vipPoints + mission.rewardVipPoints;

      set({
        dailyMissions: updatedMissions,
        vipPoints: newVipPoints,
        club: updatedClub,
        missionSkipUsedDate: todayStr,
      });
      saveToStorage({
        dailyMissions: updatedMissions,
        vipPoints: newVipPoints,
        club: updatedClub,
        missionSkipUsedDate: todayStr,
      });

      return {
        success: true,
        message: isAr
          ? `👑 تم تخطي المهمة بنقرة واحدة (VIP ${currentLevel})! استلمت: ${mission.rewardCoins.toLocaleString()} كوينز، ${mission.rewardDiamonds} جوهرة، ${mission.rewardTrainingPoints} نقطة تدريب.`
          : `👑 Mission skipped in one click (VIP ${currentLevel})! Received: ${mission.rewardCoins.toLocaleString()} Coins, ${mission.rewardDiamonds} Diamonds, ${mission.rewardTrainingPoints} Training Pts.`
      };
    },

    claimDailyCheckIn: () => {
      const state = get();
      if (state.checkInClaimedToday) return;

      soundEffects.playFanfare();
      confetti({ particleCount: 70, spread: 80 });

      let currentLevel = 1;
      for (const tier of VIP_LEVELS) {
        if (state.vipPoints >= tier.pointsRequired) currentLevel = tier.level;
      }
      const currentTier = VIP_LEVELS.find(t => t.level === currentLevel) || VIP_LEVELS[0];
      const loginMult = currentTier.loginBonusMultiplier || 1;

      const newStreak = (state.checkInStreak % 7) + 1;
      const rewardCoins = Math.round(newStreak * 8000 * loginMult);
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

      let currentLevel = 1;
      for (const tier of VIP_LEVELS) {
        if (state.vipPoints >= tier.pointsRequired) currentLevel = tier.level;
      }
      const currentTier = VIP_LEVELS.find(t => t.level === currentLevel) || VIP_LEVELS[0];
      const recoveryBonusMult = 1 + (currentTier.recoverySpeedBonusPercent || 0) / 100;

      const recoveryChanges = stateChangesForTrainingSession(
        state.club.footballSquad.map((p) => p.id),
        { category: 'recovery', intensity: 'low' },
      ).map((c) =>
        c.kind === 'patchPlayerLife' && c.legacyDelta
          ? {
              ...c,
              legacyDelta: {
                fatigue: Math.round((c.legacyDelta.fatigue ?? -20) * recoveryBonusMult),
                stamina: Math.round((c.legacyDelta.stamina ?? 12) * recoveryBonusMult),
              },
            }
          : c,
      );
      const recoveryApplied = applyStateChanges(
        { livingWorld: state.livingWorld, players: state.club.footballSquad },
        recoveryChanges,
      );

      const updatedMissions = (state.dailyMissions || INITIAL_DAILY_MISSIONS).map((m) => {
        if (m.id === 'mission_manage_fatigue' && !m.isClaimed) {
          return { ...m, current: Math.min(m.target, m.current + 1) };
        }
        return m;
      });

      const updatedClub = {
        ...state.club,
        footballSquad: recoveryApplied.players,
        finances: {
          ...state.club.finances,
          coins: state.club.finances.coins - cost,
        },
      };

      set({
        club: updatedClub,
        livingWorld: recoveryApplied.livingWorld,
        dailyMissions: updatedMissions,
      });
      saveToStorage({ club: updatedClub, livingWorld: recoveryApplied.livingWorld, dailyMissions: updatedMissions });

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

    dispatchLivingWorldEvent: (event) => {
      ensureDefaultHandlersRegistered();
      const state = get();
      const result = runLivingWorldDispatch(
        { livingWorld: state.livingWorld, players: state.club.footballSquad },
        event
      );
      if (result.applied) {
        set({
          livingWorld: result.result.livingWorld,
          club: { ...state.club, footballSquad: result.result.players },
        });
        saveToStorage(undefined, false);
      }
      return result;
    },

    resolvePlayerLifeInteraction: (interactionId, responseId) => {
      const state = get();
      const interaction = (state.livingWorld.pendingInteractions ?? []).find((i) => i.id === interactionId);
      if (!interaction) return false;
      const result = resolveInteraction(
        { livingWorld: state.livingWorld, players: state.club.footballSquad },
        interaction,
        responseId,
      );
      set({
        livingWorld: result.livingWorld,
        club: { ...state.club, footballSquad: result.players },
      });
      saveToStorage(undefined, false);
      return true;
    },

    changeCaptainWithConsequences: (newCaptainId) => {
      const state = get();
      const oldCaptainId = state.club.footballTactics.captainId;
      if (oldCaptainId === newCaptainId) return;
      const season = state.livingWorld.currentSeason ?? 1;
      const matchday = state.leagueFixtures.filter((f) => f.played).length + 1;
      const changes = captaincyChangeConsequences(oldCaptainId, newCaptainId, season, matchday);
      const applied = applyStateChanges(
        { livingWorld: state.livingWorld, players: state.club.footballSquad },
        changes,
      );
      soundEffects.playTap();
      set({
        livingWorld: applied.livingWorld,
        club: {
          ...state.club,
          footballSquad: applied.players,
          footballTactics: {
            ...state.club.footballTactics,
            captainId: newCaptainId,
          },
        },
      });
      saveToStorage(undefined, false);
    },

    assignMentoringPairAction: (mentorId, menteeId) => {
      const state = get();
      const changes = assignMentoringPair(mentorId, menteeId);
      const applied = applyStateChanges(
        { livingWorld: state.livingWorld, players: state.club.footballSquad },
        changes,
      );
      soundEffects.playTap();
      set({
        livingWorld: applied.livingWorld,
        club: {
          ...state.club,
          footballSquad: applied.players,
        },
      });
      saveToStorage(undefined, false);
    },

    removeMentoringPairAction: (menteeId) => {
      const state = get();
      const changes: import('../domain/livingWorld/types').StateChange[] = [
        {
          kind: 'patchPlayerLife',
          playerId: menteeId,
          patch: { mentoring: { mentorId: undefined, menteeIds: [] } },
          legacyDelta: {},
        },
      ];
      const applied = applyStateChanges(
        { livingWorld: state.livingWorld, players: state.club.footballSquad },
        changes,
      );
      soundEffects.playTap();
      set({
        livingWorld: applied.livingWorld,
        club: {
          ...state.club,
          footballSquad: applied.players,
        },
      });
      saveToStorage(undefined, false);
    },

    markNotificationRead: (id) => {
      const state = get();
      const notifications = (state.livingWorld.notifications ?? []).map((n) =>
        n.id === id ? { ...n, read: true } : n,
      );
      set({
        livingWorld: {
          ...state.livingWorld,
          notifications,
        },
      });
      saveToStorage(undefined, false);
    },

    markAllNotificationsRead: () => {
      const state = get();
      const notifications = (state.livingWorld.notifications ?? []).map((n) => ({ ...n, read: true }));
      set({
        livingWorld: {
          ...state.livingWorld,
          notifications,
        },
      });
      saveToStorage(undefined, false);
    },

    runCustomTrainingPlan: (plan) => {
      const state = get();
      const cost = plan.intensity === 'very_high' ? 45 : plan.intensity === 'high' ? 35 : 25;
      if (state.club.finances.trainingPoints < cost) return false;

      soundEffects.playWhistle(true);
      const changes = stateChangesForTrainingSession(
        state.club.footballSquad.map((p) => p.id),
        plan,
      );
      const applied = applyStateChanges(
        { livingWorld: state.livingWorld, players: state.club.footballSquad },
        changes,
      );
      set({
        vipPoints: state.vipPoints + 15,
        livingWorld: applied.livingWorld,
        club: {
          ...state.club,
          footballSquad: applied.players,
          finances: {
            ...state.club.finances,
            trainingPoints: state.club.finances.trainingPoints - cost,
          },
        },
      });
      saveToStorage(undefined, false);
      return true;
    },

    applyClubManagementChanges: (changes: ClubManagementChange[]) => {
      const state = get();
      if (!state.clubManagement) return;
      const nextCm = applyClubManagementChanges(state.clubManagement, changes);
      const nextClub = syncClubFromClubManagement(state.club, nextCm);
      set({ clubManagement: nextCm, club: nextClub });
      saveToStorage({ clubManagement: nextCm, club: nextClub });
    },

    hireStaffMember: (candidate: StaffMember) => {
      const state = get();
      const isAr = state.language === 'ar';
      if (!state.clubManagement) return { success: false, message: 'Club management not initialized' };

      const currentStaffWages = computeStaffWeeklyWages(state.clubManagement.staff.members.map((m) => m.weeklyWage));
      const squadWages = state.club.footballSquad.map((p) => p.wage).reduce((a, b) => a + b, 0);
      const totalWages = currentStaffWages + squadWages + candidate.weeklyWage;
      if (totalWages > state.clubManagement.finance.wageBudgetWeekly * 1.35) {
        soundEffects.playBuzz();
        return {
          success: false,
          message: isAr
            ? `⚠️ سقف الرواتب الأسبوعي لا يسمح بالتعاقد مع ${candidate.name} (الراتب: ${candidate.weeklyWage.toLocaleString()} كوينز).`
            : `⚠️ Weekly wage ceiling exceeded for ${candidate.name} (Wage: ${candidate.weeklyWage.toLocaleString()} coins).`,
        };
      }

      const signingFee = candidate.weeklyWage * 2;
      if (state.clubManagement.finance.coins < signingFee) {
        soundEffects.playBuzz();
        return {
          success: false,
          message: isAr
            ? `❌ الرصيد المالي غير كافٍ لدفع رسوم توقيع العقد (${signingFee.toLocaleString()} كوينز).`
            : `❌ Insufficient coins to pay signing fee (${signingFee.toLocaleString()} coins).`,
        };
      }

      const updatedFinance = postFinanceTransaction(state.clubManagement.finance, {
        amount: -signingFee,
        category: 'staff_wages',
        reasonCode: 'staff_hiring_fee',
        gameWeek: deriveGameWeekFromSave(buildPartialSave(state)),
        season: state.livingWorld.currentSeason,
        timestampIso: new Date().toISOString(),
        entryId: `ledger_staff_hire_${Date.now()}`,
      });

      const changes: ClubManagementChange[] = [
        { kind: 'patchFinance', patch: updatedFinance },
        { kind: 'upsertStaffMember', member: candidate },
      ];

      const nextCm = applyClubManagementChanges(state.clubManagement, changes);
      const nextClub = syncClubFromClubManagement(state.club, nextCm);

      get().dispatchLivingWorldEvent({
        id: `evt_staff_hire_${candidate.id}_${Date.now()}`,
        type: 'staff.hired',
        timestamp: new Date().toISOString(),
        season: state.livingWorld.currentSeason,
        severity: 'medium',
        context: {
          staffId: candidate.id,
          name: candidate.name,
          category: candidate.category,
          weeklyWage: candidate.weeklyWage,
          title: isAr ? 'تعاقد طاقم فني' : 'Staff hired',
          message: isAr
            ? `تم التعاقد مع ${candidate.name}.`
            : `${candidate.name} joined the club staff.`,
        },
      });

      soundEffects.playFanfare();
      confetti({ particleCount: 50, spread: 60 });

      set({ clubManagement: nextCm, club: nextClub });
      saveToStorage({ clubManagement: nextCm, club: nextClub });

      return {
        success: true,
        message: isAr
          ? `✅ تم التعاقد بنجاح مع ${candidate.name} بعقد يمتد لموسمين!`
          : `✅ Successfully hired ${candidate.name} on a 2-season contract!`,
      };
    },

    fireStaffMember: (staffId: string) => {
      const state = get();
      const isAr = state.language === 'ar';
      if (!state.clubManagement) return { success: false, message: 'Club management not initialized' };

      const member = state.clubManagement.staff.members.find((m) => m.id === staffId);
      if (!member) return { success: false, message: 'Staff member not found' };

      const severance = member.weeklyWage * 4;
      const updatedFinance = postFinanceTransaction(state.clubManagement.finance, {
        amount: -severance,
        category: 'staff_wages',
        reasonCode: 'staff_severance',
        gameWeek: deriveGameWeekFromSave(buildPartialSave(state)),
        season: state.livingWorld.currentSeason,
        timestampIso: new Date().toISOString(),
        entryId: `ledger_severance_${Date.now()}`,
      });

      const delegationPatch: Partial<typeof state.clubManagement.delegation> = {
        assigneeByTask: { ...state.clubManagement.delegation.assigneeByTask },
      };
      for (const [task, assignee] of Object.entries(delegationPatch.assigneeByTask || {})) {
        if (assignee === staffId) {
          delete delegationPatch.assigneeByTask![task as import('../domain/clubManagement').DelegationTask];
        }
      }

      const changes: ClubManagementChange[] = [
        { kind: 'patchFinance', patch: updatedFinance },
        { kind: 'removeStaffMember', staffId },
        { kind: 'patchDelegation', patch: delegationPatch },
      ];

      const nextCm = applyClubManagementChanges(state.clubManagement, changes);
      const nextClub = syncClubFromClubManagement(state.club, nextCm);

      get().dispatchLivingWorldEvent({
        id: `evt_staff_fire_${staffId}_${Date.now()}`,
        type: 'staff.fired',
        timestamp: new Date().toISOString(),
        season: state.livingWorld.currentSeason,
        severity: 'medium',
        context: {
          staffId,
          name: member.name,
          category: member.category,
          severance,
          title: isAr ? 'إنهاء خدمات طاقم' : 'Staff released',
          message: isAr
            ? `غادر ${member.name} النادي.`
            : `${member.name} left the club staff.`,
        },
      });

      soundEffects.playTap();

      set({ clubManagement: nextCm, club: nextClub });
      saveToStorage({ clubManagement: nextCm, club: nextClub });

      return {
        success: true,
        message: isAr
          ? `تم إنهاء خدمات ${member.name} ودفع مستحقات نهاية الخدمة (${severance.toLocaleString()} كوينز).`
          : `Dismissed ${member.name} with severance settlement of ${severance.toLocaleString()} coins.`,
      };
    },

    updateDelegationTask: (task: DelegationTask, mode: DelegationMode, assigneeStaffId?: string) => {
      const state = get();
      if (!state.clubManagement) return;

      const currentDelegation = state.clubManagement.delegation;
      const patch: Partial<typeof currentDelegation> = {
        modes: { ...currentDelegation.modes, [task]: mode },
        assigneeByTask: { ...currentDelegation.assigneeByTask, [task]: assigneeStaffId || undefined },
      };

      const nextCm = applyClubManagementChanges(state.clubManagement, [
        { kind: 'patchDelegation', patch },
      ]);
      const nextClub = syncClubFromClubManagement(state.club, nextCm);

      soundEffects.playTap();
      set({ clubManagement: nextCm, club: nextClub });
      saveToStorage({ clubManagement: nextCm, club: nextClub });
    },

    submitBoardRequest: (request: BoardRequestKind) => {
      const state = get();
      const isAr = state.language === 'ar';
      if (!state.clubManagement) {
        return { approved: false, message: 'Not initialized', reasonCodes: [] };
      }

      const { influence, board } = state.clubManagement;
      const evaluation = evaluateBoardRequest(influence, board.trust, board.patience, request);

      const requestLabels: Record<BoardRequestKind, { ar: string; en: string }> = {
        raise_transfer_budget: { ar: 'زيادة ميزانية الانتقالات', en: 'Raise Transfer Budget' },
        hire_staff: { ar: 'استقدام طاقم فني إضافي', en: 'Hire Additional Staff' },
        upgrade_facility: { ar: 'تسريع تطوير مرافق النادي', en: 'Accelerate Facility Upgrade' },
        academy_focus_change: { ar: 'تغيير تركيز استقطاب الأكاديمية', en: 'Change Academy Recruitment Focus' },
        release_player: { ar: 'فسخ عقد لاعب بالتراضي', en: 'Mutual Contract Termination' },
      };

      const label = requestLabels[request] || { ar: request, en: request };

      if (evaluation.approved) {
        soundEffects.playFanfare();
        confetti({ particleCount: 50, spread: 60 });

        const changes: ClubManagementChange[] = [];

        if (request === 'raise_transfer_budget') {
          const boost = Math.round(state.clubManagement.finance.coins * 0.25);
          changes.push({
            kind: 'patchFinance',
            patch: { transferBudget: state.clubManagement.finance.transferBudget + boost },
          });
        } else if (request === 'hire_staff') {
          changes.push({
            kind: 'patchBoard',
            patch: { patience: Math.min(100, board.patience + 10) },
          });
        }

        changes.push({
          kind: 'patchBoard',
          patch: {
            patience: Math.max(10, board.patience - 15),
          },
        });

        const nextCm = applyClubManagementChanges(state.clubManagement, changes);
        const nextClub = syncClubFromClubManagement(state.club, nextCm);

        get().dispatchLivingWorldEvent({
          id: `evt_board_req_${request}_${Date.now()}`,
          type: 'board.request_resolved',
          timestamp: new Date().toISOString(),
          season: state.livingWorld.currentSeason,
          severity: 'medium',
          context: {
            request,
            approved: true,
            reasons: evaluation.reasonCodes.join(','),
            title: isAr ? `طلب مجلس الإدارة: ${label.ar}` : `Board request: ${label.en}`,
            message: isAr
              ? `وافق مجلس الإدارة على طلب (${label.ar}).`
              : `The board approved your request (${label.en}).`,
          },
        });

        set({ clubManagement: nextCm, club: nextClub });
        saveToStorage({ clubManagement: nextCm, club: nextClub });

        return {
          approved: true,
          reasonCodes: evaluation.reasonCodes,
          message: isAr
            ? `✅ وافق مجلس الإدارة على طلبك (${label.ar}) بناءً على رصيد نفوذك وثقة الإدارة!`
            : `✅ The board approved your request for (${label.en}) based on your managerial influence!`,
        };
      } else {
        soundEffects.playBuzz();

        const reasonExplainAr: Record<string, string> = {
          influence_too_low: 'مستوى نفوذ المدرب غير كافٍ لفرض هذا الطلب',
          board_trust_low: 'ثقة مجلس الإدارة منخفضة حالياً، يُرجى تحسين نتائج المباريات',
          influence_staff_locked: 'صلاحية قرارات الطاقم الفني مقفلة وتتطلب نفوذاً أعلى',
          board_impatient: 'صبر مجلس الإدارة نفد بسبب المطالب المتكررة',
          influence_infra_locked: 'صلاحية طلبات البنية التحتية مقفلة',
          influence_academy_locked: 'صلاحية قرارات الأكاديمية مقفلة',
          influence_player_authority_locked: 'صلاحية فسخ عقود اللاعبين مقفلة',
        };

        const firstReason = evaluation.reasonCodes[0];
        const reasonText = isAr
          ? (reasonExplainAr[firstReason] || 'رفضت الإدارة الطلب في الوقت الراهن.')
          : `The board rejected the request (${firstReason || 'insufficient influence'}).`;

        get().dispatchLivingWorldEvent({
          id: `evt_board_req_${request}_${Date.now()}`,
          type: 'board.request_resolved',
          timestamp: new Date().toISOString(),
          season: state.livingWorld.currentSeason,
          severity: 'low',
          context: {
            request,
            approved: false,
            reasons: evaluation.reasonCodes.join(','),
            title: isAr ? `طلب مجلس الإدارة: ${label.ar}` : `Board request: ${label.en}`,
            message: isAr
              ? `رفض مجلس الإدارة طلب (${label.ar}): ${reasonText}`
              : `Board rejected request (${label.en}): ${reasonText}`,
          },
        });

        return {
          approved: false,
          reasonCodes: evaluation.reasonCodes,
          message: isAr
            ? `❌ رفض مجلس الإدارة طلب (${label.ar}): ${reasonText}`
            : `❌ Board rejected request (${label.en}): ${reasonText}`,
        };
      }
    },

    upgradeAnalyticsDepartment: () => {
      const state = get();
      const isAr = state.language === 'ar';
      if (!state.clubManagement) return { success: false, message: 'Not initialized' };

      const currentLevel = state.clubManagement.facilities.analyticsDepartmentLevel;
      if (currentLevel >= 10) {
        return {
          success: false,
          message: isAr ? 'قسم التحليل الرياضي وصل للحد الأقصى (المستوى 10)!' : 'Analytics Department is at max level (10)!',
        };
      }

      const cost = currentLevel * 30000;
      if (state.clubManagement.finance.coins < cost) {
        soundEffects.playBuzz();
        return {
          success: false,
          message: isAr
            ? `رصيد الكوينز غير كافٍ! تحتاج إلى ${cost.toLocaleString()} كوينز 💰.`
            : `Insufficient coins! Need ${cost.toLocaleString()} coins 💰.`,
        };
      }

      const updatedFinance = postFinanceTransaction(state.clubManagement.finance, {
        amount: -cost,
        category: 'facility_running',
        reasonCode: 'analytics_upgrade',
        gameWeek: deriveGameWeekFromSave(buildPartialSave(state)),
        season: state.livingWorld.currentSeason,
        timestampIso: new Date().toISOString(),
        entryId: `ledger_analytics_upgrade_${Date.now()}`,
      });

      const nextCm = applyClubManagementChanges(state.clubManagement, [
        { kind: 'patchFinance', patch: updatedFinance },
        { kind: 'setAnalyticsLevel', level: currentLevel + 1 },
      ]);
      const nextClub = syncClubFromClubManagement(state.club, nextCm);

      soundEffects.playFanfare();
      confetti({ particleCount: 60, spread: 70 });

      set({ clubManagement: nextCm, club: nextClub });
      saveToStorage({ clubManagement: nextCm, club: nextClub });

      return {
        success: true,
        message: isAr
          ? `🚀 تم تطوير قسم التحليل الرياضي والبيانات إلى المستوى ${currentLevel + 1}!`
          : `🚀 Upgraded Analytics Department to Level ${currentLevel + 1}!`,
      };
    },

    submitPressConferenceAnswer: (question: PressQuestion, answer: PressAnswerOption) => {
      const state = get();
      const clubId = state.club.id;
      const gameWeek = Math.max(1, (state.matchHistory || []).length + 1);
      const timestampIso = new Date().toISOString();

      const resolved = resolvePressAnswer({
        question,
        answer,
        season: state.livingWorld.currentSeason,
        clubId,
        gameWeek,
        timestampIso,
      });

      // Apply returned StateChanges via authoritative domain reducer
      const nextReducer = applyStateChanges(
        { livingWorld: state.livingWorld, players: state.club.footballSquad },
        resolved.changes
      );

      // Ingest returned events through livingWorld event pipeline
      for (const ev of resolved.events) {
        state.dispatchLivingWorldEvent(ev);
      }

      set({ livingWorld: nextReducer.livingWorld });
      saveToStorage({ livingWorld: nextReducer.livingWorld });

      const cohesionDelta = answer.tone === 'support' ? 2 : answer.tone === 'attack' ? -3 : 0;
      const isAr = state.language === 'ar';

      const visibleMessageAr =
        answer.tone === 'support'
          ? 'أظهرت دعماً علنياً للاعبي الفريق، مما عزز من معنويات وتماسك غرفة الملابس.'
          : answer.tone === 'attack'
          ? 'أثارت تصريحاتك الحادة استياءً وتوتراً ملحوظاً داخل غرفة الملابس.'
          : 'اتسمت إجابتك بالدبلوماسية والهدوء المعتاد أمام وسائل الإعلام.';

      const visibleMessageEn =
        answer.tone === 'support'
          ? 'You publicly backed your squad, boosting dressing room morale and cohesion.'
          : answer.tone === 'attack'
          ? 'Your critical stance created friction and unease in the dressing room.'
          : 'Your calm, professional response neutralized media speculation.';

      return {
        success: true,
        visibleMessageAr,
        visibleMessageEn,
        cohesionDelta,
      };
    },

    storeNarrativeCacheEntry: (entry: NarrativeCacheEntry) => {
      const state = get();
      const clubId = state.club.id;
      const phaseF = ensurePhaseFState(state.livingWorld, clubId);
      const updatedCache = mergeNarrativeCache(phaseF.narrativeCache, entry);

      const nextReducer = applyStateChanges(
        { livingWorld: state.livingWorld, players: state.club.footballSquad },
        [{ kind: 'patchPhaseF', clubId, patch: { narrativeCache: updatedCache } }]
      );

      set({ livingWorld: nextReducer.livingWorld });
      saveToStorage({ livingWorld: nextReducer.livingWorld });
    },

    exportGameData: () => {
      return persistenceService.exportJson(get(), true);
    },

    importCustomDataPack: (jsonText) => {
      const res = persistenceService.deserialize(jsonText);
      if (!res.success || !res.data) {
        return { success: false, message: res.message };
      }
      const data = ensureClubManagementV6(res.data);
      const importedHydrated = hydrateLivingWorldFromClub(data.club, data.livingWorld);
      const importedClub = data.clubManagement
        ? syncClubFromClubManagement(importedHydrated.club, data.clubManagement)
        : importedHydrated.club;
      set({
        club: importedClub,
        clubManagement: data.clubManagement!,
        saveId: data.saveId,
        recruitmentWorld: data.recruitmentWorld ?? get().recruitmentWorld,
        currentSport: data.currentSport,
        language: data.language,
        soundEnabled: data.soundEnabled,
        hasSelectedInitialClub: data.hasSelectedInitialClub,
        isGuest: data.isGuest,
        hasClaimedLoginBonus: data.hasClaimedLoginBonus,
        energy: data.energy,
        lastEnergyUpdate: data.lastEnergyUpdate,
        vipPoints: data.vipPoints,
        lastVipClaimDate: data.lastVipClaimDate,
        claimedVipUpgradeChests: data.claimedVipUpgradeChests,
        missionSkipUsedDate: data.missionSkipUsedDate,
        checkInStreak: data.checkInStreak,
        lastCheckInDate: data.lastCheckInDate,
        vipClaimedToday: !!data.lastVipClaimDate && data.lastVipClaimDate === getTodayStr(),
        checkInClaimedToday: !!data.lastCheckInDate && data.lastCheckInDate === getTodayStr(),
        savedTacticalPlans: data.savedTacticalPlans,
        pendingFacilityUpgrades: data.pendingFacilityUpgrades,
        activeNegotiations: data.activeNegotiations,
        academyDiscoveries: data.academyDiscoveries,
        scoutMarket: data.scoutMarket,
        dailyMissions: data.dailyMissions,
        storyMissions: data.storyMissions,
        leagueStandings: data.leagueStandings,
        leagueFixtures: data.leagueFixtures,
        matchHistory: data.matchHistory,
        tournamentStats: data.tournamentStats,
        simulatedMatchdays: data.simulatedMatchdays,
        matchScoutReports: data.matchScoutReports,
        unlockedSpeed2x: data.unlockedSpeed2x,
        livingWorld: importedHydrated.livingWorld,
        savePassthrough: data.savePassthrough ?? {},
        assistant: mergeAssistantIntoRuntimeState(data.assistant),
        aiNarrationEnabled: readAiNarrationEnabledFromSave(data),
        activeTab: 'dashboard',
        clubSelectionModalOpen: false,
      });

      persistenceService.saveImmediate(get());
      soundEffects.playFanfare();
      return {
        success: true,
        message: data.language === 'ar'
          ? 'تم استرجاع مسيرة النادي والبيانات بالكامل بنجاح!'
          : 'Career save and all season data restored successfully!'
      };
    },

    resetCareer: () => {
      persistenceService.clearStorage();
      const resetHydrated = hydrateLivingWorldFromClub(REAL_INITIAL_PLAYER_CLUB);
      const resetSave = ensureClubManagementV6(
        ensureRecruitmentV5({
          saveVersion: 6,
          saveId: `save_${Date.now()}`,
          savedAt: new Date().toISOString(),
          appVersion: '2.1.0',
          currentSport: 'football',
          language: 'ar',
          soundEnabled: true,
          hasSelectedInitialClub: false,
          isGuest: true,
          hasClaimedLoginBonus: false,
          club: resetHydrated.club,
          energy: 100,
          lastEnergyUpdate: Date.now(),
          vipPoints: 0,
          lastVipClaimDate: null,
          claimedVipUpgradeChests: [1],
          missionSkipUsedDate: null,
          checkInStreak: 0,
          lastCheckInDate: null,
          savedTacticalPlans: [],
          pendingFacilityUpgrades: [],
          activeNegotiations: [],
          academyDiscoveries: [],
          scoutMarket: REAL_INITIAL_SCOUT_MARKET,
          dailyMissions: INITIAL_DAILY_MISSIONS,
          storyMissions: STORY_CHAPTER_1_MISSIONS,
          leagueStandings: REAL_INITIAL_STANDINGS,
          leagueFixtures: [],
          matchHistory: [],
          tournamentStats: [],
          simulatedMatchdays: [],
          matchScoutReports: {},
          unlockedSpeed2x: false,
          livingWorld: resetHydrated.livingWorld,
        }),
      );
      set({
        club: resetSave.clubManagement
          ? syncClubFromClubManagement(resetHydrated.club, resetSave.clubManagement)
          : resetHydrated.club,
        clubManagement: resetSave.clubManagement!,
        recruitmentWorld: resetSave.recruitmentWorld!,
        vipPoints: 0,
        energy: 100,
        checkInStreak: 0,
        lastCheckInDate: null,
        lastVipClaimDate: null,
        claimedVipUpgradeChests: [1],
        missionSkipUsedDate: null,
        savedTacticalPlans: [],
        pendingFacilityUpgrades: [],
        activeNegotiations: [],
        academyDiscoveries: [],
        hasClaimedLoginBonus: false,
        isGuest: true,
        hasSelectedInitialClub: false,
        clubSelectionModalOpen: true,
        storyMissions: STORY_CHAPTER_1_MISSIONS,
        dailyMissions: INITIAL_DAILY_MISSIONS,
        leagueStandings: REAL_INITIAL_STANDINGS,
        leagueFixtures: [],
        matchHistory: [],
        tournamentStats: [],
        simulatedMatchdays: [],
        lastRoundSummary: null,
        matchScoutReports: {},
        livingWorld: resetHydrated.livingWorld,
        savePassthrough: {},
        activeTab: 'dashboard',
        isMatchLive: false,
      });
    },

    getTeamSynergy: (): TeamSynergyResult => {
      const state = get();
      const { footballLineup, footballSquad, footballTactics } = state.club;
      const squadById = new Map(footballSquad.map(p => [p.id, p]));
      const startingXI = footballLineup.map(id => squadById.get(id));
      return calculateTeamSynergy(startingXI, footballTactics.formation, footballTactics);
    },
  };
});

// Subscribe persistenceService status to store
persistenceService.subscribe((status) => {
  useGameStore.setState({ saveStatus: status });
});

// Guard against tab close / page refresh while an auto-save is pending
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    persistenceService.flush(() => useGameStore.getState());
  });
}
