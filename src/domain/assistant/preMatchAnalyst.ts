/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Deterministic Pre-Match Tactical Analyst (Phase G).
 * Evaluates upcoming opponent strengths, vulnerabilities, key threats,
 * set-piece danger, referee profile, and generates explainable recommendations.
 *
 * Uncertainty and confidence strictly reflect information quality:
 * - Unscouted vs Scouted
 * - Analytics department level (Phase E)
 * - Opposition analysis delegation (Phase E)
 * - Historical scouting samples (Phase B/F)
 */

import type { Club, Fixture, Player } from '../../types/game';
import type { RefereeProfile } from '../referee/refereeTypes';
import { createRefereeFromSeed } from '../referee/createRefereeFromSeed';
import type { OpponentTacticalScoutingCompact } from '../livingWorld/types';
import type { PreMatchAnalysis, AssistantRecommendation, TacticalChangesDiff } from './types';
import { clamp } from '../shared/math';

export interface PreMatchAnalystInput {
  userClub: Club;
  opponentClub: Club;
  fixture: Fixture;
  isScouted?: boolean;
  scoutAccuracy?: number;
  analyticsLevel?: number;
  oppositionAnalysisDelegated?: boolean;
  opponentScoutingCompact?: OpponentTacticalScoutingCompact;
  refereeProfile?: RefereeProfile;
}

