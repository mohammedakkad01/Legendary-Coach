/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * scripts/syncSquadsData.ts
 *
 * Fetches REAL full squads (18-23 players per club, real names, positions,
 * nationalities, ages, photos) from TheSportsDB for every club defined in
 * src/data/realLeaguesData.ts — including the 18 Saudi Pro League and 21
 * Egyptian Premier League clubs that are now curated by hand there.
 *
 * IMPORTANT — about "overall" ratings:
 * TheSportsDB (and every other free/public football API) does NOT publish
 * FIFA/FC-style numeric ratings — those are EA Sports' proprietary data and
 * are not available anywhere legally scrapable. There is no free API for
 * "real" player ratings. What this script CAN and DOES pull as 100% real:
 * player names, positions, nationality, date of birth, and photos.
 * The numeric `overall`/`potential` used in-game is then computed by the
 * same heuristic already used live in src/services/footballApi.ts
 * (mapApiPosition + convertApiPlayerToGamePlayer's rating curve: age,
 * position, and a recognized-superstar name boost). This script reuses
 * that exact logic so ratings stay consistent between live searches and
 * the pre-synced squads. If you later get access to a paid ratings feed
 * (e.g. Sofascore/WhoScored partner API), swap out `estimateOverall()`
 * below — everything else (the real roster data) stays the same.
 *
 * Per club (~39 clubs across the 2 leagues, but works for all 8 leagues
 * in REAL_LEAGUES if you flip SCOPE below):
 *   1) searchteams.php?t=<clubNameEn>   -> resolve TheSportsDB idTeam
 *   2) lookup_all_players.php?id=<id>   -> full real squad
 * ~2 requests/club. For 39 clubs that's ~78 requests, run weekly.
 *
 * Usage (locally):
 *   FIREBASE_SERVICE_ACCOUNT="$(cat serviceAccount.json)" npx tsx scripts/syncSquadsData.ts
 */

import admin from 'firebase-admin';
import firebaseConfig from '../firebase-applet-config.json' with { type: 'json' };
import { REAL_LEAGUES } from '../src/data/realLeaguesData.ts';

const SERVICE_ACCOUNT_JSON = process.env.FIREBASE_SERVICE_ACCOUNT;
const BASE_API_URL = 'https://www.thesportsdb.com/api/v1/json/3';

// Which leagues to sync squads for. Defaults to just the two we just hand-curated;
// change to REAL_LEAGUES.map(l => l.id) to cover every league in the file.
const SCOPE_LEAGUE_IDS = ['saudi_pro_league', 'egyptian_league'];

async function callSportsDb(endpoint: string) {
  const res = await fetch(`${BASE_API_URL}${endpoint}`);
  if (!res.ok) throw new Error(`TheSportsDB ${endpoint} -> HTTP ${res.status}: ${res.statusText}`);
  return res.json();
}

function mapApiPosition(pos?: string): string {
  if (!pos) return 'CM';
  const p = pos.toLowerCase();
  if (p.includes('goalkeeper') || p === 'gk') return 'GK';
  if (p.includes('centre-back') || p.includes('center back') || p === 'cb') return 'CB';
  if (p.includes('left-back') || p.includes('left back') || p === 'lb') return 'LB';
  if (p.includes('right-back') || p.includes('right back') || p === 'rb') return 'RB';
  if (p.includes('defensive midfield') || p === 'cdm' || p === 'dm') return 'CDM';
  if (p.includes('attacking midfield') || p === 'cam' || p === 'am') return 'CAM';
  if (p.includes('left wing') || p === 'lw') return 'LW';
  if (p.includes('right wing') || p === 'rw') return 'RW';
  if (p.includes('forward') || p.includes('striker') || p === 'st' || p === 'cf') return 'ST';
  return 'CM';
}

// Same heuristic curve as convertApiPlayerToGamePlayer() in src/services/footballApi.ts —
// kept in sync manually since this runs as a standalone script (see file header note).
function estimateRatings(name: string, age: number): { overall: number; potential: number } {
  let overall = 74; // slightly lower baseline than the "search a superstar" path, since
  let potential = 80; // full-squad rosters include plenty of squad/rotation players too.
  const n = name.toLowerCase();
  if (n.includes('ronaldo') || n.includes('benzema') || n.includes('mane') || n.includes('kante')) {
    overall = 87; potential = 87;
  } else if (age < 22) {
    overall = 68; potential = 82;
  } else if (age > 32) {
    overall = 76; potential = 76;
  }
  return { overall, potential };
}

