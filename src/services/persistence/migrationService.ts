/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Persistence Migration Service
 * Handles schema version detection and upgrades legacy saves to the current canonical schema.
 */

import { GameSaveData, LegacyGameSaveData, CURRENT_SAVE_VERSION } from '../../types/save';
import { ensureLivingWorldV3 } from '../../domain/livingWorld/migrateLivingWorld';
import { ensureFootballSimulationV4 } from '../../domain/tactics/migrateFootballSimulation';
import { ensurePlayerLifeV4 } from '../../domain/playerLife/migratePlayerLife';
import { attachPassthrough } from './savePassthrough';
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
  public migrate(raw: LegacyGameSaveData | Record<string, unknown>, sanitizeClubFn: (club: Club) => Club, extractSaveDataFn: (state: Record<string, unknown>) => GameSaveData): GameSaveData {
    const rawRecord = raw as Record<string, unknown>;
    const version = Number(rawRecord.saveVersion || 1);

    if (version >= 2 && rawRecord.club && Array.isArray(rawRecord.leagueFixtures)) {
      const normalized = extractSaveDataFn(rawRecord);
      if (version < CURRENT_SAVE_VERSION) {
        console.info(`[MigrationService] Upgrading save from v${version} to v${CURRENT_SAVE_VERSION}...`);
      }
      return this.finalizeCanonicalSave(normalized, rawRecord);
    }

    // Migration from Version 1 (or unversioned legacy save)
    console.info(`[MigrationService] Migrating save from v${version} to v${CURRENT_SAVE_VERSION}...`);

    const club = sanitizeClubFn((rawRecord.club as Club) || REAL_INITIAL_PLAYER_CLUB);

    // If fixtures were missing in legacy save, regenerate full calendar for the club's league
    const fixtures: Fixture[] = Array.isArray(rawRecord.leagueFixtures) && rawRecord.leagueFixtures.length > 0
      ? ensureFixtureDates(rawRecord.leagueFixtures as Fixture[])
      : ensureFixtureDates(generateFixturesForLeague(club.divisionId, club.id));

    // Standings fallback
    const standings: LeagueStanding[] = Array.isArray(rawRecord.leagueStandings) && rawRecord.leagueStandings.length > 0
      ? (rawRecord.leagueStandings as LeagueStanding[])
      : REAL_INITIAL_STANDINGS;

    // Daily missions fallback
    const dailyMissions: DailyMission[] = Array.isArray(rawRecord.dailyMissions) && rawRecord.dailyMissions.length > 0
      ? (rawRecord.dailyMissions as DailyMission[])
      : INITIAL_DAILY_MISSIONS;

    // Story missions fallback
    const storyMissions: StoryMission[] = Array.isArray(rawRecord.storyMissions) && rawRecord.storyMissions.length > 0
      ? (rawRecord.storyMissions as StoryMission[])
      : STORY_CHAPTER_1_MISSIONS;

    const v1Base: GameSaveData = {
      saveVersion: CURRENT_SAVE_VERSION,
      saveId: (rawRecord.saveId as string) || `save_migrated_${Date.now()}`,
      savedAt: new Date().toISOString(),
      appVersion: APP_VERSION,

      currentSport: rawRecord.currentSport === 'basketball' ? 'basketball' : 'football',
      language: rawRecord.language === 'en' ? 'en' : 'ar',
      soundEnabled: (rawRecord.soundEnabled as boolean | undefined) ?? true,
      hasSelectedInitialClub: (rawRecord.hasSelectedInitialClub as boolean | undefined) ?? true,
      isGuest: (rawRecord.isGuest as boolean | undefined) ?? false,
      hasClaimedLoginBonus: (rawRecord.hasClaimedLoginBonus as boolean | undefined) ?? false,

      club,

      energy: typeof rawRecord.energy === 'number' ? rawRecord.energy : 100,
      lastEnergyUpdate: typeof rawRecord.lastEnergyUpdate === 'number' ? rawRecord.lastEnergyUpdate : Date.now(),
      vipPoints: typeof rawRecord.vipPoints === 'number' ? rawRecord.vipPoints : 0,
      lastVipClaimDate: (rawRecord.lastVipClaimDate as string | null) || null,
      claimedVipUpgradeChests: Array.isArray(rawRecord.claimedVipUpgradeChests) ? (rawRecord.claimedVipUpgradeChests as number[]) : [1],
      missionSkipUsedDate: (rawRecord.missionSkipUsedDate as string | null) || null,
      checkInStreak: typeof rawRecord.checkInStreak === 'number' ? rawRecord.checkInStreak : 0,
      lastCheckInDate: (rawRecord.lastCheckInDate as string | null) || null,

      savedTacticalPlans: Array.isArray(rawRecord.savedTacticalPlans) ? (rawRecord.savedTacticalPlans as GameSaveData['savedTacticalPlans']) : [],
      pendingFacilityUpgrades: Array.isArray(rawRecord.pendingFacilityUpgrades) ? (rawRecord.pendingFacilityUpgrades as GameSaveData['pendingFacilityUpgrades']) : [],

      activeNegotiations: Array.isArray(rawRecord.activeNegotiations) ? (rawRecord.activeNegotiations as GameSaveData['activeNegotiations']) : [],
      academyDiscoveries: Array.isArray(rawRecord.academyDiscoveries) ? (rawRecord.academyDiscoveries as GameSaveData['academyDiscoveries']) : [],
      scoutMarket: Array.isArray(rawRecord.scoutMarket) ? (rawRecord.scoutMarket as GameSaveData['scoutMarket']) : REAL_INITIAL_SCOUT_MARKET,

      dailyMissions,
      storyMissions,

      leagueStandings: standings,
      leagueFixtures: fixtures,
      matchHistory: Array.isArray(rawRecord.matchHistory) ? (rawRecord.matchHistory as GameSaveData['matchHistory']) : [],
      tournamentStats: Array.isArray(rawRecord.tournamentStats) ? (rawRecord.tournamentStats as GameSaveData['tournamentStats']) : [],
      simulatedMatchdays: Array.isArray(rawRecord.simulatedMatchdays) ? (rawRecord.simulatedMatchdays as number[]) : [],
      matchScoutReports: rawRecord.matchScoutReports && typeof rawRecord.matchScoutReports === 'object' ? (rawRecord.matchScoutReports as GameSaveData['matchScoutReports']) : {},

      unlockedSpeed2x: Boolean(rawRecord.unlockedSpeed2x),
      livingWorld: rawRecord.livingWorld as GameSaveData['livingWorld'],
      savePassthrough: rawRecord.savePassthrough as GameSaveData['savePassthrough'],
    };

    return this.finalizeCanonicalSave(v1Base, rawRecord);
  }

  private finalizeCanonicalSave(base: GameSaveData, raw: Record<string, unknown>): GameSaveData {
    const withVersion: GameSaveData = { ...base, saveVersion: CURRENT_SAVE_VERSION };
    const withWorld = ensureLivingWorldV3(withVersion);
    const withFootball = ensureFootballSimulationV4(withWorld);
    const withPlayerLife = ensurePlayerLifeV4(withFootball);
    return attachPassthrough(withPlayerLife, raw);
  }
}

export const migrationService = new MigrationService();
