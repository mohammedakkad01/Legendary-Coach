/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * End-to-End Test Suite for Player Career Save System
 * Verifies Schema v2, migration, corruption resilience, and the full lifecycle scenario:
 * Start Career -> Choose club -> Change tactics -> Change lineup -> Buy player ->
 * Training -> Play match -> Simulate matchday -> Update standings -> Complete mission ->
 * Earn coins -> Change facility -> Save -> Reload -> Verify every important state ->
 * Cloud Save -> Compare states.
 */

import { persistenceService } from '../src/services/persistenceService';
import { GameSaveData, CURRENT_SAVE_VERSION } from '../src/types/save';
import { REAL_INITIAL_PLAYER_CLUB, REAL_INITIAL_STANDINGS } from '../src/data/realFootballData';
import { generateFixturesForLeague, ensureFixtureDates } from '../src/data/realLeaguesData';
import { INITIAL_DAILY_MISSIONS } from '../src/data/dailyMissionsData';
import { STORY_CHAPTER_1_MISSIONS } from '../src/data/storyChapter1';
import { Player, MatchRecord } from '../src/types/game';

// In-memory mock localStorage for standalone testing
class MockLocalStorage {
  private store: Record<string, string> = {};

  getItem(key: string): string | null {
    return this.store[key] ?? null;
  }

  setItem(key: string, value: string): void {
    this.store[key] = value;
  }

  removeItem(key: string): void {
    delete this.store[key];
  }

  clear(): void {
    this.store = {};
  }
}

const mockStorage = new MockLocalStorage();
// @ts-ignore
global.localStorage = mockStorage;

let testsPassed = 0;
let testsFailed = 0;

