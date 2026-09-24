/**
 * scripts/auditClubData.ts — فحص سلامة بيانات الأندية (بدون API وبدون Firebase)
 *
 *   npx tsx scripts/auditClubData.ts              # فحص ساكن (تكرار/معرّفات/شعارات فارغة/روابط مُختلَقة)
 *   CHECK_URLS=1 npx tsx scripts/auditClubData.ts # + يطلب كل رابط شعار فعلياً ويبلغ عن المعطوب (يحتاج إنترنت)
 *
 * يخرج بكود 1 إذا وُجد تكرار داخل نفس الدوري أو معرّف مكرر.
 */
import { REAL_LEAGUES, normalizeClubName } from '../src/data/realLeaguesData.ts';

const normAr = (s: string) => (s || '')
  .replace(/[\u064B-\u0652\u0640]/g, '').replace(/[إأآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي')
  .replace(/\(.*?\)/g, '').replace(/[^\u0621-\u064Aa-z0-9]/gi, '').replace(/^ال/, '').toLowerCase();

let errors = 0;
const idSeen = new Map<string, string>();
const badgeSeen = new Map<string, string>();
const leagueLogoFiles = new Map(REAL_LEAGUES.map(l => [l.logo.split('/').pop() || '', l.id]));
const urlsToCheck: { club: string; url: string }[] = [];

for (const l of REAL_LEAGUES) {
  console.log(`\n== ${l.id} (${l.clubs.length} clubs)`);
  const en = new Map<string, string>(), ar = new Map<string, string>();
  let noBadge = 0;
  for (const c of l.clubs) {
    if (idSeen.has(c.id)) { console.error(`  ❌ معرّف مكرر ${c.id}: ${idSeen.get(c.id)} و ${l.id}`); errors++; }
    idSeen.set(c.id, l.id);

    const ne = normalizeClubName(c.nameEn), na = normAr(c.name);
    if (en.has(ne)) { console.error(`  ❌ تكرار (إنجليزي): "${c.nameEn}" = "${en.get(ne)}"`); errors++; }
    if (ar.has(na)) { console.error(`  ❌ تكرار (عربي): "${c.name}" = "${ar.get(na)}"`); errors++; }
    en.set(ne, c.nameEn); ar.set(na, c.name);

    if (!c.badge) { noBadge++; continue; }
    const file = c.badge.split('/').pop() || '';
    if (leagueLogoFiles.has(file) && c.badge.includes('/team/')) console.warn(`  ⚠️ شعار ${c.nameEn} يستخدم معرّف ملف شعار الدوري ${leagueLogoFiles.get(file)} (رابط مُختلَق غالباً)`);
    if (badgeSeen.has(c.badge)) console.warn(`  ⚠️ نفس رابط الشعار لناديين: ${c.nameEn} و ${badgeSeen.get(c.badge)}`);
    badgeSeen.set(c.badge, c.nameEn);
    urlsToCheck.push({ club: c.nameEn, url: c.badge });
  }
  console.log(`  بلا شعار: ${noBadge}/${l.clubs.length}`);
}

async function checkUrls() {
  console.log(`\n== فحص ${urlsToCheck.length} رابط شعار ...`);
  let bad = 0;
  for (const { club, url } of urlsToCheck) {
    try {
      const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 12000);
      const r = await fetch(url, { signal: ctrl.signal }); clearTimeout(t);
      const ct = r.headers.get('content-type') || '';
      if (!r.ok || !ct.startsWith('image/')) { console.error(`  ❌ ${club}: HTTP ${r.status} ${ct} ${url}`); bad++; }
    } catch (e: any) { console.error(`  ❌ ${club}: ${e.message} ${url}`); bad++; }
  }
  console.log(`  روابط معطوبة: ${bad}/${urlsToCheck.length}`);
}

(async () => {
  if (process.env.CHECK_URLS === '1') await checkUrls();
  console.log(errors ? `\n❌ ${errors} خطأ(أخطاء) تكرار/معرّف` : '\n✅ لا تكرار ولا معرّفات مكررة');
  process.exit(errors ? 1 : 0);
})();