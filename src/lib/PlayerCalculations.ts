/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * المدرب الأسطورة — The Legendary Coach
 * حسابات اللاعب: التقييم العام (Overall) حسب المركز، والتقييم الفعّال
 * عند وضع اللاعب في مركز غير مركزه الأساسي (Out of Position Penalty).
 *
 * ملاحظة معمارية:
 * الحقول `position` و `secondaryPositions` و `attributes` موجودة أصلاً في
 * واجهة Player (src/types/game.ts) وتغطي طلب "المركز الأساسي/الثانوي"،
 * لذلك لم يتم تعديل types.ts — تم فقط إضافة هذا الملف كدوال نقية (Pure
 * Functions) منفصلة كما يقتضي التصميم.
 */

import type { Player, PlayerAttributes, PlayerPosition } from '../types/game';

// -----------------------------------------------------------------------
// الخطوة 1: حساب الـ Overall حسب أوزان كل مركز
// -----------------------------------------------------------------------

export type FootballAttrKey = 'pace' | 'shooting' | 'passing' | 'dribbling' | 'defending' | 'physical' | 'goalkeeping';

/** أوزان كل سمة لكل مركز (يجب أن يكون مجموعها 1 لكل مركز). */
const POSITION_WEIGHTS: Record<PlayerPosition, Partial<Record<FootballAttrKey, number>>> = {
  GK: { goalkeeping: 0.85, physical: 0.10, passing: 0.05 },
  CB: { defending: 0.45, physical: 0.30, pace: 0.10, passing: 0.10, dribbling: 0.05 },
  LB: { defending: 0.30, pace: 0.25, physical: 0.15, passing: 0.15, dribbling: 0.15 },
  RB: { defending: 0.30, pace: 0.25, physical: 0.15, passing: 0.15, dribbling: 0.15 },
  CDM: { defending: 0.35, passing: 0.25, physical: 0.20, dribbling: 0.10, pace: 0.10 },
  CM: { passing: 0.30, dribbling: 0.25, defending: 0.15, physical: 0.15, pace: 0.15 },
  CAM: { passing: 0.25, dribbling: 0.30, shooting: 0.20, pace: 0.15, physical: 0.10 },
  LW: { pace: 0.30, dribbling: 0.30, shooting: 0.20, passing: 0.15, physical: 0.05 },
  RW: { pace: 0.30, dribbling: 0.30, shooting: 0.20, passing: 0.15, physical: 0.05 },
  ST: { shooting: 0.45, pace: 0.25, physical: 0.15, dribbling: 0.10, passing: 0.05 },
  // مراكز كرة السلة غير مشمولة بهذه الخطوة (تُعالج في مرحلة لاحقة عند الحاجة)
  PG: {}, SG: {}, SF: {}, PF: {}, C: {},
};

/**
 * يحسب التقييم العام (1-99) بناءً على سمات اللاعب ومركزه الأساسي.
 * دالة نقية بالكامل — لا تعتمد على أي حالة خارجية.
 */
export function calculateOverall(attributes: PlayerAttributes, naturalPosition: PlayerPosition): number {
  const weights = POSITION_WEIGHTS[naturalPosition];
  if (!weights || Object.keys(weights).length === 0) {
    // مركز غير مدعوم بعد (كرة سلة) — رجوع آمن بدل استثناء
    return 0;
  }

  let total = 0;
  let weightSum = 0;
  for (const [key, weight] of Object.entries(weights) as [FootballAttrKey, number][]) {
    const value = attributes[key] ?? 0;
    total += value * weight;
    weightSum += weight;
  }

  const overall = weightSum > 0 ? total / weightSum : 0;
  return Math.max(1, Math.min(99, Math.round(overall)));
}

// -----------------------------------------------------------------------
// الخطوة 2: عقوبة المركز (Out of Position Penalty)
// -----------------------------------------------------------------------

/** تجميع المراكز إلى "عائلات" على خط تصاعدي من حارس المرمى حتى المهاجم. */
type PositionFamily = 'GK' | 'DEF_CENTRAL' | 'DEF_WIDE' | 'MID_DEF' | 'MID_CENTRAL' | 'MID_ATT' | 'WIDE_ATT' | 'ST';

