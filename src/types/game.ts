/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * المدرب الأسطورة — The Legendary Coach
 * Core Game Domain Types
 */

export type SportType = 'football' | 'basketball';

export type PlayerPosition = 
  // Football
  | 'GK' | 'CB' | 'LB' | 'RB' | 'CDM' | 'CM' | 'CAM' | 'LW' | 'RW' | 'ST'
  // Basketball
  | 'PG' | 'SG' | 'SF' | 'PF' | 'C';

export type PlayerPersonality = 'leader' | 'temperamental' | 'professional' | 'ambitious' | 'loyal' | 'nervous';

export type PlayerRarity = 'standard' | 'rare' | 'prospect' | 'legend';

export interface PlayerAttributes {
  // Football Attributes (1-99)
  pace?: number;
  shooting?: number;
  passing?: number;
  dribbling?: number;
  defending?: number;
  physical?: number;
  goalkeeping?: number;

  // Basketball Attributes (1-99)
  speed?: number;
  shootingThree?: number;
  shootingMid?: number;
  layupDunk?: number;
  playmaking?: number;
  perimeterDef?: number;
  interiorDef?: number;
  rebounding?: number;
}

export interface Player {
  id: string;
  sport: SportType;
  name: string;
  nameEn: string;
  age: number;
  nationality: string;
  nationalityFlag: string;
  position: PlayerPosition;
  secondaryPositions: PlayerPosition[];
  overall: number;
  potential: number;
  attributes: PlayerAttributes;
  rarity: PlayerRarity;
  personality: PlayerPersonality;
  traits: string[];
  
  // Dynamic Condition
  morale: number;    // 0-100
  form: number;      // 1-10
  stamina: number;   // 0-100
  fatigue: number;   // 0-100
  injuredWeeks: number;
  suspendedMatches: number;

  // Economy & Contracts
  contractYears: number;
  wage: number;      // Weekly wage in Coins
  marketValue: number;

  // Real Football API Metadata
  photoUrl?: string;
  realTeam?: string;

  // Career Stats
  matchesPlayed: number;
  goalsOrPoints: number;
  assists: number;
  cleanSheetsOrRebounds: number;
  averageRating: number;
}

export type FootballFormation = '4-3-3' | '4-4-2' | '4-2-3-1' | '3-5-2' | '5-3-2' | '4-1-4-1' | '3-4-3';
export type MatchMentality = 'ultra_defensive' | 'defensive' | 'balanced' | 'attacking' | 'all_out_attack';
export type PressingStyle = 'low_block' | 'mid_press' | 'high_press' | 'gegenpress';
export type PassingStyle = 'short_tiki_taka' | 'mixed' | 'direct_counter' | 'long_ball';
export type TeamTempo = 'slow_patient' | 'normal' | 'fast_electric';

export interface FootballTactics {
  formation: FootballFormation;
  mentality: MatchMentality;
  pressing: PressingStyle;
  passing: PassingStyle;
  tempo: TeamTempo;
  width: 'narrow' | 'standard' | 'wide';
  offsideTrap: boolean;
  captainId: string;
  penaltyTakerId: string;
  freeKickTakerId: string;
  cornerTakerId: string;
}

export interface BasketballTactics {
  pace: 'slow_half_court' | 'balanced' | 'fast_break';
  defenseScheme: 'man_to_man' | 'zone_2_3' | 'full_court_press';
  shotSelection: 'attack_paint' | 'balanced' | 'perimeter_threes';
  primaryBallHandlerId: string;
  captainId: string;
}

export interface ClubFacilities {
  stadiumLevel: number;      // 1-10 (capacity and ticket revenue)
  trainingGroundLevel: number;// 1-10 (XP boost)
  youthAcademyLevel: number; // 1-10 (talent star probability)
  medicalCenterLevel: number;// 1-10 (injury recovery speed)
  scoutingNetworkLevel: number; // 1-10 (scouting accuracy)
}

export interface ClubStaff {
  assistantCoach: { name: string; level: number; salary: number };
  fitnessCoach: { name: string; level: number; salary: number };
  physio: { name: string; level: number; salary: number };
  chiefScout: { name: string; level: number; salary: number };
  youthDirector: { name: string; level: number; salary: number };
}

