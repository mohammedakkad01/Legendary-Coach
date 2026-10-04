/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Isolated Frontend Assistant Service (Phase G).
 * Provides explainable "Ask Why" reasoning:
 * 1. Checks global kill switch (`aiNarrationEnabled`)
 * 2. Checks client explanation cache (`assistant.explanationCache`)
 * 3. Enforces short timeout (4.5s) and max 1 retry
 * 4. Strictly validates responses with domain `validateAssistantExplanation`
 * 5. Deterministic fallback guarantee: always returns structured explanations
 *    even when AI is offline, disabled, or fails.
 */

import type { AssistantRecommendation, AssistantExplanation } from '../domain/assistant/types';
import { getAssistantExplanationCacheKey } from '../domain/assistant/cache';
import { validateAssistantExplanation } from '../domain/assistant/validation';
import { useGameStore } from '../state/useGameStore';

export interface AssistantExplainOptions {
  recommendation: AssistantRecommendation;
  locale: 'en' | 'ar';
}

export function buildDeterministicExplanation(
  rec: AssistantRecommendation,
  locale: 'en' | 'ar'
): { explanation: string; keyPoints: string[] } {
  const isAr = locale === 'ar';

  const explanation = isAr
    ? `التحليل التكتيكي الموصى به: ${rec.summaryAr}\nتم بناء هذا الاستنتاج بناءً على مؤشرات اللعب المسجلة، دقة الكشافة، وجاهزية عناصر الفريق لتحقيق أعلى نتيجة إيجابية ممكنة.`
    : `Tactical recommendation rationale: ${rec.summaryEn}\nThis assessment is synthesized from live data indicators, scout confidence, and squad fitness to maximize overall expected performance.`;

  const keyPoints = isAr
    ? (rec.reasonDetailsAr && rec.reasonDetailsAr.length > 0
        ? rec.reasonDetailsAr
        : [`مستوى الثقة في البيانات: ${rec.confidence}%`, `الأولوية التكتيكية: ${rec.severity}`, `رموز الأسباب: ${rec.reasonCodes.join(' · ')}`])
    : (rec.reasonDetailsEn && rec.reasonDetailsEn.length > 0
        ? rec.reasonDetailsEn
        : [`Data Confidence: ${rec.confidence}%`, `Tactical Priority: ${rec.severity}`, `Reason Factors: ${rec.reasonCodes.join(' · ')}`]);

  return { explanation, keyPoints };
}

export async function requestAssistantExplanation(
  options: AssistantExplainOptions
): Promise<AssistantExplanation> {
  const { recommendation, locale } = options;
  const state = useGameStore.getState();

  // 1. Check authoritative cache
  const cacheKey = getAssistantExplanationCacheKey(recommendation, locale);
  const cachedHit = state.assistant?.explanationCache?.[cacheKey];
  if (cachedHit) {
    return {
      recommendationId: recommendation.id,
      explanation: cachedHit.explanation,
      keyPoints: cachedHit.keyPoints,
      isAiEnhanced: true,
      cached: true,
    };
  }

  // Deterministic fallback baseline
  const deterministicFallback = buildDeterministicExplanation(recommendation, locale);

  // 2. Kill switch check
  if (!state.aiNarrationEnabled) {
    return {
      recommendationId: recommendation.id,
      explanation: deterministicFallback.explanation,
      keyPoints: deterministicFallback.keyPoints,
      isAiEnhanced: false,
      cached: false,
    };
  }

  // 3. Network call to server proxy with short timeout & 1 retry
  let attempt = 0;
  const maxAttempts = 2;

  while (attempt < maxAttempts) {
    attempt++;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);

    try {
      const response = await fetch('/api/assistant/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recommendation,
          locale,
          schemaVersion: 1,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (attempt >= maxAttempts) break;
        continue;
      }

      const raw = await response.json();
      if (!raw || !raw.success || !raw.data) {
        if (attempt >= maxAttempts) break;
        continue;
      }

      // 4. Domain client-side validation
      const validation = validateAssistantExplanation(raw.data);
      if (!validation.valid || !validation.data) {
        console.warn('[AssistantService] Response rejected by domain validator:', validation.issues);
        break; // Discard invalid AI responses; fallback to deterministic
      }

      // 5. Store validated result in cache
      state.cacheAssistantExplanation(cacheKey, {
        explanation: validation.data.explanation,
        keyPoints: validation.data.keyPoints,
        timestamp: new Date().toISOString(),
      });

      return {
        recommendationId: recommendation.id,
        explanation: validation.data.explanation,
        keyPoints: validation.data.keyPoints,
        isAiEnhanced: true,
        cached: false,
      };
    } catch {
      clearTimeout(timeoutId);
      if (attempt >= maxAttempts) break;
    }
  }

  // Graceful fallback to deterministic
  return {
    recommendationId: recommendation.id,
    explanation: deterministicFallback.explanation,
    keyPoints: deterministicFallback.keyPoints,
    isAiEnhanced: false,
    cached: false,
  };
}
