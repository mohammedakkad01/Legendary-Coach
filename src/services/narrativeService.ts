/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Narrative Service (Frontend Client)
 * Isolated client narrative enrichment service.
 * Enforces:
 * 1. Global kill switch check
 * 2. Importance gating (≥70)
 * 3. Authoritative cache lookup (lookupNarrativeCache from livingWorld.phaseF.narrativeCache)
 * 4. Client session & daily quota caps
 * 5. Short timeout (4.5s) & max 1 retry
 * 6. Dual validation: validates server response with domain validateNarrativeResult()
 * 7. Discards invalid/state-mutating responses and falls back to deterministic text
 * 8. Commits validated result to store via storeNarrativeCacheEntry()
 */

import type { StructuredContext, NarrativeRequest, NarrativeResult } from '../domain/livingWorld/narrative/contracts';
import { getNarrativeCacheKey, lookupNarrativeCache } from '../domain/livingWorld/narrative/cache';
import { validateNarrativeResult } from '../domain/livingWorld/narrative/validate';
import { useGameStore } from '../state/useGameStore';

interface NarrativeFetchOptions {
  context: StructuredContext;
  importance?: number;
  knownIds?: Set<string>;
}

export interface EnrichedNarrativeText {
  headline?: string;
  body?: string;
  pullQuote?: string;
  isAiEnhanced: boolean;
  cached: boolean;
}

// Session call counters (transient memory only)
let sessionCallCount = 0;
export const MAX_SESSION_CALLS = 15;
export const MAX_DAILY_CALLS = 40;

export function _resetNarrativeCapsForTest(): void {
  sessionCallCount = 0;
  try {
    localStorage.removeItem('narrative_daily_calls');
  } catch {}
}

export function _setSessionCallCountForTest(count: number): void {
  sessionCallCount = count;
}

function getDailyCount(): number {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const stored = localStorage.getItem('narrative_daily_calls');
    if (!stored) return 0;
    const parsed = JSON.parse(stored);
    return parsed.day === today ? (parsed.count || 0) : 0;
  } catch {
    return 0;
  }
}

function incrementDailyCount(): void {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const current = getDailyCount();
    localStorage.setItem('narrative_daily_calls', JSON.stringify({ day: today, count: current + 1 }));
    sessionCallCount += 1;
  } catch {
    // Ignore storage issues
  }
}

export async function requestNarrativeEnrichment(options: NarrativeFetchOptions): Promise<EnrichedNarrativeText | null> {
  const state = useGameStore.getState();

  // 1. Kill switch check
  if (!state.aiNarrationEnabled) {
    return null;
  }

  // 2. Importance threshold gate (only items with importance >= 70 get Gemini treatment)
  const importance = options.importance ?? options.context.newsItem?.importance ?? 50;
  if (importance < 70) {
    return null;
  }

  // 3. Authoritative Cache check
  const phaseF = state.livingWorld?.phaseF;
  const cacheKey = getNarrativeCacheKey(options.context);
  if (phaseF?.narrativeCache) {
    const hit = lookupNarrativeCache(phaseF.narrativeCache, cacheKey, options.context.locale);
    if (hit) {
      return {
        headline: hit.headline,
        body: hit.body,
        isAiEnhanced: true,
        cached: true,
      };
    }
  }

  // 4. Session and Daily Cap Check
  if (sessionCallCount >= MAX_SESSION_CALLS || getDailyCount() >= MAX_DAILY_CALLS) {
    return null;
  }

  // 5. Construct NarrativeRequest
  const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const narrativeRequest: NarrativeRequest = {
    context: options.context,
    requestId,
    schemaVersion: 1,
  };

  // 6. Network request with timeout & 1 retry
  let attempt = 0;
  while (attempt < 2) {
    attempt += 1;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4500);

      const response = await fetch('/api/narrative/enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(narrativeRequest),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status >= 500 && attempt === 1) continue; // retry once
        return null;
      }

      const rawResult = await response.json();

      // 7. Domain Validation Hook (authoritative client-side validation)
      const knownIds = options.knownIds ?? new Set<string>([
        options.context.clubId,
        ...options.context.subjectIds,
      ]);

      const validation = validateNarrativeResult(narrativeRequest, rawResult, { knownIds });
      if (!validation.ok || !validation.sanitized) {
        console.warn('Narrative response rejected by domain validator:', validation.errors);
        return null;
      }

      // Validated Result accepted
      incrementDailyCount();
      const presentation = validation.sanitized.presentation;

      // 8. Commit to store authoritative narrativeCache
      state.storeNarrativeCacheEntry({
        contextHash: cacheKey,
        headline: presentation.headline,
        body: presentation.body,
        locale: options.context.locale,
        cachedAt: new Date().toISOString(),
      });

      return {
        headline: presentation.headline,
        body: presentation.body,
        pullQuote: presentation.pullQuote,
        isAiEnhanced: true,
        cached: false,
      };
    } catch (err) {
      if (attempt === 2) {
        return null; // Silent graceful fallback on timeout/offline
      }
    }
  }

  return null;
}
