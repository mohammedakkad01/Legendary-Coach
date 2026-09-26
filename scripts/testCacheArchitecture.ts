/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * scripts/testCacheArchitecture.ts
 *
 * Unit and integration tests for Unified Football Caching Architecture:
 * - CacheRepository (Memory Tier 0 + Firestore Tier 1)
 * - Cache expiration logic (isExpired)
 * - FootballDataRepository & Quota Safeguard
 * - SyncService Cache-First strategy (never call API if cache fresh)
 * - Safe refresh when expired
 * - Document schema standardization (source, season, version, updatedAt, expiresAt)
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CacheRepository,
  FootballDataRepository,
  SyncService,
  QuotaExceededError,
  CachedLeague,
  CachedClub,
  CachedSquad,
} from '../server/index.ts';

test('1. CacheRepository: saves and retrieves league with standard metadata', async () => {
  const cacheRepo = new CacheRepository({ disableMemoryCache: false });

  const testLeague: CachedLeague = {
    id: 'league_premier_league',
    leagueKey: 'premier_league',
    apiFootballLeagueId: 39,
    name: 'الدوري الإنجليزي الممتاز',
    nameEn: 'Premier League',
    country: 'England',
    totalClubs: 20,
    expectedClubs: 20,
    source: 'api-football',
    season: '2024',
    version: '1.0',
    updatedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
  };

  await cacheRepo.saveLeague(testLeague);
  const fetched = await cacheRepo.getLeague('premier_league');

  assert.ok(fetched, 'League should be retrieved');
  assert.equal(fetched.id, 'league_premier_league');
  assert.equal(fetched.source, 'api-football');
  assert.equal(fetched.season, '2024');
  assert.equal(fetched.version, '1.0');
  assert.ok(fetched.updatedAt, 'updatedAt must be present');
  assert.ok(fetched.expiresAt, 'expiresAt must be present');
});

test('2. CacheRepository: isExpired accurately identifies fresh vs stale cache', () => {
  const cacheRepo = new CacheRepository({ defaultTtlDays: 30 });

  // Fresh item (expires in 10 days)
  const freshItem = {
    updatedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 10 * 86400000).toISOString(),
  };
  assert.equal(cacheRepo.isExpired(freshItem), false, 'Fresh item should not be expired');

  // Stale item (expired 1 hour ago)
  const staleItem = {
    updatedAt: new Date(Date.now() - 31 * 86400000).toISOString(),
    expiresAt: new Date(Date.now() - 3600000).toISOString(),
  };
  assert.equal(cacheRepo.isExpired(staleItem), true, 'Past expiresAt should be expired');

  // Item with no expiresAt, but updatedAt is 40 days ago (> 30 days default TTL)
  const oldUpdatedItem = {
    updatedAt: new Date(Date.now() - 40 * 86400000).toISOString(),
  };
  assert.equal(cacheRepo.isExpired(oldUpdatedItem, 30), true, 'Old updatedAt should be expired');

  // Item with no timestamps
  assert.equal(cacheRepo.isExpired({} as any), true, 'Empty timestamp should be expired');
});

test('3. CacheRepository: clubs and squads storage with unified schema', async () => {
  const cacheRepo = new CacheRepository();

  const testClub: CachedClub = {
    id: 'club_af_33',
    idTeam: '33',
    leagueKey: 'premier_league',
    name: 'مانشستر يونايتد',
    nameEn: 'Manchester United',
    country: 'England',
    logo: 'https://media.api-sports.io/football/teams/33.png',
    standingRank: 1,
    standingsTotal: 20,
    source: 'api-football',
    season: '2024',
    version: '1.0',
    updatedAt: new Date().toISOString(),
  };

  await cacheRepo.saveClubs([testClub], 'premier_league');

  const fetchedClub = await cacheRepo.getClub('33');
  assert.ok(fetchedClub, 'Club should be fetched by ID');
  assert.equal(fetchedClub.id, 'club_af_33');
  assert.equal(fetchedClub.source, 'api-football');

  const testSquad: CachedSquad = {
    id: 'squad_33',
    clubId: '33',
    clubNameEn: 'Manchester United',
    leagueId: 'premier_league',
    apiTeamId: '33',
    players: [
      {
        idPlayer: '101',
        name: 'Bruno Fernandes',
        nameEn: 'Bruno Fernandes',
        position: 'CAM',
        age: 30,
        overall: 86,
        potential: 86,
      },
    ],
    playerCount: 1,
    ratingModel: 'estimate-v1',
    source: 'api-football',
    season: '2024',
    version: '1.0',
    updatedAt: new Date().toISOString(),
  };

  await cacheRepo.saveSquad(testSquad);
  const fetchedSquad = await cacheRepo.getSquad('33');

  assert.ok(fetchedSquad, 'Squad should be retrieved');
  assert.equal(fetchedSquad.players.length, 1);
  assert.equal(fetchedSquad.players[0].name, 'Bruno Fernandes');
  assert.equal(fetchedSquad.source, 'api-football');
  assert.equal(fetchedSquad.version, '1.0');
});

