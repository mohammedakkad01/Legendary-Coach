/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Maps assistant reason codes to narrative StructuredContext (text enrichment only).
 */

import type { StructuredContext } from '../../livingWorld/narrative/contracts';

export function buildAssistantNarrativeContext(input: {
  locale: 'en' | 'ar';
  season: number;
  clubId: string;
  subjectIds: string[];
  reasonCodes: readonly string[];
  recommendationId: string;
}): StructuredContext {
  const factKeys = [
    'assistant_why',
    ...input.reasonCodes.slice().sort(),
    `rec_${input.recommendationId}`,
  ];
  return {
    locale: input.locale,
    season: input.season,
    clubId: input.clubId,
    subjectIds: input.subjectIds,
    factKeys,
  };
}
