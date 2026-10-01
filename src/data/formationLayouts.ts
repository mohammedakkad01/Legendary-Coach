/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * قائمة مراكز كل تشكيلة (بدون إحداثيات x/y).
 *
 * لم تعد هذه البيانات مكرّرة: المصدر الوحيد هو
 * src/domain/squad/formations.ts وهذا الملف مجرد عرض مشتق منه للحفاظ على
 * التوافق مع الاستيرادات القديمة.
 */

import type { FootballFormation } from '../types/game';
import { FORMATION_DEFINITIONS, FORMATION_IDS } from '../domain/squad/formations';

export const FORMATION_POSITIONS: Record<FootballFormation, string[]> = Object.fromEntries(
  FORMATION_IDS.map((id) => [id, FORMATION_DEFINITIONS[id].slots.map((s) => s.label)]),
) as Record<FootballFormation, string[]>;
