/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Store / persistence integration boundary for recruitment slice only.
 */

import type { GameSaveData } from '../../types/save';
import type { RecruitmentPatch, RecruitmentWorldState } from './types';
import { applyRecruitmentPatches } from './reducer';
import { calendarWeekFromGameWeek, deriveGameWeekFromSave } from './world/gameWeek';
import { buildTransferWindowState } from './world/transferWindow';
import {
  runWeeklyRecruitmentTick,
  type RecruitmentWeeklyTickInput,
  type RecruitmentWeeklyTickResult,
} from './tick/weeklyRecruitmentTick';

export interface RecruitmentIntegrationResult {
  save: GameSaveData;
  recruitmentWorld: RecruitmentWorldState;
}

export function applyRecruitmentToSave(
  save: GameSaveData,
  patches: readonly RecruitmentPatch[],
): RecruitmentIntegrationResult {
  const base = save.recruitmentWorld;
  if (!base) {
    throw new Error('recruitmentWorld missing — run ensureRecruitmentV5 first');
  }
  const recruitmentWorld = applyRecruitmentPatches(base, patches);
  return {
    save: { ...save, recruitmentWorld },
    recruitmentWorld,
  };
}

/** Sync calendar week / window from current save progression (pure). */
export function syncRecruitmentCalendarFromSave(save: GameSaveData): RecruitmentPatch[] {
  const rw = save.recruitmentWorld;
  if (!rw) return [];
  const gameWeek = deriveGameWeekFromSave(save);
  const calendarWeek = calendarWeekFromGameWeek(gameWeek);
  const window = buildTransferWindowState(calendarWeek);
  const patches: RecruitmentPatch[] = [];
  if (rw.gameWeek !== gameWeek) patches.push({ kind: 'setGameWeek', gameWeek });
  if (
    rw.transferWindow.calendarWeek !== window.calendarWeek ||
    rw.transferWindow.phase !== window.phase
  ) {
    patches.push({ kind: 'setTransferWindow', transferWindow: window });
  }
  return patches;
}

export function runRecruitmentCalendarSync(save: GameSaveData): GameSaveData {
  const patches = syncRecruitmentCalendarFromSave(save);
  if (patches.length === 0) return save;
  return applyRecruitmentToSave(save, patches).save;
}

/** Apply scouting patches and persist on save (store hook point for later parts). */
export function applyScoutingPatchesToSave(
  save: GameSaveData,
  patches: readonly RecruitmentPatch[],
): RecruitmentIntegrationResult {
  return applyRecruitmentToSave(save, patches);
}

export type WeeklyRecruitmentTickSaveInput = Omit<
  RecruitmentWeeklyTickInput,
  'worldSeed' | 'gameWeek' | 'userClubId'
> & {
  gameWeek?: number;
  userClubId?: string;
};

export interface WeeklyRecruitmentTickSaveResult extends RecruitmentWeeklyTickResult {
  save: GameSaveData;
  recruitmentWorld: RecruitmentWorldState;
}

/** Apply one weekly recruitment tick and persist patches on save (store hook point). */
export function runWeeklyRecruitmentTickOnSave(
  save: GameSaveData,
  input: WeeklyRecruitmentTickSaveInput,
): WeeklyRecruitmentTickSaveResult {
  const base = save.recruitmentWorld;
  if (!base) {
    throw new Error('recruitmentWorld missing — run ensureRecruitmentV5 first');
  }
  const gameWeek = input.gameWeek ?? deriveGameWeekFromSave(save);
  const userClubId = input.userClubId ?? save.club.id;
  const tick = runWeeklyRecruitmentTick(base, {
    ...input,
    worldSeed: base.worldSeed,
    gameWeek,
    userClubId,
  });
  const recruitmentWorld = applyRecruitmentPatches(base, tick.patches);
  return {
    save: { ...save, recruitmentWorld },
    recruitmentWorld,
    ...tick,
  };
}
