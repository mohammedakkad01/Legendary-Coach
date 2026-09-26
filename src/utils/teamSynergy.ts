/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * المدرب الأسطورة — The Legendary Coach
 * الخطوة 3: مؤشر تناغم التشكيلة (Squad Synergy & Chemistry)
 *
 * دالة نقية بالكامل — تُستدعى من داخل useGameStore (getTeamSynergy) وتُعرض
 * كـ Feedback مرئي في TacticalBoardView بدل الرقم الثابت "92%" السابق.
 */

import type { Player, FootballFormation, FootballTactics } from '../types/game';
import { FORMATION_POSITIONS } from '../data/formationLayouts';
import { normalizeSlot } from './playerCalculations';

export type SynergyRating = 'ممتاز' | 'جيد' | 'مناسب' | 'سيئ';

export interface TeamSynergyResult {
  score: number; // 0-100
  rating: SynergyRating;
  ratingEn: 'Excellent' | 'Good' | 'Average' | 'Poor';
  naturalPositionRate: number; // 0-1: نسبة اللاعبين في مركزهم الطبيعي تماماً
  warnings: string[]; // ملاحظات عربية قصيرة عن مشاكل التوازن التكتيكي
}

type PositionFamily = 'GK' | 'DEF' | 'MID' | 'ATT';

function familyOf(core: ReturnType<typeof normalizeSlot>): PositionFamily | null {
  if (!core) return null;
  if (core === 'GK') return 'GK';
  if (core === 'CB' || core === 'LB' || core === 'RB') return 'DEF';
  if (core === 'ST' || core === 'LW' || core === 'RW') return 'ATT';
  return 'MID'; // CDM, CM, CAM
}

/**
 * يقيّم التشكيلة الحالية (0-100) بناءً على نسبة اللاعبين في مراكزهم
 * الطبيعية والتوازن التكتيكي (حارس واحد، عدد كافٍ من المدافعين حسب
 * العقلية التكتيكية، ووجود خط هجومي).
 *
 * startingXI: مصفوفة بطول 11 خانة مرتبة حسب تشكيلة formation — undefined
 * لأي خانة فارغة لم يُسند لها لاعب بعد.
 */
export function calculateTeamSynergy(
  startingXI: (Player | undefined)[],
  formation: FootballFormation,
  tactics: FootballTactics
): TeamSynergyResult {
  const slots = FORMATION_POSITIONS[formation] || FORMATION_POSITIONS['4-3-3'];
  const totalSlots = slots.length;
  const warnings: string[] = [];

  let exactMatches = 0;
  let gkCount = 0;
  let defendersCount = 0;
  let attackersCount = 0;
  let filledCount = 0;

  slots.forEach((slotLabel, idx) => {
    const player = startingXI[idx];
    if (!player) return;
    filledCount += 1;

    const slotCore = normalizeSlot(slotLabel);
    if (slotCore && player.position === slotCore) exactMatches += 1;

    const family = familyOf(slotCore);
    if (family === 'GK') gkCount += 1;
    else if (family === 'DEF') defendersCount += 1;
    else if (family === 'ATT') attackersCount += 1;
  });

  const naturalPositionRate = totalSlots > 0 ? exactMatches / totalSlots : 0;

  // العقليات الدفاعية تتطلب خط دفاعي أعرض ليُعتبر التوازن جيداً
  const requiredDefenders = tactics.mentality === 'ultra_defensive' || tactics.mentality === 'defensive' ? 4 : 3;

  let balanceScore = 100;

  if (gkCount === 0) {
    balanceScore -= 40;
    warnings.push('لا يوجد حارس مرمى في التشكيلة!');
  } else if (gkCount > 1) {
    balanceScore -= 40;
    warnings.push('يوجد أكثر من حارس مرمى في التشكيلة!');
  }

  if (defendersCount < requiredDefenders) {
    balanceScore -= 25;
    warnings.push(`عدد المدافعين غير كافٍ (${defendersCount}/${requiredDefenders})`);
  }

  if (attackersCount < 1) {
    balanceScore -= 15;
    warnings.push('لا يوجد خط هجومي واضح (مهاجم أو جناح)');
  }

  const missingSlots = totalSlots - filledCount;
  if (missingSlots > 0) {
    balanceScore -= missingSlots * 8;
    warnings.push(`${missingSlots} ${missingSlots === 1 ? 'مركز شاغر' : 'مراكز شاغرة'} في التشكيلة`);
  }

  balanceScore = Math.max(0, Math.min(100, balanceScore));

  const score = Math.max(0, Math.min(100, Math.round(naturalPositionRate * 60 + balanceScore * 0.4)));

  let rating: SynergyRating;
  let ratingEn: TeamSynergyResult['ratingEn'];
  if (score >= 85) { rating = 'ممتاز'; ratingEn = 'Excellent'; }
  else if (score >= 65) { rating = 'جيد'; ratingEn = 'Good'; }
  else if (score >= 45) { rating = 'مناسب'; ratingEn = 'Average'; }
  else { rating = 'سيئ'; ratingEn = 'Poor'; }

  return { score, rating, ratingEn, naturalPositionRate, warnings };
}
