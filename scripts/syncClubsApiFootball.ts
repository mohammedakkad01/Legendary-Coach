/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * scripts/syncClubsApiFootball.ts
 *
 * يجلب أندية 9 دوريات من API-Football (الخطة المجانية) ويخزنها في Firestore
 * (clubs_cache + leagues_cache) بنفس الشكل الذي تقرؤه اللعبة.
 *
 * الخطة المجانية ترفض الموسمين 2025/2026 وكذلك next/last، لذلك نستخدم موسم 2024 (SEASON) عبر
 * /standings (جدول الدوري = العضوية الدقيقة + الترتيب الذي نستخدمه لاحقاً لتقدير قوة النادي).
 * التكلفة: طلب واحد لكل دوري (9 طلبات). عند الترقية لخطة مدفوعة: SEASON=2026 فقط.
 *
 * تشغيل محلي بدون Firebase:  DRY_RUN=1 API_FOOTBALL_KEY=xxx npx tsx scripts/syncClubsApiFootball.ts
 */
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import firebaseConfig from '../firebase-applet-config.json' with { type: 'json' };

const KEY = (process.env.API_FOOTBALL_KEY || '').trim();
const DRY_RUN = process.env.DRY_RUN === '1';
const SEASON = process.env.SEASON || '2024';
const SERVICE_ACCOUNT_JSON = process.env.FIREBASE_SERVICE_ACCOUNT;
const BASE = 'https://v3.football.api-sports.io';
const DELAY_MS = 8000; // المجاني: 10 طلبات/دقيقة — نستخدم ~7 فقط كهامش أمان (بعد حادثة الإيقاف)

interface LeagueCfg {
  key: string; afId: number; name: string; nameEn: string; country: string;
  expected: number; nameMustMatch?: RegExp; countrySlug: string;
}
const LEAGUES: LeagueCfg[] = [
  { key: 'premier_league',   afId: 39,  name: 'الدوري الإنجليزي الممتاز',     nameEn: 'Premier League',      country: 'England', countrySlug: 'England',      expected: 20 },
  { key: 'la_liga',          afId: 140, name: 'الدوري الإسباني (La Liga)',     nameEn: 'La Liga',             country: 'Spain',   countrySlug: 'Spain',        expected: 20 },
  { key: 'serie_a',          afId: 135, name: 'الدوري الإيطالي (Serie A)',     nameEn: 'Serie A',             country: 'Italy',   countrySlug: 'Italy',        expected: 20 },
  { key: 'bundesliga',       afId: 78,  name: 'الدوري الألماني (Bundesliga)',  nameEn: 'Bundesliga',          country: 'Germany', countrySlug: 'Germany',      expected: 18 },
  { key: 'ligue_1',          afId: 61,  name: 'الدوري الفرنسي (Ligue 1)',      nameEn: 'Ligue 1',             country: 'France',  countrySlug: 'France',       expected: 18 },
  { key: 'championship',     afId: 40,  name: 'الدرجة الأولى الإنجليزية',     nameEn: 'EFL Championship',    country: 'England', countrySlug: 'England',      expected: 24 },
  { key: 'segunda_division', afId: 141, name: 'الدرجة الثانية الإسبانية',     nameEn: 'La Liga Hypermotion', country: 'Spain',   countrySlug: 'Spain',        expected: 22 },
  { key: 'yelo_league',      afId: 308, name: 'دوري يلو السعودي',             nameEn: 'Saudi Yelo League',   country: 'Saudi Arabia', countrySlug: 'Saudi-Arabia', expected: 18, nameMustMatch: /first|division|yelo|2/i },
  { key: 'botola_pro',       afId: 200, name: 'الدوري المغربي الاحترافي',     nameEn: 'Botola Pro Inwi',     country: 'Morocco', countrySlug: 'Morocco',      expected: 16 },
];

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
let remaining: number | null = null;
let used = 0;

async function call(path: string): Promise<{ body: any; planError: boolean }> {
  if (remaining !== null && remaining <= 8) throw new Error(`Daily quota almost exhausted (remaining=${remaining}) — stopping.`);
  await sleep(DELAY_MS);
  const res = await fetch(`${BASE}${path}`, { headers: { 'x-apisports-key': KEY } });
  used++;
  const r = res.headers.get('x-ratelimit-requests-remaining');
  if (r !== null) remaining = Number(r);
  if (res.status === 429) throw new Error('HTTP 429 (rate/daily limit reached)');
  const body: any = await res.json().catch(() => ({}));
  const errs = body.errors && (Array.isArray(body.errors) ? body.errors : Object.values(body.errors));
  const hasErr = !!(errs && errs.length);
  if (hasErr) console.log(`    ! ${path} -> ${JSON.stringify(body.errors)}`);
  return { body, planError: hasErr };
}

interface Club { id: number; name: string; logo: string; rank?: number }

async function clubsFromStandings(cfg: LeagueCfg): Promise<{ clubs: Club[]; leagueName: string }> {
  const { body, planError } = await call(`/standings?league=${cfg.afId}&season=${SEASON}`);
  if (planError) return { clubs: [], leagueName: '' };
  const league = body.response?.[0]?.league;
  const groups: any[][] = league?.standings || [];
  const map = new Map<number, Club>();
  for (const g of groups) for (const r of g) if (r?.team?.id && !map.has(r.team.id)) map.set(r.team.id, { id: r.team.id, name: r.team.name, logo: r.team.logo || '', rank: r.rank });
  return { clubs: [...map.values()], leagueName: league?.name || '' };
}

