/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LIVING_WORLD_TUNING } from '../config/livingWorldTuning';
import type { NarrativeRequest, NarrativeResult } from './contracts';

export type NarrativeValidationError =
  | 'schema_violation'
  | 'unknown_id'
  | 'text_too_long'
  | 'state_mutation_forbidden'
  | 'unsupported_claim';

export interface NarrativeValidationOutcome {
  ok: boolean;
  errors: NarrativeValidationError[];
  sanitized?: NarrativeResult;
}

const FORBIDDEN_KEYS = [
  'delta',
  'patch',
  'change',
  'morale',
  'reputation',
  'stateChange',
  'mutations',
] as const;

export interface NarrativeValidatorContext {
  knownIds: Set<string>;
}

export function validateNarrativeResult(
  request: NarrativeRequest,
  result: unknown,
  ctx: NarrativeValidatorContext,
): NarrativeValidationOutcome {
  const errors: NarrativeValidationError[] = [];
  if (!result || typeof result !== 'object') {
    return { ok: false, errors: ['schema_violation'] };
  }
  const r = result as Record<string, unknown>;
  if (r.requestId !== request.requestId) {
    errors.push('schema_violation');
  }
  for (const key of FORBIDDEN_KEYS) {
    if (key in r) errors.push('state_mutation_forbidden');
  }
  const presentation = r.presentation;
  if (!presentation || typeof presentation !== 'object') {
    errors.push('schema_violation');
    return { ok: false, errors };
  }
  const p = presentation as Record<string, unknown>;
  for (const [k, v] of Object.entries(p)) {
    if (typeof v !== 'string') continue;
    if (k === 'headline' && v.length > LIVING_WORLD_TUNING.narrative.maxHeadlineChars) {
      errors.push('text_too_long');
    }
    if ((k === 'body' || k === 'pullQuote') && v.length > LIVING_WORLD_TUNING.narrative.maxBodyChars) {
      errors.push('text_too_long');
    }
  }
  for (const id of request.context.subjectIds) {
    if (!ctx.knownIds.has(id)) errors.push('unknown_id');
  }
  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    errors: [],
    sanitized: {
      requestId: request.requestId,
      presentation: {
        headline: typeof p.headline === 'string' ? p.headline : undefined,
        body: typeof p.body === 'string' ? p.body : undefined,
        pullQuote: typeof p.pullQuote === 'string' ? p.pullQuote : undefined,
      },
    },
  };
}
