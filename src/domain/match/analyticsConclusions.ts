/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { MatchAnalyticsSummary } from './matchAnalytics';
import type { MatchStats } from '../../types/game';

export interface AnalyticsConclusion {
  readonly code: string;
  readonly metricKey: string;
  readonly value: number;
  readonly sentenceEn: string;
  readonly sentenceAr: string;
}

export function generateAnalyticsConclusions(
  stats: MatchStats,
  analytics: MatchAnalyticsSummary,
  isHomeTeamPerspective: boolean,
): readonly AnalyticsConclusion[] {
  const out: AnalyticsConclusion[] = [];
  const attL = isHomeTeamPerspective ? analytics.homeAttLeft : analytics.awayAttLeft;
  const attR = isHomeTeamPerspective ? analytics.homeAttRight : analytics.awayAttRight;
  const attC = isHomeTeamPerspective ? analytics.homeAttCenter : analytics.awayAttCenter;
  const attTotal = attL + attR + attC;
  const duelsW = isHomeTeamPerspective ? analytics.homeDuelsWon : analytics.awayDuelsWon;
  const duelsL = isHomeTeamPerspective ? analytics.homeDuelsLost : analytics.awayDuelsLost;
  const duels = duelsW + duelsL;
  const poss = isHomeTeamPerspective ? stats.homePossession : stats.awayPossession;
  const ppda = isHomeTeamPerspective ? analytics.homePpda : analytics.awayPpda;
  const prog = isHomeTeamPerspective ? analytics.homeProgressivePasses : analytics.awayProgressivePasses;

  if (attTotal >= 5 && attL > attR && attL > attC) {
    out.push({
      code: 'chances_left',
      metricKey: 'attLeftShare',
      value: Math.round((attL / attTotal) * 100),
      sentenceEn: `Most chances came down the left (${Math.round((attL / attTotal) * 100)}% of recorded attempts).`,
      sentenceAr: `غالبية الفرص جاءت من الجهة اليسرى (${Math.round((attL / attTotal) * 100)}% من المحاولات).`,
    });
  }
  if (duels >= 8 && duelsL > duelsW) {
    out.push({
      code: 'duels_lost',
      metricKey: 'duelsLostShare',
      value: Math.round((duelsL / duels) * 100),
      sentenceEn: `You lost ${Math.round((duelsL / duels) * 100)}% of duels — midfield battles hurt progression.`,
      sentenceAr: `خسرت ${Math.round((duelsL / duels) * 100)}% من المبارزات — صراع الوسط أضر بالتقدم.`,
    });
  }
  if (poss >= 58 && prog < 8) {
    out.push({
      code: 'sterile_possession',
      metricKey: 'progressivePasses',
      value: prog,
      sentenceEn: `High possession (${poss}%) but only ${prog} progressive passes — attack lacked penetration.`,
      sentenceAr: `استحواذ مرتفع (${poss}%) لكن ${prog} تمريرة تقدمية فقط — الهجوم افتقر للاختراق.`,
    });
  }
  if (ppda > 0 && ppda < 8) {
    out.push({
      code: 'low_press',
      metricKey: 'ppda',
      value: ppda,
      sentenceEn: `Low pressing intensity (PPDA ${ppda}) — opponent circulated comfortably.`,
      sentenceAr: `ضغط منخفض (PPDA ${ppda}) — الخصم مرّر براحة.`,
    });
  }
  if (ppda >= 14) {
    out.push({
      code: 'high_press',
      metricKey: 'ppda',
      value: ppda,
      sentenceEn: `Aggressive press (PPDA ${ppda}) forced turnovers.`,
      sentenceAr: `ضغط عالٍ (PPDA ${ppda}) أجبر على فقدان الكرة.`,
    });
  }
  return out;
}
