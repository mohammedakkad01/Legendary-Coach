/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Official Real Leagues & Clubs Database
 * Authentic real football clubs across top world leagues.
 * Top-tier / Champion clubs require Gems (100 💎).
 * Challenger / Mid-tier clubs are Free (0 💎).
 */

import { Club, LeagueStanding, Fixture, Player, PlayerPosition, PlayerRarity } from '../types/game';
import { REAL_INITIAL_PLAYER_CLUB } from './realFootballData';
import { SeededRandom } from '../engine/prng';

// Shape written by scripts/syncFootballData.ts into Firestore's clubs_cache/{club_<idTeam>}
// (source: TheSportsDB — no numeric-ID mapping needed, it already uses our own league keys)
export interface CachedClubDoc {
  id: string;
  idTeam: string;
  leagueKey: string; // one of our internal league ids, e.g. 'premier_league'
  name: string;
  nameEn: string;
  country?: string;
  logo?: string;
  venue?: string;
  updatedAt?: string;
}

// ---- مطابقة أسماء الأندية بين القائمة المنسّقة يدوياً وبيانات API ----
// (Newcastle = Newcastle United، Inter = Inter Milan، Bayern München = Bayern Munich ...)
const CLUB_NAME_STOPWORDS = new Set(['fc', 'sc', 'cf', 'afc', 'cd', 'club', 'de', 'bc', 'ssc', 'fk']);
const CLUB_NAME_ALIASES: Record<string, string> = {
  bayernmunchen: 'bayernmunich',
  rajacasablanca: 'rajaathletic',   // Raja Casablanca (API) = Raja Club Athletic (curated)
  albaten: 'albatin',               // Al Baten (API) = Al-Batin FC (curated)
  internazionale: 'intermilan',
  milan: 'acmilan',
  alhazm: 'alhazem',
};
export function normalizeClubName(raw: string): string {
  const base = (raw || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[0-9]/g, ' ')
    .split(/[^a-z]+/)
    .filter(w => w && !CLUB_NAME_STOPWORDS.has(w))
    .join('');
  return CLUB_NAME_ALIASES[base] || base;
}
function sameClub(a: string, b: string): boolean {
  const x = normalizeClubName(a);
  const y = normalizeClubName(b);
  if (!x || !y) return false;
  if (x === y) return true;
  const [short, long] = x.length <= y.length ? [x, y] : [y, x];
  return short.length >= 4 && long.includes(short);
}

/**
 * يدمج الأندية المزامَنة (Firestore clubs_cache) مع القائمة المنسّقة يدوياً REAL_LEAGUES.
 *  - قائمة API هي المرجع لعضوية الدوري في الموسم الحالي (إن كانت كاملة ≥ 16 نادياً).
 *  - النادي المطابق لنادٍ منسّق يحتفظ بمعرّفه وبياناته (الألوان، النجوم، الوصف، الجواهر)
 *    ويأخذ الشعار من API.
 *  - النادي المنسّق الذي لا يوجد في قائمة API يُحذف (انتقل لدوري آخر/هبط) — إلا إذا كانت
 *    قائمة API ناقصة (< 16) فنُبقيه حتى لا نفقد أندية.
 *  - الدوريات بلا بيانات مزامَنة (السعودي الممتاز والمصري) تبقى كما هي.
 */
export function mergeLiveClubsIntoLeagues(
  leagues: RealLeague[],
  cachedClubs: Record<string, CachedClubDoc>
): RealLeague[] {
  const clubsByLeagueKey = new Map<string, CachedClubDoc[]>();
  Object.values(cachedClubs || {}).forEach(c => {
    if (!c || !c.leagueKey) return;
    const arr = clubsByLeagueKey.get(c.leagueKey) || [];
    arr.push(c);
    clubsByLeagueKey.set(c.leagueKey, arr);
  });

  return leagues.map(league => {
    const liveClubs = clubsByLeagueKey.get(league.id);
    if (!liveClubs || liveClubs.length === 0) {
      return { ...league, isLiveSynced: false };
    }

    const usedCurated = new Set<string>();
    const merged: RealClubConfig[] = liveClubs.map(lc => {
      const liveName = lc.nameEn || lc.name || '';
      const cur = league.clubs.find(c => !usedCurated.has(c.id) && sameClub(c.nameEn, liveName));
      if (cur) {
        usedCurated.add(cur.id);
        return { ...cur, badge: lc.logo || cur.badge, stadiumName: cur.stadiumName || lc.venue || '', apiTeamId: String(lc.idTeam) };
      }
      return {
        id: `club_api_${lc.idTeam}`,
        name: liveName,
        nameEn: liveName,
        country: league.country,
        leagueId: league.id,
        leagueName: league.name,
        leagueNameEn: league.nameEn,
        badge: lc.logo || '',
        stadiumName: lc.venue || '',
        city: '',
        isTopTier: false,
        gemCost: 0,
        starRating: 3.5,
        colors: { primary: '#334155', secondary: '#ffffff', accent: '#64748b' },
        keyStars: [],
        descriptionAr: 'نادٍ رسمي مزامَن مباشرة من بيانات الدوري الحقيقية.',
        descriptionEn: 'Officially licensed club synced live from real league data.',
        apiTeamId: String(lc.idTeam)
      };
    });

    const liveIsComplete = liveClubs.length >= 16;
    const leftovers = liveIsComplete ? [] : league.clubs.filter(c => !usedCurated.has(c.id));
    const all = [...merged, ...leftovers].sort(
      (a, b) => Number(b.isTopTier) - Number(a.isTopTier) || b.starRating - a.starRating || a.nameEn.localeCompare(b.nameEn)
    );
    return { ...league, clubs: all, isLiveSynced: true };
  });
}

export interface RealClubConfig {
  id: string;
  name: string;
  nameEn: string;
  country: string;
  leagueId: string;
  leagueName: string;
  leagueNameEn: string;
  badge: string;
  stadiumName: string;
  city: string;
  isTopTier: boolean; // Top tier / 1st place champion club
  gemCost: number;    // 100 💎 for Top Tier, 0 💎 for Challenger
  starRating: number; // 3.5 to 5.0
  colors: { primary: string; secondary: string; accent: string };
  keyStars: string[];
  descriptionAr: string;
  descriptionEn: string;
  apiTeamId?: string; // معرّف النادي في API-Football (يُضاف عند الدمج مع clubs_cache) — يستخدمه سكربت التشكيلات
}

export interface RealLeague {
  id: string;
  name: string;
  nameEn: string;
  flag: string;
  country: string;
  logo: string;
  descriptionAr: string;
  descriptionEn: string;
  clubs: RealClubConfig[];
  isLiveSynced?: boolean; // true إذا وصلت بيانات فعلية من clubs_cache لهذا الدوري، false/undefined = لا تزال بالقائمة الاحتياطية الجزئية فقط
}

