/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { AssistantPersistedPreferences } from '../../types/assistantSave';
import type { AssistantState } from '../../domain/assistant/types';
import { createEmptyAssistantState } from '../../domain/assistant/cache';

const MAX_PERSISTED_ASSISTANT_IDS = 200;

function uniqueIds(ids: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of ids) {
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out.slice(-MAX_PERSISTED_ASSISTANT_IDS);
}

export function extractAssistantPersistedFromState(
  state: Record<string, unknown>,
): AssistantPersistedPreferences | undefined {
  const rawAssistant = state.assistant;
  if (!rawAssistant || typeof rawAssistant !== 'object') {
    return extractAssistantPersistedFromSaveShape(state);
  }
  const a = rawAssistant as AssistantState & AssistantPersistedPreferences;
  const ignored = Array.isArray(a.ignoredRecommendationIds) ? uniqueIds(a.ignoredRecommendationIds) : [];
  const applied = Array.isArray(a.appliedRecommendationIds) ? uniqueIds(a.appliedRecommendationIds) : [];
  if (ignored.length === 0 && applied.length === 0) return undefined;
  return { ignoredRecommendationIds: ignored, appliedRecommendationIds: applied };
}

function extractAssistantPersistedFromSaveShape(
  state: Record<string, unknown>,
): AssistantPersistedPreferences | undefined {
  const a = state.assistant;
  if (!a || typeof a !== 'object') return undefined;
  const rec = a as AssistantPersistedPreferences;
  const ignored = Array.isArray(rec.ignoredRecommendationIds) ? uniqueIds(rec.ignoredRecommendationIds) : [];
  const applied = Array.isArray(rec.appliedRecommendationIds) ? uniqueIds(rec.appliedRecommendationIds) : [];
  if (ignored.length === 0 && applied.length === 0) return undefined;
  return { ignoredRecommendationIds: ignored, appliedRecommendationIds: applied };
}

export function mergeAssistantIntoRuntimeState(
  persisted: AssistantPersistedPreferences | undefined,
): AssistantState {
  const base = createEmptyAssistantState();
  if (!persisted) return base;
  return {
    ...base,
    ignoredRecommendationIds: [...persisted.ignoredRecommendationIds],
    appliedRecommendationIds: [...persisted.appliedRecommendationIds],
  };
}

export function readAiNarrationEnabledFromState(state: Record<string, unknown>): boolean {
  if (typeof state.aiNarrationEnabled === 'boolean') return state.aiNarrationEnabled;
  return true;
}

export function readAiNarrationEnabledFromSave(save: GameSaveDataLike): boolean {
  if (typeof save.aiNarrationEnabled === 'boolean') return save.aiNarrationEnabled;
  return true;
}

type GameSaveDataLike = { aiNarrationEnabled?: boolean };
