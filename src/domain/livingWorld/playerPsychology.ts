/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pure morale / mental-state update helpers (canonical morale = Player.morale).
 */

import { clamp } from '../shared/math';
import type { SeededRandom } from '../../engine/prng';
import type { PlayerMentalState } from './types';

export function clampMorale(value: number): number {
  return clamp(value, 0, 100);
}

export function applyMoraleDelta(current: number, delta: number, varianceRng?: SeededRandom): number {
  let effectiveDelta = delta;
  if (varianceRng && delta !== 0) {
    const variance = varianceRng.nextRange(-2, 2);
    effectiveDelta = delta + variance;
  }
  return clampMorale(current + effectiveDelta);
}

export function clampMentalState(state: PlayerMentalState): PlayerMentalState {
  return {
    confidence: clamp(state.confidence, 0, 100),
    happiness: clamp(state.happiness, 0, 100),
    frustration: clamp(state.frustration, 0, 100),
    pressure: clamp(state.pressure, 0, 100),
  };
}

export function applyMentalPatch(
  current: PlayerMentalState,
  patch: Partial<PlayerMentalState>,
  varianceRng?: SeededRandom
): PlayerMentalState {
  const applyField = (key: keyof PlayerMentalState, base: number, delta: number | undefined): number => {
    if (delta === undefined) return base;
    let d = delta;
    if (varianceRng) {
      d += varianceRng.nextRange(-1, 1);
    }
    return clamp(base + d, 0, 100);
  };

  return clampMentalState({
    confidence: applyField('confidence', current.confidence, patch.confidence !== undefined ? patch.confidence - current.confidence : undefined),
    happiness: applyField('happiness', current.happiness, patch.happiness !== undefined ? patch.happiness - current.happiness : undefined),
    frustration: applyField('frustration', current.frustration, patch.frustration !== undefined ? patch.frustration - current.frustration : undefined),
    pressure: applyField('pressure', current.pressure, patch.pressure !== undefined ? patch.pressure - current.pressure : undefined),
  });
}

/** Apply numeric deltas to mental fields (for handlers). */
export function applyMentalDeltas(
  current: PlayerMentalState,
  deltas: Partial<PlayerMentalState>,
  varianceRng?: SeededRandom
): PlayerMentalState {
  const merged: PlayerMentalState = { ...current };
  (['confidence', 'happiness', 'frustration', 'pressure'] as const).forEach((key) => {
    const d = deltas[key];
    if (d === undefined) return;
    let delta = d;
    if (varianceRng) delta += varianceRng.nextRange(-1, 1);
    merged[key] = clamp(current[key] + delta, 0, 100);
  });
  return clampMentalState(merged);
}
