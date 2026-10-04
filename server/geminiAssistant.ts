/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Server-side Gemini Assistant Explanation handler.
 * Consumes @google/genai with model 'gemini-3.8-flash'.
 * Enforces structured schema output, low temperature, and server-side validation.
 */

import { GoogleGenAI, Type, Schema } from '@google/genai';
import type { AssistantRecommendation } from '../src/domain/assistant/types.ts';
import { validateAssistantExplanation } from '../src/domain/assistant/validation.ts';
import { GEMINI_NARRATIVE_CONFIG } from './narrativeConfig.ts';

const assistantResponseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    explanation: {
      type: Type.STRING,
      description: 'Concise tactical explanation for the manager, max 800 characters',
    },
    keyPoints: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Up to 4 key takeaways/rationale points, max 150 characters each',
    },
  },
  required: ['explanation', 'keyPoints'],
};

export interface IncomingAssistantRequest {
  recommendation: AssistantRecommendation;
  locale: 'en' | 'ar';
  schemaVersion: 1;
}

export function validateIncomingAssistantRequest(
  payload: unknown
): { ok: true; data: IncomingAssistantRequest } | { ok: false; error: string } {
  if (!payload || typeof payload !== 'object') {
    return { ok: false, error: 'Request body must be a JSON object' };
  }

  const r = payload as Record<string, unknown>;
  if (r.schemaVersion !== 1) {
    return { ok: false, error: 'Invalid schemaVersion (expected 1)' };
  }
  if (r.locale !== 'en' && r.locale !== 'ar') {
    return { ok: false, error: 'locale must be "en" or "ar"' };
  }
  if (!r.recommendation || typeof r.recommendation !== 'object') {
    return { ok: false, error: 'Missing recommendation object' };
  }

  const rec = r.recommendation as Record<string, unknown>;
  if (typeof rec.id !== 'string' || !rec.id.trim()) {
    return { ok: false, error: 'Missing recommendation.id' };
  }
  if (!Array.isArray(rec.reasonCodes)) {
    return { ok: false, error: 'recommendation.reasonCodes must be an array' };
  }

  return { ok: true, data: payload as IncomingAssistantRequest };
}

export async function handleAssistantExplanation(
  request: IncomingAssistantRequest,
  apiKey: string | undefined
): Promise<{ ok: boolean; status: number; result?: { explanation: string; keyPoints: string[] }; error?: string }> {
  if (!apiKey) {
    console.warn('[GeminiAssistant] GEMINI_API_KEY is not configured on server.');
    return { ok: false, status: 503, error: 'AI Assistant service is temporarily unavailable' };
  }

  const modelName = GEMINI_NARRATIVE_CONFIG.model;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const { recommendation: rec, locale } = request;

    const systemPrompt = `You are the Senior Tactical Assistant Coach for a professional football club in "Legendary Coach" ("المدرب الأسطورة").
Rules:
1. Explain the tactical recommendation based strictly on the provided facts, reason factors, and confidence level.
2. The language MUST be ${locale === 'ar' ? 'Modern Standard Arabic (العربية الفصحى الرياضية)' : 'English'}.
3. Keep the tone professional, analytical, authoritative, and direct.
4. Output must be strictly valid JSON matching the schema.
5. NEVER mutate game state, invent scorelines, or return numerical cheat codes.`;

    const userPrompt = `Explain why the head coach should consider this recommendation:
- Source: ${rec.source}
- Title: ${locale === 'ar' ? rec.titleAr : rec.titleEn}
- Summary: ${locale === 'ar' ? rec.summaryAr : rec.summaryEn}
- Confidence: ${rec.confidence}%
- Priority: ${rec.severity}
- Reason Codes: ${rec.reasonCodes.join(', ')}
- Reason Details: ${(locale === 'ar' ? rec.reasonDetailsAr : rec.reasonDetailsEn)?.join('; ') || 'N/A'}
- Tactical Changes Suggested: ${JSON.stringify(rec.suggestedChanges || {})}`;

    const response = await ai.models.generateContent({
      model: modelName,
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.3,
        responseMimeType: 'application/json',
        responseSchema: assistantResponseSchema,
      },
    });

    const text = response.text?.trim();
    if (!text) {
      return { ok: false, status: 502, error: 'Empty response from model' };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return { ok: false, status: 502, error: 'Model response was not valid JSON' };
    }

    const validation = validateAssistantExplanation(parsed);
    if (!validation.valid || !validation.data) {
      console.warn('[GeminiAssistant] Generated explanation failed validation:', validation.issues);
      return { ok: false, status: 422, error: 'Generated explanation failed validation' };
    }

    return {
      ok: true,
      status: 200,
      result: validation.data,
    };
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string; name?: string };
    console.error(`[GeminiAssistant] Model call failed [model=${modelName}, type=${err.name || 'Error'}]`);
    return { ok: false, status: 502, error: 'AI Assistant generation failed' };
  }
}
