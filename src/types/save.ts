/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Game Save Schema & Persistence Types
 * Centralized schema definition for Local Save, Cloud Save, and Data Pack export/import.
 */

import type { LivingWorldState } from '../domain/livingWorld/types';
import {
  Club,
  Player,
  FootballTactics,
  BasketballTactics,
  StoryMission,
  LeagueStanding,
  MatchRecord,
  SportType,
  DailyMission,
  Fixture,
  PlayerStats,
  MatchScoutReport,
  SavedTacticalPlan,
  PendingFacilityUpgrade,
  PlayerNegotiation,
  AcademyDiscovery
} from './game';

/**
 * Current canonical version of the game save schema.
 * Increment this whenever a non-backward-compatible change is introduced
 * and provide a corresponding migration function in persistenceService.ts.
 */
export const CURRENT_SAVE_VERSION = 3;

/**
 * Full Canonical Game Save Schema (Version 2)
 * Contains all state essential to resuming a player's career without data loss.
 * Excludes transient UI state (open modals, animation frames, live match ticks).
 */
export interface GameSaveData {
  // Metadata & Migration Tracking
  saveVersion: number;
  saveId: string;
  savedAt: string;         // ISO date-time string
  appVersion: string;

  // Career Identity & Preferences
  currentSport: SportType;
  language: 'ar' | 'en';
  soundEnabled: boolean;
  hasSelectedInitialClub: boolean;
  isGuest: boolean;
  hasClaimedLoginBonus: boolean;

  // Club & Squad State
  club: Club;

  // Coach Progression, Resources & VIP
  energy: number;
  lastEnergyUpdate: number;
  vipPoints: number;
  lastVipClaimDate: string | null;
  claimedVipUpgradeChests: number[];
  missionSkipUsedDate: string | null;
  checkInStreak: number;
  lastCheckInDate: string | null;

  // Tactical Plans & Facilities Management
  savedTacticalPlans: SavedTacticalPlan[];
  pendingFacilityUpgrades: PendingFacilityUpgrade[];

  // Transfer Negotiations & Youth Academy
  activeNegotiations: PlayerNegotiation[];
  academyDiscoveries: AcademyDiscovery[];
  scoutMarket: Player[];

  // Missions & Progression Systems
  dailyMissions: DailyMission[];
  storyMissions: StoryMission[];

  // League Competitions, Calendar & Records
  leagueStandings: LeagueStanding[];
  leagueFixtures: Fixture[];
  matchHistory: MatchRecord[];
  tournamentStats: PlayerStats[];
  simulatedMatchdays: number[];
  matchScoutReports: Record<number, MatchScoutReport>;

  // Feature Unlocks & Settings
  unlockedSpeed2x: boolean;

  /** Phase A living world slice (relationships, memories, events, notifications). */
  livingWorld?: LivingWorldState;

  /**
   * Unknown root-level JSON keys preserved across migrate/export/import.
   * Persistence layer only — not used by gameplay systems.
   */
  savePassthrough?: Record<string, unknown>;
}

/**
 * Legacy Save Schema (Version 1 / unversioned)
 * Used as input during migration when upgrading legacy saves.
 */
export interface LegacyGameSaveData {
  version?: string;
  saveVersion?: number;
  exportedAt?: string;
  club?: Club;
  vipPoints?: number;
  storyMissions?: StoryMission[];
  leagueStandings?: LeagueStanding[];
  leagueFixtures?: Fixture[];
  matchHistory?: MatchRecord[];
  tournamentStats?: PlayerStats[];
  simulatedMatchdays?: number[];
  dailyMissions?: DailyMission[];
  savedTacticalPlans?: SavedTacticalPlan[];
  pendingFacilityUpgrades?: PendingFacilityUpgrade[];
  activeNegotiations?: PlayerNegotiation[];
  academyDiscoveries?: AcademyDiscovery[];
  scoutMarket?: Player[];
  energy?: number;
  language?: 'ar' | 'en';
  currentSport?: SportType;
  checkInStreak?: number;
  lastCheckInDate?: string | null;
  lastVipClaimDate?: string | null;
  claimedVipUpgradeChests?: number[];
  hasClaimedLoginBonus?: boolean;
  isGuest?: boolean;
  hasSelectedInitialClub?: boolean;
  unlockedSpeed2x?: boolean;
  matchScoutReports?: Record<number, MatchScoutReport>;
  [key: string]: any;
}

/**
 * Save operation status for UI indicators.
 */
export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';
