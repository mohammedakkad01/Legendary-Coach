/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Narrative Service & Gemini Server Route Hardening Configuration.
 */

export const GEMINI_NARRATIVE_CONFIG = {
  /** Single authoritative model name for server-side narrative generation */
  model: process.env.GEMINI_NARRATIVE_MODEL || 'gemini-3.8-flash',
  /** Maximum allowed request payload size in bytes (16 KB) */
  maxPayloadBytes: 16 * 1024,
  /** IP rate limit: max requests per minute */
  maxRequestsPerMinute: 20,
  /** IP rate limit window in milliseconds (1 minute) */
  rateLimitWindowMs: 60 * 1000,
} as const;