export interface ClubFinances {
  coins: number;              // Liquid currency
  diamonds?: number;          // Premium currency (e.g. 300 diamonds login bonus)
  reputation: number;         // Club prestige (0 - 10000)
  trainingPoints: number;     // For drill training
  scoutPoints: number;        // For scouting reports
  ticketPrice: number;
  sponsorName: string;
  sponsorIncomePerMatch: number;
  totalSeasonRevenue: number;
  totalSeasonExpenses: number;
}

export interface Club {
  id: string;
  name: string;
  nameEn: string;
  city: string;
  stadiumName?: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  logoBadge: string;
  logoUrl?: string;           // Real Club Crest URL from Football API
  divisionId: string;
  divisionName: string;
  boardTrust: number;         // 0 - 100 (if < 20, danger of dismissal)
  fanMood: number;            // 0 - 100
  facilities: ClubFacilities;
  finances: ClubFinances;
  staff: ClubStaff;
  
  // Squad for each sport
  footballSquad: Player[];
  footballLineup: string[];   // 11 player IDs in order of positions
  footballBench: string[];    // up to 7 player IDs
  footballTactics: FootballTactics;

  basketballSquad: Player[];
  basketballLineup: string[]; // 5 starter player IDs
  basketballBench: string[];  // 7 bench player IDs
  basketballTactics: BasketballTactics;

  // PvP Tactical Duel ELO & Record
  duelRating?: number; // Starts at 1200
  duelWins?: number;
  duelLosses?: number;
  duelDraws?: number;
}

export interface MatchEvent {
  minute: number;
  quarter?: number;
  sport: SportType;
  type: 'goal' | 'shot' | 'save' | 'foul' | 'yellow_card' | 'red_card' | 'injury' | 'substitution' | 'three_pointer' | 'dunk' | 'timeout' | 'interactive_moment';
  team: 'home' | 'away';
  playerId?: string;
  playerName?: string;
  secondaryPlayerId?: string;
  secondaryPlayerName?: string;
  textAr: string;
  textEn: string;
  homeScore: number;
  awayScore: number;
  interactiveOptions?: InteractiveDecisionOption[];
}

export interface InteractiveDecisionOption {
  id: string;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  tacticEffect: {
    mentality?: MatchMentality;
    pressing?: PressingStyle;
    tempo?: TeamTempo;
    staminaCost?: number;
    riskLevel: 'safe' | 'medium' | 'high';
  };
}

export interface MatchStats {
  homePossession: number;
  awayPossession: number;
  homeShots: number;
  awayShots: number;
  homeShotsOnTarget: number;
  awayShotsOnTarget: number;
  homeCorners: number;
  awayCorners: number;
  homeFouls: number;
  awayFouls: number;
  homeYellowCards: number;
  awayYellowCards: number;
  homeXg: number;
  awayXg: number;
}

export interface MatchRecord {
  id: string;
  sport: SportType;
  seed: number;
  homeClubId: string;
  homeClubName: string;
  awayClubId: string;
  awayClubName: string;
  homeScore: number;
  awayScore: number;
  events: MatchEvent[];
  stats: MatchStats;
  isFinished: boolean;
  competition: string;
  matchDay: number;
  date: string;
}

// A single scheduled league match (the season calendar).
// Generated once per league via generateFixturesForLeague() in realLeaguesData.ts
// and consumed in order by startNewMatch() so the opponent always follows the
// real fixture list instead of a random/fixed team.
export interface Fixture {
  matchday: number;
  opponentClubId: string;
  opponentClubName: string;
  opponentBadge: string;
  isHome: boolean;
  played: boolean;
  homeScore?: number;
  awayScore?: number;
  date?: string; // ISO yyyy-mm-dd — real calendar date of this matchday (weekly, see generateFixturesForLeague)
}