export function generatePreMatchAnalysis(input: PreMatchAnalystInput): PreMatchAnalysis {
  const {
    userClub,
    opponentClub,
    fixture,
    isScouted = false,
    scoutAccuracy = 70,
    analyticsLevel = 0,
    oppositionAnalysisDelegated = false,
    opponentScoutingCompact,
  } = input;

  // Derive referee if not explicitly provided
  const matchSeed = fixture.matchday * 1337 + 42;
  const referee = input.refereeProfile ?? createRefereeFromSeed(matchSeed);

  // 1. Compute information quality & confidence
  let confidence = 40; // baseline unscouted
  if (isScouted) {
    confidence = 65 + Math.round((scoutAccuracy - 70) * 0.4);
  }
  confidence += analyticsLevel * 5; // up to +20% for level 4
  if (oppositionAnalysisDelegated) {
    confidence += 5;
  }
  if (opponentScoutingCompact && opponentScoutingCompact.samples > 0) {
    confidence += Math.min(10, opponentScoutingCompact.samples * 2);
  }
  // Clamped to 25-92% (football inherently contains uncertainty)
  const overallConfidence = clamp(confidence, 25, 92);

  const dataQualityNoticeEn = isScouted
    ? (analyticsLevel >= 2
        ? `Comprehensive data verified by Level ${analyticsLevel} Analytics Dept and scout team (${overallConfidence}% confidence).`
        : `Scouted report available (${overallConfidence}% confidence). Upgrading Analytics Dept increases precision.`)
    : `Preliminary unscouted estimate (${overallConfidence}% confidence). Dispatch scouts or upgrade Analytics for high-fidelity data.`;

  const dataQualityNoticeAr = isScouted
    ? (analyticsLevel >= 2
        ? `بيانات متكاملة موثقة بواسطة قسم التحليلات المستوى ${analyticsLevel} وفريق الكشافة (دقة ${overallConfidence}%).`
        : `تقرير كشافة متاح (دقة ${overallConfidence}%). ترقية قسم التحليلات ترفع دقة التفاصيل.`)
    : `تقدير أولي قبل إرسال الكشافة (دقة ${overallConfidence}%). أرسل كشافاً أو طوّر قسم التحليلات للحصول على تقرير استخباراتي دقيق.`;

  // 2. Opponent Squad Analysis
  const starters: Player[] = (opponentClub.footballLineup || [])
    .map((id) => opponentClub.footballSquad.find((p) => p.id === id))
    .filter((p): p is Player => Boolean(p));

  const squadToAnalyze = starters.length >= 11 ? starters : opponentClub.footballSquad;

  const defenders = squadToAnalyze.filter((p) => p.position === 'CB' || p.position === 'LB' || p.position === 'RB' || p.position === 'LWB' || p.position === 'RWB');
  const midfielders = squadToAnalyze.filter((p) => p.position === 'CM' || p.position === 'CDM' || p.position === 'CAM' || p.position === 'LM' || p.position === 'RM');
  const attackers = squadToAnalyze.filter((p) => p.position === 'ST' || p.position === 'CF' || p.position === 'LW' || p.position === 'RW');

  const avgDefRating = defenders.length > 0 ? Math.round(defenders.reduce((sum, p) => sum + p.rating, 0) / defenders.length) : 70;
  const avgMidRating = midfielders.length > 0 ? Math.round(midfielders.reduce((sum, p) => sum + p.rating, 0) / midfielders.length) : 70;
  const avgAttRating = attackers.length > 0 ? Math.round(attackers.reduce((sum, p) => sum + p.rating, 0) / attackers.length) : 70;

  // Identify Main Threat
  const topAttacker = [...attackers, ...midfielders].sort((a, b) => b.rating - a.rating)[0] || squadToAnalyze[0];
  const mainThreat = {
    playerId: topAttacker?.id,
    playerName: topAttacker ? topAttacker.name : 'Opponent Key Striker',
    role: topAttacker?.position || 'ST',
    threatReasonEn: `Rated ${topAttacker?.rating || 75} with high offensive awareness and goal contribution.`,
    threatReasonAr: `تقييم ${topAttacker?.rating || 75} مع فاعلية هجومية وخطورة دائمة أمام المرمى.`,
  };

  // Strengths and Weaknesses
  const strengths: Array<{ labelEn: string; labelAr: string; confidence: number }> = [];
  const weaknesses: Array<{ labelEn: string; labelAr: string; confidence: number }> = [];

  const oppTactics = opponentClub.footballTactics;

  if (avgAttRating >= 78 || oppTactics.mentality === 'attacking' || oppTactics.mentality === 'ultra_attacking') {
    strengths.push({
      labelEn: `High offensive firepower (${avgAttRating} avg forward rating) with proactive attacking posture`,
      labelAr: `قوة هجومية ضاربة (متوسط هجوم ${avgAttRating}) مع نهج هجومي مبادر`,
      confidence: overallConfidence,
    });
  }
  if (avgMidRating >= 77 || oppTactics.pressing === 'high') {
    strengths.push({
      labelEn: `Aggressive midfield press and quick central recoveries`,
      labelAr: `ضغط مكثف في خط الوسط واستعادة سريعة للكرة في العمق`,
      confidence: Math.round(overallConfidence * 0.95),
    });
  }
  if (oppTactics.tempo === 'fast' && (oppTactics.formation.includes('3') || oppTactics.formation.includes('4-3-3'))) {
    strengths.push({
      labelEn: `Rapid wide transitions exploiting space behind advanced fullbacks`,
      labelAr: `تحولات هجومية سريعة عبر الأجنحة واستغلال المساحات خلف الأظهرة`,
      confidence: overallConfidence,
    });
  }
  if (strengths.length === 0) {
    strengths.push({
      labelEn: `Disciplined tactical structure in ${oppTactics.formation}`,
      labelAr: `تنظيم تكتيكي متماسك بنظام ${oppTactics.formation}`,
      confidence: overallConfidence,
    });
  }

  // Weaknesses
  const leftDefenders = defenders.filter((p) => p.position === 'LB' || p.position === 'LWB');
  const rightDefenders = defenders.filter((p) => p.position === 'RB' || p.position === 'RWB');
  const leftAvg = leftDefenders.length > 0 ? leftDefenders.reduce((s, p) => s + p.rating, 0) / leftDefenders.length : 70;
  const rightAvg = rightDefenders.length > 0 ? rightDefenders.reduce((s, p) => s + p.rating, 0) / rightDefenders.length : 70;

  if (avgDefRating < 74) {
    weaknesses.push({
      labelEn: `Vulnerable backline (average rating ${avgDefRating}) susceptible to direct balls`,
      labelAr: `خط دفاع متواضع (متوسط ${avgDefRating}) يسهل اختراقه بالكرات البينية المباشرة`,
      confidence: overallConfidence,
    });
  }
  if (leftAvg < rightAvg - 2) {
    weaknesses.push({
      labelEn: `Defensive weakness on opponent's left flank (${Math.round(leftAvg)} rating vs ${Math.round(rightAvg)} on right)`,
      labelAr: `ثغرة واضحة في الرواق الأيسر للخصم (تقييم ${Math.round(leftAvg)} مقابل ${Math.round(rightAvg)} يميناً)`,
      confidence: Math.round(overallConfidence * 0.9),
    });
  } else if (rightAvg < leftAvg - 2) {
    weaknesses.push({
      labelEn: `Defensive weakness on opponent's right flank (${Math.round(rightAvg)} rating vs ${Math.round(leftAvg)} on left)`,
      labelAr: `ثغرة واضحة في الرواق الأيمن للخصم (تقييم ${Math.round(rightAvg)} مقابل ${Math.round(leftAvg)} يساراً)`,
      confidence: Math.round(overallConfidence * 0.9),
    });
  }
  if (oppTactics.pressing === 'low' || oppTactics.mentality === 'defensive') {
    weaknesses.push({
      labelEn: `Passive defensive block surrenders possession and territory`,
      labelAr: `تكتل دفاعي منخفض يمنحك السيطرة والاستحواذ في الثلث الأخير`,
      confidence: overallConfidence,
    });
  }
  if (weaknesses.length === 0) {
    weaknesses.push({
      labelEn: `Struggles against sustained high pressing and positional rotation`,
      labelAr: `يواجه صعوبة تحت الضغط العالي والتحركات الذكية بدون كرة`,
      confidence: overallConfidence,
    });
  }

  // Defensive Vulnerabilities Breakdown
  const defensiveVulnerabilities: Array<{ zone: 'left' | 'center' | 'right'; detailEn: string; detailAr: string }> = [];
  if (leftAvg <= rightAvg) {
    defensiveVulnerabilities.push({
      zone: 'left',
      detailEn: `Left fullback space can be exploited with quick diagonal passing and overloads.`,
      detailAr: `يمكن ضرب الجبهة اليسرى للخصم بالتمرير القطري والزيادة العددية.`,
    });
  }
  if (rightAvg < leftAvg) {
    defensiveVulnerabilities.push({
      zone: 'right',
      detailEn: `Right fullback struggles in 1v1 duels against dynamic wingers.`,
      detailAr: `الظهير الأيمن للخصم يعاني في المواجهات الفردية أمام الأجنحة السريعة.`,
    });
  }
  if (defenders.length < 4 || avgDefRating < 73) {
    defensiveVulnerabilities.push({
      zone: 'center',
      detailEn: `Central channels show slow recovery pace when turning against through balls.`,
      detailAr: `قلب الدفاع يعاني من بطء في الارتداد وسهولة تلقي الكرات البينية في ظهر المدافعين.`,
    });
  }

  // Set-Piece Danger
  const aerialScore = Math.round((avgDefRating * 0.5) + (topAttacker?.rating || 70) * 0.5);
  const setPieceDanger = {
    riskLevel: aerialScore >= 78 ? ('high' as const) : aerialScore >= 72 ? ('medium' as const) : ('low' as const),
    aerialPower: aerialScore,
    noteEn: aerialScore >= 78
      ? 'Opponent has significant height and physical dominance on attacking set-pieces.'
      : aerialScore >= 72
      ? 'Standard set-piece threat; maintain disciplined zone marking.'
      : 'Low aerial presence; prioritize quick counter-attacks from defensive corners.',
    noteAr: aerialScore >= 78
      ? 'الخصم يمتلك أطوالاً وقوة بدنية تشكل خطورة قصوى في الكرات الهوائية والركنيات.'
      : aerialScore >= 72
      ? 'خطورة اعتيادية في الكرات الثابتة؛ الالتزام بالرقابة يقلل التهديد.'
      : 'حضور هوائي ضعيف للخصم؛ استغل الكرات الثابتة لشن مرتدات سريعة.',
  };

  // Key Players
  const keyPlayers = squadToAnalyze
    .slice(0, 3)
    .map((p) => ({
      name: p.name,
      position: p.position,
      ratingEst: p.rating,
      formTrend: p.rating >= 78 ? ('hot' as const) : p.rating <= 71 ? ('cold' as const) : ('normal' as const),
    }));

  // Referee Profile Analysis
  const refereeProfile = {
    name: referee.nameEn,
    strictness: referee.strictness > 65 ? 'High (Strict)' : referee.strictness < 40 ? 'Low (Lenient)' : 'Moderate',
    cardTendency: referee.cardTendency > 60 ? 'Card-heavy' : 'Fair',
    penaltyTendency: referee.penaltyTendency > 60 ? 'Whistle-happy in the box' : 'Standard',
    adviceEn: referee.cardTendency > 60
      ? `Referee ${referee.nameEn} averages high bookings. Instruct players to avoid rash lunges and temper pressing aggression.`
      : referee.strictness < 40
      ? `Referee ${referee.nameEn} allows physical play. You can contest duels firmly without fear of soft cards.`
      : `Balanced officiating expected under ${referee.nameEn}. Maintain normal tackle timing.`,
    adviceAr: referee.cardTendency > 60
      ? `الحكم ${referee.name} يشهر البطاقات بكثرة. وجّه اللاعبين بتجنب التدخلات المتهورة وخفض حدة الاندفاع.`
      : referee.strictness < 40
      ? `الحكم ${referee.name} يتيح اللعب البدني. يمكنك المنافسة على الكرات المشتركة بقوة.`
      : `إدارة متوازنة متوقعة مع الحكم ${referee.name}. حافظ على التوقيت الطبيعي للتدخلات.`,
  };

  // 3. Generate Actionable Assistant Recommendations
  const recommendations: AssistantRecommendation[] = [];

  // Recommendation A: Tactical exploitation of flank vulnerability
  const weakFlank = leftAvg <= rightAvg ? 'left' : 'right';
  const recChanges: TacticalChangesDiff = {
    width: weakFlank === 'left' ? 'wide' : 'balanced',
    passing: 'mixed',
  };

  recommendations.push({
    id: `rec_pre_${fixture.matchday}_flank`,
    source: 'pre_match',
    severity: 'high',
    confidence: overallConfidence,
    titleEn: `Target Opponent's Vulnerable ${weakFlank === 'left' ? 'Left' : 'Right'} Flank`,
    titleAr: `استهدف الجبهة ${weakFlank === 'left' ? 'اليسرى' : 'اليمنى'} الضعيفة للخصم`,
    summaryEn: `Opponent fullbacks on their ${weakFlank} side are rated lower (${Math.round(weakFlank === 'left' ? leftAvg : rightAvg)} vs ${Math.round(weakFlank === 'left' ? rightAvg : leftAvg)}). Broaden team width to overload and isolate this channel.`,
    summaryAr: `أظهرة الخصم في الرواق ${weakFlank === 'left' ? 'الأيسر' : 'الأيمن'} أضعف فTraceياً. وسّع انتشار الفريق لتكثيف الضغط وخلق فرص سانحة عبر هذا الجانب.`,
    reasonCodes: ['flank_defensive_gap', 'overload_space', 'scouted_weakness'],
    reasonDetailsEn: [
      `Opponent ${weakFlank} flank average rating is ${Math.round(weakFlank === 'left' ? leftAvg : rightAvg)}`,
      `Wide distribution forces their backline to stretch, creating space`,
      `Confidence of ${overallConfidence}% based on scout intel`,
    ],
    reasonDetailsAr: [
      `متوسط تقييم رواق الخصم هو ${Math.round(weakFlank === 'left' ? leftAvg : rightAvg)}`,
      `اللعب الواسع يجبر دفاعهم على التشتت ويصنع ثغرات للتمرير البيني`,
      `نسبة دقة ${overallConfidence}% مستندة لبيانات الكشافة`,
    ],
    suggestedChanges: recChanges,
    expiryMatchday: fixture.matchday,
    status: 'pending',
    createdAt: new Date().toISOString(),
  });

  // Recommendation B: Referee Discipline Alert if card tendency is high
  if (referee.cardTendency > 62) {
    recommendations.push({
      id: `rec_pre_${fixture.matchday}_ref`,
      source: 'pre_match',
      severity: 'medium',
      confidence: 88,
      titleEn: `Discipline Warning: High-Card Official (${referee.nameEn})`,
      titleAr: `تحذير انضباطي: حكم حازم في البطاقات (${referee.name})`,
      summaryEn: `Referee ${referee.nameEn} exhibits a strict card tendency (${referee.cardTendency}/100). Lower pressing intensity slightly or set cautious tackling to prevent early ejections.`,
      summaryAr: `الحكم ${referee.name} يميل لإشهار البطاقات بسرعة (${referee.cardTendency}/100). يُنصح بضبط التدخلات وتجنب التدخلات المتهورة لحماية اللاعبين من الطرد.`,
      reasonCodes: ['referee_strictness', 'card_risk_prevention'],
      reasonDetailsEn: [
        `Referee card tendency score: ${referee.cardTendency}/100`,
        `Premature red card would compromise tactical shape`,
      ],
      reasonDetailsAr: [
        `معدل ميل الحكم للبطاقات: ${referee.cardTendency}/100`,
        `أي طرد مبكر سيهدد التوازن التكتيكي للمباراة`,
      ],
      suggestedChanges: {
        pressing: 'low',
      },
      expiryMatchday: fixture.matchday,
      status: 'pending',
      createdAt: new Date().toISOString(),
    });
  }

  return {
    opponentClubId: opponentClub.id,
    opponentFormation: oppTactics.formation,
    strengths,
    weaknesses,
    mainThreat,
    defensiveVulnerabilities,
    setPieceDanger,
    keyPlayers,
    refereeProfile,
    overallConfidence,
    dataQualityNoticeEn,
    dataQualityNoticeAr,
    recommendations,
  };
}
