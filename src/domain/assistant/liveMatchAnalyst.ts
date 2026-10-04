/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Deterministic Live Match Analyst (Phase G).
 * Evaluates the ACTUAL live simulation stream:
 * - Chance creation by zone (left / center / right)
 * - Defensive vulnerabilities & full-back exposure
 * - Pressing effectiveness & midfield duel control
 * - Player fatigue thresholds (stamina < 35% after min 55)
 * - Opponent in-game tactical shifts
 *
 * Strictly adheres to cooldowns (10–15 mins) and ignored IDs.
 * Zero AI calls per minute: all triggers are 100% deterministic domain logic.
 */

import type { MatchEvent, MatchAnalyticsSummary, FootballTactics, Player } from '../../types/game';
import type { LiveMatchAnalysis, AssistantRecommendation, TacticalChangesDiff } from './types';

export interface LiveMatchAnalystInput {
  currentMinute: number;
  events: MatchEvent[];
  analytics?: MatchAnalyticsSummary;
  userTactics: FootballTactics;
  userSquad: Player[];
  userLineup: string[];
  userBench: string[];
  isHome: boolean;
  cooldowns: Record<string, number>;
  ignoredIds: string[];
  /** Optional live player conditions (e.g. stamina 0-100) */
  playerStaminaMap?: Record<string, number>;
}

export const LIVE_ANALYST_COOLDOWN_MINUTES = 12;

