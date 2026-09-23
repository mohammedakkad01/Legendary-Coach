/**
 * scripts/probeApiFootball.ts
 * فحص سريع (~8 طلبات فقط من حصة اليوم = 100) لمعرفة ماذا يسمح به مفتاحك بالضبط:
 *  - أي مواسم متاحة (الحالي 2026 أم لا)؟
 *  - هل قوائم الأندية والتشكيلات (squads) مفتوحة؟ هل الدوري السعودي/المغربي مغطى؟
 * لا يكتب شيئاً في Firebase. المفتاح يُقرأ من API_FOOTBALL_KEY فقط.
 *
 * تشغيل محلي:  API_FOOTBALL_KEY=xxxx npx tsx scripts/probeApiFootball.ts
 */
const KEY = (process.env.API_FOOTBALL_KEY || '').trim();
if (!KEY) { console.error('Missing API_FOOTBALL_KEY'); process.exit(1); }

const BASE = 'https://v3.football.api-sports.io';
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function call(path: string) {
  await sleep(7000); // الحد المجاني: 10 طلبات/دقيقة
  const res = await fetch(`${BASE}${path}`, { headers: { 'x-apisports-key': KEY } });
  const body: any = await res.json().catch(() => ({}));
  const remaining = res.headers.get('x-ratelimit-requests-remaining');
  const errors = body.errors && (Array.isArray(body.errors) ? body.errors : Object.values(body.errors));
  console.log(`\n>>> GET ${path}`);
  console.log(`    HTTP ${res.status} | results=${body.results ?? '?'} | daily requests remaining=${remaining ?? '?'}`);
  if (errors && errors.length) console.log(`    ERRORS: ${JSON.stringify(body.errors)}`);
  return body;
}

async function main() {
  const status = await call('/status');
  const acc = status.response;
  if (acc && !Array.isArray(acc)) {
    console.log(`    plan=${acc.subscription?.plan} active=${acc.subscription?.active} used=${acc.requests?.current}/${acc.requests?.limit_day}`);
  }

  // تغطية المواسم لثلاثة دوريات: الإنجليزي (39) والسعودي الممتاز (307) والمغربي (200)
  for (const id of [39, 307, 200]) {
    const b = await call(`/leagues?id=${id}`);
    const l = b.response?.[0];
    if (!l) continue;
    console.log(`    ${l.league.name} (${l.country.name}) seasons: ${l.seasons.map((s: any) => s.year + (s.current ? '*' : '')).join(', ')}`);
    const cur = l.seasons.find((s: any) => s.current) || l.seasons[l.seasons.length - 1];
    console.log(`    current=${cur.year} coverage: players=${cur.coverage.players} standings=${cur.coverage.standings}`);
  }

  // هل نستطيع جلب أندية الموسم الحالي أم فقط القديم؟
  for (const season of [2026, 2025, 2024]) {
    const b = await call(`/teams?league=39&season=${season}`);
    console.log(`    teams(league=39, season=${season}) -> ${b.response?.length ?? 0} clubs`);
    if (b.response?.length) break;
  }

  // التشكيلة الحالية لمانشستر يونايتد (id=33) — لا تحتاج موسماً
  const sq = await call('/players/squads?team=33');
  const players = sq.response?.[0]?.players || [];
  console.log(`    squad(team=33) -> ${players.length} players; sample: ${players.slice(0, 3).map((p: any) => `${p.name}/${p.position}`).join(', ')}`);
  console.log('\nDONE — انسخ كل هذا المخرج وأرسله لي.');
}
main().catch(e => { console.error(e); process.exit(1); });
