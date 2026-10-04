/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { MatchRecord } from '../../../types/game';
import { generateAnalyticsConclusions } from '../../match/analyticsConclusions';
import type { Recommendation } from '../types';

export interface PostMatchAnalystInput {
  readonly record: MatchRecord;
  readonly clubId: string;
  readonly analyticsDepartmentLevel: number;
  readonly isScoutedNextOpponent?: boolean;
}

export function runPostMatchAnalyst(input: PostMatchAnalystInput): {
  readonly conclusions: ReturnType<typeof generateAnalyticsConclusions>;
  readonly recommendations: readonly Recommendation[];
  readonly overallConfidence: number;
} {
  const { record, clubId } = input;
  const isHome = record.homeClubId === clubId;
  if (!record.analytics || !record.stats) {
    return { conclusions: [], recommendations: [], overallConfidence: 0 };
  }

  const conclusions = generateAnalyticsConclusions(record.stats, record.analytics, isHome);
  const baseConf = Math.min(
    90,
    45 + input.analyticsDepartmentLevel * 4 + (conclusions.length > 0 ? 10 : 0),
  );

  const recommendations: Recommendation[] = [];

  for (const c of conclusions) {
    if (c.code === 'low_press') {
      recommendations.push({
        id: `post_${record.id}_press`,
        dedupeKey: `post|${record.id}|press`,
        source: 'post_match',
        severity: 'info',
        confidence: baseConf,
        reasonCodes: ['post_change_pressing'],
        reasonParams: { ppda: c.value },
        titleEn: 'Adjust pressing next match',
        titleAr: 'عدّل الضغط للمباراة القادمة',
        summaryEn: c.sentenceEn,
        summaryAr: c.sentenceAr,
        suggestedChanges: [{ kind: 'tactics', patch: { pressing: 'mid_press' } }],
        fixtureMatchday: record.matchDay,
        importance: 62,
      });
    }
    if (c.code === 'chances_left') {
      recommendations.push({
        id: `post_${record.id}_width`,
        dedupeKey: `post|${record.id}|width`,
        source: 'post_match',
        severity: 'info',
        confidence: baseConf,
        reasonCodes: ['post_change_width'],
        reasonParams: { metric: c.metricKey, value: c.value },
        titleEn: 'Balance defensive width',
        titleAr: 'وازن عرض الدفاع',
        summaryEn: c.sentenceEn,
        summaryAr: c.sentenceAr,
        suggestedChanges: [{ kind: 'tactics', patch: { width: 'standard' } }],
        fixtureMatchday: record.matchDay,
        importance: 60,
      });
    }
  }

  return {
    conclusions,
    recommendations,
    overallConfidence: conclusions.length > 0 ? baseConf : 0,
  };
}
