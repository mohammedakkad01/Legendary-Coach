/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LIVING_WORLD_TUNING } from '../config/livingWorldTuning';
import type { StructuredContext } from './contracts';
import type { NarrativeCacheEntry } from '../phaseF/types';

export function getNarrativeCacheKey(context: StructuredContext): string {
  const payload = JSON.stringify({
    locale: context.locale,
    season: context.season,
    clubId: context.clubId,
    subjectIds: [...context.subjectIds].sort(),
    factKeys: [...context.factKeys].sort(),
    newsType: context.newsItem?.type,
    sourceEventId: context.newsItem?.sourceEventId,
  });
  let hash = 0;
  for (let i = 0; i < payload.length; i += 1) {
    hash = (hash * 31 + payload.charCodeAt(i)) | 0;
  }
  return `nar_${Math.abs(hash)}`;
}

export function mergeNarrativeCache(
  entries: NarrativeCacheEntry[],
  entry: NarrativeCacheEntry,
): NarrativeCacheEntry[] {
  const without = entries.filter((e) => e.contextHash !== entry.contextHash || e.locale !== entry.locale);
  return [entry, ...without].slice(0, LIVING_WORLD_TUNING.narrative.maxCacheEntries);
}

export function lookupNarrativeCache(
  entries: NarrativeCacheEntry[],
  contextHash: string,
  locale: 'en' | 'ar',
): NarrativeCacheEntry | undefined {
  return entries.find((e) => e.contextHash === contextHash && e.locale === locale);
}
