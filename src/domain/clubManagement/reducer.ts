/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { clamp } from '../shared/math';
import type { ClubManagementChange, ClubManagementState } from './types';

export function applyClubManagementChanges(
  state: ClubManagementState,
  changes: readonly ClubManagementChange[],
): ClubManagementState {
  let next = state;
  for (const change of changes) {
    next = applyOne(next, change);
  }
  return next;
}

function applyOne(state: ClubManagementState, change: ClubManagementChange): ClubManagementState {
  switch (change.kind) {
    case 'setFinance':
      return { ...state, finance: change.finance };
    case 'patchFinance': {
      const { ledgerAppend, ...patch } = change.patch;
      let finance = { ...state.finance, ...patch };
      if (ledgerAppend) {
        finance = {
          ...finance,
          ledger: [...finance.ledger, ledgerAppend].slice(-400),
          coins: ledgerAppend.balanceAfter,
        };
      }
      return { ...state, finance };
    }
    case 'setStaff':
      return { ...state, staff: change.staff };
    case 'upsertStaffMember': {
      const members = state.staff.members.filter((m) => m.id !== change.member.id);
      return {
        ...state,
        staff: {
          ...state.staff,
          members: [...members, change.member],
        },
      };
    }
    case 'removeStaffMember':
      return {
        ...state,
        staff: {
          ...state.staff,
          members: state.staff.members.filter((m) => m.id !== change.staffId),
        },
      };
    case 'setAnalyticsLevel':
      return {
        ...state,
        facilities: {
          analyticsDepartmentLevel: clamp(change.level, 1, 10),
        },
      };
    case 'patchDelegation':
      return {
        ...state,
        delegation: { ...state.delegation, ...change.patch },
      };
    case 'patchBoard':
      return { ...state, board: { ...state.board, ...change.patch } };
    case 'patchFans':
      return { ...state, fans: { ...state.fans, ...change.patch } };
    case 'setInfluence':
      return { ...state, influence: change.influence };
    case 'patchScheduled':
      return { ...state, scheduled: { ...state.scheduled, ...change.patch } };
    default: {
      const _exhaustive: never = change;
      return _exhaustive;
    }
  }
}