export const REAL_LEAGUES: RealLeague[] = [
  {
    id: 'premier_league',
    name: 'الدوري الإنجليزي الممتاز',
    nameEn: 'Premier League',
    flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    country: 'إنجلترا',
    logo: 'https://r2.thesportsdb.com/images/media/league/badge/p5vwe51688647545.png',
    descriptionAr: 'الدوري الأقوى والأكثر إثارة وتنافسية في العالم.',
    descriptionEn: 'The most competitive and watched football league in the world.',
    clubs: [
      {
        id: 'club_man_city',
        name: 'مانشستر سيتي',
        nameEn: 'Manchester City',
        country: 'إنجلترا 🏴󠁧󠁢󠁥󠁮󠁧󠁿',
        leagueId: 'premier_league',
        leagueName: 'الدوري الإنجليزي الممتاز',
        leagueNameEn: 'Premier League',
        badge: 'https://r2.thesportsdb.com/images/media/team/badge/vwpvry1467462651.png',
        stadiumName: 'Etihad Stadium',
        city: 'مانشستر',
        isTopTier: true,
        gemCost: 100,
        starRating: 5.0,
        colors: { primary: '#38bdf8', secondary: '#0f172a', accent: '#ffffff' },
        keyStars: ['إيرلينغ هالاند', 'كيفين دي بروين', 'رودري'],
        descriptionAr: 'بطل إنجلترا وأوروبا، فريق متكامل يمتلك أقوى ترسانة هجومية في العالم.',
        descriptionEn: 'Reigning champions with world-class depth and tactical supremacy.'
      },
      {
        id: 'club_arsenal',
        name: 'أرسنال',
        nameEn: 'Arsenal FC',
        country: 'إنجلترا 🏴󠁧󠁢󠁥󠁮󠁧󠁿',
        leagueId: 'premier_league',
        leagueName: 'الدوري الإنجليزي الممتاز',
        leagueNameEn: 'Premier League',
        badge: 'https://r2.thesportsdb.com/images/media/team/badge/uyhbfe1612467038.png',
        stadiumName: 'Emirates Stadium',
        city: 'لندن',
        isTopTier: true,
        gemCost: 100,
        starRating: 4.5,
        colors: { primary: '#dc2626', secondary: '#ffffff', accent: '#fbbf24' },
        keyStars: ['بوكايو ساكا', 'مارتن أوديغارد', 'ديكلان رايس'],
        descriptionAr: 'المدفعجية؛ كرة هجومية شابة وصلابة دفاعية استثنائية تنافس على القمة.',
        descriptionEn: 'The Gunners; fluid attacking football with a rock-solid defense.'
      },
      {
        id: 'club_liverpool',
        name: 'ليفربول',
        nameEn: 'Liverpool FC',
        country: 'إنجلترا 🏴󠁧󠁢󠁥󠁮󠁧󠁿',
        leagueId: 'premier_league',
        leagueName: 'الدوري الإنجليزي الممتاز',
        leagueNameEn: 'Premier League',
        badge: 'https://r2.thesportsdb.com/images/media/team/badge/c8430b1716386341.png',
        stadiumName: 'Anfield',
        city: 'ليفربول',
        isTopTier: true,
        gemCost: 100,
        starRating: 4.5,
        colors: { primary: '#991b1b', secondary: '#047857', accent: '#ffffff' },
        keyStars: ['محمد صلاح', 'فيرجيل فان دايك', 'أليسون بيكر'],
        descriptionAr: 'كتيبة الريدز التاريخية؛ ضغط عالي متواصل في قلعة الأنفيلد المرعبة.',
        descriptionEn: 'The Reds; relentless high-intensity football fueled by Anfield passion.'
      },
      {
        id: 'club_aston_villa',
        name: 'أستون فيلا',
        nameEn: 'Aston Villa',
        country: 'إنجلترا 🏴󠁧󠁢󠁥󠁮󠁧󠁿',
        leagueId: 'premier_league',
        leagueName: 'الدوري الإنجليزي الممتاز',
        leagueNameEn: 'Premier League',
        badge: 'https://r2.thesportsdb.com/images/media/team/badge/03t1121694432857.png',
        stadiumName: 'Villa Park',
        city: 'برمنغهام',
        isTopTier: false,
        gemCost: 0,
        starRating: 4.0,
        colors: { primary: '#831843', secondary: '#38bdf8', accent: '#f59e0b' },
        keyStars: ['أولي واتكينز', 'إيميليانو مارتينيز', 'جون مكجين'],
        descriptionAr: 'الحصان الأسود للدوري الإنجليزي؛ مشروع طموح يبحث عن العودة لمنصات التتويج.',
        descriptionEn: 'Ambitious challenger with Champions League aspirations. (Free to start!)'
      },
      {
        id: 'club_newcastle',
        name: 'نيوكاسل يونايتد',
        nameEn: 'Newcastle United',
        country: 'إنجلترا 🏴󠁧󠁢󠁥󠁮󠁧󠁿',
        leagueId: 'premier_league',
        leagueName: 'الدوري الإنجليزي الممتاز',
        leagueNameEn: 'Premier League',
        badge: 'https://r2.thesportsdb.com/images/media/team/badge/lh97g61694432906.png',
        stadiumName: 'St James\' Park',
        city: 'نيوكاسل',
        isTopTier: false,
        gemCost: 0,
        starRating: 4.0,
        colors: { primary: '#0f172a', secondary: '#ffffff', accent: '#3b82f6' },
        keyStars: ['ألكسندر إيزاك', 'برونو غيمارايش', 'أنطوني جوردون'],
        descriptionAr: 'قوة صاعدة في شمال إنجلترا تمتلك جماهيرية كاسحة ورغبة في حصد الألقاب.',
        descriptionEn: 'Rising Northern force with explosive speed and vocal fanbase.'
      }
    ]
  },
  {
    id: 'la_liga',
    name: 'الدوري الإسباني (لا ليغا)',
    nameEn: 'La Liga EA Sports',
    flag: '🇪🇸',
    country: 'إسبانيا',
    logo: 'https://r2.thesportsdb.com/images/media/league/badge/71591p1688647568.png',
    descriptionAr: 'دوري السحر والمهارة الفردية وعمالقة الكرة الأوروبية.',
    descriptionEn: 'Home of technical brilliance, El Clásico, and European royalty.',
    clubs: [
      {
        id: 'club_real_madrid',
        name: 'ريال مدريد',
        nameEn: 'Real Madrid',
        country: 'إسبانيا 🇪🇸',
        leagueId: 'la_liga',
        leagueName: 'الدوري الإسباني (لا ليغا)',
        leagueNameEn: 'La Liga EA Sports',
        badge: 'https://r2.thesportsdb.com/images/media/team/badge/vwvwrw1473502969.png',
        stadiumName: 'Santiago Bernabéu',
        city: 'مدريد',
        isTopTier: true,
        gemCost: 100,
        starRating: 5.0,
        colors: { primary: '#1e3a8a', secondary: '#ffffff', accent: '#fbbf24' },
        keyStars: ['كيليان مبابي', 'فينيسيوس جونيور', 'جود بيلينغهام'],
        descriptionAr: 'ملك أوروبا وسيد الألقاب؛ تشكيلة أسطورية تجمع ألمع نجوم العالم.',
        descriptionEn: 'Kings of Europe; reigning champions with unmatched superstar power.'
      },
      {
        id: 'club_barcelona',
        name: 'برشلونة',
        nameEn: 'FC Barcelona',
        country: 'إسبانيا 🇪🇸',
        leagueId: 'la_liga',
        leagueName: 'الدوري الإسباني (لا ليغا)',
        leagueNameEn: 'La Liga EA Sports',
        badge: 'https://r2.thesportsdb.com/images/media/team/badge/xqwpux1473502870.png',
        stadiumName: 'Spotify Camp Nou',
        city: 'برشلونة',
        isTopTier: true,
        gemCost: 100,
        starRating: 4.5,
        colors: { primary: '#831843', secondary: '#1e3a8a', accent: '#f59e0b' },
        keyStars: ['لامين يامال', 'روبرت ليفاندوفسكي', 'رافينيا'],
        descriptionAr: 'مدرسة التيكي تاكا ومصنع المواهب الشابة؛ ثورة كروية واعدة يقودها يامال.',
        descriptionEn: 'The Blaugrana; beautiful attacking football driven by young phenoms.'
      },
      {
        id: 'club_atletico',
        name: 'أتلتيكو مدريد',
        nameEn: 'Atlético de Madrid',
        country: 'إسبانيا 🇪🇸',
        leagueId: 'la_liga',
        leagueName: 'الدوري الإسباني (لا ليغا)',
        leagueNameEn: 'La Liga EA Sports',
        badge: 'https://r2.thesportsdb.com/images/media/team/badge/yswtpr1420586938.png',
        stadiumName: 'Cívitas Metropolitano',
        city: 'مدريد',
        isTopTier: true,
        gemCost: 100,
        starRating: 4.5,
        colors: { primary: '#dc2626', secondary: '#1e3a8a', accent: '#ffffff' },
        keyStars: ['أنطوان غريزمان', 'جوليان ألفاريز', 'يان أوبلاك'],
        descriptionAr: 'الروخي بلانكوس؛ روح قتالية شراسة دفاعية وهجمات مرتدة حاسمة.',
        descriptionEn: 'Fierce warriors with tactical discipline and world-class strikers.'
      },
      {
        id: 'club_real_sociedad',
        name: 'ريال سوسيداد',
        nameEn: 'Real Sociedad',
        country: 'إسبانيا 🇪🇸',
        leagueId: 'la_liga',
        leagueName: 'الدوري الإسباني (لا ليغا)',
        leagueNameEn: 'La Liga EA Sports',
        badge: 'https://r2.thesportsdb.com/images/media/team/badge/vxxsww1420587288.png',
        stadiumName: 'Reale Arena',
        city: 'سان سيباستيان',
        isTopTier: false,
        gemCost: 0,
        starRating: 4.0,
        colors: { primary: '#2563eb', secondary: '#ffffff', accent: '#3b82f6' },
        keyStars: ['تاكيفوسا كوبو', 'ميكيل أويارزابال', 'برايس مينديز'],
        descriptionAr: 'فريق إقليم الباسك الأنيق؛ منظومة جماعية تعتمد على الاستحواذ والانضباط.',
        descriptionEn: 'Basque powerhouse boasting technical finesse. (Free to start!)'
      },
      {
        id: 'club_girona',
        name: 'جيرونا',
        nameEn: 'Girona FC',
        country: 'إسبانيا 🇪🇸',
        leagueId: 'la_liga',
        leagueName: 'الدوري الإسباني (لا ليغا)',
        leagueNameEn: 'La Liga EA Sports',
        badge: 'https://r2.thesportsdb.com/images/media/team/badge/6t28w41660439115.png',
        stadiumName: 'Montilivi',
        city: 'جيرونا',
        isTopTier: false,
        gemCost: 0,
        starRating: 3.5,
        colors: { primary: '#dc2626', secondary: '#ffffff', accent: '#f59e0b' },
        keyStars: ['كريستيان ستواني', 'يانجيل هيريرا', 'فيكتور تسيغانكوف'],
        descriptionAr: 'مفاجأة الليغا؛ كرة قدم هجومية شجاعة صنعت التاريخ في كاتالونيا.',
        descriptionEn: 'Fearless attacking underdogs who took Europe by storm.'
      }
    ]
  },
  {
    id: 'saudi_pro_league',
    name: 'دوري روشن السعودي للمحترفين',
    nameEn: 'Roshn Saudi League',
    flag: '🇸🇦',
    country: 'المملكة العربية السعودية',
    logo: 'https://r2.thesportsdb.com/images/media/league/badge/5trzvq1660439102.png',
    descriptionAr: 'الدوري الأسرع نمواً عالمياً والوجهة المفضلة لألمع نجوم الساحرة المستديرة.',
    descriptionEn: 'The fastest growing league globally, attracting world-class superstars.',
    clubs: [
      {
        id: 'club_al_hilal',
        name: 'الهلال السعودي',
        nameEn: 'Al-Hilal FC',
        country: 'السعودية 🇸🇦',
        leagueId: 'saudi_pro_league',
        leagueName: 'دوري روشن السعودي للمحترفين',
        leagueNameEn: 'Roshn Saudi League',
        badge: '', // ⚠️ رابط مُختلَق (نفس معرّف شعار الدوري) — أُزيل حتى نجلب الشعار الحقيقي
        stadiumName: 'Kingdom Arena',
        city: 'الرياض',
        isTopTier: true,
        gemCost: 100,
        starRating: 5.0,
        colors: { primary: '#1d4ed8', secondary: '#ffffff', accent: '#60a5fa' },
        keyStars: ['سالم الدوسري', 'ألكسندر ميتروفيتش', 'روبن نيفيز'],
        descriptionAr: 'الزعيم الآسيوي؛ بطل الأرقام القياسية وسلسلة الانتصارات التاريخية.',
        descriptionEn: 'The Asian Giants; record-breakers with unparalleled winning pedigree.'
      },
      {
        id: 'club_al_nassr',
        name: 'النصر السعودي',
        nameEn: 'Al-Nassr FC',
        country: 'السعودية 🇸🇦',
        leagueId: 'saudi_pro_league',
        leagueName: 'دوري روشن السعودي للمحترفين',
        leagueNameEn: 'Roshn Saudi League',
        badge: 'https://r2.thesportsdb.com/images/media/team/badge/84yvqi1748524565.png',
        stadiumName: 'Al-Awwal Park',
        city: 'الرياض',
        isTopTier: true,
        gemCost: 100,
        starRating: 4.5,
        colors: { primary: '#eab308', secondary: '#1e3a8a', accent: '#ffffff' },
        keyStars: ['كريستيانو رونالدو', 'ساديو ماني', 'مارسيلو بروزوفيتش'],
        descriptionAr: 'العالمي؛ يقوده الأسطورة رونالدو في مهمة حصد الألقاب والبطولات الكبرى.',
        descriptionEn: 'The Global Club; spearheaded by Cristiano Ronaldo and elite stars.'
      },
      {
        id: 'club_al_ittihad',
        name: 'الاتحاد السعودي',
        nameEn: 'Al-Ittihad Club',
        country: 'السعودية 🇸🇦',
        leagueId: 'saudi_pro_league',
        leagueName: 'دوري روشن السعودي للمحترفين',
        leagueNameEn: 'Roshn Saudi League',
        badge: 'https://r2.thesportsdb.com/images/media/team/badge/9d3z6c1660439109.png',
        stadiumName: 'King Abdullah Sports City',
        city: 'جدة',
        isTopTier: true,
        gemCost: 100,
        starRating: 4.5,
        colors: { primary: '#eab308', secondary: '#0f172a', accent: '#ffffff' },
        keyStars: ['كريم بنزيما', 'نغولو كانتي', 'فابينيو'],
        descriptionAr: 'العميد؛ أقدم أندية المملكة وقوة جماهيرية جارفة تقاتل من أجل الذهب.',
        descriptionEn: 'The Dean; historic titan powered by Karim Benzema and French steel.'
      },
      {
        id: 'club_al_shabab',
        name: 'الشباب السعودي',
        nameEn: 'Al-Shabab FC',
        country: 'السعودية 🇸🇦',
        leagueId: 'saudi_pro_league',
        leagueName: 'دوري روشن السعودي للمحترفين',
        leagueNameEn: 'Roshn Saudi League',
        badge: 'https://r2.thesportsdb.com/images/media/team/badge/7a56111660439121.png',
        stadiumName: 'Al-Shabab Club Stadium',
        city: 'الرياض',
        isTopTier: false,
        gemCost: 0,
        starRating: 3.5,
        colors: { primary: '#0f172a', secondary: '#ffffff', accent: '#ea580c' },
        keyStars: ['يانيك كاراسكو', 'جاك بونافينتورا', 'عبدالرزاق حمدالله'],
        descriptionAr: 'الليث الأبيض؛ نادٍ عريق يتميز بالكرة الممتعة والمواهب الصاعدة.',
        descriptionEn: 'The White Lions; storied club with dynamic flair. (Free to start!)'
      },
      {
        id: 'club_al_taawoun',
        name: 'التعاون السعودي',
        nameEn: 'Al-Taawoun FC',
        country: 'السعودية 🇸🇦',
        leagueId: 'saudi_pro_league',
        leagueName: 'دوري روشن السعودي للمحترفين',
        leagueNameEn: 'Roshn Saudi League',
        badge: 'https://r2.thesportsdb.com/images/media/team/badge/5q4m4h1660439128.png',
        stadiumName: 'King Abdullah Sport City Stadium (Buraidah)',
        city: 'بريدة',
        isTopTier: false,
        gemCost: 0,
        starRating: 3.5,
        colors: { primary: '#eab308', secondary: '#1e3a8a', accent: '#ffffff' },
        keyStars: ['موسى بارو', 'جواو بيدرو', 'أشرف المهديوي'],
        descriptionAr: 'سكري القصيم؛ فريق متماسك تكتيكياً يحقق دائماً نتائج مبهرة أمام الكبار.',
        descriptionEn: 'Disciplined underdogs who constantly punch above their weight.'
      },
      {
        id: 'club_al_ahli_saudi',
        name: 'الأهلي السعودي',
        nameEn: 'Al-Ahli Saudi FC',
        country: 'السعودية 🇸🇦',
        leagueId: 'saudi_pro_league',
        leagueName: 'دوري روشن السعودي للمحترفين',
        leagueNameEn: 'Roshn Saudi League',
        badge: '',
        stadiumName: 'King Abdullah Sports City',
        city: 'جدة',
        isTopTier: true,
        gemCost: 100,
        starRating: 4.5,
        colors: { primary: '#0f766e', secondary: '#eab308', accent: '#ffffff' },
        keyStars: ['فرانك كيسييه', 'رياض محرز', 'إيفرتون ريبيرو'],
        descriptionAr: 'الراقي؛ عائد بقوة لمنافسة الكبار بصفقات ضخمة وطموح لا حدود له.',
        descriptionEn: 'The Royal Club; back among the elite with world-class new signings.'
      },
      {
        id: 'club_al_qadsiah',
        name: 'القادسية السعودي',
        nameEn: 'Al-Qadsiah FC',
        country: 'السعودية 🇸🇦',
        leagueId: 'saudi_pro_league',
        leagueName: 'دوري روشن السعودي للمحترفين',
        leagueNameEn: 'Roshn Saudi League',
        badge: '',
        stadiumName: 'Prince Abdullah bin Jalawi Stadium',
        city: 'الخبر',
        isTopTier: true,
        gemCost: 100,
        starRating: 4.5,
        colors: { primary: '#059669', secondary: '#ffffff', accent: '#0f172a' },
        keyStars: ['خوليان كينيونيس', 'نادر السيد', 'موسى ديمبيلي'],
        descriptionAr: 'عنابي الأحساء؛ صعود صاروخي وتشكيلة مليئة بالنجوم تهدد عرش الكبار.',
        descriptionEn: 'Meteoric rise with a star-studded squad challenging for the title.'
      },
      {
        id: 'club_al_ettifaq',
        name: 'الاتفاق السعودي',
        nameEn: 'Al-Ettifaq FC',
        country: 'السعودية 🇸🇦',
        leagueId: 'saudi_pro_league',
        leagueName: 'دوري روشن السعودي للمحترفين',
        leagueNameEn: 'Roshn Saudi League',
        badge: '',
        stadiumName: 'Prince Mohamed bin Fahd Stadium',
        city: 'الدمام',
        isTopTier: false,
        gemCost: 0,
        starRating: 4.0,
        colors: { primary: '#78350f', secondary: '#ffffff', accent: '#eab308' },
        keyStars: ['فيصل الغامدي', 'موسى النذير', 'حمد اليامي'],
        descriptionAr: 'العميد الأول للكرة السعودية؛ تاريخ عريق وجمهور شرقي متحمس.',
        descriptionEn: 'One of Saudi football\'s oldest clubs with a passionate Eastern fanbase.'
      },
      {
        id: 'club_neom_sc',
        name: 'نيوم السعودي',
        nameEn: 'Neom SC',
        country: 'السعودية 🇸🇦',
        leagueId: 'saudi_pro_league',
        leagueName: 'دوري روشن السعودي للمحترفين',
        leagueNameEn: 'Roshn Saudi League',
        badge: '',
        stadiumName: 'King Abdullah Sports City',
        city: 'جدة',
        isTopTier: false,
        gemCost: 0,
        starRating: 3.5,
        colors: { primary: '#164e63', secondary: '#ffffff', accent: '#0ea5e9' },
        keyStars: ['أنجيلو أوغبونا', 'سلطان الغنام', 'ديفيد أوزوكو'],
        descriptionAr: 'مشروع المستقبل؛ ناد فتي طموح يمثل رؤية سعودية جديدة في كرة القدم.',
        descriptionEn: 'Ambitious newcomer representing Saudi Arabia\'s football future. (Free to start!)'
      },
      {
        id: 'club_al_hazem_saudi',
        name: 'الحزم السعودي',
        nameEn: 'Al-Hazem SC',
        country: 'السعودية 🇸🇦',
        leagueId: 'saudi_pro_league',
        leagueName: 'دوري روشن السعودي للمحترفين',
        leagueNameEn: 'Roshn Saudi League',
        badge: '',
        stadiumName: 'Prince Abdullah bin Jalawi Stadium (Ha\'il)',
        city: 'الرس',
        isTopTier: false,
        gemCost: 0,
        starRating: 3.5,
        colors: { primary: '#eab308', secondary: '#1e3a8a', accent: '#dc2626' },
        keyStars: ['توزي', 'باولو ريكاردو', 'فهد العبيد'],
        descriptionAr: 'حزم الصمود يعود لدوري روشن بعد صعود مستحق وتصميم على الاستمرار.',
        descriptionEn: 'Resilient promoted side determined to stay among the elite.'
      },
      {
        id: 'club_al_fayha',
        name: 'الفيحاء السعودي',
        nameEn: 'Al-Fayha FC',
        country: 'السعودية 🇸🇦',
        leagueId: 'saudi_pro_league',
        leagueName: 'دوري روشن السعودي للمحترفين',
        leagueNameEn: 'Roshn Saudi League',
        badge: '',
        stadiumName: 'Al-Majma\'ah Sports City',
        city: 'المجمعة',
        isTopTier: false,
        gemCost: 0,
        starRating: 3.5,
        colors: { primary: '#166534', secondary: '#ffffff', accent: '#f59e0b' },
        keyStars: ['أوسكار روميرو', 'سعد الناصر', 'فهد المولد'],
        descriptionAr: 'سيوف الوادي؛ منافس عنيد يعتمد على الصلابة الدفاعية والروح القتالية.',
        descriptionEn: 'Determined side relying on defensive resilience and fighting spirit.'
      },
      {
        id: 'club_al_fateh',
        name: 'الفتح السعودي',
        nameEn: 'Al-Fateh SC',
        country: 'السعودية 🇸🇦',
        leagueId: 'saudi_pro_league',
        leagueName: 'دوري روشن السعودي للمحترفين',
        leagueNameEn: 'Roshn Saudi League',
        badge: '',
        stadiumName: 'Prince Abdullah Al-Faisal Stadium',
        city: 'الأحساء',
        isTopTier: false,
        gemCost: 0,
        starRating: 3.5,
        colors: { primary: '#7c2d12', secondary: '#eab308', accent: '#ffffff' },
        keyStars: ['عبدالمجيد التركي', 'ماركوس فيلمينيو', 'علي مجرشي'],
        descriptionAr: 'أسود الأحساء؛ ناد عريق يبحث دوماً عن الاستقرار في صفوف الدوري.',
        descriptionEn: 'Historic club always fighting to stay competitive in the top flight.'
      },
      {
        id: 'club_al_khaleej',
        name: 'الخليج السعودي',
        nameEn: 'Al-Khaleej FC',
        country: 'السعودية 🇸🇦',
        leagueId: 'saudi_pro_league',
        leagueName: 'دوري روشن السعودي للمحترفين',
        leagueNameEn: 'Roshn Saudi League',
        badge: '',
        stadiumName: 'Prince Abdullah bin Jalawi Stadium',
        city: 'سيهات',
        isTopTier: false,
        gemCost: 0,
        starRating: 3.5,
        colors: { primary: '#1d4ed8', secondary: '#ffffff', accent: '#f59e0b' },
        keyStars: ['أحمد الجميعان', 'إيغور كورياو', 'عبدالرحمن مطلق'],
        descriptionAr: 'العملاق الأزرق؛ فريق شرقي طموح يسعى لترسيخ اسمه بين الكبار.',
        descriptionEn: 'Ambitious Eastern Province club aiming to cement its top-flight status.'
      },
      {
        id: 'club_al_kholood',
        name: 'الخلود السعودي',
        nameEn: 'Al-Kholood Club',
        country: 'السعودية 🇸🇦',
        leagueId: 'saudi_pro_league',
        leagueName: 'دوري روشن السعودي للمحترفين',
        leagueNameEn: 'Roshn Saudi League',
        badge: '',
        stadiumName: 'Prince Saud bin Jalawi Stadium',
        city: 'أبها',
        isTopTier: false,
        gemCost: 0,
        starRating: 3.0,
        colors: { primary: '#7f1d1d', secondary: '#ffffff', accent: '#0f172a' },
        keyStars: ['جوردان أياو', 'سعود عبدالحميد', 'محمد الشملاوي'],
        descriptionAr: 'فريق صاعد يخوض تجربته بين الكبار بحماس الشباب وإصرار الطموح.',
        descriptionEn: 'Newly promoted side taking on the elite with youthful ambition.'
      },
      {
        id: 'club_al_riyadh',
        name: 'الرياض السعودي',
        nameEn: 'Al-Riyadh SC',
        country: 'السعودية 🇸🇦',
        leagueId: 'saudi_pro_league',
        leagueName: 'دوري روشن السعودي للمحترفين',
        leagueNameEn: 'Roshn Saudi League',
        badge: '',
        stadiumName: 'Prince Turki bin Abdulaziz Stadium',
        city: 'الرياض',
        isTopTier: false,
        gemCost: 0,
        starRating: 3.0,
        colors: { primary: '#0f172a', secondary: '#eab308', accent: '#ffffff' },
        keyStars: ['كوامي كوانا', 'عبدالعزيز الحسن', 'محمد الرشيدي'],
        descriptionAr: 'فريق العاصمة؛ يقاتل بضراوة من أجل البقاء في مصاف الأندية الكبرى.',
        descriptionEn: 'The capital\'s underdog fighting hard for top-flight survival.'
      },
      {
        id: 'club_damac',
        name: 'ضمك السعودي',
        nameEn: 'Damac FC',
        country: 'السعودية 🇸🇦',
        leagueId: 'saudi_pro_league',
        leagueName: 'دوري روشن السعودي للمحترفين',
        leagueNameEn: 'Roshn Saudi League',
        badge: '',
        stadiumName: 'Prince Sultan bin Abdulaziz Stadium',
        city: 'خميس مشيط',
        isTopTier: false,
        gemCost: 0,
        starRating: 3.0,
        colors: { primary: '#164e63', secondary: '#ffffff', accent: '#f97316' },
        keyStars: ['فيتينيو', 'مراد باتنا', 'أحمد الزين'],
        descriptionAr: 'نمور الجنوب؛ فريق مكافح يعتمد على العزيمة لمجابهة الأندية الكبيرة.',
        descriptionEn: 'Southern fighters relying on grit to take on the giants. (Free to start!)'
      },
      {
        id: 'club_al_akhdoud',
        name: 'الأخدود السعودي',
        nameEn: 'Al-Akhdoud Club',
        country: 'السعودية 🇸🇦',
        leagueId: 'saudi_pro_league',
        leagueName: 'دوري روشن السعودي للمحترفين',
        leagueNameEn: 'Roshn Saudi League',
        badge: '',
        stadiumName: 'Prince Hathloul bin Abdulaziz Stadium',
        city: 'نجران',
        isTopTier: false,
        gemCost: 0,
        starRating: 3.0,
        colors: { primary: '#166534', secondary: '#ffffff', accent: '#eab308' },
        keyStars: ['كريستيان جوارتيه', 'علي البشير', 'فيصل الغانم'],
        descriptionAr: 'فريق الجنوب الصاعد؛ يخوض تجربته الأولى في دوري روشن بحماس كبير.',
        descriptionEn: 'Newly promoted southern club making its top-flight debut. (Free to start!)'
      },
      {
        id: 'club_al_najma',
        name: 'النجمة السعودي',
        nameEn: 'Al-Najma SC',
        country: 'السعودية 🇸🇦',
        leagueId: 'saudi_pro_league',
        leagueName: 'دوري روشن السعودي للمحترفين',
        leagueNameEn: 'Roshn Saudi League',
        badge: '',
        stadiumName: 'Prince Abdullah bin Jalawi Stadium',
        city: 'الأحساء',
        isTopTier: false,
        gemCost: 0,
        starRating: 3.0,
        colors: { primary: '#1e3a8a', secondary: '#ffffff', accent: '#eab308' },
        keyStars: ['عبدالله الحربي', 'سامي القثامي', 'راشد المري'],
        descriptionAr: 'يعود إلى دوري روشن بعد غياب طويل بطموح إثبات النفس مجدداً.',
        descriptionEn: 'Returns to the top flight after decades away, eager to prove itself.'
      }
    ]
  },
  {
    id: 'serie_a',
    name: 'الدوري الإيطالي (سيريا آ)',
    nameEn: 'Serie A Enilive',
    flag: '🇮🇹',
    country: 'إيطاليا',
    logo: 'https://r2.thesportsdb.com/images/media/league/badge/6t16481688647590.png',
    descriptionAr: 'عاصمة التكتيك الدفاعي والملاحم الكروية التاريخية في الكالتشيو.',
    descriptionEn: 'The tactical chess championship of European football.',
    clubs: [
      {
        id: 'club_inter',
        name: 'إنتر ميلان',
        nameEn: 'Inter Milan',
        country: 'إيطاليا 🇮🇹',
        leagueId: 'serie_a',
        leagueName: 'الدوري الإيطالي (سيريا آ)',
        leagueNameEn: 'Serie A Enilive',
        badge: 'https://r2.thesportsdb.com/images/media/team/badge/xpyuvw1473504104.png',
        stadiumName: 'San Siro (Giuseppe Meazza)',
        city: 'ميلانو',
        isTopTier: true,
        gemCost: 100,
        starRating: 5.0,
        colors: { primary: '#0284c7', secondary: '#000000', accent: '#eab308' },
        keyStars: ['لاوتارو مارتينيز', 'نيكولو باريلا', 'ماركوس تورام'],
        descriptionAr: 'النيراتزوري بطل إيطاليا؛ صلابة تكتيكية وتناغم هجومي مذهل في سان سيرو.',
        descriptionEn: 'Reigning Italian champions with cohesive modern tactical dominance.'
      },
      {
        id: 'club_juventus',
        name: 'يوفنتوس',
        nameEn: 'Juventus FC',
        country: 'إيطاليا 🇮🇹',
        leagueId: 'serie_a',
        leagueName: 'الدوري الإيطالي (سيريا آ)',
        leagueNameEn: 'Serie A Enilive',
        badge: 'https://r2.thesportsdb.com/images/media/team/badge/wsqptx1473504183.png',
        stadiumName: 'Allianz Stadium',
        city: 'تورينو',
        isTopTier: true,
        gemCost: 100,
        starRating: 4.5,
        colors: { primary: '#0f172a', secondary: '#ffffff', accent: '#fbbf24' },
        keyStars: ['دوشان فلاهوفيتش', 'كينان يلدز', 'تون كوبماينرز'],
        descriptionAr: 'السيدة العجوز؛ زعيم الكرة الإيطالية التاريخي في مرحلة تجديد الدماء والعودة للقمة.',
        descriptionEn: 'The Old Lady; Italy\'s most decorated club rebuilding a winning dynasty.'
      },
      {
        id: 'club_milan',
        name: 'إيه سي ميلان',
        nameEn: 'AC Milan',
        country: 'إيطاليا 🇮🇹',
        leagueId: 'serie_a',
        leagueName: 'الدوري الإيطالي (سيريا آ)',
        leagueNameEn: 'Serie A Enilive',
        badge: 'https://r2.thesportsdb.com/images/media/team/badge/uwtssv1473504068.png',
        stadiumName: 'San Siro',
        city: 'ميلانو',
        isTopTier: true,
        gemCost: 100,
        starRating: 4.5,
        colors: { primary: '#dc2626', secondary: '#000000', accent: '#ffffff' },
        keyStars: ['رافائيل لياو', 'كريستيان بوليسيتش', 'ثيو هيرنانديز'],
        descriptionAr: 'الروسونيري؛ بطل أوروبا 7 مرات يمتلك أجنحة خارقة السرعة في الهجوم.',
        descriptionEn: 'Seven-time European champions with explosive wings.'
      },
      {
        id: 'club_roma',
        name: 'روما',
        nameEn: 'AS Roma',
        country: 'إيطاليا 🇮🇹',
        leagueId: 'serie_a',
        leagueName: 'الدوري الإيطالي (سيريا آ)',
        leagueNameEn: 'Serie A Enilive',
        badge: 'https://r2.thesportsdb.com/images/media/team/badge/25h4701694432943.png',
        stadiumName: 'Stadio Olimpico',
        city: 'روما',
        isTopTier: false,
        gemCost: 0,
        starRating: 4.0,
        colors: { primary: '#991b1b', secondary: '#f59e0b', accent: '#ffffff' },
        keyStars: ['باولو ديبالا', 'لورينزو بيليغريني', 'أرتيم دوفبيك'],
        descriptionAr: 'ذئاب العاصمة؛ سحر ديبالا وشغف جماهيري جنوني في الأولمبيكو.',
        descriptionEn: 'The Giallorossi; passionate capital club with Dybala magic. (Free to start!)'
      },
      {
        id: 'club_atalanta',
        name: 'أتالانتا',
        nameEn: 'Atalanta BC',
        country: 'إيطاليا 🇮🇹',
        leagueId: 'serie_a',
        leagueName: 'الدوري الإيطالي (سيريا آ)',
        leagueNameEn: 'Serie A Enilive',
        badge: 'https://r2.thesportsdb.com/images/media/team/badge/rtppxs1420586884.png',
        stadiumName: 'Gewiss Stadium',
        city: 'بيرغامو',
        isTopTier: false,
        gemCost: 0,
        starRating: 4.0,
        colors: { primary: '#1e3a8a', secondary: '#000000', accent: '#ffffff' },
        keyStars: ['أديمولا لوكمان', 'شارل دي كيتيلاير', 'ماتيو ريتيغي'],
        descriptionAr: 'بطل الدوري الأوروبي؛ ماكينة هجومية غزيرة الأهداف ترهب أي دفاع.',
        descriptionEn: 'Europa League champions with relentless high-scoring machine.'
      }
    ]
  },
  {
    id: 'bundesliga',
    name: 'الدوري الألماني (بوندسليغا)',
    nameEn: 'Bundesliga',
    flag: '🇩🇪',
    country: 'ألمانيا',
    logo: 'https://r2.thesportsdb.com/images/media/league/badge/v2s19z1688647610.png',
    descriptionAr: 'دوري الأهداف الغزيرة والسرعة الفائقة والملاعب الممتلئة دائماً.',
    descriptionEn: 'High-octane football with record-breaking goal averages.',
    clubs: [
      {
        id: 'club_bayern',
        name: 'بايرن ميونخ',
        nameEn: 'Bayern Munich',
        country: 'ألمانيا 🇩🇪',
        leagueId: 'bundesliga',
        leagueName: 'الدوري الألماني (بوندسليغا)',
        leagueNameEn: 'Bundesliga',
        badge: 'https://r2.thesportsdb.com/images/media/team/badge/095ud71694432924.png',
        stadiumName: 'Allianz Arena',
        city: 'ميونخ',
        isTopTier: true,
        gemCost: 100,
        starRating: 5.0,
        colors: { primary: '#b91c1c', secondary: '#ffffff', accent: '#1d4ed8' },
        keyStars: ['هاري كين', 'جمال موسيالا', 'مانويل نوير'],
        descriptionAr: 'العملاق البافاري؛ ماكينة انتصارات لا ترحم يقودها هداف أوروبا هاري كين.',
        descriptionEn: 'Bavarian giants; ruthless winning machine powered by Harry Kane.'
      },
      {
        id: 'club_leverkusen',
        name: 'باير ليفركوزن',
        nameEn: 'Bayer 04 Leverkusen',
        country: 'ألمانيا 🇩🇪',
        leagueId: 'bundesliga',
        leagueName: 'الدوري الألماني (بوندسليغا)',
        leagueNameEn: 'Bundesliga',
        badge: 'https://r2.thesportsdb.com/images/media/team/badge/xvtqxy1420587053.png',
        stadiumName: 'BayArena',
        city: 'ليفركوزن',
        isTopTier: true,
        gemCost: 100,
        starRating: 4.5,
        colors: { primary: '#dc2626', secondary: '#000000', accent: '#ffffff' },
        keyStars: ['فلوريان فيرتز', 'غرانيت تشاكا', 'جيريمي فريمبونغ'],
        descriptionAr: 'فريق الذهب الذي لا يُقهر؛ بطل الثنائية التاريخية بأسلوب تكتيكي مبهر.',
        descriptionEn: 'The invincible champions of Germany with electric tactical flair.'
      },
      {
        id: 'club_dortmund',
        name: 'بوروسيا دورتموند',
        nameEn: 'Borussia Dortmund',
        country: 'ألمانيا 🇩🇪',
        leagueId: 'bundesliga',
        leagueName: 'الدوري الألماني (بوندسليغا)',
        leagueNameEn: 'Bundesliga',
        badge: 'https://r2.thesportsdb.com/images/media/team/badge/swqpvv1420587093.png',
        stadiumName: 'Signal Iduna Park (Westfalenstadion)',
        city: 'دورتموند',
        isTopTier: false,
        gemCost: 0,
        starRating: 4.0,
        colors: { primary: '#eab308', secondary: '#000000', accent: '#ffffff' },
        keyStars: ['سيرهو غيراسي', 'يوليان براندت', 'غريغور كوبيل'],
        descriptionAr: 'الجدار الأصفر؛ وصيف دوري أبطال أوروبا وعاشق الكرة السريعة والمواهب.',
        descriptionEn: 'The Yellow Wall; Champions League finalists known for rapid development.'
      },
      {
        id: 'club_leipzig',
        name: 'آر بي لايبزيغ',
        nameEn: 'RB Leipzig',
        country: 'ألمانيا 🇩🇪',
        leagueId: 'bundesliga',
        leagueName: 'الدوري الألماني (بوندسليغا)',
        leagueNameEn: 'Bundesliga',
        badge: 'https://r2.thesportsdb.com/images/media/team/badge/0l2l8h1694432936.png',
        stadiumName: 'Red Bull Arena',
        city: 'لايبزيغ',
        isTopTier: false,
        gemCost: 0,
        starRating: 4.0,
        colors: { primary: '#ffffff', secondary: '#dc2626', accent: '#eab308' },
        keyStars: ['بنيامين شيشكو', 'تشافي سيمونز', 'لويس أوبيندا'],
        descriptionAr: 'سرعة وضغط مكثف؛ تشكيلة مليئة بالطاقة وأسرع المهاجمين في القارة.',
        descriptionEn: 'High-speed transitions and elite young talent. (Free to start!)'
      }
    ]
  },
  {
    id: 'ligue_1',
    name: 'الدوري الفرنسي (ليغ 1)',
    nameEn: 'Ligue 1 McDonald\'s',
    flag: '🇫🇷',
    country: 'فرنسا',
    logo: 'https://r2.thesportsdb.com/images/media/league/badge/k858561688647631.png',
    descriptionAr: 'مهد النجوم العالميين والمواهب الصاعدة والكرة البدنية السريعة.',
    descriptionEn: 'The proving ground for Europe\'s greatest talents.',
    clubs: [
      {
        id: 'club_psg',
        name: 'باريس سان جيرمان',
        nameEn: 'Paris Saint-Germain',
        country: 'فرنسا 🇫🇷',
        leagueId: 'ligue_1',
        leagueName: 'الدوري الفرنسي (ليغ 1)',
        leagueNameEn: 'Ligue 1 McDonald\'s',
        badge: 'https://r2.thesportsdb.com/images/media/team/badge/rwqrrq1473504808.png',
        stadiumName: 'Parc des Princes',
        city: 'باريس',
        isTopTier: true,
        gemCost: 100,
        starRating: 5.0,
        colors: { primary: '#1e1b4b', secondary: '#b91c1c', accent: '#ffffff' },
        keyStars: ['عثمان ديمبيلي', 'أشرف حكيمي', 'وارن زاير إيمري'],
        descriptionAr: 'زعيم العاصمة؛ سيطرة مطلقة على الكرة الفرنسية وهجوم شاب ناري.',
        descriptionEn: 'French royalty with blistering pace down the flanks.'
      },
      {
        id: 'club_monaco',
        name: 'موناكو',
        nameEn: 'AS Monaco',
        country: 'فرنسا 🇫🇷',
        leagueId: 'ligue_1',
        leagueName: 'الدوري الفرنسي (ليغ 1)',
        leagueNameEn: 'Ligue 1 McDonald\'s',
        badge: 'https://r2.thesportsdb.com/images/media/team/badge/vvwyvw1420587394.png',
        stadiumName: 'Stade Louis II',
        city: 'موناكو',
        isTopTier: true,
        gemCost: 100,
        starRating: 4.0,
        colors: { primary: '#dc2626', secondary: '#ffffff', accent: '#fbbf24' },
        keyStars: ['تاكومي مينامينو', 'دينيس زكريا', 'ألكسندر غولوفين'],
        descriptionAr: 'أمراء الإمارة؛ فريق منظم يجمع بين الخبرة الدولية والمهارة التكتيكية.',
        descriptionEn: 'The Principality\'s pride with fluid technical attacking prowess.'
      },
      {
        id: 'club_marseille',
        name: 'أولمبيك مارسيليا',
        nameEn: 'Olympique de Marseille',
        country: 'فرنسا 🇫🇷',
        leagueId: 'ligue_1',
        leagueName: 'الدوري الفرنسي (ليغ 1)',
        leagueNameEn: 'Ligue 1 McDonald\'s',
        badge: 'https://r2.thesportsdb.com/images/media/team/badge/8421831660439139.png',
        stadiumName: 'Orange Vélodrome',
        city: 'مارسيليا',
        isTopTier: false,
        gemCost: 0,
        starRating: 4.0,
        colors: { primary: '#38bdf8', secondary: '#ffffff', accent: '#0f172a' },
        keyStars: ['مايسون غرينوود', 'أمين حارث', 'بيير هويبيرغ'],
        descriptionAr: 'فريق الجنوب الفرنسي؛ الشغف الجماهيري الأكثر حماساً في فيلودروم.',
        descriptionEn: 'South of France powerhouse with fiery passion. (Free to start!)'
      },
      {
        id: 'club_lyon',
        name: 'أولمبيك ليون',
        nameEn: 'Olympique Lyonnais',
        country: 'فرنسا 🇫🇷',
        leagueId: 'ligue_1',
        leagueName: 'الدوري الفرنسي (ليغ 1)',
        leagueNameEn: 'Ligue 1 McDonald\'s',
        badge: 'https://r2.thesportsdb.com/images/media/team/badge/wwpypx1420587363.png',
        stadiumName: 'Groupama Stadium',
        city: 'ليون',
        isTopTier: false,
        gemCost: 0,
        starRating: 3.5,
        colors: { primary: '#1e3a8a', secondary: '#dc2626', accent: '#ffffff' },
        keyStars: ['ألكسندر لاكازيت', 'ريان شرقي', 'سعيد بن رحمة'],
        descriptionAr: 'بطل فرنسا السابق وأشهر أكاديمية تخريج نجوم في تاريخ فرنسا.',
        descriptionEn: 'Historic giant known for legendary academy output.'
      }
    ]
  },
  {
    id: 'egyptian_league',
    name: 'الدوري المصري الممتاز',
    nameEn: 'Egyptian Premier League',
    flag: '🇪🇬',
    country: 'مصر',
    logo: 'https://r2.thesportsdb.com/images/media/league/badge/3rkv511676916584.png',
    descriptionAr: 'أعرق الدوريات العربية والأفريقية ومعقل عمالقة القارة السمراء.',
    descriptionEn: 'The most decorated league in African and Arab football history.',
    clubs: [
      {
        id: 'club_al_ahly',
        name: 'الأهلي المصري',
        nameEn: 'Al Ahly SC',
        country: 'مصر 🇪🇬',
        leagueId: 'egyptian_league',
        leagueName: 'الدوري المصري الممتاز',
        leagueNameEn: 'Egyptian Premier League',
        badge: '', // ⚠️ رابط مُختلَق (نفس معرّف شعار الدوري) — أُزيل حتى نجلب الشعار الحقيقي
        stadiumName: 'Cairo International Stadium',
        city: 'القاهرة',
        isTopTier: true,
        gemCost: 100,
        starRating: 5.0,
        colors: { primary: '#dc2626', secondary: '#ffffff', accent: '#eab308' },
        keyStars: ['إمام عاشور', 'محمد الشناوي', 'وسام أبو علي'],
        descriptionAr: 'نادي القرن الأفريقي؛ الأكثر تتويجاً بالبطولات القارية والمحلية عبر التاريخ.',
        descriptionEn: 'Club of the Century in Africa; serial winners with continental dominance.'
      },
      {
        id: 'club_zamalek',
        name: 'الزمالك المصري',
        nameEn: 'Zamalek SC',
        country: 'مصر 🇪🇬',
        leagueId: 'egyptian_league',
        leagueName: 'الدوري المصري الممتاز',
        leagueNameEn: 'Egyptian Premier League',
        badge: 'https://r2.thesportsdb.com/images/media/team/badge/u1y68d1676916590.png',
        stadiumName: 'Cairo International Stadium',
        city: 'الجيزة / القاهرة',
        isTopTier: true,
        gemCost: 100,
        starRating: 4.5,
        colors: { primary: '#ffffff', secondary: '#dc2626', accent: '#0f172a' },
        keyStars: ['أحمد سيد زيزو', 'عبدالله السعيد', 'ناصر ماهر'],
        descriptionAr: 'مدرسة الفن والهندسة؛ عملاق تاريخي يمتلك قاعدة جماهيرية وفية وعريضة.',
        descriptionEn: 'The White Knights; historic artists of African football.'
      },
      {
        id: 'club_pyramids',
        name: 'بيراميدز',
        nameEn: 'Pyramids FC',
        country: 'مصر 🇪🇬',
        leagueId: 'egyptian_league',
        leagueName: 'الدوري المصري الممتاز',
        leagueNameEn: 'Egyptian Premier League',
        badge: 'https://r2.thesportsdb.com/images/media/team/badge/v7u8h41676916595.png',
        stadiumName: '30 June Stadium',
        city: 'القاهرة',
        isTopTier: false,
        gemCost: 0,
        starRating: 4.0,
        colors: { primary: '#0284c7', secondary: '#ffffff', accent: '#0f172a' },
        keyStars: ['رمضان صبحي', 'فيستون ماييلي', 'إبراهيم عادل'],
        descriptionAr: 'القوة الحديثة المتطورة؛ تشكيلة مدججة بالنجوم تنافس بقوة على الألقاب.',
        descriptionEn: 'Modern ambitious force challenging traditional giants. (Free to start!)'
      },
      {
        id: 'club_ismaily',
        name: 'الإسماعيلي (برازيل مصر)',
        nameEn: 'Ismaily SC',
        country: 'مصر 🇪🇬',
        leagueId: 'egyptian_league',
        leagueName: 'الدوري المصري الممتاز',
        leagueNameEn: 'Egyptian Premier League',
        badge: 'https://r2.thesportsdb.com/images/media/team/badge/5k89e11676916602.png',
        stadiumName: 'Ismailia Stadium',
        city: 'الإسماعيلية',
        isTopTier: false,
        gemCost: 0,
        starRating: 3.5,
        colors: { primary: '#eab308', secondary: '#1e3a8a', accent: '#ffffff' },
        keyStars: ['عبدالرحمن مجدي', 'محمد دسوقي', 'نادر فرج'],
        descriptionAr: 'الدراويش؛ مدرسة الكرة الساحرة ومصنع النجوم الأول في مصر.',
        descriptionEn: 'The Dervishes; famous for beautiful samba football. (Free to start!)'
      },
      {
        id: 'club_ceramica',
        name: 'سيراميكا كليوباترا',
        nameEn: 'Ceramica Cleopatra FC',
        country: 'مصر 🇪🇬',
        leagueId: 'egyptian_league',
        leagueName: 'الدوري المصري الممتاز',
        leagueNameEn: 'Egyptian Premier League',
        badge: '',
        stadiumName: '30 June Stadium',
        city: 'السويس الجديدة',
        isTopTier: true,
        gemCost: 100,
        starRating: 4.0,
        colors: { primary: '#166534', secondary: '#ffffff', accent: '#eab308' },
        keyStars: ['أحمد سامي', 'كريم فؤاد', 'زياد عبدالسلام'],
        descriptionAr: 'القوة الصاعدة في الكرة المصرية؛ إدارة طموحة ومشروع رياضي متكامل.',
        descriptionEn: 'Egypt\'s rising power with ambitious management and a complete project.'
      },
      {
        id: 'club_al_masry',
        name: 'المصري البورسعيدي',
        nameEn: 'Al Masry Club',
        country: 'مصر 🇪🇬',
        leagueId: 'egyptian_league',
        leagueName: 'الدوري المصري الممتاز',
        leagueNameEn: 'Egyptian Premier League',
        badge: '',
        stadiumName: 'Port Said Stadium',
        city: 'بورسعيد',
        isTopTier: false,
        gemCost: 0,
        starRating: 4.0,
        colors: { primary: '#166534', secondary: '#ffffff', accent: '#0f172a' },
        keyStars: ['أحمد ياسر ريان', 'محمود الوايلي', 'أحمد توفيق'],
        descriptionAr: 'الفريق الأخضر؛ عاصمة الصمود بورسعيد وتاريخ حافل بالمنافسة على القمة.',
        descriptionEn: 'The Green Team from Port Said, historically strong and competitive.'
      },
      {
        id: 'club_enppi',
        name: 'إنبي',
        nameEn: 'ENPPI Club',
        country: 'مصر 🇪🇬',
        leagueId: 'egyptian_league',
        leagueName: 'الدوري المصري الممتاز',
        leagueNameEn: 'Egyptian Premier League',
        badge: '',
        stadiumName: 'Petro Sport Stadium',
        city: 'القاهرة',
        isTopTier: false,
        gemCost: 0,
        starRating: 3.5,
        colors: { primary: '#1d4ed8', secondary: '#ffffff', accent: '#f59e0b' },
        keyStars: ['أحمد رفعت', 'محمد عبدالرازق', 'محمود جاد الله'],
        descriptionAr: 'نادي شركات البترول؛ تنظيم إداري متميز وأداء كروي متوازن دوماً.',
        descriptionEn: 'Petroleum companies\' club known for stability and balanced performances.'
      },
      {
        id: 'club_smouha',
        name: 'سموحة',
        nameEn: 'Smouha SC',
        country: 'مصر 🇪🇬',
        leagueId: 'egyptian_league',
        leagueName: 'الدوري المصري الممتاز',
        leagueNameEn: 'Egyptian Premier League',
        badge: '',
        stadiumName: 'Alexandria Stadium',
        city: 'الإسكندرية',
        isTopTier: false,
        gemCost: 0,
        starRating: 3.5,
        colors: { primary: '#0f172a', secondary: '#eab308', accent: '#ffffff' },
        keyStars: ['محمود عبدالعزيز', 'أحمد الشيخ', 'محمد حمدي'],
        descriptionAr: 'عميد الأندية السكندرية؛ ملعب برج العرب حصن منيع أمام الخصوم.',
        descriptionEn: 'Alexandria\'s oldest club with Borg El Arab as its fortress.'
      },
      {
        id: 'club_pharco',
        name: 'فاركو',
        nameEn: 'Pharco FC',
        country: 'مصر 🇪🇬',
        leagueId: 'egyptian_league',
        leagueName: 'الدوري المصري الممتاز',
        leagueNameEn: 'Egyptian Premier League',
        badge: '',
        stadiumName: 'Alexandria Stadium',
        city: 'الإسكندرية',
        isTopTier: false,
        gemCost: 0,
        starRating: 3.0,
        colors: { primary: '#0891b2', secondary: '#ffffff', accent: '#0f172a' },
        keyStars: ['أحمد صدقي', 'محمد الشحات', 'يوسف أسامة'],
        descriptionAr: 'مشروع رياضي حديث في الإسكندرية يسعى لترسيخ مكانته بالدوري الممتاز.',
        descriptionEn: 'Modern Alexandria project working to establish itself in the top flight.'
      },
      {
        id: 'club_talaea',
        name: 'طلائع الجيش',
        nameEn: 'Tala\'ea El Gaish SC',
        country: 'مصر 🇪🇬',
        leagueId: 'egyptian_league',
        leagueName: 'الدوري المصري الممتاز',
        leagueNameEn: 'Egyptian Premier League',
        badge: '',
        stadiumName: '30 June Stadium',
        city: 'القاهرة',
        isTopTier: false,
        gemCost: 0,
        starRating: 3.5,
        colors: { primary: '#065f46', secondary: '#ffffff', accent: '#eab308' },
        keyStars: ['أحمد الشناوي', 'محمد مجدي أفشة', 'كريم كوباني'],
        descriptionAr: 'فريق الجيش المصري؛ انضباط تكتيكي عالٍ وصلابة دفاعية يصعب اختراقها.',
        descriptionEn: 'Egyptian Army club known for tactical discipline and a solid defense.'
      },
      {
        id: 'club_petrojet',
        name: 'بتروجيت',
        nameEn: 'Petrojet SC',
        country: 'مصر 🇪🇬',
        leagueId: 'egyptian_league',
        leagueName: 'الدوري المصري الممتاز',
        leagueNameEn: 'Egyptian Premier League',
        badge: '',
        stadiumName: 'Petrosport Stadium',
        city: 'الإسماعيلية',
        isTopTier: false,
        gemCost: 0,
        starRating: 3.0,
        colors: { primary: '#1d4ed8', secondary: '#ffffff', accent: '#0f172a' },
        keyStars: ['سيكو سونكو', 'أحمد عاطف', 'محمد إبراهيم'],
        descriptionAr: 'نادي شركات البترول الثاني؛ يعتمد على الشباب والروح القتالية العالية.',
        descriptionEn: 'Second petroleum-sector club built on youth and a fighting spirit.'
      },
      {
        id: 'club_ittihad_sakandary',
        name: 'الاتحاد السكندري',
        nameEn: 'Alexandria Union Club',
        country: 'مصر 🇪🇬',
        leagueId: 'egyptian_league',
        leagueName: 'الدوري المصري الممتاز',
        leagueNameEn: 'Egyptian Premier League',
        badge: '',
        stadiumName: 'Alexandria Stadium',
        city: 'الإسكندرية',
        isTopTier: false,
        gemCost: 0,
        starRating: 3.0,
        colors: { primary: '#dc2626', secondary: '#ffffff', accent: '#0f172a' },
        keyStars: ['محمود كهربا', 'أحمد الشناوي', 'حسام عاشور'],
        descriptionAr: 'عميد الأندية المصرية؛ تاريخ عريق يمتد لأكثر من قرن من الزمان.',
        descriptionEn: 'One of Egypt\'s oldest clubs, with over a century of football history.'
      },
      {
        id: 'club_mokawloon',
        name: 'المقاولون العرب',
        nameEn: 'Arab Contractors SC',
        country: 'مصر 🇪🇬',
        leagueId: 'egyptian_league',
        leagueName: 'الدوري المصري الممتاز',
        leagueNameEn: 'Egyptian Premier League',
        badge: '',
        stadiumName: '30 June Stadium',
        city: 'القاهرة',
        isTopTier: false,
        gemCost: 0,
        starRating: 3.5,
        colors: { primary: '#f59e0b', secondary: '#0f172a', accent: '#ffffff' },
        keyStars: ['أحمد الشيخ', 'محمد عبدالشافي', 'كريم الديب'],
        descriptionAr: 'فريق المهندسين؛ نادٍ صاعد بحماس جماهيري كبير وطموح لا حدود له.',
        descriptionEn: 'The Engineers; a promoted club with huge fan enthusiasm and ambition.'
      },
      {
        id: 'club_bank_al_ahly',
        name: 'بنك الأهلي المصري',
        nameEn: 'National Bank of Egypt SC',
        country: 'مصر 🇪🇬',
        leagueId: 'egyptian_league',
        leagueName: 'الدوري المصري الممتاز',
        leagueNameEn: 'Egyptian Premier League',
        badge: '',
        stadiumName: 'Cairo Stadium',
        city: 'القاهرة',
        isTopTier: false,
        gemCost: 0,
        starRating: 3.0,
        colors: { primary: '#166534', secondary: '#ffffff', accent: '#eab308' },
        keyStars: ['أحمد الشيمي', 'محمد فاروق', 'عمرو السولية'],
        descriptionAr: 'نادي القطاع المصرفي؛ إدارة مستقرة وأداء متوازن موسماً بعد موسم.',
        descriptionEn: 'Banking-sector club known for stable management and consistency.'
      },
      {
        id: 'club_el_gouna',
        name: 'الجونة',
        nameEn: 'El Gouna FC',
        country: 'مصر 🇪🇬',
        leagueId: 'egyptian_league',
        leagueName: 'الدوري المصري الممتاز',
        leagueNameEn: 'Egyptian Premier League',
        badge: '',
        stadiumName: 'Khaled Bishara Stadium',
        city: 'الجونة',
        isTopTier: false,
        gemCost: 0,
        starRating: 3.5,
        colors: { primary: '#ea580c', secondary: '#ffffff', accent: '#0f172a' },
        keyStars: ['أحمد الجعفري', 'عمرو السولية', 'يوسف عبدالرازق'],
        descriptionAr: 'ناد ساحلي طموح بإدارة حديثة وملعب على ضفاف البحر الأحمر.',
        descriptionEn: 'Coastal club with modern management and a stadium by the Red Sea.'
      },
      {
        id: 'club_ghazl_mahalla',
        name: 'غزل المحلة',
        nameEn: 'Ghazl El Mahalla SC',
        country: 'مصر 🇪🇬',
        leagueId: 'egyptian_league',
        leagueName: 'الدوري المصري الممتاز',
        leagueNameEn: 'Egyptian Premier League',
        badge: '',
        stadiumName: 'Ghazl El Mahalla Stadium',
        city: 'المحلة الكبرى',
        isTopTier: false,
        gemCost: 0,
        starRating: 3.0,
        colors: { primary: '#dc2626', secondary: '#ffffff', accent: '#0f172a' },
        keyStars: ['محمد عبدالغني', 'أحمد سعيد', 'كريم حافظ'],
        descriptionAr: 'فريق عمال الغزل والنسيج؛ دعم جماهيري صناعي واسع في دلتا مصر.',
        descriptionEn: 'Textile workers\' club with strong industrial-town support in the Delta.'
      },
      {
        id: 'club_kahrabaa_ismailia',
        name: 'كهرباء الإسماعيلية',
        nameEn: 'Kahrabaa Ismailia SC',
        country: 'مصر 🇪🇬',
        leagueId: 'egyptian_league',
        leagueName: 'الدوري المصري الممتاز',
        leagueNameEn: 'Egyptian Premier League',
        badge: '',
        stadiumName: 'Ismailia Stadium',
        city: 'الإسماعيلية',
        isTopTier: false,
        gemCost: 0,
        starRating: 3.0,
        colors: { primary: '#0284c7', secondary: '#ffffff', accent: '#eab308' },
        keyStars: ['أحمد صبري', 'محمود فتح الله', 'يوسف رمضان'],
        descriptionAr: 'فريق صاعد حديثاً يخوض أولى تجاربه في أجواء الدوري الممتاز.',
        descriptionEn: 'Newly promoted side making its debut among Egypt\'s elite.'
      },
      {
        id: 'club_haras_hodoud',
        name: 'حرس الحدود',
        nameEn: 'Haras El Hodoud SC',
        country: 'مصر 🇪🇬',
        leagueId: 'egyptian_league',
        leagueName: 'الدوري المصري الممتاز',
        leagueNameEn: 'Egyptian Premier League',
        badge: '',
        stadiumName: 'Border Guards Stadium',
        city: 'الإسكندرية',
        isTopTier: false,
        gemCost: 0,
        starRating: 3.0,
        colors: { primary: '#166534', secondary: '#ffffff', accent: '#0f172a' },
        keyStars: ['أحمد الشناوي', 'محمد رضا', 'كريم نيدفيد'],
        descriptionAr: 'فريق حرس الحدود؛ انضباط عسكري وصلابة دفاعية معروفة في الدوري.',
        descriptionEn: 'Border Guards club known for military discipline and defensive solidity.'
      },
      {
        id: 'club_wadi_degla',
        name: 'وادي دجلة',
        nameEn: 'Wadi Degla SC',
        country: 'مصر 🇪🇬',
        leagueId: 'egyptian_league',
        leagueName: 'الدوري المصري الممتاز',
        leagueNameEn: 'Egyptian Premier League',
        badge: '',
        stadiumName: 'El Salam Stadium',
        city: 'القاهرة',
        isTopTier: false,
        gemCost: 0,
        starRating: 3.0,
        colors: { primary: '#ea580c', secondary: '#0f172a', accent: '#ffffff' },
        keyStars: ['أحمد الشيخ', 'محمد الغندور', 'عمر جابر'],
        descriptionAr: 'مشروع رياضي متكامل بالقاهرة الجديدة، صاعد بحماس لإثبات نفسه.',
        descriptionEn: 'Well-rounded New Cairo project, newly promoted and eager to prove itself.'
      },
      {
        id: 'club_modern_sport',
        name: 'مودرن سبورت',
        nameEn: 'Modern Sport FC',
        country: 'مصر 🇪🇬',
        leagueId: 'egyptian_league',
        leagueName: 'الدوري المصري الممتاز',
        leagueNameEn: 'Egyptian Premier League',
        badge: '',
        stadiumName: '30 June Stadium',
        city: 'القاهرة',
        isTopTier: false,
        gemCost: 0,
        starRating: 3.0,
        colors: { primary: '#7c3aed', secondary: '#ffffff', accent: '#eab308' },
        keyStars: ['أحمد فاروق', 'محمد الشحات', 'كريم عبدالوهاب'],
        descriptionAr: 'نادٍ حديث النشأة يعتمد على الاستثمار في المواهب الشابة الواعدة.',
        descriptionEn: 'Young club focused on investing in promising emerging talent.'
      },
      {
        id: 'club_zed',
        name: 'زد',
        nameEn: 'ZED FC',
        country: 'مصر 🇪🇬',
        leagueId: 'egyptian_league',
        leagueName: 'الدوري المصري الممتاز',
        leagueNameEn: 'Egyptian Premier League',
        badge: '',
        stadiumName: '30 June Stadium',
        city: 'القاهرة',
        isTopTier: false,
        gemCost: 0,
        starRating: 3.5,
        colors: { primary: '#0f172a', secondary: '#eab308', accent: '#ffffff' },
        keyStars: ['أحمد سامي', 'معاذ النني', 'حسين الشحات'],
        descriptionAr: 'مشروع أحمد حسن؛ استثمار كبير في الشباب ومنافسة قوية على البطولات.',
        descriptionEn: 'Ahmed Hassan\'s project, heavily investing in youth and title contention.'
      }
    ]
  },
  {
    id: 'championship',
    name: 'دوري الدرجة الأولى الإنجليزي (التشامبيونشيب)',
    nameEn: 'EFL Championship',
    flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    country: 'إنجلترا (الدرجة الثانية)',
    logo: 'https://r2.thesportsdb.com/images/media/league/badge/06mff11534764834.png',
    descriptionAr: 'دوري الحماس والإثارة والقتال الشرس للصعود إلى الدوري الممتاز البريميرليغ.',
    descriptionEn: 'Fierce competitive battleground for promotion to the Premier League.',
    clubs: [
      {
        id: 'club_leeds',
        name: 'ليدز يونايتد',
        nameEn: 'Leeds United',
        country: 'إنجلترا 🏴󠁧󠁢󠁥󠁮󠁧󠁿',
        leagueId: 'championship',
        leagueName: 'دوري الدرجة الأولى الإنجليزي',
        leagueNameEn: 'EFL Championship',
        badge: 'https://r2.thesportsdb.com/images/media/team/badge/zwsugb1535457319.png',
        stadiumName: 'Elland Road',
        city: 'ليدز',
        isTopTier: true,
        gemCost: 100,
        starRating: 4.0,
        colors: { primary: '#ffffff', secondary: '#1e3a8a', accent: '#f59e0b' },
        keyStars: ['ويلفريد نيونتو', 'دان جيمس', 'إيثان أمبادو'],
        descriptionAr: 'عملاق يوركشاير التاريخي، يسعى للعودة إلى مصاف كبار البريميرليغ.',
        descriptionEn: 'Historic giant fighting for top-flight glory.'
      },
      {
        id: 'club_leicester',
        name: 'ليستر سيتي',
        nameEn: 'Leicester City',
        country: 'إنجلترا 🏴󠁧󠁢󠁥󠁮󠁧󠁿',
        leagueId: 'championship',
        leagueName: 'دوري الدرجة الأولى الإنجليزي',
        leagueNameEn: 'EFL Championship',
        badge: 'https://r2.thesportsdb.com/images/media/team/badge/vwpwxv1424031652.png',
        stadiumName: 'King Power Stadium',
        city: 'ليستر',
        isTopTier: false,
        gemCost: 0,
        starRating: 4.0,
        colors: { primary: '#1e3a8a', secondary: '#ffffff', accent: '#f59e0b' },
        keyStars: ['جيمي فاردي', 'هاري وينكس', 'ستيفي مافيديدي'],
        descriptionAr: 'الثعالب أبطال المعجزة الإنجليزية، عتاد هجومي قوي وخبرة عريضة.',
        descriptionEn: 'The Foxes; miracle champions with top-tier pedigree. (Free to start!)'
      },
      {
        id: 'club_sunderland',
        name: 'سندرلاند',
        nameEn: 'Sunderland AFC',
        country: 'إنجلترا 🏴󠁧󠁢󠁥󠁮󠁧󠁿',
        leagueId: 'championship',
        leagueName: 'دوري الدرجة الأولى الإنجليزي',
        leagueNameEn: 'EFL Championship',
        badge: 'https://r2.thesportsdb.com/images/media/team/badge/vuyrwv1424032128.png',
        stadiumName: 'Stadium of Light',
        city: 'سندرلاند',
        isTopTier: false,
        gemCost: 0,
        starRating: 3.5,
        colors: { primary: '#dc2626', secondary: '#ffffff', accent: '#000000' },
        keyStars: ['جوبي بيلينغهام', 'باتريك روبرتس', 'جاك كلارك'],
        descriptionAr: 'القطط السوداء وجماهيرية تاريخية كاسحة في ملعب الضوء.',
        descriptionEn: 'The Black Cats; passionate crowd and rising youth talent.'
      }
    ]
  },
  {
    id: 'segunda_division',
    name: 'دوري الدرجة الثانية الإسباني (لا ليغا هايبرموشن)',
    nameEn: 'La Liga Hypermotion',
    flag: '🇪🇸',
    country: 'إسبانيا (الدرجة الثانية)',
    logo: 'https://r2.thesportsdb.com/images/media/league/badge/e4h4vd1566817294.png',
    descriptionAr: 'أقوى درجات إسبانيا التكتيكية، صراع محتدم للتأهل إلى لا ليغا.',
    descriptionEn: 'Spain second tier characterized by tactical nuance and intense matches.',
    clubs: [
      {
        id: 'club_espanyol',
        name: 'إسبانيول',
        nameEn: 'RCD Espanyol',
        country: 'إسبانيا 🇪🇸',
        leagueId: 'segunda_division',
        leagueName: 'دوري الدرجة الثانية الإسباني',
        leagueNameEn: 'La Liga Hypermotion',
        badge: 'https://r2.thesportsdb.com/images/media/team/badge/tyrrvx1420587114.png',
        stadiumName: 'Stage Front Stadium',
        city: 'برشلونة',
        isTopTier: true,
        gemCost: 100,
        starRating: 4.0,
        colors: { primary: '#2563eb', secondary: '#ffffff', accent: '#dc2626' },
        keyStars: ['مارتن بريثوايت', 'خافي بوادو', 'سيرجي داردير'],
        descriptionAr: 'الغريم الكتالوني التاريخي؛ يمتلك تشكيلة نارية قادرة على الهيمنة.',
        descriptionEn: 'Catalan historic club with top-tier squad quality.'
      },
      {
        id: 'club_zaragoza',
        name: 'ريال سرقسطة',
        nameEn: 'Real Zaragoza',
        country: 'إسبانيا 🇪🇸',
        leagueId: 'segunda_division',
        leagueName: 'دوري الدرجة الثانية الإسباني',
        leagueNameEn: 'La Liga Hypermotion',
        badge: 'https://r2.thesportsdb.com/images/media/team/badge/vxxvut1420587295.png',
        stadiumName: 'La Romareda',
        city: 'سرقسطة',
        isTopTier: false,
        gemCost: 0,
        starRating: 3.5,
        colors: { primary: '#2563eb', secondary: '#ffffff', accent: '#f59e0b' },
        keyStars: ['مايكيل ميسا', 'سينان باكيس', 'فرانشو سيرانو'],
        descriptionAr: 'أحد أقطاب الكرة الإسبانية العريقة، تقاليد كروية وعزيمة حديدية.',
        descriptionEn: 'Historic Spanish club striving for comeback glory. (Free to start!)'
      },
      {
        id: 'club_oviedo',
        name: 'ريال أوفييدو',
        nameEn: 'Real Oviedo',
        country: 'إسبانيا 🇪🇸',
        leagueId: 'segunda_division',
        leagueName: 'دوري الدرجة الثانية الإسباني',
        leagueNameEn: 'La Liga Hypermotion',
        badge: 'https://r2.thesportsdb.com/images/media/team/badge/uxuwtt1420587247.png',
        stadiumName: 'Carlos Tartiere',
        city: 'أوفييدو',
        isTopTier: false,
        gemCost: 0,
        starRating: 3.5,
        colors: { primary: '#1e3a8a', secondary: '#ffffff', accent: '#fbbf24' },
        keyStars: ['سانتي كازورلا', 'بورخا باستون', 'داني كالبو'],
        descriptionAr: 'يقوده المايسترو سانتي كازورلا؛ كرة أنيقة وتماسك خططي مثير للإعجاب.',
        descriptionEn: 'Captained by maestro Santi Cazorla with pure technical flair.'
      }
    ]
  },
  {
    id: 'yelo_league',
    name: 'دوري يلو السعودي للدرجة الأولى',
    nameEn: 'Saudi Yelo League',
    flag: '🇸🇦',
    country: 'المملكة العربية السعودية (الدرجة الأولى)',
    logo: 'https://r2.thesportsdb.com/images/media/league/badge/v5p3a91599818816.png',
    descriptionAr: 'دوري يلو للمحترفين؛ حماس تنافسي شرس وروح التحدي لبلوغ دوري روشن السعودي.',
    descriptionEn: 'The proving ground of Saudi football battling for promotion to the Pro League.',
    clubs: [
      {
        id: 'club_faisaly',
        name: 'الفيصلي',
        nameEn: 'Al-Faisaly FC',
        country: 'السعودية 🇸🇦',
        leagueId: 'yelo_league',
        leagueName: 'دوري يلو السعودي',
        leagueNameEn: 'Saudi Yelo League',
        badge: 'https://r2.thesportsdb.com/images/media/team/badge/v8s8k61546879895.png',
        stadiumName: 'Al Majmaah Sports City',
        city: 'المجمعة',
        isTopTier: true,
        gemCost: 100,
        starRating: 4.0,
        colors: { primary: '#991b1b', secondary: '#ffffff', accent: '#f59e0b' },
        keyStars: ['بول غارنت', 'أحمد فلاتة', 'صالح القميزي'],
        descriptionAr: 'عنابي سدير؛ بطل كأس الملك سابقاً ويملك تنظيماً إدارياً احترافياً متقدماً.',
        descriptionEn: 'Former King Cup winners with high organizational prestige.'
      },
      {
        id: 'club_batin',
        name: 'الباطن (السماوي)',
        nameEn: 'Al-Batin FC',
        country: 'السعودية 🇸🇦',
        leagueId: 'yelo_league',
        leagueName: 'دوري يلو السعودي',
        leagueNameEn: 'Saudi Yelo League',
        badge: 'https://r2.thesportsdb.com/images/media/team/badge/8m8m881546880012.png',
        stadiumName: 'Al-Batin Club Stadium',
        city: 'حفر الباطن',
        isTopTier: false,
        gemCost: 0,
        starRating: 3.5,
        colors: { primary: '#0284c7', secondary: '#ffffff', accent: '#0369a1' },
        keyStars: ['يوسف الجبلي', 'بسام الحريجي', 'محمد فريح'],
        descriptionAr: 'كتيبة حفر الباطن؛ قوة بدنية وحماس جماهيري منقطع النظير.',
        descriptionEn: 'Northern power with formidable grit and passionate fans. (Free to start!)'
      },
      {
        id: 'club_hazem',
        name: 'الحزم',
        nameEn: 'Al-Hazem SC',
        country: 'السعودية 🇸🇦',
        leagueId: 'yelo_league',
        leagueName: 'دوري يلو السعودي',
        leagueNameEn: 'Saudi Yelo League',
        badge: 'https://r2.thesportsdb.com/images/media/team/badge/2s09211546879948.png',
        stadiumName: 'Al-Hazem Club Stadium',
        city: 'الرس',
        isTopTier: false,
        gemCost: 0,
        starRating: 3.5,
        colors: { primary: '#eab308', secondary: '#1e3a8a', accent: '#dc2626' },
        keyStars: ['توزي', 'باولو ريكاردو', 'فهد العبيد'],
        descriptionAr: 'حزم الصمود؛ خبرة كروية وباع طويل في المنافسات السعودية الكبرى.',
        descriptionEn: 'Resilient and battle-tested Saudi club. (Free to start!)'
      }
    ]
  },
  {
    id: 'botola_pro',
    name: 'الدوري المغربي الاحترافي (البطولة برو)',
    nameEn: 'Botola Pro Inwi',
    flag: '🇲🇦',
    country: 'المغرب',
    logo: 'https://r2.thesportsdb.com/images/media/league/badge/t06b4d1566817366.png',
    descriptionAr: 'البطولة الاحترافية؛ تنافس كروي عربي وإفريقي عالي المستوى وقاعدة جماهيرية مرعبة.',
    descriptionEn: 'Top-tier Moroccan and African powerhouse league with legendary fan passion.',
    clubs: [
      {
        id: 'club_wydad',
        name: 'الوداد الرياضي (وداد الأمة)',
        nameEn: 'Wydad AC',
        country: 'المغرب 🇲🇦',
        leagueId: 'botola_pro',
        leagueName: 'الدوري المغربي الاحترافي',
        leagueNameEn: 'Botola Pro',
        badge: 'https://r2.thesportsdb.com/images/media/team/badge/8w8y0v1566818129.png',
        stadiumName: 'Stade Mohammed V',
        city: 'الدار البيضاء',
        isTopTier: true,
        gemCost: 100,
        starRating: 4.5,
        colors: { primary: '#dc2626', secondary: '#ffffff', accent: '#000000' },
        keyStars: ['أيوب الكعبي', 'يحيى جبران', 'أيوب العملود'],
        descriptionAr: 'وداد الأمة؛ بطل إفريقيا التاريخي وصاحب أحد أعظم الملاعب في القارة.',
        descriptionEn: 'Red Castle; African heavyweight with phenomenal winning pedigree.'
      },
      {
        id: 'club_raja',
        name: 'الرجاء البيضاوي (النسر الأخضر)',
        nameEn: 'Raja Club Athletic',
        country: 'المغرب 🇲🇦',
        leagueId: 'botola_pro',
        leagueName: 'الدوري المغربي الاحترافي',
        leagueNameEn: 'Botola Pro',
        badge: 'https://r2.thesportsdb.com/images/media/team/badge/0s3y1t1566818152.png',
        stadiumName: 'Stade Mohammed V',
        city: 'الدار البيضاء',
        isTopTier: false,
        gemCost: 0,
        starRating: 4.5,
        colors: { primary: '#15803d', secondary: '#ffffff', accent: '#f59e0b' },
        keyStars: ['يسري بوزوق', 'آدم النفاتي', 'صابر بوغرين'],
        descriptionAr: 'النسور الخضر؛ بطل الدوري الذهبي بدون أي هزيمة، وفن التيكي تاكا المغربية.',
        descriptionEn: 'The Green Eagles; undefeated champions with captivating skill. (Free to start!)'
      },
      {
        id: 'club_asfar',
        name: 'الجيش الملكي (الزعيم)',
        nameEn: 'AS FAR Rabat',
        country: 'المغرب 🇲🇦',
        leagueId: 'botola_pro',
        leagueName: 'الدوري المغربي الاحترافي',
        leagueNameEn: 'Botola Pro',
        badge: 'https://r2.thesportsdb.com/images/media/team/badge/2k8b4m1566818171.png',
        stadiumName: 'Prince Moulay Abdellah Stadium',
        city: 'الرباط',
        isTopTier: false,
        gemCost: 0,
        starRating: 4.0,
        colors: { primary: '#15803d', secondary: '#dc2626', accent: '#000000' },
        keyStars: ['حمزة إكمان', 'أمين زحزوح', 'ربيع حريمات'],
        descriptionAr: 'الزعيم العسكري؛ انضباط تكتيكي، لياقة بدنية خارقة، وقوة هجومية كاسحة.',
        descriptionEn: 'The Military Leader; tactical discipline and devastating attack. (Free to start!)'
      }
    ]
  }
];

