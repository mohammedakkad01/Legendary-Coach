/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Cache key generators and helpers for Assistant explainability.
 */

import type { AssistantRecommendation } from './types';

export function getAssistantExplanationCacheKey(
  recommendation: Pick<AssistantRecommendation, 'id' | 'source' | 'reasonCodes'>,
  locale: 'en' | 'ar'
): string {
  const sortedReasons = [...recommendation.reasonCodes].sort().join(',');
  return `ast_${recommendation.id}_${recommendation.source}_${locale}_${sortedReasons}`;
}

export const MAX_ASSISTANT_EXPLANATION_CACHE_ENTRIES = 40;

export function createEmptyAssistantState(): import('./types').AssistantState {
  return {
    ignoredRecommendationIds: [],
    appliedRecommendationIds: [],
    liveTriggerCooldowns: {},
    activeRecommendations: [],
    explanationCache: {},
  };
}

export function mergeAssistantExplanationCache(
  existing: import('./types').AssistantState['explanationCache'],
  key: string,
  entry: { explanation: string; keyPoints: string[]; timestamp: string },
): import('./types').AssistantState['explanationCache'] {
  const next = { ...existing, [key]: entry };
  const keys = Object.keys(next);
  if (keys.length <= MAX_ASSISTANT_EXPLANATION_CACHE_ENTRIES) return next;
  const sorted = keys.sort((a, b) => next[a].timestamp.localeCompare(next[b].timestamp));
  const trimmed: typeof next = {};
  for (const k of sorted.slice(-MAX_ASSISTANT_EXPLANATION_CACHE_ENTRIES)) {
    trimmed[k] = next[k];
  }
  return trimmed;
}