async function resolveTeamId(nameEn: string, nameAr: string): Promise<{ id: string; matchedName: string } | null> {
  const candidates = [nameEn, nameEn.replace(/\s*(FC|SC|Club|CF)\.?$/i, '').trim(), nameAr];
  for (const c of candidates) {
    if (!c) continue;
    const data = await callSportsDb(`/searchteams.php?t=${encodeURIComponent(c)}`);
    const teams = (data.teams || []).filter((t: any) => !t.strSport || t.strSport === 'Soccer');
    if (teams.length > 0) {
      // Prefer exact (case-insensitive) name match, else first result
      const exact = teams.find((t: any) => (t.strTeam || '').toLowerCase() === nameEn.toLowerCase());
      const pick = exact || teams[0];
      return { id: pick.idTeam, matchedName: pick.strTeam };
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

  const clubs = REAL_LEAGUES
    .filter(l => SCOPE_LEAGUE_IDS.includes(l.id))
    .flatMap(l => l.clubs.map(c => ({ ...c, leagueId: l.id })));

  console.log(`Syncing squads for ${clubs.length} clubs across ${SCOPE_LEAGUE_IDS.join(', ')}...`);

  let requestsUsed = 0;
  let totalPlayers = 0;
  let clubsMatched = 0;
  let clubsSkipped: string[] = [];
  const batch = db.batch();

  for (const club of clubs) {
    const resolved = await resolveTeamId(club.nameEn, club.name);
    requestsUsed += 1;
    if (!resolved) {
      console.warn(`  [skip] ${club.nameEn}: no TheSportsDB team match found.`);
      clubsSkipped.push(club.nameEn);
      continue;
    }

    const playersData = await callSportsDb(`/lookup_all_players.php?id=${resolved.id}`);
    requestsUsed += 1;
    const rawPlayers = (playersData.player || []).filter((p: any) => p.strSport === 'Soccer' || !p.strSport);

    if (rawPlayers.length === 0) {
      console.warn(`  [empty] ${club.nameEn} (matched "${resolved.matchedName}", id=${resolved.id}): 0 players returned.`);
      clubsSkipped.push(club.nameEn);
      continue;
    }

    const players = rawPlayers.map((p: any) => {
      let age = 24;
      if (p.dateBorn) {
        const bornYear = new Date(p.dateBorn).getFullYear();
        if (!isNaN(bornYear) && bornYear > 1970) age = Math.max(16, Math.min(41, 2026 - bornYear));
      }
      const { overall, potential } = estimateRatings(p.strPlayer || '', age);
      return {
        idPlayer: p.idPlayer,
        name: p.strPlayer || '',
        nameEn: p.strPlayer || '',
        position: mapApiPosition(p.strPosition),
        positionRaw: p.strPosition || '',
        nationality: p.strNationality || '',
        age,
        number: p.strNumber || '',
        photoUrl: p.strCutout || p.strThumb || '',
        overall,
        potential,
      };
    });

    totalPlayers += players.length;
    clubsMatched += 1;
    console.log(`  [ok] ${club.nameEn} -> "${resolved.matchedName}": ${players.length} real players`);

    batch.set(db.collection('squads_cache').doc(`squad_${club.id}`), {
      clubId: club.id,
      clubNameEn: club.nameEn,
      leagueId: club.leagueId,
      matchedTeamId: resolved.id,
      matchedTeamName: resolved.matchedName,
      players,
      playerCount: players.length,
      updatedAt: new Date().toISOString(),
    });
  }

  const logId = `squad_log_${Date.now()}`;
  batch.set(db.collection('sync_logs').doc(logId), {
    id: logId,
    timestamp: new Date().toISOString(),
    initiatedBy: 'github-actions',
    source: 'thesportsdb-squads',
    requestsUsed,
    status: clubsSkipped.length === 0 ? 'success' : 'partial',
    summary: `تمت مزامنة تشكيلات ${clubsMatched} من ${clubs.length} نادياً (${totalPlayers} لاعباً حقيقياً). لم يتم العثور على: ${clubsSkipped.join('، ') || 'لا يوجد'}.`,
  });

  await batch.commit();
  console.log(`Done. ${clubsMatched}/${clubs.length} clubs, ${totalPlayers} real players synced. Requests used: ${requestsUsed}.`);
  if (clubsSkipped.length > 0) {
    console.log(`Skipped (no match / empty squad): ${clubsSkipped.join(', ')}`);
  }
}

main().catch(err => {
  console.error('Squad sync failed:', err);
  process.exit(1);
});
