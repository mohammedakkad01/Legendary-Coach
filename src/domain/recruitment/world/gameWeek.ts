/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { GameSaveData } from '../../../types/save';
import { RECRUITMENT_TUNING as T } from '../config/recruitmentTuning';

/** Derive a monotonic week index from matchday progression (integration hook). */
export function deriveGameWeekFromSave(save: GameSaveData): number {
  const days = save.simulatedMatchdays?.length ?? 0;
  if (days > 0) return Math.max(1, days);
  return T.migration.defaultGameWeek;
}

export function calendarWeekFromGameWeek(gameWeek: number): number {
  const w = ((gameWeek - 1) % 52) + 1;
  return w;
}
