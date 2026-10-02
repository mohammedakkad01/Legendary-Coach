/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MAX_PLAYER_MEMORIES } from './types';
import type { PlayerMemoryEntry } from './types';

export function addPlayerMemory(
  entries: PlayerMemoryEntry[],
  entry: PlayerMemoryEntry,
  cap = MAX_PLAYER_MEMORIES
): PlayerMemoryEntry[] {
  const next = [...entries, entry];
  if (next.length <= cap) return next;
  return next.slice(next.length - cap);
}

export function decayPlayerMemories(entries: PlayerMemoryEntry[], factor: number): PlayerMemoryEntry[] {
  if (factor <= 0) return entries;
  return entries
    .map((e) => ({
      ...e,
      intensity: Math.max(0, e.intensity - e.decayRate * factor),
    }))
    .filter((e) => e.intensity > 0.5);
}

export function queryPlayerMemoriesBySeason(
  entries: PlayerMemoryEntry[],
  season: number
): PlayerMemoryEntry[] {
  return entries.filter((e) => e.season === season);
}

export function queryPlayerMemoriesInvolving(
  entries: PlayerMemoryEntry[],
  subjectId: string
): PlayerMemoryEntry[] {
  return entries.filter((e) => e.subjectIds.includes(subjectId));
}
