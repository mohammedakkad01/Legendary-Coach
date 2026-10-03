/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { clamp } from '../../shared/math';
import { hashStringToSeed } from '../../shared/seed';
import { SeededRandom } from '../../../engine/prng';
import type { AiClubTransferProfile, ClubRiskTolerance, ClubTransferPhilosophy } from './clubProfileTypes';

const KNOWN_OVERRIDES: Record<
  string,
  Partial<Omit<AiClubTransferProfile, 'clubId'>>
> = {
  club_man_city: {
    philosophy: 'galacticos',
    riskTolerance: 'high',
    boardAmbition: 94,
    financialPressure: 15,
    youthPolicyWeight: 0.35,
    starPolicyWeight: 0.85,
    loanPreference: 0.15,
    maxTransferFeePctOfBudget: 0.55,
    minScoutConfidenceToBid: 38,
    sellWillingnessBase: 28,
    rivalClubIds: ['club_liverpool', 'club_arsenal', 'club_man_united'],
  },
  club_real_madrid: {
    philosophy: 'galacticos',
    riskTolerance: 'high',
    boardAmbition: 96,
    financialPressure: 20,
    youthPolicyWeight: 0.4,
    starPolicyWeight: 0.9,
    loanPreference: 0.2,
    maxTransferFeePctOfBudget: 0.6,
    minScoutConfidenceToBid: 35,
    sellWillingnessBase: 32,
    rivalClubIds: ['club_barcelona', 'club_atletico'],
  },
  club_barcelona: {
    philosophy: 'youth_development',
    riskTolerance: 'medium',
    boardAmbition: 88,
    youthPolicyWeight: 0.85,
    starPolicyWeight: 0.55,
    loanPreference: 0.35,
    minScoutConfidenceToBid: 42,
    sellWillingnessBase: 35,
    rivalClubIds: ['club_real_madrid'],
  },
  club_al_ahly: {
    philosophy: 'balanced',
    riskTolerance: 'medium',
    boardAmbition: 72,
    financialPressure: 35,
    youthPolicyWeight: 0.55,
    starPolicyWeight: 0.6,
    loanPreference: 0.45,
    maxTransferFeePctOfBudget: 0.4,
    minScoutConfidenceToBid: 45,
    sellWillingnessBase: 48,
    rivalClubIds: ['club_zamalek'],
  },
  club_al_hilal: {
    philosophy: 'galacticos',
    riskTolerance: 'high',
    boardAmbition: 90,
    financialPressure: 25,
    starPolicyWeight: 0.88,
    youthPolicyWeight: 0.3,
    loanPreference: 0.25,
    maxTransferFeePctOfBudget: 0.5,
    minScoutConfidenceToBid: 40,
    sellWillingnessBase: 30,
    rivalClubIds: ['club_al_nassr'],
  },
};

function pickPhilosophy(rng: SeededRandom): ClubTransferPhilosophy {
  const roll = rng.nextRange(0, 3);
  return (['balanced', 'youth_development', 'sell_to_buy', 'galacticos'] as const)[roll];
}

function pickRisk(rng: SeededRandom): ClubRiskTolerance {
  const roll = rng.nextRange(0, 2);
  return (['low', 'medium', 'high'] as const)[roll];
}

export function createDefaultAiClubProfile(clubId: string, worldSeed: number): AiClubTransferProfile {
  const override = KNOWN_OVERRIDES[clubId];
  const rng = new SeededRandom(hashStringToSeed(`ai_club_profile_${worldSeed}_${clubId}`));

  const base: AiClubTransferProfile = {
    clubId,
    philosophy: pickPhilosophy(rng),
    riskTolerance: pickRisk(rng),
    boardAmbition: clamp(45 + rng.nextRange(0, 40), 30, 98),
    financialPressure: clamp(20 + rng.nextRange(0, 50), 5, 90),
    youthPolicyWeight: clamp(0.35 + rng.nextRange(-0.15, 0.35), 0.1, 0.95),
    starPolicyWeight: clamp(0.55 + rng.nextRange(-0.2, 0.3), 0.15, 0.95),
    loanPreference: clamp(0.25 + rng.nextRange(-0.1, 0.35), 0, 0.85),
    maxTransferFeePctOfBudget: clamp(0.35 + rng.nextRange(-0.1, 0.2), 0.2, 0.65),
    minScoutConfidenceToBid: clamp(40 + rng.nextRange(-8, 12), 25, 60),
    rivalClubIds: [],
    preferredBuyerClubIds: [],
    sellWillingnessBase: clamp(35 + rng.nextRange(-10, 25), 15, 75),
  };

  if (!override) return base;

  return {
    ...base,
    ...override,
    clubId,
    rivalClubIds: override.rivalClubIds ?? base.rivalClubIds,
    preferredBuyerClubIds: override.preferredBuyerClubIds ?? base.preferredBuyerClubIds,
  };
}

export function ensureAiClubProfiles(
  existing: Record<string, AiClubTransferProfile> | undefined,
  clubIds: readonly string[],
  worldSeed: number,
): Record<string, AiClubTransferProfile> {
  const out = { ...(existing ?? {}) };
  for (const id of clubIds) {
    if (!out[id]) out[id] = createDefaultAiClubProfile(id, worldSeed);
  }
  return out;
}
