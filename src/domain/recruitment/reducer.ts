/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Recruitment-owned state applicator (does not touch livingWorld / PlayerLife).
 */

import type { RecruitmentPatch, RecruitmentWorldState } from './types';
import type { TrueWorldPlayer } from './trueProfile/types';

function applyOne(state: RecruitmentWorldState, patch: RecruitmentPatch): RecruitmentWorldState {
  switch (patch.kind) {
    case 'setGameWeek':
      return { ...state, gameWeek: patch.gameWeek };
    case 'setTransferWindow':
      return { ...state, transferWindow: patch.transferWindow };
    case 'upsertKnowledge': {
      const byClub = { ...(state.knowledgeByObserverClubId[patch.knowledge.observerClubId] ?? {}) };
      byClub[patch.knowledge.playerId] = patch.knowledge;
      return {
        ...state,
        knowledgeByObserverClubId: {
          ...state.knowledgeByObserverClubId,
          [patch.knowledge.observerClubId]: byClub,
        },
      };
    }
    case 'mergeWorldPlayer': {
      const prev: TrueWorldPlayer | undefined = state.worldPlayers[patch.playerId];
      if (!prev) return state;
      return {
        ...state,
        worldPlayers: {
          ...state.worldPlayers,
          [patch.playerId]: { ...prev, ...patch.patch, playerId: patch.playerId },
        },
      };
    }
    default: {
      const _exhaustive: never = patch;
      return _exhaustive;
    }
  }
}

export function applyRecruitmentPatches(
  state: RecruitmentWorldState,
  patches: readonly RecruitmentPatch[],
): RecruitmentWorldState {
  return patches.reduce((acc, p) => applyOne(acc, p), state);
}
