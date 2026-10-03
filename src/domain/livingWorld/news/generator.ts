/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { GameEvent } from '../types';
import { LIVING_WORLD_TUNING } from '../config/livingWorldTuning';
import type { NewsItem, NewsThrottleState } from '../phaseF/types';
import { dayKeyFromIso } from '../notifications/throttle';

export function newsIdFromEvent(event: GameEvent): string {
  return `news_${event.id}`;
}

export function buildNewsItemFromGameEvent(event: GameEvent): NewsItem | null {
  const subjectIds: string[] = [];
  if (event.playerId) subjectIds.push(event.playerId);
  if (event.clubId) subjectIds.push(event.clubId);

  let type = 'general';
  let tone: NewsItem['tone'] = 'neutral';
  let importance = 40;

  if (event.type.startsWith('manager.reputation.')) {
    type = 'manager_reputation';
    tone = (event.context.delta as number) >= 0 ? 'positive' : 'negative';
    importance = 55;
  } else if (event.type.startsWith('story.') || event.type.startsWith('recruitment.')) {
    type = event.type.replace(/\./g, '_');
    importance = event.severity === 'high' || event.severity === 'critical' ? 70 : 50;
  } else if (event.type === 'match.user_completed') {
    type = 'match_result';
    tone = event.context.won === true ? 'positive' : event.context.drew === true ? 'neutral' : 'negative';
    importance = 45;
  } else if (event.type.startsWith('board.')) {
    type = 'board';
    tone = 'dramatic';
    importance = 75;
  } else {
    return null;
  }

  const facts: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(event.context)) {
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
      facts[k] = v;
    }
  }
  facts.eventType = event.type;

  return {
    id: newsIdFromEvent(event),
    type,
    subjectIds,
    facts,
    tone,
    importance,
    sourceEventId: event.id,
    createdAt: event.timestamp,
    season: event.season,
  };
}

export function appendNewsWithCaps(feed: NewsItem[], item: NewsItem): NewsItem[] {
  if (feed.some((n) => n.id === item.id)) return feed;
  return [item, ...feed].slice(0, LIVING_WORLD_TUNING.news.maxFeed);
}

export function canAcceptNews(throttle: NewsThrottleState, createdAt: string): boolean {
  const day = dayKeyFromIso(createdAt);
  const count = throttle.dayBuckets[day] ?? 0;
  return count < LIVING_WORLD_TUNING.news.dailyCap;
}

export function recordNewsAccepted(throttle: NewsThrottleState, createdAt: string): NewsThrottleState {
  const day = dayKeyFromIso(createdAt);
  return {
    dayBuckets: {
      ...throttle.dayBuckets,
      [day]: (throttle.dayBuckets[day] ?? 0) + 1,
    },
  };
}
