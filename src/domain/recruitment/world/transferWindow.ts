/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { RECRUITMENT_TUNING as T } from '../config/recruitmentTuning';
import type { TransferWindowPhase, TransferWindowState } from '../types';

export function resolveTransferWindowPhase(calendarWeek: number): TransferWindowPhase {
  const w = calendarWeek;
  const { summerOpenWeekStart, summerOpenWeekEnd, winterOpenWeekStart, winterOpenWeekEnd } =
    T.transferWindow;
  if (w >= summerOpenWeekStart && w <= summerOpenWeekEnd) return 'summer';
  if (w >= winterOpenWeekStart && w <= winterOpenWeekEnd) return 'winter';
  return 'closed';
}

export function buildTransferWindowState(calendarWeek: number): TransferWindowState {
  return {
    calendarWeek,
    phase: resolveTransferWindowPhase(calendarWeek),
  };
}

export function isTransferWindowOpen(state: TransferWindowState): boolean {
  return state.phase === 'summer' || state.phase === 'winter';
}

export type TransferWindowBlockReason = 'window_closed' | 'window_phase_mismatch';

export interface TransferWindowCheckResult {
  allowed: boolean;
  reason?: TransferWindowBlockReason;
  phase: TransferWindowPhase;
}

/** Domain gate for permanent transfers (loans may differ in a later part). */
export function checkPermanentTransferAllowed(
  windowState: TransferWindowState,
  requiredPhase?: TransferWindowPhase,
): TransferWindowCheckResult {
  if (!isTransferWindowOpen(windowState)) {
    return { allowed: false, reason: 'window_closed', phase: windowState.phase };
  }
  if (requiredPhase && windowState.phase !== requiredPhase) {
    return { allowed: false, reason: 'window_phase_mismatch', phase: windowState.phase };
  }
  return { allowed: true, phase: windowState.phase };
}
