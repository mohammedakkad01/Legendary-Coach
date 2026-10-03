/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { LivingWorldPhaseFState } from './types';
import { ensurePhaseFState } from './ensurePhaseF';
import type { LivingWorldState } from '../types';

export type PhaseFPatch = Partial<LivingWorldPhaseFState> & {
  clubHistory?: Partial<LivingWorldPhaseFState['clubHistory']>;
  pressCooldowns?: Partial<LivingWorldPhaseFState['pressCooldowns']>;
};

export function applyPhaseFPatch(
  livingWorld: LivingWorldState,
  clubId: string,
  patch: PhaseFPatch,
): LivingWorldPhaseFState {
  const current = ensurePhaseFState(livingWorld, clubId);
  return {
    ...current,
    ...patch,
    clubHistory: patch.clubHistory
      ? { ...current.clubHistory, ...patch.clubHistory }
      : current.clubHistory,
    pressCooldowns: patch.pressCooldowns
      ? { ...current.pressCooldowns, ...patch.pressCooldowns }
      : current.pressCooldowns,
    storyCooldowns: patch.storyCooldowns
      ? { ...current.storyCooldowns, ...patch.storyCooldowns }
      : current.storyCooldowns,
    newsThrottle: patch.newsThrottle
      ? { ...current.newsThrottle, ...patch.newsThrottle }
      : current.newsThrottle,
  };
}
