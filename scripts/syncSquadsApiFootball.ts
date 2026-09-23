/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * scripts/syncSquadsApiFootball.ts
 *
 * يجلب التشكيلة الحالية الحقيقية (/players/squads — لا تحتاج موسماً فتعمل في الخطة المجانية) لكل نادٍ
 * موجود في clubs_cache ويحفظها في squads_cache/squad_<clubId> (نفس المعرّف الذي تستخدمه اللعبة).
 *
 * الميزانية: طلب واحد لكل نادٍ. ~170 نادياً = يومان بحصة 100 يومياً. السكربت "قابل للاستئناف":
 * يعالج الأندية التي لا تملك تشكيلة (أو أقدم من REFRESH_DAYS) حتى ينتهي MAX_REQUESTS ثم يتوقف،
 * ويكمل من حيث توقف عند التشغيل التالي (الـ workflow يعمل يومياً؛ وحين لا يبقى شيء يكلّف 0 طلب).
 *
 * تشغيل محلي: FIREBASE_SERVICE_ACCOUNT="$(cat sa.json)" API_FOOTBALL_KEY=xxx npx tsx scripts/syncSquadsApiFootball.ts
 */
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import firebaseConfig from '../firebase-applet-config.json' with { type: 'json' };
import { REAL_LEAGUES, mergeLiveClubsIntoLeagues } from '../src/data/realLeaguesData.ts';
import { buildSquadPlayers } from './lib/squadBuilder.ts';

const KEY = (process.env.API_FOOTBALL_KEY || '').trim();
const SERVICE_ACCOUNT_JSON = process.env.FIREBASE_SERVICE_ACCOUNT;
const MAX_REQUESTS = Number(process.env.MAX_REQUESTS || 85);
const REFRESH_DAYS = Number(process.env.REFRESH_DAYS || 30);
const BASE = 'https://v3.football.api-sports.io';
const DELAY_MS = 6500; // المجاني: 10 طلبات/دقيقة
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// أولوية المعالجة: الدوريات الكبرى أولاً
const LEAGUE_ORDER = ['premier_league', 'la_liga', 'serie_a', 'bundesliga', 'ligue_1', 'championship', 'segunda_division', 'yelo_league', 'botola_pro'];

