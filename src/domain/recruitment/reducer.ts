/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Recruitment-owned state applicator (does not touch livingWorld / PlayerLife).
 */

import { RECRUITMENT_TUNING as T } from './config/recruitmentTuning';
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
    case 'upsertWorldPlayer':
      return {
        ...state,
        worldPlayers: {
          ...state.worldPlayers,
          [patch.player.playerId]: patch.player,
        },
      };
    case 'setScoutNetwork':
      return { ...state, scoutNetwork: [...patch.scouts] };
    case 'upsertScoutingAssignment': {
      const idx = state.scoutingAssignments.findIndex((a) => a.id === patch.assignment.id);
      const scoutingAssignments =
        idx >= 0
          ? state.scoutingAssignments.map((a, i) => (i === idx ? patch.assignment : a))
          : [...state.scoutingAssignments, patch.assignment];
      return { ...state, scoutingAssignments };
    }
    case 'appendScoutingReport': {
      const scoutingReports = [...state.scoutingReports, patch.report];
      const max = T.scouting.maxStoredReports;
      return {
        ...state,
        scoutingReports: scoutingReports.length > max ? scoutingReports.slice(-max) : scoutingReports,
      };
    }
    case 'upsertNegotiation': {
      const idx = state.negotiations.findIndex((n) => n.id === patch.negotiation.id);
      const negotiations =
        idx >= 0
          ? state.negotiations.map((n, i) => (i === idx ? patch.negotiation : n))
          : [...state.negotiations, patch.negotiation];
      return { ...state, negotiations };
    }
    case 'upsertAiClubProfile':
      return {
        ...state,
        aiClubProfiles: {
          ...state.aiClubProfiles,
          [patch.profile.clubId]: patch.profile,
        },
      };
    case 'appendTransferRumor': {
      const transferRumors = [...state.transferRumors, patch.rumor];
      const max = T.rumors.maxStoredRumors;
      return {
        ...state,
        transferRumors: transferRumors.length > max ? transferRumors.slice(-max) : transferRumors,
      };
    }
    case 'appendClubInterest': {
      const clubInterestRecords = [...state.clubInterestRecords, patch.interest];
      const max = T.rumors.maxStoredInterests;
      return {
        ...state,
        clubInterestRecords: clubInterestRecords.length > max ? clubInterestRecords.slice(-max) : clubInterestRecords,
      };
    }
    case 'setRumorThrottle':
      return { ...state, rumorThrottle: patch.throttle };
    case 'setAcademyFocus':
      return {
        ...state,
        academyFocusByClubId: {
          ...state.academyFocusByClubId,
          [patch.clubId]: patch.focus,
        },
      };
    case 'appendAcademyIntakeRecord': {
      const academyIntakeRecords = [...state.academyIntakeRecords, patch.record];
      const max = T.academy.maxStoredIntakeRecords;
      return {
        ...state,
        academyIntakeRecords:
          academyIntakeRecords.length > max ? academyIntakeRecords.slice(-max) : academyIntakeRecords,
      };
    }
    case 'setWeeklyTickState':
      return { ...state, weeklyTick: patch.weeklyTick };
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