function assertEqual<T>(actual: T, expected: T, msg: string) {
  assert(actual === expected, `${msg} (expected ${String(expected)}, got ${String(actual)})`);
}

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${msg}`);
    testsPassed++;
  } else {
    console.error(`  ❌ FAIL: ${msg}`);
    testsFailed++;
  }
}

async function runTests() {
  console.log('====================================================');
  console.log('🚀 Running Career Save System & Persistence Test Suite');
  console.log('====================================================\n');

  // Test 1: Corrupted Save Resilience
  console.log('Test 1: Corrupted & Malformed Save Resilience');
  mockStorage.setItem(persistenceService.STORAGE_KEY, '{ invalid_json ::: corrupt ');
  const corruptRes = persistenceService.loadFromStorage();
  assert(corruptRes === null, 'Corrupt JSON returns null without throwing or breaking game');

  mockStorage.setItem(persistenceService.STORAGE_KEY, JSON.stringify({ randomField: 123 }));
  const invalidSchemaRes = persistenceService.loadFromStorage();
  assert(invalidSchemaRes === null, 'Invalid schema without club returns null fallback safely');

  // Test 2: Legacy V1 Save Migration to Canonical V2
  console.log('\nTest 2: Legacy V1 Save Migration');
  const legacyV1Payload = {
    version: '1.0.0',
    exportedAt: '2026-01-01T00:00:00Z',
    club: {
      ...REAL_INITIAL_PLAYER_CLUB,
      name: 'Legacy FC',
      finances: { coins: 888000, reputation: 2500 }
    },
    vipPoints: 120,
    storyMissions: STORY_CHAPTER_1_MISSIONS,
    leagueStandings: REAL_INITIAL_STANDINGS,
    // Note: leagueFixtures, tournamentStats, dailyMissions are intentionally absent in v1
  };

  const migrated = persistenceService.migrate(legacyV1Payload);
  assert(migrated.saveVersion === CURRENT_SAVE_VERSION, `Migrated version is now canonical ${CURRENT_SAVE_VERSION}`);
  assert(migrated.club.name === 'Legacy FC', 'Club name preserved across migration');
  assert(migrated.club.finances.coins === 888000, 'Finances preserved');
  assert(migrated.club.finances.diamonds === 0, 'Missing diamonds given safe default 0');
  assert(Array.isArray(migrated.leagueFixtures) && migrated.leagueFixtures.length > 0, 'Missing leagueFixtures automatically generated for division');
  assert(Array.isArray(migrated.dailyMissions) && migrated.dailyMissions.length > 0, 'Missing dailyMissions given canonical defaults');

  // Test 3: The Complete User Career Lifecycle Scenario
  console.log('\nTest 3: Full Career Lifecycle Scenario');
  
  // Step 1: Start Career & Choose Club
  const clubId = 'club_arsenal';
  const divisionId = 'league_premier_league';
  const fixtures = ensureFixtureDates(generateFixturesForLeague(divisionId, clubId));
  
  const chosenClub = {
    ...REAL_INITIAL_PLAYER_CLUB,
    id: clubId,
    name: 'Arsenal Gunners',
    nameEn: 'Arsenal',
    divisionId,
    divisionName: 'الدوري الإنجليزي الممتاز',
    finances: {
      ...REAL_INITIAL_PLAYER_CLUB.finances,
      coins: 500000,
      diamonds: 300,
      trainingPoints: 100,
      reputation: 3000,
    },
    facilities: {
      stadiumLevel: 2,
      trainingGroundLevel: 2,
      youthAcademyLevel: 1,
      medicalCenterLevel: 1,
      scoutingNetworkLevel: 1,
    }
  };

  // Step 2: Change Tactics
  const updatedTactics = {
    ...chosenClub.footballTactics,
    formation: '4-2-3-1' as const,
    mentality: 'attacking' as const,
    pressing: 'high_press' as const,
    passing: 'short_tiki_taka' as const,
  };
  chosenClub.footballTactics = updatedTactics;

  // Step 3: Change Lineup & Bench
  const originalLineup = [...chosenClub.footballLineup];
  const originalBench = [...chosenClub.footballBench];
  // Swap player 0 with bench 0
  const swappedStarter = originalBench[0] || 'sub_player_1';
  const swappedSub = originalLineup[0];
  chosenClub.footballLineup[0] = swappedStarter;
  chosenClub.footballBench[0] = swappedSub;

  // Step 4: Buy Player
  const newSignedPlayer: Player = {
    id: 'bought_player_99',
    sport: 'football',
    name: 'كيليان مبابي الجديد',
    nameEn: 'Star Striker',
    age: 22,
    nationality: 'فرنسا',
    nationalityFlag: '🇫🇷',
    position: 'ST',
    secondaryPositions: ['LW'],
    overall: 88,
    potential: 94,
    attributes: { pace: 95, shooting: 89, dribbling: 90, physical: 82, passing: 84 },
    rarity: 'legend',
    personality: 'ambitious',
    traits: ['سرعة فائقة'],
    morale: 95,
    form: 8,
    stamina: 98,
    fatigue: 0,
    injuredWeeks: 0,
    suspendedMatches: 0,
    contractYears: 5,
    wage: 25000,
    marketValue: 120000,
    matchesPlayed: 0,
    goalsOrPoints: 0,
    assists: 0,
    cleanSheetsOrRebounds: 0,
    averageRating: 0,
  };

  chosenClub.finances.coins -= newSignedPlayer.marketValue;
  chosenClub.footballSquad.push(newSignedPlayer);
  chosenClub.footballBench.push(newSignedPlayer.id);

  // Step 5: Training
  const trainingCost = 40;
  chosenClub.finances.trainingPoints -= trainingCost;
  chosenClub.footballSquad[0].stamina = Math.min(100, chosenClub.footballSquad[0].stamina + 8);
  chosenClub.footballSquad[0].form = Math.min(10, chosenClub.footballSquad[0].form + 1);

  // Step 6: Play Match
  const matchRecord: MatchRecord = {
    id: 'match_day_1_record',
    sport: 'football',
    seed: 12345,
    homeClubId: clubId,
    homeClubName: 'Arsenal Gunners',
    awayClubId: 'club_chelsea',
    awayClubName: 'Chelsea',
    homeScore: 3,
    awayScore: 1,
    events: [
      {
        minute: 23,
        sport: 'football',
        type: 'goal',
        team: 'home',
        playerId: newSignedPlayer.id,
        playerName: newSignedPlayer.name,
        textAr: 'هدف رائع!',
        textEn: 'Goal!',
        homeScore: 1,
        awayScore: 0,
      }
    ],
    stats: {
      homePossession: 58,
      awayPossession: 42,
      homeShots: 14,
      awayShots: 7,
      homeShotsOnTarget: 8,
      awayShotsOnTarget: 3,
      homeCorners: 6,
      awayCorners: 2,
      homeFouls: 5,
      awayFouls: 9,
      homeYellowCards: 1,
      awayYellowCards: 2,
      homeRedCards: 0,
      awayRedCards: 0,
      homeXg: 2.4,
      awayXg: 0.9,
    },
    isFinished: true,
    competition: 'الدوري الإنجليزي الممتاز',
    matchDay: 1,
    date: new Date().toISOString(),
  };

  fixtures[0].played = true;
  fixtures[0].homeScore = 3;
  fixtures[0].awayScore = 1;

  // Step 7: Simulate Matchday & Update Standings
  const simulatedMatchdays = [1];
  const updatedStandings = REAL_INITIAL_STANDINGS.map((s, idx) => {
    if (s.clubId === clubId) {
      return { ...s, played: 1, won: 1, goalsFor: 3, goalsAgainst: 1, goalDifference: 2, points: 3 };
    }
    return s;
  });

  const tournamentStats = [
    {
      playerId: newSignedPlayer.id,
      name: newSignedPlayer.name,
      clubId,
      goals: 1,
      assists: 0,
      yellowCards: 0,
      redCards: 0,
      matchRatings: [8.5],
    }
  ];

  // Step 8: Complete Mission & Earn Coins
  const dailyMissions = INITIAL_DAILY_MISSIONS.map(m => {
    if (m.id === 'mission_win_match') {
      return { ...m, current: 1, isClaimed: true };
    }
    return m;
  });
  chosenClub.finances.coins += 25000;
  chosenClub.finances.diamonds += 15;

  // Step 9: Change Facility (Start Upgrade)
  const facilityUpgrade = {
    facility: 'stadiumLevel' as const,
    targetLevel: 3,
    startedAt: new Date().toISOString(),
    completesAt: new Date(Date.now() + 3600000).toISOString(),
  };
  chosenClub.finances.coins -= 70000;

  // Build full Career State
  const fullGameState = {
    club: chosenClub,
    currentSport: 'football',
    language: 'ar',
    soundEnabled: true,
    hasSelectedInitialClub: true,
    isGuest: false,
    hasClaimedLoginBonus: true,
    energy: 90,
    lastEnergyUpdate: Date.now(),
    vipPoints: 240,
    lastVipClaimDate: '2026-09-26',
    claimedVipUpgradeChests: [1, 2],
    missionSkipUsedDate: null,
    checkInStreak: 3,
    lastCheckInDate: '2026-09-26',
    savedTacticalPlans: [],
    pendingFacilityUpgrades: [facilityUpgrade],
    activeNegotiations: [],
    academyDiscoveries: [],
    scoutMarket: [newSignedPlayer],
    dailyMissions,
    storyMissions: STORY_CHAPTER_1_MISSIONS,
    leagueStandings: updatedStandings,
    leagueFixtures: fixtures,
    matchHistory: [matchRecord],
    tournamentStats,
    simulatedMatchdays,
    matchScoutReports: { 1: { matchday: 1, opponentClubId: 'club_chelsea', unlocked: true, unlockedBy: 'coins' as const, accuracyPercent: 85, unlockedAt: Date.now() } },
    unlockedSpeed2x: true,
  };

  // Step 10: Save to Local Storage
  console.log('  Saving state to local storage...');
  const saveSuccess = persistenceService.saveImmediate(fullGameState);
  assert(saveSuccess === true, 'saveImmediate returned true');
  assert(mockStorage.getItem(persistenceService.STORAGE_KEY) !== null, 'LocalStorage contains saved JSON string');

  // Step 11: Reload from Local Storage
  console.log('  Reloading and restoring from local storage...');
  const loadedSave = persistenceService.loadFromStorage();
  assert(loadedSave !== null, 'Loaded save is not null');
  if (!loadedSave) throw new Error('Loaded save is null');

  // Step 12: Verify EVERY important state!
  assert(loadedSave.saveVersion === CURRENT_SAVE_VERSION, `Loaded saveVersion is ${CURRENT_SAVE_VERSION}`);
  assert(loadedSave.club.id === clubId, `Club ID matches: ${loadedSave.club.id}`);
  assert(loadedSave.club.name === 'Arsenal Gunners', `Club name matches: ${loadedSave.club.name}`);
  assert(loadedSave.club.footballTactics.formation === '4-2-3-1', `Tactics formation preserved: ${loadedSave.club.footballTactics.formation}`);
  assert(loadedSave.club.footballTactics.mentality === 'attacking', `Tactics mentality preserved: ${loadedSave.club.footballTactics.mentality}`);
  assert(loadedSave.club.footballLineup[0] === swappedStarter, `Lineup swap starter preserved: ${loadedSave.club.footballLineup[0]}`);
  assert(loadedSave.club.footballBench[0] === swappedSub, `Lineup swap sub preserved: ${loadedSave.club.footballBench[0]}`);
  
  const hasBoughtPlayer = loadedSave.club.footballSquad.some(p => p.id === 'bought_player_99');
  assert(hasBoughtPlayer === true, 'Bought player is present in footballSquad');
  
  assert(loadedSave.club.finances.coins === chosenClub.finances.coins, `Coins preserved exactly: ${loadedSave.club.finances.coins}`);
  assert(loadedSave.club.finances.diamonds === chosenClub.finances.diamonds, `Diamonds preserved: ${loadedSave.club.finances.diamonds}`);
  assert(loadedSave.club.finances.trainingPoints === chosenClub.finances.trainingPoints, `Training points preserved: ${loadedSave.club.finances.trainingPoints}`);
  
  assert(loadedSave.matchHistory.length === 1, `Match history preserved: length ${loadedSave.matchHistory.length}`);
  assert(loadedSave.matchHistory[0].homeScore === 3 && loadedSave.matchHistory[0].awayScore === 1, 'Match scores preserved in history');
  assert(loadedSave.leagueFixtures[0].played === true, 'Fixture 1 marked as played');
  assert(loadedSave.simulatedMatchdays.includes(1), 'Simulated matchday 1 recorded');
  assert(loadedSave.tournamentStats.length === 1 && loadedSave.tournamentStats[0].goals === 1, 'Tournament stats preserved');
  assert(loadedSave.pendingFacilityUpgrades.length === 1 && loadedSave.pendingFacilityUpgrades[0].facility === 'stadiumLevel', 'Facility upgrade in-progress preserved');
  assert(loadedSave.matchScoutReports[1]?.unlocked === true, 'Scout report unlocked status preserved');
  assert(loadedSave.unlockedSpeed2x === true, 'Unlocked 2x simulation speed preserved');

  // Step 13: Cloud Save Parity Test
  console.log('\nTest 4: Cloud Save & Local Save Equivalence Check');
  const cloudPayloadStr = persistenceService.serialize(persistenceService.extractSaveData(loadedSave), false);
  const cloudRestored = persistenceService.deserialize(cloudPayloadStr);
  assert(cloudRestored.success === true, 'Cloud payload deserialized successfully');

  if (cloudRestored.data) {
    const comparison = persistenceService.compareStates(loadedSave, cloudRestored.data);
    assert(comparison.identical === true, `Cloud Save and Local Save are 100% logically identical! (Diffs: ${comparison.differences.join(', ') || 'None'})`);
  }

  // Step 14: Security Sanity Check (No sensitive credentials in save)
  console.log('\nTest 5: Security & Secret Leak Prevention');
  const jsonString = mockStorage.getItem(persistenceService.STORAGE_KEY) || '';
  assert(!jsonString.includes('private_key'), 'No private_key in save JSON');
  assert(!jsonString.includes('client_secret'), 'No client_secret in save JSON');
  assert(!jsonString.includes('FIREBASE_SERVICE_ACCOUNT'), 'No service account secret in save JSON');

  // Test 6: aiNarrationEnabled + assistant durable prefs roundtrip
  console.log('\nTest 6: aiNarrationEnabled & assistant preferences persist');
  const prefState = {
    ...fullGameState,
    aiNarrationEnabled: false,
    assistant: {
      ignoredRecommendationIds: ['rec_test_ignore'],
      appliedRecommendationIds: ['rec_test_apply'],
      explanationCache: { k: { explanation: 'must not persist', keyPoints: [], timestamp: 'x' } },
      activeRecommendations: [],
      liveTriggerCooldowns: {},
    },
  };
  persistenceService.saveImmediate(prefState);
  const prefLoaded = persistenceService.loadFromStorage();
  assert(prefLoaded !== null, 'preference save loads');
  assertEqual(prefLoaded!.aiNarrationEnabled, false, 'aiNarrationEnabled restored false');
  assertEqual(prefLoaded!.assistant?.ignoredRecommendationIds?.[0], 'rec_test_ignore', 'ignored id restored');
  assert(
    Boolean(prefLoaded!.assistant && !('explanationCache' in prefLoaded!.assistant)),
    'assistant cache not in save',
  );

  console.log('\n====================================================');
  console.log(`📊 Test Summary: ${testsPassed} Passed, ${testsFailed} Failed`);
  console.log('====================================================');

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});
