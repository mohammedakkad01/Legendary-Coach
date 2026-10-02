/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MAX_CLUB_MEMORIES } from './types';
import type { ClubMemoryEntry } from './types';

export function addClubMemory(
  entries: ClubMemoryEntry[],
  entry: ClubMemoryEntry,
  cap = MAX_CLUB_MEMORIES
): ClubMemoryEntry[] {
  const next = [...entries, entry];
  if (next.length <= cap) return next;
  return next.slice(next.length - cap);
}

export function decayClubMemories(entries: ClubMemoryEntry[], factor: number): ClubMemoryEntry[] {
  if (factor <= 0) return entries;
  return entries
    .map((e) => ({
      ...e,
      intensity: Math.max(0, e.intensity - e.decayRate * factor),
    }))
    .filter((e) => e.intensity > 0.5);
}
