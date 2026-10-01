/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Bounded probabilities for VAR, all from gameTuning.VAR.
 *
 * KNOWN LIMITATION — offside:
 * The match engine does not simulate offside. `goalOffsideLabelRate` is only
 * the chance that this stream labels an already-scored open-play goal as
 * offside (truth no_goal). It is not an offside the engine generated.
 */

import { VAR } from '../../config/gameTuning';
import { clamp } from '../shared/math';
import type { RefereeProfile } from '../referee/refereeTypes';

/** strictness above 50 reduces mistakes; foul sensitivity above 50 increases them. */
export function refereeErrorScale(referee: RefereeProfile): number {
  const strict = 1 - ((referee.strictness - 50) / 50) * VAR.strictnessErrorScale;
  const foul = 1 + ((referee.foulSensitivity - 50) / 50) * VAR.foulSensitivityErrorScale;
  return clamp(strict * foul, VAR.errorScaleMin, VAR.errorScaleMax);
}

const scaled = (base: number, referee: RefereeProfile): number =>
  clamp(base * refereeErrorScale(referee), VAR.rateMin, VAR.rateMax);

export const goalOffsideLabelRate = (referee: RefereeProfile): number => scaled(VAR.offsideLabelRate, referee);

export const penaltyErrorRate = (referee: RefereeProfile): number => scaled(VAR.penaltyErrorRate, referee);

export const redErrorRate = (referee: RefereeProfile): number => scaled(VAR.redErrorRate, referee);

export function interventionRate(varTendency: number): number {
  const scale = 1 + ((varTendency - 50) / 50) * VAR.interventionScale;
  return clamp(VAR.baseInterventionRate * scale, VAR.minInterventionRate, VAR.maxInterventionRate);
}

export function reviewConfidence(referee: RefereeProfile): number {
  const shifted = VAR.confidenceBase + ((referee.varTendency - 50) / 50) * VAR.confidenceSpan;
  return Math.round(clamp(shifted, 0.5, 0.99) * 100) / 100;
}

export const maxReviewsPerMatch = (): number => Math.round(VAR.maxReviewsPerMatch);

/** Goals, penalties, and reds are the only incidents VAR is allowed to open. */
export type VarCandidateKind = 'goal' | 'penalty' | 'red_card' | 'foul' | 'yellow_card' | 'save' | 'corner' | 'shot';

export function isVarQualifying(kind: VarCandidateKind): boolean {
  return kind === 'goal' || kind === 'penalty' || kind === 'red_card';
}
