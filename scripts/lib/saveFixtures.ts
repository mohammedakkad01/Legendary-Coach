/**
 * Compact deterministic save fixtures for migration matrix tests (v1–v7).
 */

import { REAL_INITIAL_PLAYER_CLUB, REAL_INITIAL_STANDINGS, REAL_INITIAL_SCOUT_MARKET } from '../../src/data/realFootballData';
import { generateFixturesForLeague, ensureFixtureDates } from '../../src/data/realLeaguesData';
import type { GameSaveData } from '../../src/types/save';
import type { MatchRecord } from '../../src/types/game';
import { hydrateLivingWorldFromClub } from '../../src/domain/livingWorld/migrateLivingWorld';

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));

function baseFields(saveVersion: number, overrides: Partial<GameSaveData> = {}): GameSaveData {
  const club = clone(REAL_INITIAL_PLAYER_CLUB);
  return {
    saveVersion,
    saveId: `fixture_v${saveVersion}`,
    savedAt: '2026-01-15T12:00:00Z',
    appVersion: '2.1.0-test',
    currentSport: 'football',
    language: 'en',
    soundEnabled: true,
    hasSelectedInitialClub: true,
    isGuest: false,
    hasClaimedLoginBonus: false,
    club,
    energy: 100,
    lastEnergyUpdate: 1_700_000_000_000,
    vipPoints: 10,
    lastVipClaimDate: null,
    claimedVipUpgradeChests: [1],
    missionSkipUsedDate: null,
    checkInStreak: 0,
    lastCheckInDate: null,
    savedTacticalPlans: [],
    pendingFacilityUpgrades: [],
    activeNegotiations: [],
    academyDiscoveries: [],
    scoutMarket: clone(REAL_INITIAL_SCOUT_MARKET.slice(0, 3)),
    dailyMissions: [],
    storyMissions: [],
    leagueStandings: clone(REAL_INITIAL_STANDINGS),
    leagueFixtures: ensureFixtureDates(generateFixturesForLeague(club.divisionId, club.id)).slice(0, 4),
    matchHistory: [],
    tournamentStats: [],
    simulatedMatchdays: [],
    matchScoutReports: {},
    unlockedSpeed2x: false,
    ...overrides,
  };
}

/** Legacy export shape (unversioned / v1). */
export function buildLegacyV1Raw(): Record<string, unknown> {
  return {
    version: '1.0.0',
    exportedAt: '2026-01-01T00:00:00Z',
    club: clone(REAL_INITIAL_PLAYER_CLUB),
    vipPoints: 88,
    storyMissions: [],
    leagueStandings: clone(REAL_INITIAL_STANDINGS),
    futurePhaseField: { probe: true, n: 1 },
  };
}

export function buildV2Fixture(): GameSaveData {
  return baseFields(2, {
    savePassthrough: { futurePhaseField: { probe: true, n: 2 } },
  });
}

export function buildV3Fixture(): GameSaveData {
  return baseFields(3);
}

export function buildV4Fixture(): GameSaveData {
  return baseFields(4);
}

export function buildV5Fixture(): GameSaveData {
  return baseFields(5);
}

export function buildV6Fixture(): GameSaveData {
  return baseFields(6);
}

export function buildV7Fixture(): GameSaveData {
  return baseFields(7, {
    assistant: {
      ignoredRecommendationIds: ['rec_pre_1_flank'],
      appliedRecommendationIds: ['rec_tactics_demo'],
    },
    aiNarrationEnabled: false,
  });
}

export function buildOversizedMatchHistoryFixture(count: number): GameSaveData {
  const save = buildV7Fixture();
  save.livingWorld = hydrateLivingWorldFromClub(save.club).livingWorld;
  const clubId = save.club.id;
  const records: MatchRecord[] = [];
  for (let i = 0; i < count; i += 1) {
    records.push({
      id: `mh_${i}`,
      sport: 'football',
      seed: 1000 + i,
      homeClubId: clubId,
      homeClubName: save.club.name,
      awayClubId: 'club_away_test',
      awayClubName: 'Away FC',
      homeScore: i % 3 === 0 ? 2 : 0,
      awayScore: i % 3 === 0 ? 1 : 1,
      events: [],
      stats: {
        homePossession: 50,
        awayPossession: 50,
        homeShots: 5,
        awayShots: 4,
        homeShotsOnTarget: 2,
        awayShotsOnTarget: 2,
        homeCorners: 1,
        awayCorners: 1,
        homeFouls: 1,
        awayFouls: 1,
        homeYellowCards: 0,
        awayYellowCards: 0,
        homeRedCards: 0,
        awayRedCards: 0,
        homeXg: 1,
        awayXg: 0.8,
      },
      isFinished: true,
      competition: 'League',
      matchDay: i + 1,
      date: `2026-01-${String((i % 28) + 1).padStart(2, '0')}`,
    });
  }
  save.matchHistory = records;
  return save;
}

export const FIXTURE_BUILDERS: Record<number, () => GameSaveData | Record<string, unknown>> = {
  1: buildLegacyV1Raw,
  2: buildV2Fixture,
  3: buildV3Fixture,
  4: buildV4Fixture,
  5: buildV5Fixture,
  6: buildV6Fixture,
  7: buildV7Fixture,
};
