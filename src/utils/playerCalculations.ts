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
import { computeEffectiveRating } from '../domain/squad/positionSuitability';
import { normalizeSlot as normalizeSlotImpl } from '../domain/squad/positionTaxonomy';

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
// منطق التوافق انتقل بلا أي تغيير في الأرقام إلى المصدر الوحيد:
//   - domain/squad/positionTaxonomy.ts   (عائلات المراكز وتطبيع الخانات)
//   - domain/squad/positionSuitability.ts (التوافق + تفصيل الأسباب)
//   - config/gameTuning.ts               (الأرقام نفسها)
// وتبقى الدالتان أدناه كواجهة متوافقة مع كل الاستدعاءات القديمة.

/** تطبيع اسم خانة التشكيلة (LWB/RM/…) إلى أقرب مركز رسمي — يُفوَّض للمصدر الوحيد. */
export function normalizeSlot(assignedPosition: string): PlayerPosition | null {
  return normalizeSlotImpl(assignedPosition);
}

/**
 * التقييم الفعّال للاعب في مركز معيّن على لوحة التكتيكات: توافق المركز ثم
 * خصم الإرهاق ومكافأة/عقوبة المعنويات. للحصول على تفصيل الأسباب استخدم
 * computeEffectiveRating مباشرة.
 */
export function getEffectivePlayerRating(player: Player, assignedPosition: string): number {
  return computeEffectiveRating(player, assignedPosition).effective;
}
