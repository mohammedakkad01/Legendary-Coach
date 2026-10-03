/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ClubMemoryEntry, PlayerMemoryEntry } from '../types';

export function queryClubMemoriesByType(
  entries: ClubMemoryEntry[],
  type: ClubMemoryEntry['type'],
): ClubMemoryEntry[] {
  return entries.filter((e) => e.type === type);
}

export function queryClubMemoriesInvolving(
  entries: ClubMemoryEntry[],
  subjectId: string,
): ClubMemoryEntry[] {
  return entries.filter((e) => e.subjectIds.includes(subjectId));
}

export function queryClubMemoriesForSeason(
  entries: ClubMemoryEntry[],
  season: number,
): ClubMemoryEntry[] {
  return entries.filter((e) => e.season === season);
}

export interface StoryCallbackQuery {
  minIntensity?: number;
  types?: ClubMemoryEntry['type'][];
  subjectId?: string;
  season?: number;
}

export function findClubMemoryCallbacks(
  entries: ClubMemoryEntry[],
  query: StoryCallbackQuery,
): ClubMemoryEntry[] {
  let out = entries;
  if (query.types?.length) {
    out = out.filter((e) => query.types!.includes(e.type));
  }
  if (query.subjectId) {
    out = out.filter((e) => e.subjectIds.includes(query.subjectId!));
  }
  if (query.season !== undefined) {
    out = out.filter((e) => e.season === query.season);
  }
  const minI = query.minIntensity ?? 40;
  return out.filter((e) => e.intensity >= minI).sort((a, b) => b.intensity - a.intensity);
}

export function findPlayerMemoryCallbacks(
  entries: PlayerMemoryEntry[],
  query: StoryCallbackQuery,
): PlayerMemoryEntry[] {
  let out = entries;
  if (query.subjectId) {
    out = out.filter((e) => e.subjectIds.includes(query.subjectId!));
  }
  if (query.season !== undefined) {
    out = out.filter((e) => e.season === query.season);
  }
  const minI = query.minIntensity ?? 40;
  return out.filter((e) => e.intensity >= minI).sort((a, b) => b.intensity - a.intensity);
}
