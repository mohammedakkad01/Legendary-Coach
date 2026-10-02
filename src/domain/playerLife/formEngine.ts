/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PLAYER_LIFE as P } from '../../config/gameTuning';
import { clampForm } from './math';

export function updateFormFromMatchRating(currentForm: number, matchRating: number, minutes: number): number {
  if (minutes <= 0) return currentForm;
  const target = clampForm((matchRating - 4) * 1.4 + P.form.neutral, P.form.min, P.form.max);
  const next = currentForm + (target - currentForm) * P.form.ratingWeight;
  return clampForm(next, P.form.min, P.form.max);
}

export function decayFormWhenIdle(currentForm: number, playedThisWeek: boolean): number {
  if (playedThisWeek) return currentForm;
  return clampForm(currentForm - P.form.idleWeekDecay, P.form.min, P.form.max);
}
