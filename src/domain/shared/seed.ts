/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Deterministic string → seed (FNV-1a). Shared by living-world defaults only.
 */

export function hashStringToSeed(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
