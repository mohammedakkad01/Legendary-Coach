/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { GameEvent } from '../../livingWorld/types';
import { ASSISTANT_DISMISS_EVENT_TYPE } from '../types';
import type { Recommendation } from '../types';

export function collectDismissedDedupeKeys(events: readonly GameEvent[]): Set<string> {
  const keys = new Set<string>();
  for (const e of events) {
    if (e.type !== ASSISTANT_DISMISS_EVENT_TYPE) continue;
    const key = e.context.dedupeKey;
    if (typeof key === 'string' && key.length > 0) keys.add(key);
  }
  return keys;
}

export function filterRecommendationsByIgnore(
  recs: readonly Recommendation[],
  dismissed: ReadonlySet<string>,
): Recommendation[] {
  return recs.filter((r) => !dismissed.has(r.dedupeKey));
}

export function buildDismissEvent(input: {
  dedupeKey: string;
  clubId: string;
  season: number;
  nowIso: string;
  recommendationId: string;
}): GameEvent {
  return {
    id: `evt_${ASSISTANT_DISMISS_EVENT_TYPE}_${input.recommendationId}_${Date.now()}`,
    type: ASSISTANT_DISMISS_EVENT_TYPE,
    timestamp: input.nowIso,
    season: input.season,
    clubId: input.clubId,
    severity: 'low',
    context: {
      dedupeKey: input.dedupeKey,
      recommendationId: input.recommendationId,
      title: 'Assistant advice dismissed',
      message: 'A coaching suggestion was dismissed.',
    },
  };
}
