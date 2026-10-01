/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Small pure numeric helpers shared by the domain layer and the tuning config.
 */

/** Clamp `value` into [min, max]. Non-finite input falls back to `min`. */
export const clamp = (value: number, min: number, max: number): number => {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
};
