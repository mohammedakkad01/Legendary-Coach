/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ManagerCareerState } from '../types';
import { computeManagerReputationModifiers } from './modifiers';

export interface ManagerJobOffer {
  id: string;
  clubId: string;
  clubName: string;
  reputationRequired: number;
  interestScore: number;
}

export interface JobOfferGeneratorInput {
  career: ManagerCareerState;
  candidateClubs: readonly { id: string; name: string; reputation: number }[];
  worldSeed: number;
  season: number;
}

export function generateManagerJobOffers(input: JobOfferGeneratorInput): ManagerJobOffer[] {
  if (input.career.employmentStatus === 'employed') {
    return input.career.pendingJobOffers ?? [];
  }
  const mods = computeManagerReputationModifiers(input.career);
  const rep = input.career.reputation;
  const offers: ManagerJobOffer[] = [];
  for (const c of input.candidateClubs) {
    const required = Math.max(20, Math.min(85, Math.floor(c.reputation / 120)));
    if (rep + 5 * mods.jobOfferInterest < required) continue;
    const interestScore = Math.round((rep * mods.jobOfferInterest + c.reputation * 0.01) * 10) / 10;
    offers.push({
      id: `offer_${input.worldSeed}_${c.id}_${input.season}`,
      clubId: c.id,
      clubName: c.name,
      reputationRequired: required,
      interestScore,
    });
  }
  return offers.slice(0, 5);
}
