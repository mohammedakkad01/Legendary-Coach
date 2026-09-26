/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * scripts/syncClubsApiFootball.ts
 *
 * Synchronizes official leagues and clubs from API-Football into Firestore
 * (leagues_cache and clubs_cache) using the unified SyncService and CacheRepository.
 *
 * Guarantees:
 * - Single source of truth (Firestore)
 * - Identical data schemas between GitHub Actions and Server
 * - Safe Quota Guard: asserts usage < 90 before requests
 * - Standard metadata: source, season, version, updatedAt, expiresAt
 *
 * Usage locally:
 *   DRY_RUN=1 API_FOOTBALL_KEY=xxx npx tsx scripts/syncClubsApiFootball.ts
 * With Firebase:
 *   FIREBASE_SERVICE_ACCOUNT="$(cat sa.json)" API_FOOTBALL_KEY=xxx npx tsx scripts/syncClubsApiFootball.ts
 */

import {
  FootballDataRepository,
  CacheRepository,
  SyncService,
  OFFICIAL_LEAGUES_CONFIG,
} from '../server/index.ts';

const DRY_RUN = process.env.DRY_RUN === '1';
const SEASON = process.env.SEASON || '2024';
const FORCE = process.env.FORCE === '1';

async function main() {
  console.log('=== Football Data Sync Worker (Clubs & Leagues) ===');
  console.log(`Season: ${SEASON} | Dry Run: ${DRY_RUN} | Force: ${FORCE}`);

  const footballRepo = new FootballDataRepository();
  if (!footballRepo.isConfigured() && !DRY_RUN) {
    throw new Error('Missing API_FOOTBALL_KEY environment variable.');
  }

  const cacheRepo = new CacheRepository({
    disableMemoryCache: false,
  });

  const syncService = new SyncService(footballRepo, cacheRepo);

  // Check Quota Status
  const status = await syncService.getStatus();
  console.log(`API Quota Status: ${status.current}/${status.limit_day} requests used today (${status.remainingSafe} safe remaining).`);

  if (status.current >= 90) {
    console.error('⛔ Quota threshold reached (>= 90 requests). Sync aborted to protect API quota.');
    process.exit(1);
  }

  type Row = { key: string; status: string; found: number; expected: number; requestsUsed: number; details: string };
  const summaryRows: Row[] = [];
  let totalRequestsUsed = 0;

  for (const cfg of OFFICIAL_LEAGUES_CONFIG) {
    console.log(`\n--- Syncing ${cfg.nameEn} (${cfg.key}, ID: ${cfg.id}) ---`);

    try {
      const result = await syncService.syncLeague(cfg.key, {
        season: SEASON,
        force: FORCE,
      });

      totalRequestsUsed += result.requestsUsed;

      if (result.skippedApi) {
        console.log(`  [CACHE HIT] ${result.reason}`);
        summaryRows.push({
          key: cfg.key,
          status: 'CACHED',
          found: result.clubsCount || 0,
          expected: cfg.expectedClubs || 0,
          requestsUsed: 0,
          details: 'Firestore cache was fresh',
        });
        continue;
      }

      if (!result.success) {
        console.error(`  [FAILED] ${result.error}`);
        summaryRows.push({
          key: cfg.key,
          status: result.aborted ? 'ABORTED' : 'ERROR',
          found: 0,
          expected: cfg.expectedClubs || 0,
          requestsUsed: result.requestsUsed,
          details: result.error || 'Sync failed',
        });
        if (result.aborted) break;
        continue;
      }

      const clubsCount = result.clubsCount || 0;
      const expected = cfg.expectedClubs || clubsCount;
      const statusLabel = clubsCount >= expected ? 'OK' : 'CHECK';

      console.log(`  [SUCCESS] ${clubsCount} clubs synced to Firestore (${result.requestsUsed} requests used).`);
      summaryRows.push({
        key: cfg.key,
        status: statusLabel,
        found: clubsCount,
        expected,
        requestsUsed: result.requestsUsed,
        details: `Synced ${clubsCount} clubs`,
      });
    } catch (err: any) {
      console.error(`  [EXCEPTION] ${err.message}`);
      summaryRows.push({
        key: cfg.key,
        status: 'EXCEPTION',
        found: 0,
        expected: cfg.expectedClubs || 0,
        requestsUsed: 0,
        details: err.message,
      });
    }
  }

  console.log('\n================== SYNC SUMMARY ==================');
  for (const r of summaryRows) {
    console.log(`${r.status.padEnd(10)} ${r.key.padEnd(20)} ${String(r.found).padStart(2)}/${String(r.expected).padEnd(2)} clubs (reqs: ${r.requestsUsed}) - ${r.details}`);
  }
  console.log(`Total requests used: ${totalRequestsUsed}`);

  const hasFatalErrors = summaryRows.some((r) => r.status === 'ERROR' || r.status === 'EXCEPTION' || r.status === 'ABORTED');
  if (hasFatalErrors) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal sync error:', err);
  process.exit(1);
});
