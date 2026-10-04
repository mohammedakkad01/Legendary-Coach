/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Explainable Best Tactics (Phase G).
 * Wraps and extends the Phase 4 Best Tactics engine (`recommendBestTactics`).
 * Returns the validated recommendation, optimal XI, bench, roles, instructions,
 * AND an explainable reason list with confidence and actionable diff.
 *
 * Does NOT duplicate or rewrite Best Tactics: strictly wraps its output.
 */

import type { Club, Player } from '../../types/game';
import { recommendBestTactics } from '../tactics/bestTactics/recommendBestTactics';
import type { BestTacticsInput, BestTacticsPlayer, BestTacticsRecommendation } from '../tactics/bestTactics/types';
import type { OpponentProfile } from '../tactics/bestTactics/types';
import type { AssistantRecommendation, TacticalChangesDiff } from './types';

export interface ExplainableTacticsInput {
  club: Club;
  opponent?: OpponentProfile;
  maxSubstitutes?: number;
  allowedFormations?: readonly import('../../types/game').FootballFormation[];
}

export interface ExplainableTacticsResult {
  recommendation: BestTacticsRecommendation;
  assistantRecommendation: AssistantRecommendation;
}

export function getExplainableBestTactics(input: ExplainableTacticsInput): ExplainableTacticsResult | null {
  const { club, opponent, maxSubstitutes = 7, allowedFormations } = input;

  const squad: BestTacticsPlayer[] = club.footballSquad.map((p) => ({
    id: p.id,
    position: p.position,
    overall: p.overall,
    secondaryPositions: p.secondaryPositions,
    fatigue: p.fatigue ?? 0,
    morale: p.morale ?? 75,
    form: p.form ?? 7,
    stamina: p.stamina ?? 85,
    attributes: p.attributes,
    injuredWeeks: p.injuredWeeks,
    suspendedMatches: p.suspendedMatches,
  }));

  const btInput: BestTacticsInput = {
    squad,
    currentLineup: club.footballLineup,
    currentTactics: club.footballTactics,
    opponent,
    maxSubstitutes,
    allowedFormations,
  };

  const recResult = recommendBestTactics(btInput);
  if (!recResult.ok) {
    return null;
  }

  const rec = recResult.value;

  // Build lineup swaps diff
  const currentLineupIds = club.footballLineup;
  const recommendedPlacements = rec.lineup;
  const playerMap = new Map<string, Player>(club.footballSquad.map((p) => [p.id, p]));

  const lineupSwaps: Array<{
    playerOutId: string;
    playerOutName: string;
    playerInId: string;
    playerInName: string;
    reasonEn: string;
    reasonAr: string;
  }> = [];

  for (let i = 0; i < recommendedPlacements.length; i++) {
    const curId = currentLineupIds[i];
    const recId = recommendedPlacements[i]?.playerId;
    if (curId && recId && curId !== recId) {
      const outP = playerMap.get(curId);
      const inP = playerMap.get(recId);
      if (outP && inP) {
        lineupSwaps.push({
          playerOutId: outP.id,
          playerOutName: outP.name,
          playerInId: inP.id,
          playerInName: inP.name,
          reasonEn: `Higher suitability and fitness in slot #${i + 1}`,
          reasonAr: `جاهزية بدنية وملاءمة مركزية أعلى للمركز #${i + 1}`,
        });
      }
    }
  }

  const suggestedChanges: TacticalChangesDiff = {
    formation: rec.formation,
    mentality: rec.tactics.mentality,
    pressing: rec.tactics.pressing,
    tempo: rec.tactics.tempo,
    passing: rec.tactics.passing,
    width: rec.tactics.width,
    lineupSwaps,
    bestTacticsRec: rec,
  };

  const reasonCodes = rec.reasons.map((r) => r.code);
  if (reasonCodes.length === 0) {
    reasonCodes.push('optimal_squad_synergy');
  }

  const reasonDetailsEn = rec.reasons.map((r) => {
    switch (r.code) {
      case 'PRIMARY_POSITION':
        return 'Maximizes players deployed in their native natural roles.';
      case 'HIGH_FITNESS':
        return 'Prioritizes players with superior freshness and low fatigue.';
      case 'HIGH_FORM':
        return 'Rewards players in peak competitive momentum.';
      case 'HIGH_MORALE':
        return 'Leverages high dressing-room confidence.';
      case 'OPPONENT_COUNTER':
        return 'Direct counter-formation designed to neutralize opponent strengths.';
      default:
        return 'Optimizes overall tactical cohesion and expected points.';
    }
  });

  const reasonDetailsAr = rec.reasons.map((r) => {
    switch (r.code) {
      case 'PRIMARY_POSITION':
        return 'توظيف اللاعبين في مراكزهم الطبيعية لتحقيق أعلى إنتاجية.';
      case 'HIGH_FITNESS':
        return 'منح الأفضلية للاعبين الأكثر جاهزية والأقل إجهاداً.';
      case 'HIGH_FORM':
        return 'الاعتماد على اللاعبين في قمة مستواهم التنافسي.';
      case 'HIGH_MORALE':
        return 'استثمار الروح المعنوية العالية داخل غرفة الملابس.';
      case 'OPPONENT_COUNTER':
        return 'خطة مضادة مصممة لشل مفاتيح لعب الخصم واستغلال نقاط ضعفه.';
      default:
        return 'تحقيق أعلى انسجام تكتيكي ونقاط متوقعة للفريق.';
    }
  });

  const titleEn = rec.alreadyOptimal
    ? `Tactics & Lineup Already Optimal (${rec.formation})`
    : `Optimal Setup: Switch to ${rec.formation}`;

  const titleAr = rec.alreadyOptimal
    ? `التشكيل والتكتيك في الجاهزية القصوى (${rec.formation})`
    : `التشكيل الأمثل: التحول إلى ${rec.formation}`;

  const summaryEn = rec.alreadyOptimal
    ? `Your current starters and tactics match the highest scoring setup available (Score: ${rec.score}).`
    : `Switching to ${rec.formation} improves tactical score to ${rec.score} (vs current ${rec.currentScore ?? 'unrated'}) with ${rec.expectedPoints.toFixed(2)} expected points.`;

  const summaryAr = rec.alreadyOptimal
    ? `التشكيلة الأساسية والتكتيك الحاليان يمثلان أعلى كفاءة تكتيكية ممكنة (التقييم: ${rec.score}).`
    : `التحول إلى ${rec.formation} يرفع التقييم التكتيكي إلى ${rec.score} (مقارنة بالتقييم الحالي ${rec.currentScore ?? 'غير مكتمل'}) مع ${rec.expectedPoints.toFixed(2)} نقطة متوقعة.`;

  const assistantRecommendation: AssistantRecommendation = {
    id: `rec_tactics_${rec.id}`,
    source: 'tactics',
    severity: rec.alreadyOptimal ? 'low' : 'high',
    confidence: 90,
    titleEn,
    titleAr,
    summaryEn,
    summaryAr,
    reasonCodes,
    reasonDetailsEn,
    reasonDetailsAr,
    suggestedChanges,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  return {
    recommendation: rec,
    assistantRecommendation,
  };
}
