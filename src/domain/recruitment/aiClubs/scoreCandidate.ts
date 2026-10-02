/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { clamp } from '../../shared/math';
import { RECRUITMENT_TUNING as T } from '../config/recruitmentTuning';
import type { ObservedPlayerView } from '../types';
import type {
  AiClubFinanceContext,
  AiClubTransferProfile,
  SquadNeedContext,
} from './clubProfileTypes';
import type { PreOfferWillingnessResult } from '../motivation/motivationTypes';

export function scoreObservedFit(
  profile: AiClubTransferProfile,
  squadNeeds: SquadNeedContext,
  observed: ObservedPlayerView,
): number {
  const ratingFit = clamp(
    ((observed.estimatedRating - squadNeeds.minEstimatedRating) / 20) * 50 + 50,
    0,
    100,
  );
  const potentialFit =
    squadNeeds.minEstimatedPotential !== undefined
      ? clamp(
          ((observed.estimatedPotential - squadNeeds.minEstimatedPotential) / 15) * 50 + 50,
          0,
          100,
        )
      : observed.estimatedPotential;

  const starPart = ratingFit * profile.starPolicyWeight;
  const youthPart = potentialFit * profile.youthPolicyWeight;
  const ambitionBoost = profile.boardAmbition * 0.15;
  const urgencyBoost = squadNeeds.needUrgency * 0.25;

  return clamp(starPart + youthPart + ambitionBoost + urgencyBoost, 0, 100);
}

export function uncertaintyPenalty(observed: ObservedPlayerView): number {
  const gap = clamp(100 - observed.confidencePct, 0, 100);
  return gap * T.aiClubs.uncertaintyPenaltyScale;
}

export function willingnessModifier(willingness: PreOfferWillingnessResult): number {
  switch (willingness.band) {
    case 'desperate':
      return T.aiClubs.willingnessBoost.desperate;
    case 'keen':
      return T.aiClubs.willingnessBoost.keen;
    case 'open':
      return T.aiClubs.willingnessBoost.open;
    case 'reluctant':
      return T.aiClubs.willingnessBoost.reluctant;
    default:
      return T.aiClubs.willingnessBoost.refuse;
  }
}

export function maxAffordableFee(
  profile: AiClubTransferProfile,
  finances: AiClubFinanceContext,
): number {
  return Math.floor(finances.transferBudget * profile.maxTransferFeePctOfBudget);
}

export function budgetFitScore(
  observed: ObservedPlayerView,
  profile: AiClubTransferProfile,
  finances: AiClubFinanceContext,
): number {
  const cap = maxAffordableFee(profile, finances);
  if (cap <= 0) return 0;
  const ask = observed.valueRange.max;
  if (ask <= cap) return 100;
  const ratio = cap / Math.max(1, ask);
  return clamp(ratio * 100, 0, 95);
}
