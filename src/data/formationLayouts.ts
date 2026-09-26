/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * قائمة مراكز كل تشكيلة (بدون إحداثيات x/y) — مصدر مشترك يُستخدم في
 * حسابات التناغم (utils/teamSynergy.ts) بدل تكرار البيانات.
 *
 * ملاحظة: يجب أن تبقى هذه القائمة مطابقة لمصفوفة FORMATION_COORDINATES
 * في src/components/TacticalBoardView.tsx (نفس تسميات المراكز لكل تشكيلة).
 */

import type { FootballFormation } from '../types/game';

export const FORMATION_POSITIONS: Record<FootballFormation, string[]> = {
  '4-3-3': ['GK', 'RB', 'CB', 'CB', 'LB', 'CDM', 'CM', 'CM', 'RW', 'ST', 'LW'],
  '4-4-2': ['GK', 'RB', 'CB', 'CB', 'LB', 'RM', 'CM', 'CM', 'LM', 'ST', 'ST'],
  '4-2-3-1': ['GK', 'RB', 'CB', 'CB', 'LB', 'CDM', 'CDM', 'RAM', 'CAM', 'LAM', 'ST'],
  '3-5-2': ['GK', 'CB', 'CB', 'CB', 'RWB', 'CM', 'CAM', 'CM', 'LWB', 'ST', 'ST'],
  '5-3-2': ['GK', 'RWB', 'CB', 'CB', 'CB', 'LWB', 'CM', 'CDM', 'CM', 'ST', 'ST'],
  '4-1-4-1': ['GK', 'RB', 'CB', 'CB', 'LB', 'CDM', 'RM', 'CM', 'CM', 'LM', 'ST'],
  '3-4-3': ['GK', 'CB', 'CB', 'CB', 'RM', 'CM', 'CM', 'LM', 'RW', 'ST', 'LW'],
};
