/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * scripts/syncSquadsApiFootball.ts
 *
 * Synchronizes squad rosters (/players/squads) for clubs into Firestore (squads_cache)
 * using the unified SyncService and CacheRepository.
 *
 * Features:
 * - Single source of truth in Firestore: squads_cache/squad_<clubId>
 * - Standardized schema: source, season, version, ratingModel, updatedAt, expiresAt
 * - Resumable & Incremental: Only syncs missing or expired squads
 * - Budget safe: Stops when MAX_REQUESTS reached or daily quota safety margin hit
 */

import {
  FootballDataRepository,
  CacheRepository,
  SyncService,
} from '../server/index.ts';
import { REAL_LEAGUES, mergeLiveClubsIntoLeagues } from '../src/data/realLeaguesData.ts';

const MAX_REQUESTS = Number(process.env.MAX_REQUESTS || 85);
const REFRESH_DAYS = Number(process.env.REFRESH_DAYS || 30);
const LEAGUE_ORDER = [
  'premier_league',
  'la_liga',
  'serie_a',
  'bundesliga',
  'ligue_1',
  'championship',
  'segunda_division',
  'yelo_league',
  'botola_pro',
];

async function main() {
  console.log('=== Squads Sync Worker (API-Football -> Firestore) ===');
  console.log(`Max Requests: ${MAX_REQUESTS} | Refresh Days: ${REFRESH_DAYS}`);

  const footballRepo = new FootballDataRepository();
  if (!footballRepo.isConfigured()) {
    throw new Error('Missing API_FOOTBALL_KEY environment variable.');
  }

  const cacheRepo = new CacheRepository();
  const syncService = new SyncService(footballRepo, cacheRepo);

  // Check Quota Status
  const quota = await syncService.getStatus();
  console.log(`API Quota Status: ${quota.current}/${quota.limit_day} requests used (${quota.remainingSafe} safe remaining).`);

  if (quota.current >= 90) {
    console.error('⛔ Daily quota safeguard threshold reached (>= 90 requests). Sync aborted.');
    process.exit(1);
  }

  // 1. Load clubs from Firestore clubs_cache
  const clubsList = await cacheRepo.getAllClubs();
  const clubsCacheMap: Record<string, any> = {};
  const rankByApiId = new Map<string, { rank?: number; total?: number }>();

  for (const c of clubsList) {
    if (c.source !== 'api-football') continue;
    clubsCacheMap[c.id] = c;
    rankByApiId.set(String(c.idTeam), {
      rank: c.standingRank ?? undefined,
      total: c.standingsTotal ?? undefined,
    });
  }

  if (Object.keys(clubsCacheMap).length === 0) {
    throw new Error('clubs_cache is empty in Firestore. Run "Sync Clubs (API-Football)" first.');
  }

  // 2. Merge with real leagues definition
  const leagues = mergeLiveClubsIntoLeagues(REAL_LEAGUES, clubsCacheMap);
  const allClubs = leagues
    .filter((l) => LEAGUE_ORDER.includes(l.id))
    .sort((a, b) => LEAGUE_ORDER.indexOf(a.id) - LEAGUE_ORDER.indexOf(b.id))
    .flatMap((l) => l.clubs.filter((c) => c.apiTeamId).map((c) => ({ club: c, leagueId: l.id })));

  // 3. Find pending clubs (missing or expired squads)
  const existingSquads = await cacheRepo.getAllSquads();
  const existingMap = new Map<string, any>();
  for (const s of existingSquads) {
    existingMap.set(s.id, s);
  }

  const pending = allClubs.filter(({ club }) => {
    const existing = existingMap.get(`squad_${club.id}`);
    if (!existing) return true;
    return cacheRepo.isExpired(existing, REFRESH_DAYS);
  });

  console.log(`Total clubs: ${allClubs.length} | Pending squads: ${pending.length} | Budget: ${MAX_REQUESTS} requests`);

  let used = 0;
  let successCount = 0;
  const failed: string[] = [];

  for (const { club, leagueId } of pending) {
    if (used >= MAX_REQUESTS) {
      console.log(`Reached max request budget for this run (${MAX_REQUESTS}). Stopping.`);
      break;
    }

    const rankInfo = rankByApiId.get(String(club.apiTeamId));
    console.log(`Syncing squad for ${club.nameEn} (team ID: ${club.apiTeamId})...`);

    try {
      const res = await syncService.syncSquad(club.id, club.apiTeamId!, {
        leagueId,
        clubNameEn: club.nameEn,
        standingRank: rankInfo?.rank,
        standingsTotal: rankInfo?.total,
        ttlDays: REFRESH_DAYS,
        force: true,
      });

      used += res.requestsUsed;

      if (res.aborted) {
        console.warn('Sync aborted by Quota Guard.');
        break;
      }

      if (res.success) {
        successCount++;
        console.log(`  [OK] ${club.nameEn}: ${res.playersCount} players cached in Firestore.`);
      } else {
        console.warn(`  [FAIL] ${club.nameEn}: ${res.error}`);
        failed.push(club.nameEn);
      }
    } catch (err: any) {
      console.warn(`  [FAIL] ${club.nameEn}: ${err.message}`);
      failed.push(club.nameEn);
    }
  }

  const left = pending.length - successCount - failed.length;
  console.log('\n================== SQUAD SYNC SUMMARY ==================');
  console.log(`Successfully synced: ${successCount} | Failed: ${failed.length} | Remaining pending: ${Math.max(0, left)}`);
  console.log(`Requests used this run: ${used}`);

  if (left > 0) {
    console.log('⏭️ Remaining clubs will be automatically processed on the next scheduled run.');
  }
}

main().catch((err) => {
  console.error('Fatal squad sync error:', err);
  process.exit(1);
});
