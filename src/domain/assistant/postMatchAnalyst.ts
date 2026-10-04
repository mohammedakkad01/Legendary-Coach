/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Deterministic Post-Match Analyst (Phase G).
 * Reuses Phase B `generateAnalyticsConclusions` and builds actionable
 * "What to change next" tactical recommendations tied directly to recorded metrics.
 */

import type { MatchRecord, Club } from '../../types/game';
import { generateAnalyticsConclusions, type AnalyticsConclusion } from '../match/analyticsConclusions';
import type { PostMatchAnalysis, AssistantRecommendation } from './types';

export function generatePostMatchAnalysis(match: MatchRecord, userClub: Club): PostMatchAnalysis {
  const isHome = match.homeClubId === userClub.id;
  const userScore = isHome ? match.homeScore : match.awayScore;
  const oppScore = isHome ? match.awayScore : match.homeScore;
  const opponentName = isHome ? match.awayClubName : match.homeClubName;

  // 1. Reuse existing Phase B analytics conclusions if saved, or compute afresh
  const conclusions: readonly AnalyticsConclusion[] =
    match.analyticsConclusions && match.analyticsConclusions.length > 0
      ? match.analyticsConclusions
      : match.analytics
      ? generateAnalyticsConclusions(match.stats, match.analytics, isHome)
      : [];

  // 2. Structured Summary
  const outcomeEn = userScore > oppScore ? 'Victory' : userScore === oppScore ? 'Draw' : 'Defeat';
  const outcomeAr = userScore > oppScore ? 'فوز مستحق' : userScore === oppScore ? 'تعادل' : 'خسارة مخيبة';

  const summaryEn = `${outcomeEn} (${userScore}-${oppScore}) against ${opponentName}. Recorded ${match.stats.homeShots + match.stats.awayShots} total shots with ${isHome ? match.stats.homePossession : match.stats.awayPossession}% possession.`;
  const summaryAr = `${outcomeAr} بنتيجة (${userScore}-${oppScore}) أمام ${opponentName}. شهدت المباراة ${match.stats.homeShots + match.stats.awayShots} تسديدة واستحواذ بنسبة ${isHome ? match.stats.homePossession : match.stats.awayPossession}%.`;

  // 3. Translate metrics & conclusions into Actionable "What to change next" recommendations
  const actionableTakeaways: AssistantRecommendation[] = [];

  for (const c of conclusions) {
    if (c.code === 'sterile_possession') {
      actionableTakeaways.push({
        id: `post_${match.id}_sterile`,
        source: 'post_match',
        severity: 'high',
        confidence: 90,
        titleEn: 'Inject Penetration: Increase Passing Directness',
        titleAr: 'زيادة الفاعلية الهجومية: اعتماد التمرير المباشر',
        summaryEn: `Possession was high but produced only ${c.value} progressive passes. For the upcoming fixture, consider switching from short possession to mixed or direct passing with higher tempo.`,
        summaryAr: `الاستحواذ كان مرتفعاً لكنه أسفر عن ${c.value} تمريرات تقدمية فقط. للمباراة القادمة، يُنصح بالتحول إلى التمرير المختلط أو المباشر مع رفع إيقاع اللعب.`,
        reasonCodes: ['sterile_possession', 'lack_of_penetration'],
        reasonDetailsEn: [
          `Possession lacked forward incision (${c.value} progressive passes recorded)`,
          `Higher tempo forces opponent defenders out of settled low block`,
        ],
        reasonDetailsAr: [
          `الاستحواذ افتقر للعمق والفاعلية (${c.value} تمريرة تقدمية فقط)`,
          `تسريع الإيقاع يجبر دفاع الخصم على التحرك وفتح مساحات بينية`,
        ],
        suggestedChanges: {
          passing: 'direct_counter',
          tempo: 'fast_electric',
        },
        expiryMatchday: match.matchDay + 1,
        status: 'pending',
        createdAt: new Date().toISOString(),
      });
    } else if (c.code === 'duels_lost') {
      actionableTakeaways.push({
        id: `post_${match.id}_duels`,
        source: 'post_match',
        severity: 'high',
        confidence: 88,
        titleEn: 'Reinforce Midfield Engine: Physical Conditioning & Press',
        titleAr: 'تعزيز صلب الوسط: تدريب بدني وتكثيف الضغط',
        summaryEn: `Lost ${c.value}% of 50-50 duels. Run a physical stamina drill this week and consider tightening midfield pressing support.`,
        summaryAr: `خسارة ${c.value}% من الالتحامات المشتركة. يُوصى بحصة تدريب بدني هذا الأسبوع وزيادة التماسك في عمق الوسط.`,
        reasonCodes: ['duels_lost', 'midfield_turnovers'],
        reasonDetailsEn: [
          `${c.value}% of contested ground and aerial duels were conceded`,
          `Physical dominance is crucial against direct opponents`,
        ],
        reasonDetailsAr: [
          `خسارة ${c.value}% من الالتحامات الهوائية والأرضية المسجلة`,
          `التفوق البدني عنصر حاسم لحسم مباريات الدوري`,
        ],
        suggestedChanges: {
          pressing: 'high_press',
        },
        expiryMatchday: match.matchDay + 1,
        status: 'pending',
        createdAt: new Date().toISOString(),
      });
    } else if (c.code === 'chances_left') {
      actionableTakeaways.push({
        id: `post_${match.id}_left_flank`,
        source: 'post_match',
        severity: 'medium',
        confidence: 85,
        titleEn: 'Seal Defensive Channel: Reinforce Left Side',
        titleAr: 'تأمين الرواق الأيسر: تعزيز التغطية الدفاعية',
        summaryEn: `${c.value}% of opponent attacks pierced the left side. Adjust defensive width to 'narrow' or ensure adequate midfield cover for your left fullback.`,
        summaryAr: `${c.value}% من هجمات الخصم تركزت على الجبهة اليسرى. اضبط الانتشار الدفاعي ليكون أكثر إحكاماً ووفّر مساندة للظهير.`,
        reasonCodes: ['conceded_flank_attacks', 'defensive_imbalance'],
        reasonDetailsEn: [
          `${c.value}% of recorded attempts targeted this defensive sector`,
          `Compact width reduces the space between fullback and center-back`,
        ],
        reasonDetailsAr: [
          `${c.value}% من المحاولات المسجلة استهدفت هذا القطاع الدفاعي`,
          `التقارب الدفاعي يقلل الفجوة بين الظهير وقلب الدفاع`,
        ],
        suggestedChanges: {
          width: 'narrow',
        },
        expiryMatchday: match.matchDay + 1,
        status: 'pending',
        createdAt: new Date().toISOString(),
      });
    } else if (c.code === 'low_press') {
      actionableTakeaways.push({
        id: `post_${match.id}_low_press`,
        source: 'post_match',
        severity: 'medium',
        confidence: 82,
        titleEn: 'Increase Pressing Pressure: Higher PPDA Target',
        titleAr: 'رفع حدة الضغط: استعادة أسرع للكرة',
        summaryEn: `Opponent enjoyed relaxed circulation (PPDA ${c.value}). Step up pressing triggers in the middle third to force earlier turnovers.`,
        summaryAr: `الخصم تمتع بحرية تدوير الكرة (PPDA ${c.value}). ارفع ضغط خط الوسط لإجبار الخصم على ارتكاب الأخطاء.`,
        reasonCodes: ['passive_pressing', 'high_opponent_possession'],
        reasonDetailsEn: [`PPDA value of ${c.value} indicates a low engagement block`],
        reasonDetailsAr: [`قيمة PPDA تبلغ ${c.value} تشير إلى تراجع دفاعي غير ضاغط`],
        suggestedChanges: {
          pressing: 'high_press',
        },
        expiryMatchday: match.matchDay + 1,
        status: 'pending',
        createdAt: new Date().toISOString(),
      });
    }
  }

  // Default recommendation if no negative conclusions emerged
  if (actionableTakeaways.length === 0) {
    actionableTakeaways.push({
      id: `post_${match.id}_balanced`,
      source: 'post_match',
      severity: 'low',
      confidence: 92,
      titleEn: 'Maintain Tactical Continuity',
      titleAr: 'الحفاظ على الاستقرار التكتيكي',
      summaryEn: 'The team exhibited balanced execution across key metrics. Maintain current setup while managing player fatigue for the next round.',
      summaryAr: 'أظهر الفريق أداءً متوازناً عبر المؤشرات الإحصائية الرئيسية. حافظ على الخطة الحالية مع مراعاة جاهزية اللاعبين.',
      reasonCodes: ['tactical_equilibrium', 'solid_execution'],
      expiryMatchday: match.matchDay + 1,
      status: 'pending',
      createdAt: new Date().toISOString(),
    });
  }

  return {
    matchRecordId: match.id,
    summaryEn,
    summaryAr,
    keyConclusions: [...conclusions],
    actionableTakeaways,
  };
}
