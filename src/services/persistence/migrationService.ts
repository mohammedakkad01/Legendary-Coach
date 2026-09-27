/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Persistence Migration Service
 * Handles schema version detection and upgrades legacy saves (v1) to canonical v2.
 */

import { GameSaveData, LegacyGameSaveData, CURRENT_SAVE_VERSION } from '../../types/save';
import { Club, Fixture, LeagueStanding, DailyMission, StoryMission } from '../../types/game';
import { REAL_INITIAL_PLAYER_CLUB, REAL_INITIAL_STANDINGS, REAL_INITIAL_SCOUT_MARKET } from '../../data/realFootballData';
import { STORY_CHAPTER_1_MISSIONS } from '../../data/storyChapter1';
import { INITIAL_DAILY_MISSIONS } from '../../data/dailyMissionsData';
import { generateFixturesForLeague, ensureFixtureDates } from '../../data/realLeaguesData';

import { saveService, APP_VERSION } from './saveService';

export class MigrationService {
  /**
   * Migrates any save format (v1 or unversioned) to canonical v2 schema.
   */
  public migrate(raw: LegacyGameSaveData | any, sanitizeClubFn: (club: Club) => Club, extractSaveDataFn: (state: any) => GameSaveData): GameSaveData {
    const version = Number(raw.saveVersion || 1);

    if (version >= CURRENT_SAVE_VERSION && raw.club && Array.isArray(raw.leagueFixtures)) {
      // Already v2 or higher, just re-sanitize
      return extractSaveDataFn(raw);
    }

    // Migration from Version 1 (or unversioned legacy save)
    console.info(`[MigrationService] Migrating save from v${version} to v${CURRENT_SAVE_VERSION}...`);

    const club = sanitizeClubFn(raw.club || REAL_INITIAL_PLAYER_CLUB);

    // If fixtures were missing in legacy save, regenerate full calendar for the club's league
    const fixtures: Fixture[] = Array.isArray(raw.leagueFixtures) && raw.leagueFixtures.length > 0
      ? ensureFixtureDates(raw.leagueFixtures)
      : ensureFixtureDates(generateFixturesForLeague(club.divisionId, club.id));

    // Standings fallback
    const standings: LeagueStanding[] = Array.isArray(raw.leagueStandings) && raw.leagueStandings.length > 0
      ? raw.leagueStandings
      : REAL_INITIAL_STANDINGS;

    // Daily missions fallback
    const dailyMissions: DailyMission[] = Array.isArray(raw.dailyMissions) && raw.dailyMissions.length > 0
      ? raw.dailyMissions
      : INITIAL_DAILY_MISSIONS;

    // Story missions fallback
    const storyMissions: StoryMission[] = Array.isArray(raw.storyMissions) && raw.storyMissions.length > 0
      ? raw.storyMissions
      : STORY_CHAPTER_1_MISSIONS;

    return {
      saveVersion: CURRENT_SAVE_VERSION,
      saveId: raw.saveId || `save_migrated_${Date.now()}`,
      savedAt: new Date().toISOString(),
      appVersion: APP_VERSION,

      currentSport: raw.currentSport === 'basketball' ? 'basketball' : 'football',
      language: raw.language === 'en' ? 'en' : 'ar',
      soundEnabled: raw.soundEnabled ?? true,
      hasSelectedInitialClub: raw.hasSelectedInitialClub ?? true,
      isGuest: raw.isGuest ?? false,
      hasClaimedLoginBonus: raw.hasClaimedLoginBonus ?? false,

      club,

      energy: typeof raw.energy === 'number' ? raw.energy : 100,
      lastEnergyUpdate: typeof raw.lastEnergyUpdate === 'number' ? raw.lastEnergyUpdate : Date.now(),
      vipPoints: typeof raw.vipPoints === 'number' ? raw.vipPoints : 0,
      lastVipClaimDate: raw.lastVipClaimDate || null,
      claimedVipUpgradeChests: Array.isArray(raw.claimedVipUpgradeChests) ? raw.claimedVipUpgradeChests : [1],
      missionSkipUsedDate: raw.missionSkipUsedDate || null,
      checkInStreak: typeof raw.checkInStreak === 'number' ? raw.checkInStreak : 0,
      lastCheckInDate: raw.lastCheckInDate || null,

      savedTacticalPlans: Array.isArray(raw.savedTacticalPlans) ? raw.savedTacticalPlans : [],
      pendingFacilityUpgrades: Array.isArray(raw.pendingFacilityUpgrades) ? raw.pendingFacilityUpgrades : [],

      activeNegotiations: Array.isArray(raw.activeNegotiations) ? raw.activeNegotiations : [],
      academyDiscoveries: Array.isArray(raw.academyDiscoveries) ? raw.academyDiscoveries : [],
      scoutMarket: Array.isArray(raw.scoutMarket) ? raw.scoutMarket : REAL_INITIAL_SCOUT_MARKET,

      dailyMissions,
      storyMissions,

      leagueStandings: standings,
      leagueFixtures: fixtures,
      matchHistory: Array.isArray(raw.matchHistory) ? raw.matchHistory : [],
      tournamentStats: Array.isArray(raw.tournamentStats) ? raw.tournamentStats : [],
      simulatedMatchdays: Array.isArray(raw.simulatedMatchdays) ? raw.simulatedMatchdays : [],
      matchScoutReports: raw.matchScoutReports && typeof raw.matchScoutReports === 'object' ? raw.matchScoutReports : {},

      unlockedSpeed2x: Boolean(raw.unlockedSpeed2x),
    };
  }
}

export const migrationService = new MigrationService();
