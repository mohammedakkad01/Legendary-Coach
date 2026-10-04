/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Safe Scouting Summaries (Phase G).
 * Strictly consumes the Phase D `ObservedPlayerView` ONLY.
 * NEVER reads hidden true ratings, true potential, or internal simulation states.
 */

import type { ObservedPlayerView } from '../recruitment/types';
import type { ScoutingSummary, AssistantRecommendation } from './types';

export function generateScoutingSummary(
  observed: ObservedPlayerView,
  playerName = 'Target Prospect',
  playerPosition = 'Player'
): ScoutingSummary {
  const { confidencePct, ratingRange, potentialBand, estimatedValue, personalityIndicators = [], injuryConcernLevel = 0 } = observed;

  const strengthsEn: string[] = [];
  const strengthsAr: string[] = [];
  const risksEn: string[] = [];
  const risksAr: string[] = [];

  // Evaluate observable qualities
  if (potentialBand.max >= 84) {
    strengthsEn.push(`High projected ceiling (potential up to ${potentialBand.max})`);
    strengthsAr.push(`سقف تطور مرتفع (إمكانات متوقعة تصل إلى ${potentialBand.max})`);
  }
  if (ratingRange.min >= 74) {
    strengthsEn.push(`Immediate first-team quality (guaranteed baseline rating ${ratingRange.min}+)`);
    strengthsAr.push(`جاهزية فورية للتشكيلة الأساسية (مستوى مضمون لا يقل عن ${ratingRange.min})`);
  }
  if (personalityIndicators.includes('professional') || personalityIndicators.includes('ambitious')) {
    strengthsEn.push(`Exemplary character and professional drive`);
    strengthsAr.push(`عقلية احترافية وطموح عالٍ لتطوير الذات`);
  }

  // Evaluate risks
  if (confidencePct < 60) {
    risksEn.push(`Low scouting certainty (${confidencePct}%); rating variance spans ${ratingRange.max - ratingRange.min} points`);
    risksAr.push(`دقة استكشاف منخفضة (${confidencePct}%); هامش تفاوت التقييم يبلغ ${ratingRange.max - ratingRange.min} نقطة`);
  }
  if (injuryConcernLevel > 2) {
    risksEn.push('Elevated injury vulnerability noted by medical scouts');
    risksAr.push('مؤشرات طبية تحذر من قابلية متزايدة للإصابات');
  }
  if (personalityIndicators.includes('volatile') || personalityIndicators.includes('mercenary')) {
    risksEn.push('Dressing-room temper or contract friction risks');
    risksAr.push('احتمالية خلافات في غرفة الملابس أو تقلبات سلوكية');
  }

  if (strengthsEn.length === 0) {
    strengthsEn.push('Solid squad depth option with development margin');
    strengthsAr.push('خيار مناسب لدعم دكة البدلاء مع قابلية للتطور');
  }
  if (risksEn.length === 0) {
    risksEn.push('Reliable profile with low identifiable risk factors');
    risksAr.push('ملف متوازن ومخاطر فنية أو سلوكية منخفضة');
  }

  const tacticalFitEn = potentialBand.max >= 82
    ? `Strong strategic fit. Recommended for signing if transfer fee matches valuation.`
    : `Viable rotational asset for squad depth.`;

  const tacticalFitAr = potentialBand.max >= 82
    ? `استثمار استراتيجي واعد. يُنصح بالتعاقد إذا كانت القيمة المالية مناسبة.`
    : `خيار تدوير مناسب لتعزيز دكة البدلاء.`;

  const recommendation: AssistantRecommendation = {
    id: `rec_scout_${observed.playerId}`,
    source: 'scouting',
    severity: potentialBand.max >= 84 && confidencePct >= 65 ? 'high' : 'medium',
    confidence: confidencePct,
    titleEn: `Scouting Assessment: ${playerName} (${playerPosition})`,
    titleAr: `التقرير الكشفي الفني: ${playerName} (${playerPosition})`,
    summaryEn: `Observed rating band ${ratingRange.min}–${ratingRange.max}, potential ${potentialBand.min}–${potentialBand.max}. ${tacticalFitEn}`,
    summaryAr: `نطاق المستوى المرصود ${ratingRange.min}–${ratingRange.max}، الإمكانات ${potentialBand.min}–${potentialBand.max}. ${tacticalFitAr}`,
    reasonCodes: ['scouted_observed_profile', ...(potentialBand.max >= 82 ? ['high_potential_target'] : ['squad_depth_target'])],
    reasonDetailsEn: strengthsEn,
    reasonDetailsAr: strengthsAr,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  return {
    playerId: observed.playerId,
    confidencePct,
    ratingBand: `${ratingRange.min} - ${ratingRange.max}`,
    potentialBand: `${potentialBand.min} - ${potentialBand.max}`,
    estimatedValueFormatted: `${Math.round(estimatedValue).toLocaleString()} 🪙`,
    strengthsEn,
    strengthsAr,
    risksEn,
    risksAr,
    tacticalFitEn,
    tacticalFitAr,
    recommendation,
  };
}
