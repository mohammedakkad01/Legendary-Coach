/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * scripts/syncFootballData.ts
 *
 * Standalone, one-shot sync script — run manually or from GitHub Actions
 * (.github/workflows/sync-football-data.yml). It replaces the broken approach of calling
 * API-Football live from the browser (server.ts only runs in dev, never on GitHub Pages).
 *
 * What it does, per official league (6 leagues total):
 *   1) GET /teams?league=<id>&season=<season>   -> real club list, badges, venues   (1 request)
 * Total: 6 requests per run — comfortably inside the 100/day API-Football free quota,
 * even if this is run several times a day.
 *
 * Writes results to Firestore:
 *   leagues_cache/{league_<id>}   (matches the shape server.ts already used in-memory)
 *   clubs_cache/{club_<teamId>}
 *
 * These are the exact collection names already whitelisted for public read in firestore.rules
 * ("LAYER 1: Shared Read-Only Official Cache") — write access is server-only (Admin SDK bypasses
 * rules), so no rules changes are needed.
 *
 * Usage (locally):
 *   API_FOOTBALL_KEY=xxx FIREBASE_SERVICE_ACCOUNT="$(cat serviceAccount.json)" npx tsx scripts/syncFootballData.ts
 *
 * In CI this is wired up via GitHub Actions secrets — see the workflow file.
 */

import admin from 'firebase-admin';
import firebaseConfig from '../firebase-applet-config.json' with { type: 'json' };

const API_FOOTBALL_KEY = process.env.API_FOOTBALL_KEY;
const SERVICE_ACCOUNT_JSON = process.env.FIREBASE_SERVICE_ACCOUNT;
// Season = the year the season STARTS. As of late 2026 the current European season is 2026-27,
// so the correct value is 2026, not 2025. Override with FOOTBALL_SEASON if needed.
const PRIMARY_SEASON = Number(process.env.FOOTBALL_SEASON || 2026);
// If the primary season comes back empty (some free-tier keys only have full team data for one
// specific recent season), automatically retry with these seasons, in order.
const FALLBACK_SEASONS = [PRIMARY_SEASON, PRIMARY_SEASON - 1, PRIMARY_SEASON - 2];
const BASE_API_URL = 'https://v3.football.api-sports.io';

// Must stay in sync with LEAGUE_ID_TO_API_FOOTBALL_ID in src/data/realLeaguesData.ts
const OFFICIAL_LEAGUES_CONFIG = [
  { id: 39, key: 'premier_league', name: 'الدوري الإنجليزي الممتاز', nameEn: 'Premier League', country: 'England' },
  { id: 140, key: 'la_liga', name: 'الدوري الإسباني (La Liga)', nameEn: 'La Liga', country: 'Spain' },
  { id: 61, key: 'ligue_1', name: 'الدوري الفرنسي (Ligue 1)', nameEn: 'Ligue 1', country: 'France' },
  { id: 78, key: 'bundesliga', name: 'الدوري الألماني (Bundesliga)', nameEn: 'Bundesliga', country: 'Germany' },
  { id: 233, key: 'egypt_pl', name: 'الدوري المصري الممتاز', nameEn: 'Egyptian Premier League', country: 'Egypt' },
  { id: 307, key: 'saudi_pro', name: 'دوري روشن السعودي', nameEn: 'Saudi Pro League', country: 'Saudi Arabia' },
];

async function callApiFootball(endpoint: string) {
  const res = await fetch(`${BASE_API_URL}${endpoint}`, {
    headers: { 'x-apisports-key': API_FOOTBALL_KEY as string },
  });
  if (!res.ok) {
    throw new Error(`API-Football ${endpoint} -> HTTP ${res.status}: ${res.statusText}`);
  }
  return res.json();
}

