/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { FootballTactics } from '../../../types/game';
import { ASSISTANT_TUNING, type LiveTriggerId } from '../config/assistantTuning';
import type { LiveAnalystInput, LiveAnalystResult, Recommendation } from '../types';

function stableRecId(trigger: string, minute: number): string {
  return `live_${trigger}_${minute}`;
}

function makeRec(
  trigger: LiveTriggerId,
  minute: number,
  confidence: number,
  reasonCodes: string[],
  reasonParams: Record<string, string | number>,
  titles: { en: string; ar: string },
  summaries: { en: string; ar: string },
  patch?: Partial<FootballTactics>,
): Recommendation {
  const cfg = ASSISTANT_TUNING.live.triggers[trigger];
  return {
    id: stableRecId(trigger, minute),
    dedupeKey: `live|${trigger}|${Math.floor(minute / cfg.cooldownMinutes)}`,
    source: 'live',
    severity: cfg.severity === 'warning' ? 'warning' : 'info',
    confidence,
    reasonCodes,
    reasonParams,
    titleEn: titles.en,
    titleAr: titles.ar,
    summaryEn: summaries.en,
    summaryAr: summaries.ar,
    suggestedChanges: patch
      ? [{ kind: 'live_tactics', patch }]
      : [],
    expiryMinute: minute + ASSISTANT_TUNING.expiry.liveAlertMinutes,
    importance: cfg.importance,
  };
}

