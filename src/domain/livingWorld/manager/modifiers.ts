/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LIVING_WORLD_TUNING, mediaAttentionLevel, reputationToModifier } from '../config/livingWorldTuning';
import type { ManagerCareerState } from '../types';

export interface ManagerReputationModifiers {
  jobOfferInterest: number;
  playerInterest: number;
  staffInterest: number;
  boardTrustNegotiation: number;
  transferNegotiation: number;
  mediaAttention: number;
}

export function computeManagerReputationModifiers(career: ManagerCareerState): ManagerReputationModifiers {
  const rep = career.reputation;
  const mediaRep = career.mediaReputation ?? rep;
  const base = reputationToModifier(rep);
  const t = LIVING_WORLD_TUNING.modifiers;
  const clampMod = (v: number) => Math.max(t.min, Math.min(t.max, v));

  return {
    jobOfferInterest: clampMod(base),
    playerInterest: clampMod(base),
    staffInterest: clampMod(base),
    boardTrustNegotiation: clampMod(base),
    transferNegotiation: clampMod(base),
    mediaAttention: mediaAttentionLevel(rep, mediaRep),
  };
}
