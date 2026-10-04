/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Deterministic EN/AR strings for assistant reason codes (no Gemini).
 */

export function reasonSentence(
  code: string,
  params: Readonly<Record<string, string | number>> | undefined,
  isAr: boolean,
): string {
  const p = params ?? {};
  const en = reasonEn(code, p);
  const ar = reasonAr(code, p);
  return isAr ? ar : en;
}

function reasonEn(code: string, p: Readonly<Record<string, string | number>>): string {
  switch (code) {
    case 'opp_high_attack':
      return `Opponent attack rating is strong (${p.power}).`;
    case 'opp_weak_defense':
      return `Opponent defence looks exploitable (${p.power}).`;
    case 'opp_formation_wide':
      return `They line up in ${p.formation} — watch wide overloads.`;
    case 'opp_high_press':
      return 'Opponent tends to press high — quick circulation helps.';
    case 'form_strong':
      return `Recent league form: ${p.w}W-${p.d}D-${p.l}L (${p.sample} matches).`;
    case 'form_unknown':
      return 'Limited recent form data for this opponent.';
    case 'tendency_attack_left':
      return `Scouting memory: they attack down the left ~${p.share}% (n=${p.samples}).`;
    case 'tendency_attack_right':
      return `Scouting memory: they attack down the right ~${p.share}% (n=${p.samples}).`;
    case 'set_piece_threat':
      return 'Set-piece takers and aerial presence are a live threat.';
    case 'ref_generic':
      return 'Referee will be assigned at kickoff — expect a standard league profile until then.';
    case 'ref_assigned_strict':
      return `Assigned referee: strict (${p.strictness}/100), card tendency ${p.cards}/100.`;
    case 'flank_overload_right':
      return `Repeated chances down your right flank (${p.share}% of their attempts).`;
    case 'flank_overload_left':
      return `Repeated chances down your left flank (${p.share}% of their attempts).`;
    case 'set_piece_pressure':
      return 'They are generating set-piece attempts — tighten marking on restarts.';
    case 'press_not_sticking':
      return `Press success is low (${p.rate}%) — consider dropping intensity or trapping lanes.`;
    case 'midfield_overrun':
      return 'Midfield is losing duels and possession — reinforce central structure.';
    case 'sterile_possession':
      return 'Possession without penetration — increase verticality or width.';
    case 'opponent_tactical_change':
      return 'Opponent changed tactics in-game — re-check match-up.';
    case 'post_change_pressing':
      return 'Next match: revisit pressing triggers after low PPDA.';
    case 'post_change_width':
      return 'Shift width or fullback support to balance flank exposure.';
    case 'scout_band_wide':
      return 'Scouting estimate still has a wide rating band — gather more reports.';
    default:
      return `Analysis: ${code}`;
  }
}

function reasonAr(code: string, p: Readonly<Record<string, string | number>>): string {
  switch (code) {
    case 'opp_high_attack':
      return `هجوم الخصم قوي (${p.power}).`;
    case 'opp_weak_defense':
      return `دفاع الخصم قابل للاستغلال (${p.power}).`;
    case 'opp_formation_wide':
      return `يلعبون ${p.formation} — راقب الت overload على الأطراف.`;
    case 'opp_high_press':
      return 'الخصم يفضل الضغط العالي — التمرير السريع يساعد.';
    case 'form_strong':
      return `النتائج الأخيرة: ${p.w} فوز ${p.d} تعادل ${p.l} خسارة (${p.sample} مباريات).`;
    case 'form_unknown':
      return 'بيانات محدودة عن نتائج الخصم الأخيرة.';
    case 'tendency_attack_left':
      return `ذاكرة الكشف: هجوم يسار ~${p.share}% (ع=${p.samples}).`;
    case 'tendency_attack_right':
      return `ذاكرة الكشف: هجوم يمين ~${p.share}% (ع=${p.samples}).`;
    case 'set_piece_threat':
      return 'الكرات الثابتة والرأسيات تشكل خطراً.';
    case 'ref_generic':
      return 'يُحدد الحكم عند صافرة البداية — معلومات عامة حتى ذلك الحين.';
    case 'ref_assigned_strict':
      return `الحكم: صرامة ${p.strictness}/100، بطاقات ${p.cards}/100.`;
    case 'flank_overload_right':
      return `فرص متكررة خلف ظهيرك الأيمن (${p.share}% من محاولاتهم).`;
    case 'flank_overload_left':
      return `فرص متكررة خلف ظهيرك الأيسر (${p.share}% من محاولاتهم).`;
    case 'set_piece_pressure':
      return 'الخصم يحصل على كرات ثابتة — شد الرقابة.';
    case 'press_not_sticking':
      return `نجاح الضغط منخفض (${p.rate}%) — راجع شدة الضغط.`;
    case 'midfield_overrun':
      return 'الوسط يخسر المبارزات والاستحواذ — عزز التمركز.';
    case 'sterile_possession':
      return 'استحواذ بلا اختراق — زد العمق أو العرض.';
    case 'opponent_tactical_change':
      return 'الخصم غيّر تكتيكه — راجع المواجهة.';
    case 'post_change_pressing':
      return 'المباراة القادمة: راجع الضغط بعد PPDA منخفض.';
    case 'post_change_width':
      return 'عدّل العرض أو دعم الظهير لموازنة الأطراف.';
    case 'scout_band_wide':
      return 'تقدير الكشافة ما زال واسعاً — أكمل التقارير.';
    default:
      return `تحليل: ${code}`;
  }
}
