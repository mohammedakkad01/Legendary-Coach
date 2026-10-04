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

export function createEmptyAssistantState(): import('./types').AssistantState {
  return {
    ignoredRecommendationIds: [],
    appliedRecommendationIds: [],
    liveTriggerCooldowns: {},
    activeRecommendations: [],
    explanationCache: {},
  };
}
