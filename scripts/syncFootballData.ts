/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * scripts/syncFootballData.ts
 *
 * Standalone, one-shot sync script (run via tsx, no Express/Cloud Functions needed).
 *
 * NOTE: originally built against API-Football, but that account got suspended with no
 * support response, so this now uses TheSportsDB instead — the exact same free, public,
 * no-signup, no-suspension-risk API already used in src/services/footballApi.ts for team/
 * player search. No API key/secret needed at all for this script anymore.
 *
 * Per official league (6 leagues total):
 *   1) search_all_leagues.php?l=<name>   -> resolve TheSportsDB's numeric league id (1 request)
 *   2) lookup_all_teams.php?id=<id>      -> full real team list, badges, stadiums   (1 request)
 * Total: ~12 requests per run. TheSportsDB's public test key ("3") has no published daily cap
 * for this volume, but the script is still deliberately small and infrequent (weekly schedule).
 *
 * Writes results to Firestore:
 *   leagues_cache/{league_<key>}
 *   clubs_cache/{club_<idTeam>}
 *
 * Usage (locally):
 *   FIREBASE_SERVICE_ACCOUNT="$(cat serviceAccount.json)" npx tsx scripts/syncFootballData.ts
 */

import admin from 'firebase-admin';
import firebaseConfig from '../firebase-applet-config.json' with { type: 'json' };

const SERVICE_ACCOUNT_JSON = process.env.FIREBASE_SERVICE_ACCOUNT;
const BASE_API_URL = 'https://www.thesportsdb.com/api/v1/json/3'; // public free test key, no signup

// Must stay in sync with LEAGUE_ID_TO_THESPORTSDB_NAME in src/data/realLeaguesData.ts
const OFFICIAL_LEAGUES_CONFIG = [
  { key: 'premier_league', name: 'الدوري الإنجليزي الممتاز', nameEn: 'Premier League', country: 'England', sportsDbNames: ['English Premier League'] },
  { key: 'la_liga', name: 'الدوري الإسباني (La Liga)', nameEn: 'La Liga', country: 'Spain', sportsDbNames: ['Spanish La Liga'] },
  { key: 'ligue_1', name: 'الدوري الفرنسي (Ligue 1)', nameEn: 'Ligue 1', country: 'France', sportsDbNames: ['French Ligue 1'] },
  { key: 'bundesliga', name: 'الدوري الألماني (Bundesliga)', nameEn: 'Bundesliga', country: 'Germany', sportsDbNames: ['German Bundesliga'] },
  { key: 'egyptian_league', name: 'الدوري المصري الممتاز', nameEn: 'Egyptian Premier League', country: 'Egypt', sportsDbNames: ['Egyptian Premier League'], seedTeamName: 'Al Ahly' },
  { key: 'saudi_pro_league', name: 'دوري روشن السعودي', nameEn: 'Saudi Pro League', country: 'Saudi Arabia', sportsDbNames: ['Saudi Professional League', 'Saudi Pro League', 'Saudi Arabian Premier League'], seedTeamName: 'Al Hilal' },
];

async function callSportsDb(endpoint: string) {
  const res = await fetch(`${BASE_API_URL}${endpoint}`);
  if (!res.ok) {
    throw new Error(`TheSportsDB ${endpoint} -> HTTP ${res.status}: ${res.statusText}`);
  }
  return res.json();
}

async function resolveLeagueId(allLeagues: any[], candidateNames: string[]): Promise<{ id: string; matchedName: string } | null> {
  for (const name of candidateNames) {
    const match = allLeagues.find((l: any) => (l.strLeague || '').toLowerCase() === name.toLowerCase());
    if (match?.idLeague) {
      return { id: match.idLeague, matchedName: match.strLeague };
    }
  }
  // Fallback: loose substring match in case the exact name differs slightly
  for (const name of candidateNames) {
    const parts = name.toLowerCase().split(' ');
    const match = allLeagues.find((l: any) => {
      const s = (l.strLeague || '').toLowerCase();
      return parts.every(p => s.includes(p));
    });
    if (match?.idLeague) {
      return { id: match.idLeague, matchedName: match.strLeague };
    }
  }
  return null;
}

