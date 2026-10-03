/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { LivingWorldState } from '../types';
import { createEmptyPhaseFState, type LivingWorldPhaseFState } from './types';

export function ensurePhaseFState(
  livingWorld: LivingWorldState | undefined,
  clubId: string,
): LivingWorldPhaseFState {
  if (livingWorld?.phaseF?.schemaVersion === 1) {
    return livingWorld.phaseF;
  }
  return createEmptyPhaseFState(clubId);
}

export function withPhaseF(
  livingWorld: LivingWorldState,
  phaseF: LivingWorldPhaseFState,
): LivingWorldState {
  return { ...livingWorld, phaseF };
}
