/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Game Store Types & State Definition
 */

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
  Fixture,
  PreMatchData,
  DuelRoom,
  PlayerStats,
  RoundSummary,
  MatchScoutReport,
  SavedTacticalPlan,
  PendingFacilityUpgrade,
  PlayerNegotiation
} from '../types/game';
import { RealClubConfig } from '../data/realLeaguesData';
import { FootballMatchEngine } from '../engine/footballEngine';
import { TeamSynergyResult } from '../utils/teamSynergy';
import { SaveStatus } from '../types/save';
import type { DispatchResult } from '../domain/livingWorld/events/dispatch';
import type { GameEvent, LivingWorldState } from '../domain/livingWorld/types';
import type { RecruitmentWorldState } from '../domain/recruitment';
import type { ClubManagementState } from '../domain/clubManagement/types';

import type { MoveTarget } from '../domain/squad/squadTypes';
import type { MoveResult } from '../domain/squad/moveEntity';
import type { ApplyBestTacticsError } from '../domain/tactics/bestTactics/applyRecommendation';
import type { BestTacticsRecommendation } from '../domain/tactics/bestTactics/types';
import type { Result } from '../domain/shared/result';

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

export interface GameState {
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
  academyDiscoveries: any[]; // VIP 13+ get an extra simultaneous academy scout slot
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
  leagueFixtures: Fixture[]; // full season calendar for the player's league
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
  nextMatchInsight: PreMatchData | null; // live preview of the next fixture
  preMatchModalOpen: boolean;
  matchSpeed: number; // 1, 2, 4
  unlockedSpeed2x: boolean; // Purchased via Coins or Diamonds
  currentMatchMinute: number;
  pendingInteractiveEvent: MatchEvent | null;

  // Market & Scouts
  scoutMarket: Player[];

  /** Living world slice (persisted; gameplay wiring in later phases). */
  livingWorld: LivingWorldState;
  /** Phase D recruitment slice (persisted; domain-only truth stays internal). */
  recruitmentWorld: RecruitmentWorldState;
  clubManagement: ClubManagementState;
  saveId: string;
  /** Persistence-only unknown root JSON keys (never read by gameplay). */
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
  /** Phase G — apply a structured assistant recommendation via validated store actions only. */
  applyAssistantRecommendation: (
    rec: import('../domain/assistant').Recommendation,
  ) => { ok: boolean; error?: string };
  /** Phase G — persist ignore via livingWorld.eventLog (no ingest pipeline). */
  dismissAssistantRecommendation: (rec: import('../domain/assistant').Recommendation) => void;
  setFootballRoles: (roles: { captainId?: string; penaltyTakerId?: string; freeKickTakerId?: string; cornerTakerId?: string }) => void;

  // Training & Facilities
  runTrainingDrill: (drillType: 'stamina' | 'technical' | 'finishing') => boolean;
  upgradeFacility: (facility: keyof ClubFacilities) => boolean;

  // Transfers & Academy
  buyPlayer: (player: Player) => boolean;
  addPlayerToSquad: (player: Player) => boolean;
  sellPlayer: (playerId: string) => void;
  promoteAcademyTalent: () => void;
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
  skipDailyMissionInstant: (missionId: string) => { success: boolean; message: string };
  saveTacticalPlan: (name: string) => { success: boolean; message: string };
  loadTacticalPlan: (id: string) => { success: boolean; message: string };
  deleteTacticalPlan: (id: string) => void;
  processFacilityUpgrades: () => void;
  skipFacilityUpgrade: (facility: keyof ClubFacilities) => { success: boolean; message: string };
  startNegotiation: (playerId: string, initialOfferAmount: number) => { success: boolean; message: string };
  submitCounterOffer: (negotiationId: string, newOfferAmount: number) => { success: boolean; message: string };
  acceptNegotiationCounter: (negotiationId: string) => { success: boolean; message: string };
  cancelNegotiation: (negotiationId: string) => void;
  applyRedeemReward: (reward: { coins: number; diamonds: number; trainingPoints: number }) => void;
  claimDailyCheckIn: () => void;

  // Custom Data Pack Editor
  exportGameData: () => string;
  importCustomDataPack: (jsonText: string) => { success: boolean; message: string };
  resetCareer: () => void;

  // Squad Synergy
  getTeamSynergy: () => TeamSynergyResult;

  // Centralized Persistence & Save Management
  saveStatus: SaveStatus;
  saveCareerImmediate: () => boolean;

  /** Runs the living-world event pipeline (pure domain); not wired to match/story in Phase A. */
  dispatchLivingWorldEvent: (event: GameEvent) => DispatchResult;
  resolvePlayerLifeInteraction: (interactionId: string, responseId: string) => boolean;
  changeCaptainWithConsequences: (newCaptainId: string) => void;
  assignMentoringPairAction: (mentorId: string, menteeId: string) => void;
  removeMentoringPairAction: (menteeId: string) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  runCustomTrainingPlan: (plan: import('../domain/playerLife/types').TrainingSessionPlan) => boolean;

  // Phase E Club Management Actions
  applyClubManagementChanges: (changes: import('../domain/clubManagement').ClubManagementChange[]) => void;
  hireStaffMember: (candidate: import('../domain/clubManagement').StaffMember) => { success: boolean; message: string };
  fireStaffMember: (staffId: string) => { success: boolean; message: string };
  updateDelegationTask: (
    task: import('../domain/clubManagement').DelegationTask,
    mode: import('../domain/clubManagement').DelegationMode,
    assigneeStaffId?: string,
  ) => void;
  submitBoardRequest: (
    request: import('../domain/clubManagement').BoardRequestKind,
  ) => { approved: boolean; message: string; reasonCodes: string[] };
  upgradeAnalyticsDepartment: () => { success: boolean; message: string };

  // Phase F Living World & Narrative Actions
  aiNarrationEnabled: boolean;
  setAiNarrationEnabled: (enabled: boolean) => void;
  submitPressConferenceAnswer: (
    question: import('../domain/livingWorld/press/types').PressQuestion,
    answer: import('../domain/livingWorld/press/types').PressAnswerOption,
  ) => {
    success: boolean;
    visibleMessageAr: string;
    visibleMessageEn: string;
    cohesionDelta: number;
  };
  storeNarrativeCacheEntry: (entry: import('../domain/livingWorld/phaseF/types').NarrativeCacheEntry) => void;

  getAutomationSettings: () => import('../domain/automation/types').AutomationSettings;
  setAutomationFeature: (
    id: import('../domain/automation/types').AutomationFeatureId,
    patch: Partial<import('../domain/automation/types').AutomationFeatureSetting>,
  ) => import('../domain/automation/types').AutomationSettings;
  getAutomationReports: () => readonly import('../domain/automation/types').AutomationReport[];
  runBeforeUserMatchAutomations: () => import('../domain/automation/types').AutomationRunResult;
  runWeeklyAutomations: (
    matchday: number,
    weeklyDelegationEvents: readonly import('../domain/livingWorld/types').GameEvent[],
  ) => import('../domain/automation/types').AutomationRunResult;
  undoLastAutomation: () =>
    | { ok: true }
    | { ok: false; reasonCode: import('../domain/automation/types').UndoFailureReason };
}
