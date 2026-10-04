/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Strict domain validation for Assistant recommendations and AI explanations.
 * Enforces:
 * 1. AI cannot mutate game state or include mutation keys.
 * 2. Bounds on text length, confidence, severity, and reason codes.
 * 3. Graceful fallback on validation failure.
 */

import type { AssistantRecommendation, AssistantExplanation } from './types';

export const MAX_EXPLANATION_CHARS = 1000;
export const MAX_KEY_POINT_CHARS = 200;
export const MAX_KEY_POINTS = 5;

const FORBIDDEN_MUTATION_KEYS = new Set([
  'coins',
  'balance',
  'finances',
  'morale',
  'reputation',
  'score',
  'goals',
  'result',
  'mutations',
  'stateChange',
  'patch',
  'delete',
]);

export interface ValidationIssue {
  code: string;
  message: string;
}

export function validateAssistantRecommendation(rec: unknown): {
  valid: boolean;
  issues: ValidationIssue[];
} {
  const issues: ValidationIssue[] = [];
  if (!rec || typeof rec !== 'object') {
    return { valid: false, issues: [{ code: 'not_an_object', message: 'Payload must be an object' }] };
  }

  const r = rec as Record<string, unknown>;

  if (typeof r.id !== 'string' || !r.id.trim()) {
    issues.push({ code: 'invalid_id', message: 'id must be a non-empty string' });
  }

  const validSources = ['pre_match', 'live_match', 'post_match', 'tactics', 'scouting'];
  if (typeof r.source !== 'string' || !validSources.includes(r.source)) {
    issues.push({ code: 'invalid_source', message: `source must be one of: ${validSources.join(', ')}` });
  }

  const validSeverities = ['low', 'medium', 'high', 'critical'];
  if (typeof r.severity !== 'string' || !validSeverities.includes(r.severity)) {
    issues.push({ code: 'invalid_severity', message: `severity must be one of: ${validSeverities.join(', ')}` });
  }

  if (typeof r.confidence !== 'number' || Number.isNaN(r.confidence) || r.confidence < 0 || r.confidence > 100) {
    issues.push({ code: 'invalid_confidence', message: 'confidence must be a number between 0 and 100' });
  }

  if (typeof r.titleEn !== 'string' || !r.titleEn.trim() || typeof r.titleAr !== 'string' || !r.titleAr.trim()) {
    issues.push({ code: 'missing_titles', message: 'titleEn and titleAr must be provided' });
  }

  if (typeof r.summaryEn !== 'string' || !r.summaryEn.trim() || typeof r.summaryAr !== 'string' || !r.summaryAr.trim()) {
    issues.push({ code: 'missing_summaries', message: 'summaryEn and summaryAr must be provided' });
  }

  if (!Array.isArray(r.reasonCodes) || r.reasonCodes.length === 0) {
    issues.push({ code: 'missing_reasons', message: 'reasonCodes must be a non-empty array' });
  }

  // Check for forbidden mutations
  for (const key of Object.keys(r)) {
    if (FORBIDDEN_MUTATION_KEYS.has(key)) {
      issues.push({ code: 'state_mutation_forbidden', message: `Forbidden mutation key: ${key}` });
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

export function validateAssistantExplanation(payload: unknown): {
  valid: boolean;
  issues: ValidationIssue[];
  data?: { explanation: string; keyPoints: string[] };
} {
  const issues: ValidationIssue[] = [];
  if (!payload || typeof payload !== 'object') {
    return { valid: false, issues: [{ code: 'not_an_object', message: 'Payload must be an object' }] };
  }

  const p = payload as Record<string, unknown>;

  // Check forbidden keys
  for (const key of Object.keys(p)) {
    if (FORBIDDEN_MUTATION_KEYS.has(key)) {
      issues.push({ code: 'state_mutation_forbidden', message: `Forbidden mutation key: ${key}` });
    }
  }

  if (typeof p.explanation !== 'string' || !p.explanation.trim()) {
    issues.push({ code: 'invalid_explanation', message: 'explanation must be a non-empty string' });
  } else if (p.explanation.length > MAX_EXPLANATION_CHARS) {
    issues.push({ code: 'explanation_too_long', message: `explanation exceeds ${MAX_EXPLANATION_CHARS} chars` });
  }

  const keyPoints: string[] = [];
  if (Array.isArray(p.keyPoints)) {
    for (const kp of p.keyPoints) {
      if (typeof kp === 'string' && kp.trim()) {
        if (kp.length > MAX_KEY_POINT_CHARS) {
          issues.push({ code: 'keypoint_too_long', message: `key point exceeds ${MAX_KEY_POINT_CHARS} chars` });
        } else {
          keyPoints.push(kp.trim());
        }
      }
    }
  }

  if (issues.length > 0) {
    return { valid: false, issues };
  }

  return {
    valid: true,
    issues: [],
    data: {
      explanation: (p.explanation as string).trim(),
      keyPoints: keyPoints.slice(0, MAX_KEY_POINTS),
    },
  };
}
