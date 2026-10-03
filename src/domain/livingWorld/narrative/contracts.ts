/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { NewsItem } from '../phaseF/types';

export interface StructuredContext {
  locale: 'en' | 'ar';
  season: number;
  clubId: string;
  subjectIds: string[];
  factKeys: string[];
  newsItem?: Pick<NewsItem, 'type' | 'facts' | 'tone' | 'importance' | 'sourceEventId'>;
  storyArcId?: string;
}

export interface NarrativeRequest {
  context: StructuredContext;
  requestId: string;
  schemaVersion: 1;
}

export interface NarrativePresentation {
  headline?: string;
  body?: string;
  pullQuote?: string;
}

export interface NarrativeResult {
  requestId: string;
  presentation: NarrativePresentation;
  /** Must remain empty in validated results — state changes are forbidden. */
  mutations?: never;
}

export const NARRATIVE_RESULT_SCHEMA_VERSION = 1 as const;