test('4. FootballDataRepository: Quota safeguard aborts when daily usage >= 90', async () => {
  const repo = new FootballDataRepository({
    apiKey: 'dummy_key',
    delayMs: 0,
    safetyQuotaThreshold: 90,
    dailyLimit: 100,
  });

  // Mock getStatus to return 92 requests used
  repo.getStatus = async () => ({
    configured: true,
    current: 92,
    limit_day: 100,
    remaining: 8,
    remainingSafe: 0,
    checkedAt: new Date().toISOString(),
  });

  await assert.rejects(
    async () => {
      await repo.assertQuotaSafe();
    },
    (err: any) => {
      assert.ok(err instanceof QuotaExceededError);
      assert.equal(err.currentUsage, 92);
      return true;
    },
    'Should throw QuotaExceededError when usage >= 90'
  );
});

test('5. SyncService: Cache-First rule prevents redundant API-Football calls when cache is fresh', async () => {
  const cacheRepo = new CacheRepository();

  // Populate cache with fresh league and clubs
  const freshLeague: CachedLeague = {
    id: 'league_la_liga',
    leagueKey: 'la_liga',
    apiFootballLeagueId: 140,
    name: 'الدوري الإسباني (La Liga)',
    nameEn: 'La Liga',
    country: 'Spain',
    totalClubs: 20,
    expectedClubs: 20,
    source: 'api-football',
    season: '2024',
    version: '1.0',
    updatedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 20 * 86400000).toISOString(), // 20 days remaining
  };
  await cacheRepo.saveLeague(freshLeague);

  const mockClubs: CachedClub[] = Array.from({ length: 20 }, (_, i) => ({
    id: `club_af_${500 + i}`,
    idTeam: `${500 + i}`,
    leagueKey: 'la_liga',
    name: `Team ${i + 1}`,
    nameEn: `Team ${i + 1}`,
    country: 'Spain',
    logo: '',
    source: 'api-football',
    season: '2024',
    version: '1.0',
    updatedAt: new Date().toISOString(),
  }));
  await cacheRepo.saveClubs(mockClubs, 'la_liga');

  // Football repo that would throw if called
  let apiCallCount = 0;
  const mockFootballRepo = new FootballDataRepository({ apiKey: 'mock' });
  mockFootballRepo.getStandings = async () => {
    apiCallCount++;
    return {};
  };

  const syncService = new SyncService(mockFootballRepo, cacheRepo);

  const result = await syncService.syncLeague('la_liga', { force: false });

  assert.equal(result.success, true, 'Sync should succeed');
  assert.equal(result.skippedApi, true, 'Must skip external API call');
  assert.equal(result.requestsUsed, 0, 'Zero requests should be consumed');
  assert.equal(apiCallCount, 0, 'getStandings must NOT be called');
  assert.equal(result.clubsCount, 20, 'Should return cached clubs count');
});

test('6. SyncService: Safe refresh triggered when cache is expired or force=true', async () => {
  const cacheRepo = new CacheRepository();

  let standingsCalled = false;
  const mockFootballRepo = new FootballDataRepository({ apiKey: 'mock', delayMs: 0 });
  mockFootballRepo.getStatus = async () => ({
    configured: true,
    current: 10,
    limit_day: 100,
    remaining: 90,
    remainingSafe: 80,
    checkedAt: new Date().toISOString(),
  });
  mockFootballRepo.getStandings = async () => {
    standingsCalled = true;
    return {
      response: [
        {
          league: {
            id: 140,
            name: 'La Liga',
            standings: [
              [
                { team: { id: 529, name: 'Barcelona', logo: 'logo.png' }, rank: 1 },
                { team: { id: 541, name: 'Real Madrid', logo: 'logo2.png' }, rank: 2 },
              ],
            ],
          },
        },
      ],
    };
  };

  const syncService = new SyncService(mockFootballRepo, cacheRepo);

  const result = await syncService.syncLeague('la_liga', { force: true });

  assert.equal(result.success, true);
  assert.equal(standingsCalled, true, 'getStandings should be called on forced refresh');
  assert.equal(result.requestsUsed, 1);
  assert.equal(result.clubsCount, 2);

  // Check that the new data is now in cacheRepo
  const updatedLeague = await cacheRepo.getLeague('la_liga');
  assert.ok(updatedLeague);
  assert.equal(updatedLeague.totalClubs, 2);
});
