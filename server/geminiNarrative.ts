/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Server-side Gemini narrative handler with production hardening:
 * - Single config-driven model name (GEMINI_NARRATIVE_CONFIG.model)
 * - Safe server-side error logging (model name, status code, error type, NO prompts, NO secrets)
 * - Strict schema validation of input NarrativeRequest
 * - Never echoes raw Gemini exceptions or stack traces to client
 */

import { GoogleGenAI, Type, Schema } from '@google/genai';
import type { NarrativeRequest, NarrativeResult } from '../src/domain/livingWorld/narrative/contracts.ts';
import { validateNarrativeResult } from '../src/domain/livingWorld/narrative/validate.ts';
import { GEMINI_NARRATIVE_CONFIG } from './narrativeConfig.ts';

const narrativeResponseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    requestId: { type: Type.STRING, description: 'Must match input requestId exactly' },
    presentation: {
      type: Type.OBJECT,
      properties: {
        headline: { type: Type.STRING, description: 'Short newspaper headline, max 160 characters' },
        body: { type: Type.STRING, description: 'Journalistic article paragraph, max 1200 characters' },
        pullQuote: { type: Type.STRING, description: 'Short dramatic quote or reaction, max 200 characters' },
      },
      required: ['headline', 'body'],
    },
  },
  required: ['requestId', 'presentation'],
};

export function validateIncomingNarrativeRequest(payload: unknown): { ok: true; data: NarrativeRequest } | { ok: false; error: string } {
  if (!payload || typeof payload !== 'object') {
    return { ok: false, error: 'Request body must be a JSON object' };
  }

  const r = payload as Record<string, unknown>;
  if (typeof r.requestId !== 'string' || !r.requestId.trim()) {
    return { ok: false, error: 'Missing or invalid requestId' };
  }
  if (r.schemaVersion !== 1) {
    return { ok: false, error: 'Invalid schemaVersion (expected 1)' };
  }
  if (!r.context || typeof r.context !== 'object') {
    return { ok: false, error: 'Missing context object' };
  }

  const ctx = r.context as Record<string, unknown>;
  if (ctx.locale !== 'en' && ctx.locale !== 'ar') {
    return { ok: false, error: 'locale must be "en" or "ar"' };
  }
  if (typeof ctx.season !== 'number') {
    return { ok: false, error: 'season must be a number' };
  }
  if (typeof ctx.clubId !== 'string' || !ctx.clubId.trim()) {
    return { ok: false, error: 'clubId must be a non-empty string' };
  }
  if (!Array.isArray(ctx.subjectIds)) {
    return { ok: false, error: 'subjectIds must be an array' };
  }
  if (!Array.isArray(ctx.factKeys)) {
    return { ok: false, error: 'factKeys must be an array' };
  }

  return { ok: true, data: payload as NarrativeRequest };
}

export async function handleNarrativeEnhancement(
  request: NarrativeRequest,
  apiKey: string | undefined
): Promise<{ ok: boolean; status: number; result?: NarrativeResult; error?: string }> {
  if (!apiKey) {
    console.warn('[GeminiNarrative] GEMINI_API_KEY is not configured on server.');
    return { ok: false, status: 503, error: 'AI narrative service is temporarily unavailable' };
  }

  const modelName = GEMINI_NARRATIVE_CONFIG.model;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const ctx = request.context;

    const systemPrompt = `You are a professional sports journalist for a high-tier football simulation newspaper ("Legendary Coach" / "المدرب الأسطورة").
Rules:
1. Use ONLY the provided verified facts and context. Never invent fantasy players, clubs, scorelines, numbers, or dates.
2. The language MUST be ${ctx.locale === 'ar' ? 'Modern Standard Arabic (العربية الفصحى الرياضية)' : 'English'}.
3. Keep the tone football-realistic, exciting, and matching tone: "${ctx.newsItem?.tone || 'neutral'}".
4. Output must be strictly valid JSON matching the provided schema.
5. NEVER include state modifications, morale numbers, coin balances, or mutations in your output.`;

    const userPrompt = `Generate a realistic press story for the following structured event:
- Season: ${ctx.season}
- Club: ${ctx.clubId}
- Associated Entities: ${ctx.subjectIds.join(', ') || 'N/A'}
- Fact Keys: ${ctx.factKeys.join(', ') || 'N/A'}
- News Event Type: ${ctx.newsItem?.type || 'general'}
- Tone: ${ctx.newsItem?.tone || 'neutral'}
- Facts Dump: ${JSON.stringify(ctx.newsItem?.facts || {})}
- Request ID: ${request.requestId}`;

    const response = await ai.models.generateContent({
      model: modelName,
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.3,
        maxOutputTokens: 600,
        responseMimeType: 'application/json',
        responseSchema: narrativeResponseSchema,
      },
    });

    const text = response.text?.trim();
    if (!text) {
      console.warn(`[GeminiNarrative] Model '${modelName}' returned empty output for req ${request.requestId}`);
      return { ok: false, status: 502, error: 'AI provider returned an empty response' };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      console.warn(`[GeminiNarrative] Model '${modelName}' returned non-JSON output for req ${request.requestId}`);
      return { ok: false, status: 502, error: 'AI provider returned invalid JSON' };
    }

    // Server-side validation pass
    const knownIds = new Set<string>([ctx.clubId, ...ctx.subjectIds]);
    const validation = validateNarrativeResult(request, parsed, { knownIds });

    if (!validation.ok || !validation.sanitized) {
      console.warn(`[GeminiNarrative] Validation rejected output for req ${request.requestId}:`, validation.errors);
      return {
        ok: false,
        status: 422,
        error: 'Generated narrative failed verification standards',
      };
    }

    return {
      ok: true,
      status: 200,
      result: validation.sanitized,
    };
  } catch (err: any) {
    // Log server-side diagnostic without leaking secrets or full prompts
    const errMessage = err?.message || String(err);
    const errStatus = err?.status || err?.statusCode || 500;
    console.error(`[GeminiNarrative] Model '${modelName}' call failed (Status: ${errStatus}): ${errMessage}`);

    // Return sanitized message to client - never echo raw Gemini stack or internals
    return {
      ok: false,
      status: 500,
      error: 'Failed to generate narrative enrichment',
    };
  }
}