const FAMILY_OF: Record<PlayerPosition, PositionFamily | null> = {
  GK: 'GK',
  CB: 'DEF_CENTRAL',
  LB: 'DEF_WIDE', RB: 'DEF_WIDE',
  CDM: 'MID_DEF',
  CM: 'MID_CENTRAL',
  CAM: 'MID_ATT',
  LW: 'WIDE_ATT', RW: 'WIDE_ATT',
  ST: 'ST',
  PG: null, SG: null, SF: null, PF: null, C: null,
};

// ترتيب العائلات على "خط الملعب" من الدفاع إلى الهجوم، لحساب المسافة بينها
const FAMILY_ORDER: PositionFamily[] = ['GK', 'DEF_CENTRAL', 'DEF_WIDE', 'MID_DEF', 'MID_CENTRAL', 'MID_ATT', 'WIDE_ATT', 'ST'];

/**
 * مراكز لوحة التكتيكات (formation slots) أوسع من PlayerPosition الرسمية
 * (تشمل LWB/RWB/LM/RM/LAM/RAM). نطبّعها هنا إلى أقرب مركز رسمي مكافئ
 * لغرض حساب التوافق فقط.
 */
const SLOT_ALIASES: Record<string, PlayerPosition> = {
  LWB: 'LB', RWB: 'RB',
  LM: 'LW', RM: 'RW',
  LAM: 'CAM', RAM: 'CAM',
};

export function normalizeSlot(assignedPosition: string): PlayerPosition | null {
  const upper = assignedPosition.toUpperCase();
  if (upper in FAMILY_OF) return upper as PlayerPosition;
  return SLOT_ALIASES[upper] ?? null;
}

/** نسبة الكفاءة (0-1) حسب توافق المركز فقط، قبل تعديلات الإرهاق/المعنويات. */
function getPositionCompatibility(natural: PlayerPosition, secondaryPositions: PlayerPosition[], assignedPosition: string): number {
  const assignedCore = normalizeSlot(assignedPosition);
  if (!assignedCore) return 0.65; // مركز غير معروف — افتراض متوسط آمن

  if (assignedCore === natural) return 1.0;

  // حارس مرمى يلعب في الملعب، أو العكس: عقوبة قصوى بغض النظر عن أي شيء آخر
  if (natural === 'GK' || assignedCore === 'GK') return 0.15;

  // مركز ثانوي مصرّح به للاعب: توافق قريب مضمون
  if (secondaryPositions.includes(assignedCore)) return 0.85;

  const naturalFamily = FAMILY_OF[natural];
  const assignedFamily = FAMILY_OF[assignedCore];
  if (!naturalFamily || !assignedFamily) return 0.65;

  const distance = Math.abs(FAMILY_ORDER.indexOf(naturalFamily) - FAMILY_ORDER.indexOf(assignedFamily));
  if (distance === 0) return 1.0;
  if (distance === 1) return 0.85;
  if (distance <= 3) return 0.65;
  return 0.40;
}

/**
 * التقييم الفعّال للاعب في مركز معيّن على لوحة التكتيكات: يأخذ بالحسبان
 * توافق المركز، ثم يخصم للإرهاق ويكافئ/يعاقب حسب المعنويات.
 * يعتمد على player.overall المخزّن أصلاً (وليس إعادة حسابه) — إن رغب
 * المستخدم بإعادة الحساب من attributes عند كل استدعاء يمكن استبدالها
 * بـ calculateOverall(player.attributes, player.position) لاحقاً.
 */
export function getEffectivePlayerRating(player: Player, assignedPosition: string): number {
  const compatibility = getPositionCompatibility(player.position, player.secondaryPositions, assignedPosition);

  // خصم الإرهاق: حتى 30% عند إرهاق كامل (100)
  const fatiguePenalty = 1 - (player.fatigue / 100) * 0.3;

  // مكافأة/عقوبة المعنويات: من 0.9 عند أدنى معنويات حتى 1.1 عند أعلاها (المحور عند 50)
  const moraleFactor = 0.9 + (player.morale / 100) * 0.2;

  const effective = player.overall * compatibility * fatiguePenalty * moraleFactor;
  return Math.max(1, Math.min(99, Math.round(effective)));
}