// Pre-match inspection data calculated before actual kickoff
export interface PreMatchData {
  fixture: Fixture;
  competition: string;
  opponentClub: Club;
  userAttackPower: number;
  userDefensePower: number;
  userVipAttackBoost: number;
  userVipDefenseBoost: number;
  opponentAttackPower: number;
  opponentDefensePower: number;
  winProbability: number;   // 0 - 100
  drawProbability: number;  // 0 - 100
  lossProbability: number;  // 0 - 100
  // Logical (non-static) technical comparison, derived from both starting XIs + VIP bonuses
  userOverall: number;          // (attack+defense)/2 of the user starting XI, after VIP boost
  opponentOverall: number;      // (attack+defense)/2 of the opponent starting XI
  technicalGap: number;         // userOverall - opponentOverall (positive = you are stronger)
  expectedUserGoals: number;    // Poisson expectation, e.g. 1.6
  expectedOpponentGoals: number;
  mostLikelyScore: string;      // e.g. "2-1" (from the user's point of view)
  opponentStarters: number;     // how many players were used to compute the opponent's power
}

export interface DialogueConsequence {
  boardTrustChange?: number;
  fanMoodChange?: number;
  squadMoraleChange?: number;
  coinsChange?: number;
  reputationChange?: number;
  trainingPoints?: number;
  vipPoints?: number;
  unlockPlayerId?: string;
}

export interface DialogueChoice {
  id: string;
  textAr: string;
  textEn: string;
  tone: 'professional' | 'aggressive' | 'diplomatic' | 'inspirational';
  consequence: DialogueConsequence;
  replyAr: string;
  replyEn: string;
}

export interface StoryMission {
  id: number;
  chapterNumber: number;
  titleAr: string;
  titleEn: string;
  speakerNameAr: string;
  speakerNameEn: string;
  speakerRoleAr: string;
  speakerRoleEn: string;
  speakerAvatar: string;
  introAr: string;
  introEn: string;
  objectiveAr: string;
  objectiveEn: string;
  choices: DialogueChoice[];
  requiredActionType?: 'view_squad' | 'set_tactics' | 'do_training' | 'play_match' | 'sign_scout' | 'upgrade_facility';
  reward: {
    coins: number;
    reputation: number;
    trainingPoints: number;
    vipPoints: number;
  };
  isCompleted: boolean;
}

export interface VIPPrivilege {
  level: number;
  pointsRequired: number;
  diamondsCostToUpgrade: number; // Cost in Diamonds/Gems to unlock or upgrade
  nameAr: string;
  nameEn: string;
  bonusesAr: string[];
  bonusesEn: string[];
  incomeBonusPercent: number;
  trainingSpeedPercent: number;
  // Combat & competitive privileges
  attackBoostPercent: number;    // +1% in VIP 1 up to +10% in VIP 20
  defenseBoostPercent: number;   // +1% in VIP 1 up to +10% in VIP 20
  lossMitigationPercent: number; // -2% penalty in VIP 1 up to -30% in VIP 20
  // Chest contents metadata
  upgradeChestReward: {
    coins: number;
    trainingPoints: number;
    diamonds?: number;
    specialDescriptionAr: string;
    specialDescriptionEn: string;
  };
  dailyChestReward: {
    coins: number;
    trainingPoints: number;
    diamonds?: number;
  };
  unlockedSecondTrainingQueue?: boolean;
  unlockedSpecialBadge?: boolean;
  hasDailyExclusiveChest?: boolean;
  unlockedSpeed4x?: boolean;
}

export interface LeagueStanding {
  clubId: string;
  clubName: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  form: ('W' | 'D' | 'L')[];
}

// -------------------------------------------------------------
// Tournament (league-wide) player statistics & matchday summaries
// -------------------------------------------------------------
// Accumulated across the whole season for EVERY player in the league
// (not only the user's squad). `matchRatings.length` = appearances.
export interface PlayerStats {
  playerId: string;
  name: string;
  clubId: string;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  matchRatings: number[];
}

export interface RoundMatchResult {
  homeClubId: string;
  homeClubName: string;
  awayClubId: string;
  awayClubName: string;
  homeScore: number;
  awayScore: number;
  isUserMatch: boolean;
}

// One player's line for a single matchday (shown in "Top Performers")
export interface RoundPerformer {
  playerId: string;
  name: string;
  clubId: string;
  clubName: string;
  position: PlayerPosition;
  rating: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
}

