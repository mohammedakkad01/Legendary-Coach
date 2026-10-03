/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { NewsItem } from '../phaseF/types';

export function renderNewsItem(item: NewsItem, locale: 'en' | 'ar'): { headline: string; body: string } {
  const type = String(item.facts.eventType ?? item.type);
  if (locale === 'ar') {
    return renderAr(item, type);
  }
  return renderEn(item, type);
}

function renderEn(item: NewsItem, type: string): { headline: string; body: string } {
  switch (item.type) {
    case 'match_result':
      return {
        headline: item.tone === 'positive' ? 'Victory for the club' : 'Defeat on matchday',
        body: `Match result recorded (${type}). Importance ${item.importance}.`,
      };
    case 'manager_reputation':
      return {
        headline: 'Manager reputation update',
        body: `Reputation shift linked to event ${item.sourceEventId}.`,
      };
    case 'board':
      return {
        headline: 'Board statement',
        body: `Board-related development (${type}).`,
      };
    default:
      return {
        headline: `Club news: ${item.type}`,
        body: `Report sourced from event ${item.sourceEventId}.`,
      };
  }
}

function renderAr(item: NewsItem, type: string): { headline: string; body: string } {
  switch (item.type) {
    case 'match_result':
      return {
        headline: item.tone === 'positive' ? 'فوز للنادي' : 'هزيمة في الجولة',
        body: `نتيجة م recorded (${type}).`,
      };
    case 'manager_reputation':
      return {
        headline: 'تحديث سمعة المدرب',
        body: `تغيير م linked إلى ${item.sourceEventId}.`,
      };
    case 'board':
      return {
        headline: 'بيان مجلس الإدارة',
        body: `تطور إداري (${type}).`,
      };
    default:
      return {
        headline: `خبر النادي: ${item.type}`,
        body: `مصدر الحدث ${item.sourceEventId}.`,
      };
  }
}