async function clubsFromTeams(cfg: LeagueCfg): Promise<Club[]> {
  const { body } = await call(`/teams?league=${cfg.afId}&season=${SEASON}`);
  return (body.response || []).map((r: any) => ({ id: r.team.id, name: r.team.name, logo: r.team.logo || '' }));
}

async function main() {
  if (!KEY) throw new Error('Missing API_FOOTBALL_KEY');
  let db: Firestore | null = null;
  const dbId: string = (firebaseConfig as any).firestoreDatabaseId || '(default)';
  if (!DRY_RUN) {
    if (!SERVICE_ACCOUNT_JSON) throw new Error('Missing FIREBASE_SERVICE_ACCOUNT');
    const sa = JSON.parse(SERVICE_ACCOUNT_JSON);
    db = getFirestore(initializeApp({ credential: cert(sa) }), dbId);
    console.log(`Firestore -> service-account project: ${sa.project_id} | app project: ${(firebaseConfig as any).projectId} | database: ${dbId}`);
    if (sa.project_id !== (firebaseConfig as any).projectId) console.warn('⚠️ مشروع حساب الخدمة يختلف عن projectId في firebase-applet-config.json');
  } else console.log('DRY RUN — لا كتابة في Firebase');

  type Row = { key: string; status: string; found: number; expected: number; via: string };
  const rows: Row[] = [];

  for (const cfg of LEAGUES) {
    console.log(`\n=== ${cfg.nameEn} (${cfg.key}, api id ${cfg.afId}) expected ${cfg.expected} ===`);
    try {
      let { clubs, leagueName } = await clubsFromStandings(cfg);
      let via = `standings season=${SEASON}`;
      console.log(`  API league name: "${leagueName}"`);

      if (cfg.nameMustMatch && leagueName && !cfg.nameMustMatch.test(leagueName)) {
        console.error(`  !! الاسم لا يطابق المتوقع — id ${cfg.afId} على الأرجح خاطئ. دوريات ${cfg.countrySlug}:`);
        const { body } = await call(`/leagues?country=${cfg.countrySlug}&current=true`);
        for (const l of body.response || []) console.error(`     id=${l.league.id}  ${l.league.name}`);
        rows.push({ key: cfg.key, status: 'WRONG_ID', found: 0, expected: cfg.expected, via: '-' });
        continue;
      }

      if (clubs.length === 0) {
        clubs = await clubsFromTeams(cfg);
        via = `teams season=${SEASON}`;
      }

      console.log(`  via ${via}: ${clubs.length} clubs`);
      console.log(`  ${clubs.map(c => c.name).sort().join(' | ')}`);
      const status = clubs.length === 0 ? 'EMPTY' : clubs.length === cfg.expected ? 'OK' : 'CHECK';
      if (status === 'CHECK') console.warn(`  ⚠️ العدد ${clubs.length} يختلف عن المتوقع ${cfg.expected} (قد يكون طبيعياً في موسم ${SEASON}) — راجع الأسماء.`);
      rows.push({ key: cfg.key, status, found: clubs.length, expected: cfg.expected, via });
      if (!db || clubs.length === 0) continue;

      const now = new Date().toISOString();
      const batch = db.batch();
      batch.set(db.collection('leagues_cache').doc(`league_${cfg.key}`), {
        id: `league_${cfg.key}`, leagueKey: cfg.key, source: 'api-football', apiFootballLeagueId: cfg.afId,
        matchedVia: leagueName, name: cfg.name, nameEn: cfg.nameEn, country: cfg.country,
        totalClubs: clubs.length, expectedClubs: cfg.expected, season: SEASON, complete: status === 'OK', updatedAt: now,
      });
      const keep = new Set<string>();
      for (const c of clubs) {
        const docId = `club_af_${c.id}`;
        keep.add(docId);
        batch.set(db.collection('clubs_cache').doc(docId), {
          id: docId, idTeam: String(c.id), leagueKey: cfg.key, source: 'api-football',
          name: c.name, nameEn: c.name, country: cfg.country, founded: '', logo: c.logo, venue: '',
          descriptionEn: '', season: SEASON, standingRank: c.rank ?? null, standingsTotal: clubs.length, updatedAt: now,
        });
      }
      {
        const old = await db.collection('clubs_cache').where('leagueKey', '==', cfg.key).get();
        let removed = 0;
        old.forEach(d => { if (!keep.has(d.id)) { batch.delete(d.ref); removed++; } });
        if (removed) console.log(`  removed ${removed} old club docs (قديمة/من مصدر آخر)`);
      }
      await batch.commit();
    } catch (e: any) {
      console.error(`  !! ${cfg.key}: ${e.message}`);
      rows.push({ key: cfg.key, status: 'ERROR', found: 0, expected: cfg.expected, via: e.message });
      if (/quota|429/i.test(e.message)) break;
    }
  }

  console.log('\n=========== SUMMARY ===========');
  for (const r of rows) console.log(`${r.status.padEnd(10)} ${r.key.padEnd(18)} ${r.found}/${r.expected}  ${r.via}`);
  console.log(`requests used this run: ${used} | remaining today: ${remaining ?? '?'}`);

  if (db) {
    const id = `log_${Date.now()}`;
    await db.collection('sync_logs').doc(id).set({ id, timestamp: new Date().toISOString(), source: 'api-football', requestsUsed: used, results: rows,
      status: rows.every(r => r.status === 'OK' || r.status === 'CHECK') ? 'success' : 'partial' });
  }
  if (rows.some(r => !['OK', 'CHECK'].includes(r.status))) process.exit(1);
}
main().catch(e => { console.error('Sync failed:', e); process.exit(1); });