/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * scripts/syncClubsApiFootball.ts
 *
 * يجلب أندية الموسم الحالي لـ 9 دوريات من API-Football (الخطة المجانية) ويخزنها في Firestore
 * (clubs_cache + leagues_cache) بنفس الشكل الذي تقرؤه اللعبة.
 *
 * لماذا fixtures وليس /teams؟
 *  الخطة المجانية ترفض /teams للمواسم 2025 و2026 (أثبت فحصك ذلك)، لكنها تسمح بـ fixtures?next/last
 *  بدون تحديد موسم. مباريات الجولتين القادمتين (next=20) تحتوي كل أندية الدوري الحالية مع الشعارات.
 *  التكلفة: 1-2 طلب لكل دوري (~20 طلباً كحد أقصى من 100 يومياً).
 *
 * تشغيل محلي بدون Firebase:  DRY_RUN=1 API_FOOTBALL_KEY=xxx npx tsx scripts/syncClubsApiFootball.ts
 * تشغيل حقيقي: FIREBASE_SERVICE_ACCOUNT="$(cat sa.json)" API_FOOTBALL_KEY=xxx npx tsx scripts/syncClubsApiFootball.ts
 */
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import firebaseConfig from '../firebase-applet-config.json' with { type: 'json' };

const KEY = (process.env.API_FOOTBALL_KEY || '').trim();
const DRY_RUN = process.env.DRY_RUN === '1';
const ALLOW_STALE = process.env.ALLOW_STALE === '1'; // يسمح بكتابة قوائم موسم 2024 إن فشلت الطريقة الحالية
const SERVICE_ACCOUNT_JSON = process.env.FIREBASE_SERVICE_ACCOUNT;
const BASE = 'https://v3.football.api-sports.io';
const DELAY_MS = 6500; // المجاني: 10 طلبات/دقيقة

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

interface Club { id: number; name: string; logo: string }

async function clubsCurrentSeason(cfg: LeagueCfg): Promise<{ clubs: Club[]; leagueName: string; via: string }> {
  const map = new Map<number, Club>();
  let leagueName = '';
  let via = '';
  let maxSeason = 0;
  const rows: { season: number; teams: Club[] }[] = [];
  for (const mode of ['next=20', 'last=20']) {
    const { body, planError } = await call(`/fixtures?league=${cfg.afId}&${mode}`);
    if (planError) continue;
    for (const f of body.response || []) {
      leagueName ||= f.league?.name || '';
      const season = Number(f.league?.season || 0);
      maxSeason = Math.max(maxSeason, season);
      rows.push({ season, teams: [f.teams?.home, f.teams?.away].filter(Boolean) });
    }
    map.clear();
    for (const r of rows) if (r.season === maxSeason) for (const t of r.teams) if (t?.id) map.set(t.id, { id: t.id, name: t.name, logo: t.logo || '' });
    via = `fixtures(${mode.split('=')[0]}${rows.length ? '+' : ''}) season=${maxSeason}`;
    if (map.size >= cfg.expected) break;
  }
  return { clubs: [...map.values()], leagueName, via };
}

async function clubsStale2024(cfg: LeagueCfg): Promise<Club[]> {
  const { body } = await call(`/teams?league=${cfg.afId}&season=2024`);
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
      let { clubs, leagueName, via } = await clubsCurrentSeason(cfg);
      console.log(`  API league name: "${leagueName}"`);

      if (cfg.nameMustMatch && leagueName && !cfg.nameMustMatch.test(leagueName)) {
        console.error(`  !! الاسم لا يطابق المتوقع — id ${cfg.afId} على الأرجح خاطئ. دوريات ${cfg.countrySlug}:`);
        const { body } = await call(`/leagues?country=${cfg.countrySlug}&current=true`);
        for (const l of body.response || []) console.error(`     id=${l.league.id}  ${l.league.name}`);
        rows.push({ key: cfg.key, status: 'WRONG_ID', found: 0, expected: cfg.expected, via: '-' });
        continue;
      }

      if (clubs.length === 0) {
        console.warn('  fixtures لم تُرجع شيئاً (خطة/موسم) — تجربة /teams موسم 2024 (قديم)');
        clubs = await clubsStale2024(cfg);
        via = 'teams season=2024 (STALE)';
        if (clubs.length && !ALLOW_STALE) {
          console.warn(`  ${clubs.length} نادياً من موسم 2024 لن تُكتب (شغّل بـ ALLOW_STALE=1 إن أردتها).`);
          rows.push({ key: cfg.key, status: 'STALE_ONLY', found: clubs.length, expected: cfg.expected, via });
          console.log(`  ${clubs.map(c => c.name).sort().join(' | ')}`);
          continue;
        }
      }

      console.log(`  via ${via}: ${clubs.length} clubs`);
      console.log(`  ${clubs.map(c => c.name).sort().join(' | ')}`);
      const status = clubs.length === cfg.expected ? 'OK' : clubs.length > cfg.expected ? 'OVER' : 'PARTIAL';
      if (status !== 'OK') console.warn(`  ⚠️ ${status}: ${clubs.length}/${cfg.expected}`);
      rows.push({ key: cfg.key, status, found: clubs.length, expected: cfg.expected, via });
      if (!db || clubs.length === 0) continue;

      const now = new Date().toISOString();
      const batch = db.batch();
      batch.set(db.collection('leagues_cache').doc(`league_${cfg.key}`), {
        id: `league_${cfg.key}`, leagueKey: cfg.key, source: 'api-football', apiFootballLeagueId: cfg.afId,
        matchedVia: leagueName, name: cfg.name, nameEn: cfg.nameEn, country: cfg.country,
        totalClubs: clubs.length, expectedClubs: cfg.expected, complete: status !== 'PARTIAL', updatedAt: now,
      });
      const keep = new Set<string>();
      for (const c of clubs) {
        const docId = `club_af_${c.id}`;
        keep.add(docId);
        batch.set(db.collection('clubs_cache').doc(docId), {
          id: docId, idTeam: String(c.id), leagueKey: cfg.key, source: 'api-football',
          name: c.name, nameEn: c.name, country: cfg.country, founded: '', logo: c.logo, venue: '',
          descriptionEn: '', updatedAt: now,
        });
      }
      if (status !== 'PARTIAL') {
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
      status: rows.every(r => r.status === 'OK' || r.status === 'OVER') ? 'success' : 'partial' });
  }
  if (rows.some(r => !['OK', 'OVER'].includes(r.status))) process.exit(1);
}
main().catch(e => { console.error('Sync failed:', e); process.exit(1); });