async function main() {
  if (!KEY) throw new Error('Missing API_FOOTBALL_KEY');
  if (!SERVICE_ACCOUNT_JSON) throw new Error('Missing FIREBASE_SERVICE_ACCOUNT');
  const sa = JSON.parse(SERVICE_ACCOUNT_JSON);
  const dbId: string = (firebaseConfig as any).firestoreDatabaseId || '(default)';
  const db = getFirestore(initializeApp({ credential: cert(sa) }), dbId);
  console.log(`Firestore -> project: ${sa.project_id} | database: ${dbId}`);

  // 1) أندية API من Firestore -> دمجها مع القائمة اليدوية لنحصل على نفس معرّفات اللعبة
  const clubsSnap = await db.collection('clubs_cache').get();
  const cache: Record<string, any> = {};
  const rankByApiId = new Map<string, { rank?: number; total?: number }>();
  clubsSnap.forEach(d => {
    const c = d.data();
    if (c.source !== 'api-football') return;
    cache[d.id] = c;
    rankByApiId.set(String(c.idTeam), { rank: c.standingRank ?? undefined, total: c.standingsTotal ?? undefined });
  });
  if (Object.keys(cache).length === 0) throw new Error('clubs_cache فارغ (source=api-football). شغّل "Sync Clubs (API-Football)" أولاً.');

  const leagues = mergeLiveClubsIntoLeagues(REAL_LEAGUES, cache);
  const all = leagues
    .filter(l => LEAGUE_ORDER.includes(l.id))
    .sort((a, b) => LEAGUE_ORDER.indexOf(a.id) - LEAGUE_ORDER.indexOf(b.id))
    .flatMap(l => l.clubs.filter(c => c.apiTeamId).map(c => ({ club: c, leagueId: l.id })));

  // 2) ما هو المعلَّق؟
  const squadsSnap = await db.collection('squads_cache').get();
  const existing = new Map<string, any>();
  squadsSnap.forEach(d => existing.set(d.id, d.data()));
  const staleBefore = Date.now() - REFRESH_DAYS * 86400_000;
  const pending = all.filter(({ club }) => {
    const e = existing.get(`squad_${club.id}`);
    return !e || e.source !== 'api-football' || e.apiTeamId !== club.apiTeamId || !e.updatedAt || Date.parse(e.updatedAt) < staleBefore;
  });
  console.log(`clubs total: ${all.length} | need squad: ${pending.length} | budget: ${MAX_REQUESTS} requests`);

  let used = 0, ok = 0, remaining: number | null = null;
  const failed: string[] = [];
  const perLeague: Record<string, number> = {};

  for (const { club, leagueId } of pending) {
    if (used >= MAX_REQUESTS || (remaining !== null && remaining <= 6)) break;
    await sleep(DELAY_MS);
    used++;
    try {
      const res = await fetch(`${BASE}/players/squads?team=${club.apiTeamId}`, { headers: { 'x-apisports-key': KEY } });
      const r = res.headers.get('x-ratelimit-requests-remaining');
      if (r !== null) remaining = Number(r);
      if (res.status === 429) { console.warn('HTTP 429 — quota reached, stopping.'); break; }
      const body: any = await res.json().catch(() => ({}));
      const errs = body.errors && (Array.isArray(body.errors) ? body.errors : Object.values(body.errors));
      if (errs && errs.length) { console.warn(`  [err] ${club.nameEn}: ${JSON.stringify(body.errors)}`); failed.push(club.nameEn); continue; }
      const raw = body.response?.[0]?.players || [];
      if (raw.length === 0) { console.warn(`  [empty] ${club.nameEn} (team ${club.apiTeamId})`); failed.push(`${club.nameEn} (empty)`); continue; }

      const rk = rankByApiId.get(String(club.apiTeamId));
      const players = buildSquadPlayers(raw, leagueId, rk?.rank, rk?.total);
      await db.collection('squads_cache').doc(`squad_${club.id}`).set({
        clubId: club.id, clubNameEn: club.nameEn, leagueId, source: 'api-football',
        apiTeamId: String(club.apiTeamId), matchedTeamName: body.response?.[0]?.team?.name || club.nameEn,
        players, playerCount: players.length, ratingModel: 'estimate-v1', updatedAt: new Date().toISOString(),
      });
      ok++;
      perLeague[leagueId] = (perLeague[leagueId] || 0) + 1;
      console.log(`  [ok] ${leagueId}/${club.nameEn}: ${players.length} players (e.g. ${players.slice(0, 3).map(p => `${p.name}/${p.position}/${p.overall}`).join(', ')})`);
    } catch (e: any) {
      console.warn(`  [fail] ${club.nameEn}: ${e.message}`);
      failed.push(club.nameEn);
    }
  }

  const left = pending.length - ok - failed.length;
  console.log('\n=========== SUMMARY ===========');
  console.log(`saved this run: ${ok} | failed: ${failed.length} | still pending: ${Math.max(0, left)} | requests used: ${used} | remaining today: ${remaining ?? '?'}`);
  console.log('per league:', JSON.stringify(perLeague));
  if (failed.length) console.log('failed:', failed.join(', '));
  if (left > 0) console.log('⏭️  تبقّت أندية — سيكمل التشغيل التالي (بعد تصفير الحصة اليومية 00:00 UTC) تلقائياً.');

  const id = `squad_log_${Date.now()}`;
  await db.collection('sync_logs').doc(id).set({ id, timestamp: new Date().toISOString(), source: 'api-football-squads', requestsUsed: used, saved: ok, failed, pending: Math.max(0, left), status: failed.length ? 'partial' : 'success' });
}
main().catch(e => { console.error('Squad sync failed:', e); process.exit(1); });
