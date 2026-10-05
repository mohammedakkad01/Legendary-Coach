/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * In-memory assistant runtime state (not fully persisted — see assistantSave.ts).
 */

import type { AssistantState, Recommendation } from './types';

export function createEmptyAssistantState(): AssistantState {
  return {
    ignoredRecommendationIds: [],
    appliedRecommendationIds: [],
    liveTriggerCooldowns: {},
    activeRecommendations: [],
    explanationCache: {},
  };
}

export function mergeAssistantExplanationCache(
  existing: AssistantState['explanationCache'],
  key: string,
  entry: { explanation: string; keyPoints: string[]; timestamp: string },
): AssistantState['explanationCache'] {
  const next = { ...existing, [key]: entry };
  const keys = Object.keys(next);
  const MAX = 40;
  if (keys.length <= MAX) return next;
  const sorted = keys.sort((a, b) => next[a].timestamp.localeCompare(next[b].timestamp));
  const trimmed: typeof next = {};
  for (const k of sorted.slice(-MAX)) {
    trimmed[k] = next[k];
  }
  return trimmed;
}

export function appendIgnoredAssistantId(state: AssistantState, id: string): AssistantState {
  if (!id || state.ignoredRecommendationIds.includes(id)) return state;
  return {
    ...state,
    ignoredRecommendationIds: [...state.ignoredRecommendationIds, id],
    activeRecommendations: state.activeRecommendations.filter((r: Recommendation) => r.id !== id),
  };
}

export function appendAppliedAssistantId(state: AssistantState, id: string): AssistantState {
  if (!id || state.appliedRecommendationIds.includes(id)) return state;
  return {
    ...state,
    appliedRecommendationIds: [...state.appliedRecommendationIds, id],
    activeRecommendations: state.activeRecommendations.filter((r: Recommendation) => r.id !== id),
  };
}