/**
 * Generate League Standings for a specific league
 */
export function generateStandingsForLeague(leagueId: string, playerClubId: string, playerClubName: string): LeagueStanding[] {
  const league = REAL_LEAGUES.find(l => l.id === leagueId) || REAL_LEAGUES[0];
  const standings: LeagueStanding[] = [];

  // Add the player's club first or in sequence
  standings.push({
    clubId: playerClubId,
    clubName: `${playerClubName} (فريقك)`,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0,
    points: 0,
    form: []
  });

  // Add all other clubs in this league
  league.clubs.forEach(c => {
    if (c.id !== playerClubId) {
      standings.push({
        clubId: c.id,
        clubName: c.name,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
        points: 0,
        form: []
      });
    }
  });

  return standings;
}

/**
 * Generate the full season calendar for a league: every other real club in
 * that league, played once at home and once away (a proper round-robin),
 * in a deterministic (seeded) order so the schedule is stable for a given
 * club/league pair instead of re-shuffling on every reload.
 *
 * This replaces the old behaviour where every match was played against a
 * single hard-coded team (REAL_OPPONENT_CLUBS[0]) — startNewMatch() should
 * now always draw the opponent from the next unplayed Fixture here.
 */
export function generateFixturesForLeague(leagueId: string, playerClubId: string): Fixture[] {
  const league = REAL_LEAGUES.find(l => l.id === leagueId) || REAL_LEAGUES[0];
  const opponents = league.clubs.filter(c => c.id !== playerClubId);

  const rng = new SeededRandom(hashStringToSeed(`${leagueId}_${playerClubId}`));
  const shuffled = [...opponents];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = rng.nextRange(0, i);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const fixtures: Fixture[] = [];
  let matchday = 1;
  // First round: alternate home/away so it isn't "all home games then all away"
  shuffled.forEach((c, idx) => {
    fixtures.push({
      matchday: matchday++,
      opponentClubId: c.id,
      opponentClubName: c.name,
      opponentBadge: c.badge,
      isHome: idx % 2 === 0,
      played: false,
    });
  });
  // Second round: reverse fixture, opposite venue
  [...shuffled].reverse().forEach((c, idx) => {
    fixtures.push({
      matchday: matchday++,
      opponentClubId: c.id,
      opponentClubName: c.name,
      opponentBadge: c.badge,
      isHome: idx % 2 !== 0,
      played: false,
    });
  });

  return fixtures;
}

