/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Typed ar/en dictionary for Best Tactics (Phase 4). The domain returns
 * RecommendationReason codes; this is the ONE place they become text.
 * `names` resolves player ids → display names (supplied by the caller, so the
 * domain never touches player data it doesn't own).
 */

import type { RecommendationReason } from '../domain/tactics/tacticalTypes';
import type { BestTacticsError } from '../domain/tactics/bestTactics/types';
import type { ApplyBestTacticsError } from '../domain/tactics/bestTactics/applyRecommendation';
import type { PassingStyle } from '../types/game';

type Bilingual = { readonly ar: string; readonly en: string };
const t = (ar: string, en: string): Bilingual => ({ ar, en });
const pick = (b: Bilingual, isAr: boolean): string => (isAr ? b.ar : b.en);

export const BEST_TACTICS_TEXT = {
  button: t('أفضل تكتيك', 'Best Tactics'),
  title: t('التكتيك المقترح', 'Recommended tactics'),
  computing: t('جارٍ التحليل…', 'Analyzing…'),
  apply: t('تطبيق', 'Apply'),
  cancel: t('إلغاء', 'Cancel'),
  applied: t('تم تطبيق التكتيك', 'Tactics applied'),
  formation: t('التشكيل', 'Formation'),
  score: t('التقييم', 'Score'),
  currentScore: t('التقييم الحالي', 'Current score'),
  expectedPoints: t('النقاط المتوقعة', 'Expected points'),
  alternatives: t('بدائل', 'Alternatives'),
  whyTitle: t('لماذا؟', 'Why?'),
  changes: t('التغييرات', 'Changes'),
  noChanges: t('تشكيلتك الحالية قريبة جداً من الأفضل.', 'Your current setup is already close to the best.'),
  staleWarning: t('تغيّرت حالة الفريق بعد التحليل، أعد التحليل.', 'The squad changed after the analysis — run it again.'),
  recompute: t('إعادة التحليل', 'Re-analyze'),
  close: t('إغلاق', 'Close'),
  substitutes: t('البدلاء', 'Substitutes'),
  tacticalSettings: t('الإعدادات التكتيكية', 'Tactical settings'),
  proposedXi: t('التشكيلة المقترحة', 'Proposed XI'),
  mentality: t('العقلية', 'Mentality'),
  pressing: t('الضغط', 'Pressing'),
  passing: t('التمرير', 'Passing'),
  tempo: t('الإيقاع', 'Tempo'),
  width: t('اتساع الخط', 'Width'),
  offsideTrap: t('مصيدة التسلل', 'Offside trap'),
  on: t('مفعّلة', 'On'),
  off: t('متوقفة', 'Off'),
  replaces: t('بدلاً من', 'replaces'),
  emptySlot: t('خانة فارغة', 'empty slot'),
  noOpponent: t('بيانات الخصم القادم غير متاحة — التقييم ضد خصم متوسط.', 'Next opponent data unavailable — evaluated against an average opponent.'),
  vsOpponent: t('ضد', 'vs'),
} as const;

export const PASSING_TEXT: Record<PassingStyle, Bilingual> = {
  short_tiki_taka: t('تيكي تاكا قصيرة', 'Short Tiki-Taka'),
  mixed: t('لعب مختلط', 'Mixed Style'),
  direct_counter: t('مرتدات مباشرة', 'Direct Counters'),
  long_ball: t('كرات طولية', 'Long Balls'),
};

const NAME = (names: ReadonlyMap<string, string>, id: unknown): string => names.get(String(id)) ?? String(id);

type Params = NonNullable<RecommendationReason['params']>;
type Renderer = (p: Params, names: ReadonlyMap<string, string>, isAr: boolean) => string;
const R = (ar: (p: Params, n: (id: unknown) => string) => string, en: (p: Params, n: (id: unknown) => string) => string): Renderer =>
  (p, names, isAr) => {
    const n = (id: unknown): string => NAME(names, id);
    return isAr ? ar(p, n) : en(p, n);
  };

const effect = (p: Params): string => {
  const v = Number(p.effect ?? 0);
  return v > 0 ? `+${v}` : `${v}`;
};

const RENDERERS: Record<string, Renderer> = {
  formation_chosen: R((p) => `التشكيل ${p.formation} يعطي أفضل توازن بين لاعبيك المتاحين.`, (p) => `${p.formation} gives the best balance for your available players.`),
  excluded_unavailable: R((p) => `استُبعد ${p.count} لاعب (${p.injured} مصاب، ${p.suspended} موقوف).`, (p) => `${p.count} player(s) excluded (${p.injured} injured, ${p.suspended} suspended).`),
  current_xi_has_unavailable: R((p) => `تشكيلتك الحالية فيها ${p.count} لاعب غير متاح.`, (p) => `Your current XI includes ${p.count} unavailable player(s).`),
  opponent_unknown: R(() => 'لا توجد معلومات عن الخصم، تم التقييم ضد خصم متوسط.', () => 'No opponent info — evaluated against an average opponent.'),
  opponent_weaker: R((p) => `فريقك أقوى من الخصم بنحو ${p.gap} نقطة.`, (p) => `Your team is about ${p.gap} points stronger than the opponent.`),
  opponent_stronger: R((p) => `الخصم أقوى منك بنحو ${p.gap} نقطة.`, (p) => `The opponent is about ${p.gap} points stronger.`),
  opponent_even: R(() => 'الفريقان متقاربان في القوة.', () => 'The teams are evenly matched.'),
  natural_positions: R((p) => `${p.natural} من ${p.total} لاعبين في مراكزهم الطبيعية.`, (p) => `${p.natural} of ${p.total} players are in their natural position.`),
  out_of_position_unavoidable: R((p, n) => `${n(p.playerId)} يلعب خارج مركزه (${p.slot}) لأنه أفضل حل متاح.`, (p, n) => `${n(p.playerId)} plays out of position (${p.slot}) as the best available option.`),
  slot_changed: R((p, n) => `${n(p.playerId)} يحل محل ${n(p.replacedId)} في مركز ${p.slot}.`, (p, n) => `${n(p.playerId)} replaces ${n(p.replacedId)} at ${p.slot}.`),
  rested_tired_player: R((p, n) => `${n(p.playerId)} مُرهَق (${p.fatigue}%) فتم إراحته.`, (p, n) => `${n(p.playerId)} is tired (${p.fatigue}%) and is rested.`),
  in_form_player: R((p, n) => `${n(p.playerId)} في حالة فنية ممتازة (${p.form}/10).`, (p, n) => `${n(p.playerId)} is in great form (${p.form}/10).`),
  tactic_mentality_fit: R((p) => `العقلية مضبوطة حسب فارق القوة مع الخصم (${effect(p)}).`, (p) => `Mentality is matched to the strength gap with the opponent (${effect(p)}).`),
  tactic_midfield_control: R((p) => `${p.mine} لاعبي وسط مقابل ${p.theirs} للخصم (${effect(p)}).`, (p) => `${p.mine} midfielders vs ${p.theirs} for the opponent (${effect(p)}).`),
  tactic_wide_vs_back_three: R((p) => `اللعب العريض يستغل أطراف خصم يلعب ${p.opponentFormation} (${effect(p)}).`, (p) => `Wide play exploits the flanks of a ${p.opponentFormation} (${effect(p)}).`),
  tactic_press_resistance: R((p) => `أسلوب التمرير مناسب لمواجهة ضغط الخصم (${effect(p)}).`, (p) => `Passing style suits facing the opponent's press (${effect(p)}).`),
  tactic_counter_vs_attacking: R((p) => `سرعة المهاجمين تناسب المرتدات ضد خصم هجومي (${effect(p)}).`, (p) => `Attacker pace suits counters against an attacking opponent (${effect(p)}).`),
  tactic_offside_trap: R((p) => `مصيدة التسلل ${Number(p.effect) >= 0 ? 'مناسبة' : 'مخاطرة'} لمدافعيك (${effect(p)}).`, (p) => `Offside trap ${Number(p.effect) >= 0 ? 'suits' : 'is a risk for'} your defenders (${effect(p)}).`),
  tactic_tempo_fit: R((p) => `الإيقاع يناسب خصائص فريقك (${effect(p)}).`, (p) => `Tempo fits your squad's traits (${effect(p)}).`),
  tactic_width_fit: R((p) => `العرض يناسب خصائص لاعبيك (${effect(p)}).`, (p) => `Width fits your players (${effect(p)}).`),
  tactic_passing_fit: R((p) => `أسلوب التمرير يناسب مهارات لاعبيك (${effect(p)}).`, (p) => `Passing style fits your players' skills (${effect(p)}).`),
  tactic_pressing_stamina: R((p) => `الضغط العالي مكلف مع لياقة الفريق الحالية (${effect(p)}).`, (p) => `High pressing is costly at the squad's current stamina (${effect(p)}).`),
  already_optimal: R(() => 'تشكيلتك الحالية قريبة جداً من الأفضل.', () => 'Your current setup is already close to the best.'),
  improves_current: R((p) => `التقييم يرتفع من ${p.from} إلى ${p.to}.`, (p) => `Score improves from ${p.from} to ${p.to}.`),
};

export function reasonText(reason: RecommendationReason, names: ReadonlyMap<string, string>, isAr: boolean): string {
  const render = RENDERERS[reason.code];
  return render ? render(reason.params ?? {}, names, isAr) : reason.code; // unknown code → visible, never a crash
}

export function bestTacticsErrorText(error: BestTacticsError | ApplyBestTacticsError, isAr: boolean): string {
  switch (error.code) {
    case 'NOT_ENOUGH_AVAILABLE_PLAYERS':
      return pick(t(`لا يوجد ${error.required} لاعباً متاحاً (المتاح ${error.available}).`, `Not enough available players (${error.available}/${error.required}).`), isAr);
    case 'UNAVAILABLE_PLAYER':
      return pick(BEST_TACTICS_TEXT.staleWarning, isAr);
    case 'FORMATION_LOCKED':
      return pick(t(`تشكيل ${error.formation} يتطلب VIP ${error.requiredVipLevel}.`, `Formation ${error.formation} requires VIP ${error.requiredVipLevel}.`), isAr);
    case 'INVALID_RESULT':
      return pick(t('التشكيلة المقترحة لا تجتاز قواعد الفريق.', 'The recommended squad failed the squad rules.'), isAr);
    default:
      return pick(t('تعذّر التحليل.', 'Analysis failed.'), isAr);
  }
}

export const bestTacticsLabel = (key: keyof typeof BEST_TACTICS_TEXT, isAr: boolean): string => pick(BEST_TACTICS_TEXT[key], isAr);
