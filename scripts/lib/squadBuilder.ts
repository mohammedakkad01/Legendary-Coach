/**
 * scripts/lib/squadBuilder.ts
 * دوال نقية (بدون شبكة/Firebase) لتحويل تشكيلة API-Football إلى شكل CachedSquadPlayer الذي تقرؤه اللعبة.
 *
 * ⚠️ التقييمات هنا "تقدير مرحلي" (estimate-v1): API-Football لا يعطي تقييماً عاماً للاعب (Overall).
 * نستخدم قوة النادي (ترتيبه في الجدول × قوة الدوري) + عمر اللاعب + تنويع ثابت لكل لاعب.
 * المشكلة 3 ستستبدل هذا بتقييمات مبنية على تقييم اللاعب الفعلي في المباريات (/players) والدقائق.
 */

export type Pos = 'GK' | 'CB' | 'LB' | 'RB' | 'CDM' | 'CM' | 'CAM' | 'LW' | 'RW' | 'ST';

// [قوة الدوري الأساسية، مدى الفرق بين الأول والأخير]
export const LEAGUE_STRENGTH: Record<string, [number, number]> = {
  premier_league: [76, 6], la_liga: [75, 6], serie_a: [74, 6], bundesliga: [73, 6], ligue_1: [71, 6],
  championship: [65, 3], segunda_division: [63, 3], yelo_league: [60, 3], botola_pro: [60, 3],
};

export function clubStrength(leagueKey: string, rank?: number | null, total?: number | null): number {
  const [base, spread] = LEAGUE_STRENGTH[leagueKey] || [65, 4];
  if (!rank || !total || total < 2) return base;
  return base + spread * (1 - (2 * (rank - 1)) / (total - 1));
}

function hash01(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 10000) / 10000;
}

function ageAdj(age: number): number {
  if (age <= 19) return -6;
  if (age <= 21) return -3;
  if (age <= 23) return -1;
  if (age <= 30) return 1;
  if (age <= 33) return -2;
  return -5;
}

export function estimateOverall(id: string, age: number, strength: number): { overall: number; potential: number } {
  const noise = (hash01(id) - 0.5) * 9;
  const overall = Math.round(Math.max(50, Math.min(90, strength + noise + ageAdj(age))));
  const growth = age <= 19 ? 12 : age <= 22 ? 7 : age <= 25 ? 3 : age <= 29 ? 1 : 0;
  const potential = Math.min(94, Math.max(overall, overall + growth));
  return { overall, potential };
}

interface RawPlayer { id: number; name: string; age?: number; number?: number | null; position?: string; photo?: string }

/** يحوّل المراكز الأربعة (Goalkeeper/Defender/Midfielder/Attacker) لمراكز اللعبة مع مساعدة رقم القميص. */
export function assignPositions(players: RawPlayer[]): Map<number, Pos> {
  const out = new Map<number, Pos>();
  const group = (g: string) => players.filter(p => (p.position || '').toLowerCase() === g)
    .sort((a, b) => (a.number ?? 999) - (b.number ?? 999));

  group('goalkeeper').forEach(p => out.set(p.id, 'GK'));

  const def = group('defender');
  def.forEach(p => out.set(p.id, p.number === 2 ? 'RB' : p.number === 3 ? 'LB' : 'CB'));
  if (def.length >= 4) {
    const cbs = def.filter(p => out.get(p.id) === 'CB');
    if (![...out.values()].includes('RB') && cbs.length > 2) out.set(cbs[0].id, 'RB');
    const cbs2 = def.filter(p => out.get(p.id) === 'CB');
    if (![...out.values()].includes('LB') && cbs2.length > 2) out.set(cbs2[0].id, 'LB');
  }

  const mid = group('midfielder');
  mid.forEach(p => out.set(p.id, p.number === 6 || p.number === 4 ? 'CDM' : p.number === 10 ? 'CAM' : 'CM'));
  if (mid.length >= 4) {
    if (![...mid].some(p => out.get(p.id) === 'CDM')) {
      const oldest = [...mid].sort((a, b) => (b.age ?? 0) - (a.age ?? 0))[0];
      out.set(oldest.id, 'CDM');
    }
    if (![...mid].some(p => out.get(p.id) === 'CAM')) {
      const youngestCm = [...mid].filter(p => out.get(p.id) === 'CM').sort((a, b) => (a.age ?? 99) - (b.age ?? 99))[0];
      if (youngestCm) out.set(youngestCm.id, 'CAM');
    }
  }

  const att = group('attacker');
  att.forEach(p => out.set(p.id, p.number === 7 ? 'RW' : p.number === 11 ? 'LW' : 'ST'));
  if (att.length >= 3 && ![...att].some(p => out.get(p.id) === 'ST')) out.set(att[0].id, 'ST');

  players.forEach(p => { if (!out.has(p.id)) out.set(p.id, 'CM'); });
  return out;
}

export function buildSquadPlayers(raw: RawPlayer[], leagueKey: string, rank?: number | null, total?: number | null) {
  const strength = clubStrength(leagueKey, rank, total);
  const list = [...raw]
    .sort((a, b) => Number(!!b.number) - Number(!!a.number))
    .slice(0, 32);
  const pos = assignPositions(list);
  return list.map(p => {
    const age = Math.max(16, Math.min(42, p.age || 24));
    const { overall, potential } = estimateOverall(String(p.id), age, strength);
    return {
      idPlayer: String(p.id),
      name: p.name || '',
      nameEn: p.name || '',
      position: pos.get(p.id) as Pos,
      positionRaw: p.position || '',
      nationality: '',
      age,
      number: p.number ? String(p.number) : '',
      photoUrl: p.photo || '',
      overall,
      potential,
      ratingEstimated: true,
    };
  });
}
