/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { StructuredContext } from './contracts';
import type { NewsItem } from '../phaseF/types';

export function buildStructuredContext(input: {
  locale: 'en' | 'ar';
  season: number;
  clubId: string;
  subjectIds: string[];
  factKeys: string[];
  newsItem?: NewsItem;
  storyArcId?: string;
}): StructuredContext {
  return {
    locale: input.locale,
    season: input.season,
    clubId: input.clubId,
    subjectIds: input.subjectIds,
    factKeys: input.factKeys,
    newsItem: input.newsItem
      ? {
          type: input.newsItem.type,
          facts: input.newsItem.facts,
          tone: input.newsItem.tone,
          importance: input.newsItem.importance,
          sourceEventId: input.newsItem.sourceEventId,
        }
      : undefined,
    storyArcId: input.storyArcId,
  };
}