async function main() {
  if (!API_FOOTBALL_KEY) {
    throw new Error('Missing API_FOOTBALL_KEY environment variable.');
  }
  if (!SERVICE_ACCOUNT_JSON) {
    throw new Error('Missing FIREBASE_SERVICE_ACCOUNT environment variable (paste the full service account JSON).');
  }

  const serviceAccount = JSON.parse(SERVICE_ACCOUNT_JSON);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  const db = admin.firestore();
  // CRITICAL: same non-default database ID the client app uses (see src/firebase/firebase.ts)
  if ((firebaseConfig as any).firestoreDatabaseId) {
    db.settings({ databaseId: (firebaseConfig as any).firestoreDatabaseId } as any);
  }

  // Safety check: verify remaining quota before doing anything (0-cost call)
  const statusData = await callApiFootball('/status');
  const current = statusData.response?.requests?.current || 0;
  const limitDay = statusData.response?.requests?.limit_day || 100;
  console.log(`API-Football quota: ${current}/${limitDay} used before this run.`);
  const maxPossibleRequests = OFFICIAL_LEAGUES_CONFIG.length * FALLBACK_SEASONS.length;
  if (current + maxPossibleRequests >= limitDay - 5) {
    throw new Error(`Aborting: not enough quota left today (${current}/${limitDay}) to safely sync ${OFFICIAL_LEAGUES_CONFIG.length} leagues.`);
  }

  let requestsUsed = 0;
  const batch = db.batch();
  let totalClubs = 0;

  for (const league of OFFICIAL_LEAGUES_CONFIG) {
    console.log(`Syncing ${league.nameEn} (id=${league.id})...`);

    let rawTeams: any[] = [];
    let seasonUsed = FALLBACK_SEASONS[0];
    for (const season of FALLBACK_SEASONS) {
      const teamsData = await callApiFootball(`/teams?league=${league.id}&season=${season}`);
      requestsUsed += 1;
      const teams = teamsData.response || [];
      console.log(`  season ${season}: ${teams.length} clubs (requests used so far: ${requestsUsed})`);
      if (teams.length === 0) {
        console.log(`    debug -> results=${teamsData.results} errors=${JSON.stringify(teamsData.errors)}`);
      }
      if (teams.length > 0) {
        rawTeams = teams;
        seasonUsed = season;
        break; // found a season with real data, stop trying older ones
      }
    }

    if (rawTeams.length === 0 && league === OFFICIAL_LEAGUES_CONFIG[0]) {
      console.error('First league returned 0 teams for every season tried — this is a systemic API/plan issue, not a per-league one. Stopping here to save quota; see the debug lines above for the real reason.');
      process.exit(1);
    }

    const leagueDocId = `league_${league.id}`;
    batch.set(db.collection('leagues_cache').doc(leagueDocId), {
      id: leagueDocId,
      leagueId: league.id,
      season: seasonUsed,
      name: league.name,
      nameEn: league.nameEn,
      country: league.country,
      totalClubs: rawTeams.length,
      updatedAt: new Date().toISOString(),
    });

    for (const t of rawTeams) {
      const teamId = t.team?.id;
      if (!teamId) continue;
      const clubDocId = `club_${teamId}`;
      batch.set(db.collection('clubs_cache').doc(clubDocId), {
        id: clubDocId,
        teamId,
        leagueId: league.id,
        season: seasonUsed,
        name: t.team?.name || '',
        nameEn: t.team?.name || '',
        code: t.team?.code || '',
        country: t.team?.country || '',
        founded: t.team?.founded || 1900,
        logo: t.team?.logo || '',
        venue: t.venue?.name || '',
        venueCapacity: t.venue?.capacity || 30000,
        updatedAt: new Date().toISOString(),
      });
      totalClubs += 1;
    }
    console.log(`  -> FINAL: ${rawTeams.length} clubs saved for ${league.nameEn} (season ${seasonUsed})`);
  }

  const logId = `log_${Date.now()}`;
  batch.set(db.collection('sync_logs').doc(logId), {
    id: logId,
    timestamp: new Date().toISOString(),
    initiatedBy: 'github-actions',
    requestsUsed,
    quotaRemaining: Math.max(0, limitDay - (current + requestsUsed)),
    status: 'success',
    summary: `تمت مزامنة ${OFFICIAL_LEAGUES_CONFIG.length} دوريات و${totalClubs} نادياً بنجاح، باستخدام ${requestsUsed} طلبات فقط.`,
  });

  await batch.commit();
  console.log(`Done. Synced ${OFFICIAL_LEAGUES_CONFIG.length} leagues, ${totalClubs} clubs. Requests used: ${requestsUsed}/${limitDay - current}.`);
}

main().catch(err => {
  console.error('Sync failed:', err);
  process.exit(1);
});