export function evaluateLiveTriggers(input: LiveAnalystInput): LiveAnalystResult {
  const t = ASSISTANT_TUNING.live;
  if (input.alertsEmitted >= t.maxAlertsPerMatch) {
    return { recommendations: [], cooldowns: input.cooldowns, alertsEmitted: input.alertsEmitted };
  }

  const { analytics, stats, minute, events } = input;
  const cooldowns = { ...input.cooldowns };
  const out: Recommendation[] = [];
  let alertsEmitted = input.alertsEmitted;

  const awayAttTotal = analytics.awayAttLeft + analytics.awayAttCenter + analytics.awayAttRight;

  const tryFire = (trigger: LiveTriggerId, rec: Recommendation) => {
    const cfg = t.triggers[trigger];
    const last = cooldowns[trigger] ?? -999;
    if (minute - last < cfg.cooldownMinutes) return;
    if (alertsEmitted >= t.maxAlertsPerMatch) return;
    cooldowns[trigger] = minute;
    out.push(rec);
    alertsEmitted += 1;
  };

  const cfgR = t.triggers.flank_overload_right;
  if (
    minute >= cfgR.minMinute &&
    awayAttTotal >= cfgR.minAwayAttTotal &&
    awayAttTotal > 0 &&
    analytics.awayAttRight / awayAttTotal >= cfgR.flankShareMin
  ) {
    const share = Math.round((analytics.awayAttRight / awayAttTotal) * 100);
    tryFire(
      'flank_overload_right',
      makeRec(
        'flank_overload_right',
        minute,
        Math.min(88, 55 + Math.min(awayAttTotal, 8) * 4),
        ['flank_overload_right'],
        { share },
        { en: 'Right flank under pressure', ar: 'ضغط على الجهة اليمنى' },
        {
          en: `Opponent has ${share}% of chances down your right — consider tucking the RB or shifting width.`,
          ar: `الخصم يهاجم يمينك بنسبة ${share}% — ضيّق أو زِح الظهير.`,
        },
        { width: 'narrow' },
      ),
    );
  }

  const cfgL = t.triggers.flank_overload_left;
  if (
    minute >= cfgL.minMinute &&
    awayAttTotal >= cfgL.minAwayAttTotal &&
    awayAttTotal > 0 &&
    analytics.awayAttLeft / awayAttTotal >= cfgL.flankShareMin
  ) {
    const share = Math.round((analytics.awayAttLeft / awayAttTotal) * 100);
    tryFire(
      'flank_overload_left',
      makeRec(
        'flank_overload_left',
        minute,
        Math.min(88, 55 + Math.min(awayAttTotal, 8) * 4),
        ['flank_overload_left'],
        { share },
        { en: 'Left flank under pressure', ar: 'ضغط على الجهة اليسرى' },
        {
          en: `Opponent has ${share}% of chances down your left — support the LB or balance width.`,
          ar: `الخصم يهاجم يسارك بنسبة ${share}% — ادعم الظهير الأيسر.`,
        },
        { width: 'narrow' },
      ),
    );
  }

  const cfgSp = t.triggers.set_piece_pressure;
  const setPieceShots = analytics.awayCornerShots + analytics.awayFkShots;
  if (
    minute >= cfgSp.minMinute &&
    (setPieceShots >= cfgSp.minAwaySetPieceShots || analytics.awaySetPieceGoals >= cfgSp.minAwaySetPieceGoals)
  ) {
    tryFire(
      'set_piece_pressure',
      makeRec(
        'set_piece_pressure',
        minute,
        Math.min(85, 50 + setPieceShots * 5),
        ['set_piece_pressure'],
        { shots: setPieceShots },
        { en: 'Set-piece danger', ar: 'خطر الكرات الثابتة' },
        {
          en: `${setPieceShots} set-piece shots conceded — tighten restarts.`,
          ar: `${setPieceShots} محاولات من كرات ثابتة — شد الرقابة.`,
        },
      ),
    );
  }

  const cfgPress = t.triggers.press_not_sticking;
  const attempts = analytics.homePressAttempts;
  const successRate = attempts > 0 ? analytics.homePressSuccess / attempts : 1;
  if (
    minute >= cfgPress.minMinute &&
    attempts >= cfgPress.minPressAttempts &&
    successRate <= cfgPress.maxSuccessRate
  ) {
    const rate = Math.round(successRate * 100);
    tryFire(
      'press_not_sticking',
      makeRec(
        'press_not_sticking',
        minute,
        Math.min(82, 48 + attempts),
        ['press_not_sticking'],
        { rate },
        { en: 'Press not sticking', ar: 'الضغط غير فعّال' },
        {
          en: `Press success ${rate}% — drop to medium press or trap centrally.`,
          ar: `نجاح الضغط ${rate}% — خفّض الشدة أو اختصر المساحة.`,
        },
        { pressing: 'mid_press' },
      ),
    );
  }

  const cfgMid = t.triggers.midfield_overrun;
  const duelsW = analytics.homeDuelsWon;
  const duelsL = analytics.homeDuelsLost;
  const duels = duelsW + duelsL;
  const lostShare = duels > 0 ? duelsL / duels : 0;
  if (
    minute >= cfgMid.minMinute &&
    stats.awayPossession >= cfgMid.minAwayPossession &&
    duels >= cfgMid.minDuels &&
    lostShare >= cfgMid.minDuelsLostShare
  ) {
    tryFire(
      'midfield_overrun',
      makeRec(
        'midfield_overrun',
        minute,
        Math.min(86, 52 + duels),
        ['midfield_overrun'],
        { possession: stats.awayPossession },
        { en: 'Midfield overrun', ar: 'الوسط يتراجع' },
        {
          en: `Possession ${stats.awayPossession}% and duels lost — add a holding role or slow tempo.`,
          ar: `استحواذ الخصم ${stats.awayPossession}% — أضف تمركزاً أو خفّض الإيقاع.`,
        },
        { tempo: 'slow_patient' },
      ),
    );
  }

  const cfgSter = t.triggers.sterile_possession;
  if (
    minute >= cfgSter.minMinute &&
    stats.homePossession >= cfgSter.minHomePossession &&
    analytics.homeProgressivePasses <= cfgSter.maxProgressivePasses
  ) {
    tryFire(
      'sterile_possession',
      makeRec(
        'sterile_possession',
        minute,
        Math.min(80, 50 + stats.homePossession),
        ['sterile_possession'],
        { prog: analytics.homeProgressivePasses },
        { en: 'Sterile possession', ar: 'استحواذ بلا عمق' },
        {
          en: `High possession but only ${analytics.homeProgressivePasses} progressive passes — push width or tempo.`,
          ar: `استحواذ مرتفع لكن ${analytics.homeProgressivePasses} تمريرة عميقة — زد العرض أو الإيقاع.`,
        },
        { width: 'wide', tempo: 'fast_electric' },
      ),
    );
  }

  const cfgOpp = t.triggers.opponent_tactical_change;
  const lastAwayTactical = [...events].reverse().find(
    (e) => e.type === 'tactical_change' && e.team === 'away' && e.minute <= minute,
  );
  if (lastAwayTactical && minute >= cfgOpp.minMinute) {
    const lastFired = cooldowns.opponent_tactical_change ?? -999;
    if (lastAwayTactical.minute > lastFired) {
      tryFire(
        'opponent_tactical_change',
        makeRec(
          'opponent_tactical_change',
          minute,
          70,
          ['opponent_tactical_change'],
          { at: lastAwayTactical.minute },
          { en: 'Opponent changed shape', ar: 'الخصم غيّر تكتيكه' },
          {
            en: 'They adjusted tactics — mirror with a live tweak if needed.',
            ar: 'عدّل الخصم خطته — راجع مواجهتك.',
          },
        ),
      );
    }
  }

  return { recommendations: out, cooldowns, alertsEmitted };
}
