/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { clamp } from '../shared/math';
import type { SeededRandom } from '../../engine/prng';

export const clamp100 = (v: number): number => clamp(v, 0, 100);

export const clampForm = (v: number, min: number, max: number): number => clamp(v, min, max);

export function decayToward(current: number, target: number, amount: number): number {
  if (current > target) return Math.max(target, current - amount);
  if (current < target) return Math.min(target, current + amount);
  return current;
}

export function seededJitter(rng: SeededRandom | undefined, delta: number, spread: number): number {
  if (!rng || delta === 0) return delta;
  return delta + rng.nextRange(-spread, spread);
}

export function medicalStaffQuality(medicalCenterLevel: number, medicalLevelToQuality: number): number {
  const level = clamp(medicalCenterLevel, 1, 10);
  return clamp(0.5 + (level - 1) * medicalLevelToQuality, 0.5, 1);
}
