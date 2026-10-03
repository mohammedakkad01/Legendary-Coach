/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { RecruitmentPatch, RecruitmentWorldState, TransferWindowState } from '../../types';
import { calendarWeekFromGameWeek } from '../../world/gameWeek';
import {
  buildTransferWindowState,
  checkPermanentTransferAllowed,
  isTransferWindowOpen,
} from '../../world/transferWindow';

export interface TransferWindowEvaluation {
  transferWindow: TransferWindowState;
  transferWindowOpen: boolean;
  permanentTransferAllowed: boolean;
}

export function evaluateTransferWindowForWeek(gameWeek: number): TransferWindowEvaluation {
  const calendarWeek = calendarWeekFromGameWeek(gameWeek);
  const transferWindow = buildTransferWindowState(calendarWeek);
  return {
    transferWindow,
    transferWindowOpen: isTransferWindowOpen(transferWindow),
    permanentTransferAllowed: checkPermanentTransferAllowed(transferWindow).allowed,
  };
}

export function buildCalendarSyncPatches(
  world: RecruitmentWorldState,
  gameWeek: number,
  transferWindow: TransferWindowState,
): RecruitmentPatch[] {
  const patches: RecruitmentPatch[] = [];
  if (world.gameWeek !== gameWeek) {
    patches.push({ kind: 'setGameWeek', gameWeek });
  }
  if (
    world.transferWindow.calendarWeek !== transferWindow.calendarWeek ||
    world.transferWindow.phase !== transferWindow.phase
  ) {
    patches.push({ kind: 'setTransferWindow', transferWindow });
  }
  return patches;
}