function hashStringToSeed(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// ---- Synthetic opponent squads (fallback when squads_cache has no real, ----
// ---- API-synced roster yet for this club) --------------------------------
// Every previous "opponent" club literally spread REAL_INITIAL_PLAYER_CLUB,
// so all of them played with the exact same 15 named players as the user's
// own club (see src/data/realFootballData.ts::REAL_OPPONENT_CLUBS). This
// generates a distinct, deterministic (seeded by club id) squad instead,
// scaled around the club's own starRating, so opponents are no longer
// clones of the player's squad. It is a stand-in only — real player names
// still require a synced squads_cache entry (scripts/syncSquadsData.ts),
// which needs the API-Football sync to resume.
const GENERIC_FIRST_NAMES = ['كريم', 'ياسين', 'عمر', 'بلال', 'حمزة', 'إلياس', 'طارق', 'زياد', 'أنس', 'رامي', 'سامي', 'وائل', 'فادي', 'نبيل', 'مراد'];
const GENERIC_LAST_NAMES = ['الشمري', 'بن يوسف', 'الحمداني', 'دياباتي', 'كوليبالي', 'فيريرا', 'موراليس', 'بيلتران', 'ماركوفيتش', 'أوزيل', 'صالح', 'دهان', 'الغامدي', 'بوتشيتي', 'راشفورد'];
const SQUAD_TEMPLATE: { pos: PlayerPosition; isStarter: boolean }[] = [
  { pos: 'GK', isStarter: true },
  { pos: 'CB', isStarter: true }, { pos: 'CB', isStarter: true }, { pos: 'LB', isStarter: true }, { pos: 'RB', isStarter: true },
  { pos: 'CDM', isStarter: true }, { pos: 'CM', isStarter: true }, { pos: 'CAM', isStarter: true },
  { pos: 'LW', isStarter: true }, { pos: 'RW', isStarter: true }, { pos: 'ST', isStarter: true },
  { pos: 'GK', isStarter: false },
  { pos: 'CB', isStarter: false }, { pos: 'CM', isStarter: false }, { pos: 'ST', isStarter: false },
];

export function generateSyntheticOpponentSquad(clubConfig: RealClubConfig): Player[] {
  const rng = new SeededRandom(hashStringToSeed(clubConfig.id));
  // starRating (3.5–5.0) -> base overall (~68–88), so top-tier clubs field stronger squads.
  const baseOverall = Math.round(58 + (clubConfig.starRating / 5) * 30);

  return SQUAD_TEMPLATE.map((slot, idx) => {
    const variance = rng.nextRange(-4, 5);
    const overall = Math.max(55, Math.min(90, baseOverall + variance - (slot.isStarter ? 0 : 6)));
    const potential = Math.min(94, overall + rng.nextRange(0, 6));
    const rarity: PlayerRarity = overall >= 85 ? 'legend' : overall >= 78 ? 'rare' : overall >= 70 ? 'prospect' : 'standard';
    const first = rng.pick(GENERIC_FIRST_NAMES);
    const last = rng.pick(GENERIC_LAST_NAMES);
    return {
      id: `${clubConfig.id}_p${idx + 1}`,
      sport: 'football',
      name: `${first} ${last}`,
      nameEn: `${first} ${last}`,
      age: rng.nextRange(19, 33),
      nationality: clubConfig.country,
      nationalityFlag: '🌍',
      position: slot.pos,
      secondaryPositions: [],
      overall,
      potential,
      attributes: {
        pace: slot.pos === 'ST' || slot.pos === 'LW' || slot.pos === 'RW' ? overall : overall - 12,
        shooting: slot.pos === 'ST' ? overall : overall - 18,
        passing: slot.pos === 'CM' || slot.pos === 'CAM' ? overall : overall - 10,
        dribbling: slot.pos === 'LW' || slot.pos === 'RW' || slot.pos === 'CAM' ? overall : overall - 14,
        defending: slot.pos === 'CB' || slot.pos === 'CDM' || slot.pos === 'LB' || slot.pos === 'RB' ? overall : overall - 30,
        physical: overall - 8,
        goalkeeping: slot.pos === 'GK' ? overall : 10,
      },
      rarity,
      personality: 'professional',
      traits: [],
      morale: 80,
      form: rng.nextRange(5, 8),
      stamina: 95,
      fatigue: 0,
      injuredWeeks: 0,
      suspendedMatches: 0,
      contractYears: 2,
      wage: Math.round(overall * 40),
      marketValue: Math.round(overall * overall * 12000),
      photoUrl: undefined,
      realTeam: clubConfig.nameEn,
      matchesPlayed: 0,
      goalsOrPoints: 0,
      assists: 0,
      cleanSheetsOrRebounds: 0,
      averageRating: 6.5,
    };
  });
}