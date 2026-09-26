/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * المدرب الأسطورة — The Legendary Coach
 * الخطوة 4: محاكاة "جولة" هجومية واحدة (Match Round) بنظام تضاد التكتيكات
 * (Tactical Countering): سيطرة على الوسط ← صناعة وحسم فرصة.
 *
 * ملاحظة معمارية مهمة:
 * محرك المباراة الفعلي المستخدم في المباريات المباشرة داخل التطبيق هو
 * FootballMatchEngine (src/engine/footballEngine.ts) — محاكاة دقيقة بدقيقة
 * (Poisson/probabilistic) تعمل بالفعل وتُستدعى من useGameStore وLiveMatchView.
 * الدالة هنا مستقلة عنه تماماً: تنفّذ بالحرف الطلب الأصلي (سيطرة وسط ثم
 * فرصة تهديفية واحدة، بجمع سمات خام بدل تقييم مركّب)، وهي مناسبة كأداة
 * محاكاة سريعة/تفسيرية (مثال: "معاينة الجولة القادمة") أو للبناء عليها لاحقاً.
 * لم أدمجها داخل محرك المباراة الحي لتفادي استبدال نظام يعمل فعلياً دون طلب صريح.
 */

import type { Player, PlayerPosition, FootballTactics } from '../types/game';
import type { FootballAttrKey } from '../utils/playerCalculations';
import { SeededRandom } from './prng';

const attr = (p: Player, key: FootballAttrKey): number => p.attributes[key] ?? p.overall;

const isMidfielder = (pos: PlayerPosition) => pos === 'CDM' || pos === 'CM' || pos === 'CAM';
const isAttacker = (pos: PlayerPosition) => pos === 'ST' || pos === 'LW' || pos === 'RW';
const isDefender = (pos: PlayerPosition) => pos === 'CB' || pos === 'LB' || pos === 'RB';

export interface TacticalCounterEffect {
  active: boolean;
  attackerPaceMultiplier: number; // e.g. 1.15 = ‎+15%
  descriptionAr: string;
}

/**
 * تضاد التكتيك: هل يستفيد fromTactic من المساحات التي يتركها againstTactic؟
 * المثال المحدد في الطلب: ارتداد سريع (passing: 'direct_counter') في مواجهة
 * استحواذ/تيكي-تاكا (passing: 'short_tiki_taka') أو ضغط عالٍ
 * (pressing: 'high_press' | 'gegenpress') ← ‎+15% لسرعة المهاجمين (pace).
 */
export function getTacticalCounterEffect(fromTactic: FootballTactics, againstTactic: FootballTactics): TacticalCounterEffect {
  const opponentPushesUp =
    againstTactic.passing === 'short_tiki_taka' ||
    againstTactic.pressing === 'high_press' ||
    againstTactic.pressing === 'gegenpress';

  if (fromTactic.passing === 'direct_counter' && opponentPushesUp) {
    return {
      active: true,
      attackerPaceMultiplier: 1.15,
      descriptionAr: 'هجوم مرتد يستغل المساحات خلف خط الضغط العالي/الاستحواذ للمنافس (+15% سرعة المهاجمين)',
    };
  }
  return { active: false, attackerPaceMultiplier: 1, descriptionAr: '' };
}

/** الضغط العالي يساعد على استرجاع الكرة في الوسط؛ الكتلة المنخفضة تتنازل عنه قليلاً. */
function pressingMidfieldFactor(tactics: FootballTactics): number {
  if (tactics.pressing === 'gegenpress') return 1.08;
  if (tactics.pressing === 'high_press') return 1.04;
  if (tactics.pressing === 'low_block') return 0.96;
  return 1;
}

function midfieldRating(team: Player[], tactics: FootballTactics, counterFactor: number): number {
  const midfielders = team.filter(p => isMidfielder(p.position));
  if (midfielders.length === 0) return 0;
  const sum = midfielders.reduce((acc, p) => acc + attr(p, 'passing') + attr(p, 'dribbling') + attr(p, 'defending'), 0);
  return (sum / midfielders.length) * pressingMidfieldFactor(tactics) * counterFactor;
}