async function main() {
  if (!SERVICE_ACCOUNT_JSON) {
    throw new Error('Missing FIREBASE_SERVICE_ACCOUNT environment variable (paste the full service account JSON).');
  }

  const serviceAccount = JSON.parse(SERVICE_ACCOUNT_JSON);
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  const db = admin.firestore();
  if ((firebaseConfig as any).firestoreDatabaseId) {
    db.settings({ databaseId: (firebaseConfig as any).firestoreDatabaseId } as any);
  }

  const batch = db.batch();
  let totalClubs = 0;
  let requestsUsed = 0;

  console.log('Fetching full leagues list from TheSportsDB (one request)...');
  const allLeaguesData = await callSportsDb('/all_leagues.php');
  requestsUsed += 1;
  const allLeagues = (allLeaguesData.leagues || []).filter((l: any) => l.strSport === 'Soccer');
  console.log(`  -> ${allLeagues.length} soccer leagues available to match against.`);

  for (const league of OFFICIAL_LEAGUES_CONFIG) {
    console.log(`Syncing ${league.nameEn} (${league.key})...`);

    let rawTeams: any[] = [];
    let matchedVia = '';

    const resolved = await resolveLeagueId(allLeagues, league.sportsDbNames);
    if (resolved) {
      console.log(`  matched via all_leagues.php: "${resolved.matchedName}" (id=${resolved.id})`);
      const teamsData = await callSportsDb(`/lookup_all_teams.php?id=${resolved.id}`);
      requestsUsed += 1;
      rawTeams = teamsData.teams || [];
      matchedVia = resolved.matchedName;
    } else {
      // Fallback: not in the small curated all_leagues.php list (true for Egypt/Saudi) —
      // search the full team DB directly by league name instead.
      for (const name of league.sportsDbNames) {
        const teamsData = await callSportsDb(`/search_all_teams.php?l=${encodeURIComponent(name)}`);
        requestsUsed += 1;
        const teams = (teamsData.teams || []).filter((t: any) => !t.strSport || t.strSport === 'Soccer');
        if (teams.length > 0) {
          console.log(`  matched via search_all_teams.php?l=${name}`);
          rawTeams = teams;
          matchedVia = name;
          break;
        }
      }
    }

    if (rawTeams.length === 0 && league.seedTeamName) {
      console.log(`  no match by guessed names — looking up seed team "${league.seedTeamName}" to find the exact league name...`);
      const seedData = await callSportsDb(`/searchteams.php?t=${encodeURIComponent(league.seedTeamName)}`);
      requestsUsed += 1;
      const candidates = (seedData.teams || []).filter((t: any) => !t.strSport || t.strSport === 'Soccer');
      console.log(`  seed search candidates: ${JSON.stringify(candidates.map((t: any) => ({ team: t.strTeam, country: t.strCountry, league: t.strLeague })))}`);
      const seedTeam = candidates.find((t: any) => {
        const c = (t.strCountry || '').toLowerCase();
        const target = league.country.toLowerCase();
        return c.includes(target) || target.includes(c);
      });
      if (seedTeam?.strLeague) {
        console.log(`  seed team's exact league name: "${seedTeam.strLeague}"`);
        const teamsData = await callSportsDb(`/search_all_teams.php?l=${encodeURIComponent(seedTeam.strLeague)}`);
        requestsUsed += 1;
        rawTeams = (teamsData.teams || []).filter((t: any) => !t.strSport || t.strSport === 'Soccer');
        matchedVia = seedTeam.strLeague;
      }
    }

    if (rawTeams.length === 0) {
      console.error(`  -> could not find any clubs for ${league.nameEn} via either method. Skipping.`);
      continue;
    }
    console.log(`  -> ${rawTeams.length} clubs found`);

    const leagueDocId = `league_${league.key}`;
    batch.set(db.collection('leagues_cache').doc(leagueDocId), {
      id: leagueDocId,
      leagueKey: league.key,
      matchedVia,
      name: league.name,
      nameEn: league.nameEn,
      country: league.country,
      totalClubs: rawTeams.length,
      updatedAt: new Date().toISOString(),
    });

    for (const t of rawTeams) {
      const idTeam = t.idTeam;
      if (!idTeam) continue;
      const clubDocId = `club_${idTeam}`;
      batch.set(db.collection('clubs_cache').doc(clubDocId), {
        id: clubDocId,
        idTeam,
        leagueKey: league.key,
        name: t.strTeam || '',
        nameEn: t.strTeam || '',
        country: t.strCountry || league.country,
        founded: t.intFormedYear || '',
        logo: t.strBadge || t.strLogo || '',
        venue: t.strStadium || '',
        descriptionEn: t.strDescriptionEN || '',
        updatedAt: new Date().toISOString(),
      });
      totalClubs += 1;
    }
  }

  const logId = `log_${Date.now()}`;
  batch.set(db.collection('sync_logs').doc(logId), {
    id: logId,
    timestamp: new Date().toISOString(),
    initiatedBy: 'github-actions',
    source: 'thesportsdb',
    requestsUsed,
    status: 'success',
    summary: `تمت مزامنة ${OFFICIAL_LEAGUES_CONFIG.length} دوريات و${totalClubs} نادياً بنجاح عبر TheSportsDB.`,
  });

  await batch.commit();
  console.log(`Done. Synced ${totalClubs} clubs across ${OFFICIAL_LEAGUES_CONFIG.length} leagues.`);
}

main().catch(err => {
  console.error('Sync failed:', err);
  process.exit(1);
});
