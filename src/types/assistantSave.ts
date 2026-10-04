/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Durable assistant preferences persisted in GameSaveData (v7).
 * Transient analyst output (live recs, explanation cache) is NOT saved.
 */

export interface AssistantPersistedPreferences {
  ignoredRecommendationIds: string[];
  appliedRecommendationIds: string[];
}