export interface RoundSummary {
  matchday: number;
  results: RoundMatchResult[];
  topPerformers: RoundPerformer[]; // top 5 by rating
}

// Daily & Weekly Mission System
export interface DailyMission {
  id: string;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  category: 'matches' | 'goals' | 'defense' | 'training' | 'scouting' | 'fatigue';
  periodicity?: 'daily' | 'weekly' | 'achievement';
  target: number;
  current: number;
  isClaimed: boolean;
  rewardCoins: number;
  rewardDiamonds: number;
  rewardTrainingPoints: number;
  rewardVipPoints: number;
  iconName: string;
}

// Match Results Character & Tactical Analyst
export interface MatchResultsCharacter {
  nameAr: string;
  nameEn: string;
  titleAr: string;
  titleEn: string;
  avatarUrl: string;
  mood: 'ecstatic' | 'happy' | 'neutral' | 'concerned' | 'analytical';
  headlineAr: string;
  headlineEn: string;
  dialogueAr: string;
  dialogueEn: string;
  tacticalAdviceAr: string;
  tacticalAdviceEn: string;
  mvpPlayerName: string;
  mvpRating: number;
  mvpStatTextAr: string;
  mvpStatTextEn: string;
}

// Simultaneous Reveal Tactical Duel (صانع المعارك والكشف المتزامن)
export type TacticalStance = 'attack' | 'defend' | 'flank';

export interface DuelPiece {
  id: string;
  nameAr: string;
  nameEn: string;
  type: 'infantry' | 'cavalry' | 'siege' | 'archer' | 'phalanx';
  power: number;
  defense: number;
  speed: number;
  icon: string;
  descriptionAr: string;
  descriptionEn: string;
}

export interface TacticalDuelOrder {
  round: number;
  playerId: string;
  pieceId: string;
  stance: TacticalStance;
  timestamp: number;
}

export interface TacticalDuelRoundResult {
  round: number;
  playerOrder: TacticalDuelOrder;
  opponentOrder: TacticalDuelOrder;
  playerPiece: DuelPiece;
  opponentPiece: DuelPiece;
  damageToPlayer: number;
  damageToOpponent: number;
  roundWinner: 'player' | 'opponent' | 'tie';
  clashSummaryAr: string;
  clashSummaryEn: string;
}

export interface TacticalDuelState {
  isActive: boolean;
  matchId: string;
  opponentName: string;
  opponentAvatar: string;
  opponentIsBot: boolean;
  round: number;
  maxRounds: number;
  playerHp: number;
  opponentHp: number;
  draftedPieces: DuelPiece[];
  selectedPieceId: string | null;
  selectedStance: TacticalStance | null;
  isOrderSubmitted: boolean;
  isRevealing: boolean;
  history: TacticalDuelRoundResult[];
  winner: 'player' | 'opponent' | 'draw' | null;
  // Realtime PvP extension
  roomId?: string | null;
  pvpRole?: 'host' | 'guest' | null;
  opponentSubmittedOrder?: boolean;
}

// -------------------------------------------------------------
// Realtime PvP Duel Room & Multi-player Firestore Schemas
// -------------------------------------------------------------
export type DuelRoomStatus = 'waiting' | 'active' | 'finished' | 'abandoned';

export interface DuelRoom {
  id: string; // Short code e.g. "TC-8492"
  hostUid: string;
  hostClubName: string;
  guestUid: string | null;
  guestClubName: string | null;
  status: DuelRoomStatus;
  round: number;
  maxRounds: number;
  hostHp: number;
  guestHp: number;
  hostDraftedPieceIds: string[];
  guestDraftedPieceIds: string[];
  lastRoundResult: TacticalDuelRoundResult | null;
  winner: 'host' | 'guest' | 'draw' | null;
  currentRoundDeadline: number | null; // epoch timestamp in ms for timeout protection
  createdAt: string;
  updatedAt: string;
}

export interface DuelPlayerOrderDoc {
  uid: string;
  round: number;
  pieceId: string;
  stance: TacticalStance;
  submittedAt: string;
}