export function evaluateLiveMatch(input: LiveMatchAnalystInput): LiveMatchAnalysis {
  const {
    currentMinute,
    events,
    analytics,
    userTactics,
    userSquad,
    userLineup,
    userBench,
    isHome,
    cooldowns,
    ignoredIds,
    playerStaminaMap = {},
  } = input;

  const opponentAttLeft = isHome ? (analytics?.awayAttLeft || 0) : (analytics?.homeAttLeft || 0);
  const opponentAttCenter = isHome ? (analytics?.awayAttCenter || 0) : (analytics?.homeAttCenter || 0);
  const opponentAttRight = isHome ? (analytics?.awayAttRight || 0) : (analytics?.homeAttRight || 0);
  const totalOppAttacks = opponentAttLeft + opponentAttCenter + opponentAttRight;

  let dominantThreatZone: 'left' | 'center' | 'right' | null = null;
  if (totalOppAttacks >= 4) {
    if (opponentAttLeft / totalOppAttacks >= 0.52) dominantThreatZone = 'left';
    else if (opponentAttRight / totalOppAttacks >= 0.52) dominantThreatZone = 'right';
    else if (opponentAttCenter / totalOppAttacks >= 0.52) dominantThreatZone = 'center';
  }

  // 1. Midfield & Pressing Assessment
  const userDuelsWon = isHome ? (analytics?.homeDuelsWon || 0) : (analytics?.awayDuelsWon || 0);
  const userDuelsLost = isHome ? (analytics?.homeDuelsLost || 0) : (analytics?.awayDuelsLost || 0);
  const totalDuels = userDuelsWon + userDuelsLost;
  const duelWinRate = totalDuels > 0 ? Math.round((userDuelsWon / totalDuels) * 100) : 50;

  const userPpda = isHome ? (analytics?.homePpda || 0) : (analytics?.awayPpda || 0);
  const userPressAttempts = isHome ? (analytics?.homePressAttempts || 0) : (analytics?.awayPressAttempts || 0);
  const userPressSuccess = isHome ? (analytics?.homePressSuccess || 0) : (analytics?.awayPressSuccess || 0);
  const pressSuccessRate = userPressAttempts > 0 ? Math.round((userPressSuccess / userPressAttempts) * 100) : 50;

  const pressingEffectiveness: 'dominant' | 'adequate' | 'failing' =
    pressSuccessRate >= 65 || (userPpda > 0 && userPpda >= 14)
      ? 'dominant'
      : pressSuccessRate < 40 || (userPpda > 0 && userPpda < 7)
      ? 'failing'
      : 'adequate';

  const midfieldVerdictEn = duelWinRate >= 58
    ? 'Midfield duels under control; maintaining defensive stability.'
    : duelWinRate < 42 && totalDuels >= 6
    ? 'Midfield second balls being conceded; opponent advancing easily.'
    : 'Even battle across the center of the pitch.';

  const midfieldVerdictAr = duelWinRate >= 58
    ? 'سيطرة جيدة على معارك الوسط؛ تماسك دفاعي ملحوظ.'
    : duelWinRate < 42 && totalDuels >= 6
    ? 'خسارة صراعات خط الوسط؛ الخصم يتقدم بسهولة للمناطق الخطرة.'
    : 'صراع متكافئ في دائرة المنتصف.';

  // 2. Fatigue Warnings
  const starters = userLineup
    .map((id) => userSquad.find((p) => p.id === id))
    .filter((p): p is Player => Boolean(p));

  const benchPlayers = userBench
    .map((id) => userSquad.find((p) => p.id === id))
    .filter((p): p is Player => Boolean(p));

  const fatigueWarnings: Array<{
    playerId: string;
    playerName: string;
    stamina: number;
    recommendation: 'sub_off' | 'rest_in_possession';
  }> = [];

  for (const starter of starters) {
    // If live stamina exists use it, otherwise derive from match progression & position
    const currentStamina = playerStaminaMap[starter.id] ?? Math.max(25, starter.stamina - Math.round(currentMinute * 0.7));
    if (currentStamina < 35 && currentMinute >= 55) {
      fatigueWarnings.push({
        playerId: starter.id,
        playerName: starter.name,
        stamina: currentStamina,
        recommendation: currentStamina < 28 ? 'sub_off' : 'rest_in_possession',
      });
    }
  }

  // 3. Opponent Tactical Shift Detection from event stream
  const recentTacticalEvents = events.filter(
    (e) => e.type === 'tactical_change' && e.team === (isHome ? 'away' : 'home') && currentMinute - e.minute <= 10
  );
  let opponentTacticalShift: { descriptionEn: string; descriptionAr: string; detectedAtMinute: number } | undefined;
  if (recentTacticalEvents.length > 0) {
    const lastShift = recentTacticalEvents[recentTacticalEvents.length - 1];
    opponentTacticalShift = {
      descriptionEn: `Opponent adjusted tactical parameters at min ${lastShift.minute} (${lastShift.textEn || 'formation shift'}).`,
      descriptionAr: `الخصم قام بتعديل تكتيكي في الدقيقة ${lastShift.minute} (${lastShift.textAr || 'تغيير في أسلوب اللعب'}).`,
      detectedAtMinute: lastShift.minute,
    };
  }

  // 4. Trigger Deterministic Actionable Alerts
  const activeAlerts: AssistantRecommendation[] = [];

  // TRIGGER 1: Repeated Flank Threat
  const canTriggerFlank =
    dominantThreatZone &&
    dominantThreatZone !== 'center' &&
    (!cooldowns.flank_threat || currentMinute - cooldowns.flank_threat >= LIVE_ANALYST_COOLDOWN_MINUTES);

  if (canTriggerFlank) {
    const oppFlank = dominantThreatZone; // opponent's left means our right side!
    const ourDefendedSide = oppFlank === 'left' ? 'Right' : 'Left';
    const ourDefendedSideAr = oppFlank === 'left' ? 'الأيمن' : 'الأيسر';
    const recId = `live_flank_${currentMinute}`;

    if (!ignoredIds.includes(recId)) {
      activeAlerts.push({
        id: recId,
        source: 'live_match',
        severity: 'high',
        confidence: 86,
        titleEn: `Repeated Attacks Behind Your ${ourDefendedSide} Flank`,
        titleAr: `هجمات متكررة خلف الرواق ${ourDefendedSideAr}`,
        summaryEn: `Opponent has launched ${oppFlank === 'left' ? opponentAttLeft : opponentAttRight} attacks (${Math.round(((oppFlank === 'left' ? opponentAttLeft : opponentAttRight) / totalOppAttacks) * 100)}%) down this wing. Narrow team width or shift to a more compact pressing stance.`,
        summaryAr: `الخصم شن ${oppFlank === 'left' ? opponentAttLeft : opponentAttRight} هجمة عبر هذا الرواق. يُنصح بضبط انتشار الفريق إلى (ضيق) وتكثيف التغطية لحماية الظهير.`,
        reasonCodes: ['live_flank_overload', 'repeated_conceded_entries'],
        reasonDetailsEn: [
          `${oppFlank === 'left' ? opponentAttLeft : opponentAttRight} of ${totalOppAttacks} total attacks focused on this flank`,
          `Fullback is facing numerical inferiority`,
        ],
        reasonDetailsAr: [
          `${oppFlank === 'left' ? opponentAttLeft : opponentAttRight} من أصل ${totalOppAttacks} هجمة ركزت على هذه الجبهة`,
          `الظهير يعاني من زيادة عددية على جانبه`,
        ],
        suggestedChanges: {
          width: 'narrow',
        },
        expiryMinute: currentMinute + 15,
        status: 'pending',
        createdAt: new Date().toISOString(),
      });
    }
  }

  // TRIGGER 2: Severe Fatigue & Substitution Opportunity
  const criticalFatigue = fatigueWarnings.find((f) => f.recommendation === 'sub_off');
  const canTriggerSub =
    criticalFatigue &&
    (!cooldowns[`fatigue_${criticalFatigue.playerId}`] || currentMinute - cooldowns[`fatigue_${criticalFatigue.playerId}`] >= 15);

  if (canTriggerSub && criticalFatigue) {
    const starterPlayer = starters.find((p) => p.id === criticalFatigue.playerId);
    const suitableSub = benchPlayers.find((b) => b.position === starterPlayer?.position) || benchPlayers[0];
    const recId = `live_fatigue_${criticalFatigue.playerId}_${currentMinute}`;

    if (!ignoredIds.includes(recId) && suitableSub && starterPlayer) {
      activeAlerts.push({
        id: recId,
        source: 'live_match',
        severity: 'critical',
        confidence: 94,
        titleEn: `Exhaustion Alert: ${starterPlayer.name} (Stamina ${criticalFatigue.stamina}%)`,
        titleAr: `تحذير إجهاد حاد: ${starterPlayer.name} (اللياقة ${criticalFatigue.stamina}%)`,
        summaryEn: `${starterPlayer.name} is depleted (<35% stamina). High risk of conceded goal or muscle injury. Substitute with ${suitableSub.name}.`,
        summaryAr: `اللاعب ${starterPlayer.name} في حالة إجهاد شديد (أقل من 35%). خطر كبير لاستقبال أهداف أو الإصابة. يُنصح بإشراك ${suitableSub.name}.`,
        reasonCodes: ['stamina_below_threshold', 'injury_risk', 'tactical_freshness'],
        reasonDetailsEn: [
          `Current stamina at ${criticalFatigue.stamina}% past minute 55`,
          `Fresh substitute ${suitableSub.name} ready on bench`,
        ],
        reasonDetailsAr: [
          `اللياقة البدنية هبطت إلى ${criticalFatigue.stamina}% بعد الدقيقة 55`,
          `البديل الجاهز ${suitableSub.name} متاح على الدكة`,
        ],
        suggestedChanges: {
          lineupSwaps: [
            {
              playerOutId: starterPlayer.id,
              playerOutName: starterPlayer.name,
              playerInId: suitableSub.id,
              playerInName: suitableSub.name,
              reasonEn: 'Stamina preservation & fresh energy',
              reasonAr: 'الحفاظ على اللياقة وضخ دماء جديدة',
            },
          ],
        },
        expiryMinute: currentMinute + 12,
        status: 'pending',
        createdAt: new Date().toISOString(),
      });
    }
  }

  // TRIGGER 3: Midfield Overrun / Duel Collapse
  const canTriggerMidfield =
    duelWinRate < 40 &&
    totalDuels >= 8 &&
    (!cooldowns.midfield_collapse || currentMinute - cooldowns.midfield_collapse >= LIVE_ANALYST_COOLDOWN_MINUTES);

  if (canTriggerMidfield) {
    const recId = `live_midfield_${currentMinute}`;
    if (!ignoredIds.includes(recId)) {
      activeAlerts.push({
        id: recId,
        source: 'live_match',
        severity: 'high',
        confidence: 84,
        titleEn: `Midfield Battle Lost (Won only ${duelWinRate}% of Duels)`,
        titleAr: `خسارة معركة الوسط (الفوز بـ ${duelWinRate}% فقط من الالتحامات)`,
        summaryEn: `Opponent is dominating physical contests in the central zone. Switch to direct passing or raise pressing tempo to bypass congested areas.`,
        summaryAr: `الخصم يسيطر على الكرات المشتركة في العمق. يُنصح بالتحول إلى التمرير المباشر أو تسريع الإيقاع لتجاوز مناطق الضغط.`,
        reasonCodes: ['duel_win_rate_low', 'conceding_second_balls'],
        reasonDetailsEn: [
          `Won only ${userDuelsWon} of ${totalDuels} recorded physical duels`,
          `Direct passing bypasses opponent's midfield trap`,
        ],
        reasonDetailsAr: [
          `الفوز في ${userDuelsWon} فقط من أصل ${totalDuels} التحام في وسط الملعب`,
          `التمرير المباشر يتجاوز مصيدة ضغط الخصم`,
        ],
        suggestedChanges: {
          passing: 'direct',
          tempo: 'fast',
        },
        expiryMinute: currentMinute + 15,
        status: 'pending',
        createdAt: new Date().toISOString(),
      });
    }
  }

  return {
    minute: currentMinute,
    zonesSummary: {
      leftAttacks: opponentAttLeft,
      centerAttacks: opponentAttCenter,
      rightAttacks: opponentAttRight,
      dominantThreatZone,
    },
    midfieldControl: {
      duelWinRate,
      possessionPct: isHome ? (analytics?.homePasses ? Math.round((analytics.homePasses / (analytics.homePasses + analytics.awayPasses || 1)) * 100) : 50) : 50,
      ppda: userPpda,
      verdictEn: midfieldVerdictEn,
      verdictAr: midfieldVerdictAr,
    },
    pressingEffectiveness,
    fatigueWarnings,
    opponentTacticalShift,
    activeAlerts,
  };
}