export interface MatchRoundResult {
  midfieldWinner: 'my' | 'opponent';
  myMidfieldScore: number;
  oppMidfieldScore: number;
  myCounterEffect: TacticalCounterEffect;
  oppCounterEffect: TacticalCounterEffect;
  chanceSide: 'my' | 'opponent';
  attackScore: number;
  defenseScore: number;
  isGoal: boolean;
  summaryAr: string;
}

/**
 * يحاكي جولة هجومية واحدة بين فريقين حسب تكتيكيهما، مع تطبيق نظام التكتيك
 * المضاد. myTeam/opponentTeam: التشكيلة الأساسية (11 لاعباً) لكل فريق.
 * rng: مولّد أرقام عشوائي محدَّد (Seeded) لضمان نتائج قابلة للاختبار — يتّبع
 * نفس نمط FootballMatchEngine.
 */
export function simulateMatchRound(
  myTeam: Player[],
  opponentTeam: Player[],
  myTactic: FootballTactics,
  oppTactic: FootballTactics,
  rng: SeededRandom = new SeededRandom(Date.now())
): MatchRoundResult {
  const myCounterEffect = getTacticalCounterEffect(myTactic, oppTactic);
  const oppCounterEffect = getTacticalCounterEffect(oppTactic, myTactic);

  // مرحلة 1: السيطرة على الوسط — عند الاعتماد على الهجوم المرتد يتنازل
  // الفريق قليلاً عن استحواذ الوسط مقابل استغلال المساحة عند الارتداد.
  const myMidfieldScore = midfieldRating(myTeam, myTactic, myCounterEffect.active ? 0.92 : 1) + rng.nextRange(-3, 3);
  const oppMidfieldScore = midfieldRating(opponentTeam, oppTactic, oppCounterEffect.active ? 0.92 : 1) + rng.nextRange(-3, 3);

  const midfieldWinner: 'my' | 'opponent' = myMidfieldScore >= oppMidfieldScore ? 'my' : 'opponent';

  // مرحلة 2: صناعة وحسم الفرص — الفريق الفائز بالوسط فقط يصل لفرصة تهديفية
  const attackingTeam = midfieldWinner === 'my' ? myTeam : opponentTeam;
  const defendingTeam = midfieldWinner === 'my' ? opponentTeam : myTeam;
  const attackCounter = midfieldWinner === 'my' ? myCounterEffect : oppCounterEffect;

  const attackers = attackingTeam.filter(p => isAttacker(p.position));
  const attackScore = attackers.length > 0
    ? attackers.reduce((acc, p) => acc + attr(p, 'shooting') + attr(p, 'pace') * attackCounter.attackerPaceMultiplier, 0) / attackers.length
    : 0;

  const defenders = defendingTeam.filter(p => isDefender(p.position));
  const gk = defendingTeam.find(p => p.position === 'GK');
  const defenseScore =
    (defenders.length > 0
      ? defenders.reduce((acc, p) => acc + attr(p, 'defending') + attr(p, 'physical'), 0) / defenders.length
      : 0) + (gk ? attr(gk, 'goalkeeping') : 0) / 2;

  const ratio = attackScore / Math.max(20, defenseScore);
  const goalChance = Math.max(0.05, Math.min(0.65, 0.28 * ratio));
  const isGoal = rng.nextChance(goalChance);

  const winnerLabel = midfieldWinner === 'my' ? 'فريقك' : 'الخصم';
  return {
    midfieldWinner,
    myMidfieldScore: Math.round(myMidfieldScore),
    oppMidfieldScore: Math.round(oppMidfieldScore),
    myCounterEffect,
    oppCounterEffect,
    chanceSide: midfieldWinner,
    attackScore: Math.round(attackScore),
    defenseScore: Math.round(defenseScore),
    isGoal,
    summaryAr: isGoal
      ? `${winnerLabel} يسيطر على الوسط ويسجّل هدفاً!`
      : `${winnerLabel} يسيطر على الوسط لكن الفرصة تُهدر.`,
  };
}
