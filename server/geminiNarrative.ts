/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Server-side Gemini narrative handler.
 * Consumes @google/genai with model 'gemini-3.8-flash'.
 * Enforces structured schema output, low temperature, and server-side domain validation.
 */

import { GoogleGenAI, Type, Schema } from '@google/genai';
import type { NarrativeRequest, NarrativeResult } from '../src/domain/livingWorld/narrative/contracts.ts';
import { validateNarrativeResult } from '../src/domain/livingWorld/narrative/validate.ts';

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

export async function handleNarrativeEnhancement(
  request: NarrativeRequest,
  apiKey: string | undefined
): Promise<{ ok: boolean; status: number; result?: NarrativeResult; error?: string }> {
  if (!apiKey) {
    return { ok: false, status: 503, error: 'GEMINI_API_KEY not configured on server' };
  }

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
      model: 'gemini-3.8-flash',
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
      return { ok: false, status: 502, error: 'Empty output from Gemini model' };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return { ok: false, status: 502, error: 'Malformed JSON from Gemini model' };
    }

    // Server-side validation pass
    const knownIds = new Set<string>([ctx.clubId, ...ctx.subjectIds]);
    const validation = validateNarrativeResult(request, parsed, { knownIds });

    if (!validation.ok || !validation.sanitized) {
      return {
        ok: false,
        status: 422,
        error: `Validation failed: ${validation.errors.join(', ')}`,
      };
    }

    return {
      ok: true,
      status: 200,
      result: validation.sanitized,
    };
  } catch (err: any) {
    return {
      ok: false,
      status: 500,
      error: err.message || 'Internal server error while calling Gemini',
    };
  }
}
