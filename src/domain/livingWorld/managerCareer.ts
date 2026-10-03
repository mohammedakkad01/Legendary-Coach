/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { clamp } from '../shared/math';
import type { ManagerCareerState, ManagerReputationLedgerEntry } from './types';

export function createDefaultManagerCareer(clubReputation: number): ManagerCareerState {
  const base = clamp(Math.floor(clubReputation / 15), 10, 85);
  return {
    reputation: base,
    reputationLedger: [],
    employmentStatus: 'employed',
  };
}

export function applyManagerReputationChange(
  career: ManagerCareerState,
  delta: number,
  entry: ManagerReputationLedgerEntry
): ManagerCareerState {
  return {
    reputation: clamp(career.reputation + delta, 0, 100),
    reputationLedger: [...career.reputationLedger, entry],
  };
}
