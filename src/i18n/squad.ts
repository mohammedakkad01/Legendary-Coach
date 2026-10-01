/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Typed ar/en dictionary for the Phase 2 squad UI (drag-and-drop, position
 * badges, wrong-position warnings, player info panel). Domain modules return
 * codes (SuitabilityLevel, SuitabilityReasonCode, MoveError['code'], …) —
 * this is the ONE place those codes become on-screen text, so every surface
 * (badge, warning popover, info panel, aria-live announcement) says the same
 * thing. New squad strings belong here, not as inline ternaries in the JSX.
 */

import type { SuitabilityLevel, SuitabilityReasonCode } from '../domain/squad/positionSuitability';
import type { MoveError } from '../domain/squad/moveEntity';
import type { SquadSection } from '../domain/squad/squadTypes';

type Bilingual = { readonly ar: string; readonly en: string };
const t = (ar: string, en: string): Bilingual => ({ ar, en });

export const SUITABILITY_LEVEL_TEXT: Record<SuitabilityLevel, Bilingual> = {
  natural: t('مركزه الطبيعي', 'Natural position'),
  very_suitable: t('مناسب جداً', 'Very suitable'),
  suitable: t('مناسب', 'Suitable'),
  acceptable: t('مقبول', 'Acceptable'),
  poor: t('غير مناسب', 'Poor fit'),
};

/** Short badge label under the rating circle (kept to one or two words). */
export const SUITABILITY_BADGE_TEXT: Record<SuitabilityLevel, Bilingual> = {
  natural: t('طبيعي', 'Natural'),
  very_suitable: t('مناسب جداً', 'Very suit.'),
  suitable: t('مناسب', 'Suitable'),
  acceptable: t('مقبول', 'Acceptable'),
  poor: t('غير مناسب', 'Poor'),
};

export const SUITABILITY_REASON_TEXT: Record<SuitabilityReasonCode, Bilingual> = {
  natural_position: t('هذا مركزه الطبيعي المسجل.', 'This is his registered natural position.'),
  same_position_family: t('من نفس عائلة مركزه الطبيعي (كفاءة كاملة).', 'Same family as his natural position (full efficiency).'),
  secondary_position: t('مسجّل كمركز ثانوي له.', 'Listed as one of his secondary positions.'),
  adjacent_position_family: t('خط واحد بعيداً عن مركزه الطبيعي.', 'One line away from his natural position.'),
  distant_position_family: t('بعيد نسبياً عن مركزه الطبيعي.', 'A couple of lines away from his natural position.'),
  far_position_family: t('بعيد جداً عن مركزه الطبيعي.', 'Far from his natural position.'),
  goalkeeper_mismatch: t('حارس مرمى خارج مركزه، أو لاعب ميدان في مركز الحراسة.', 'A goalkeeper out of goal, or an outfielder in goal.'),
  unknown_slot: t('خانة غير معروفة على لوحة التشكيل.', 'Unrecognized slot on the tactical board.'),
};

export const SQUAD_SECTION_TEXT: Record<SquadSection, Bilingual> = {
  starting: t('التشكيلة الأساسية', 'Starting XI'),
  substitutes: t('دكة البدلاء', 'Substitutes'),
  bench: t('الاحتياط', 'Bench'),
};

/** MoveError → a short, user-facing explanation for the toast / aria-live region. */
export function moveErrorText(error: MoveError, isAr: boolean): string {
  switch (error.code) {
    case 'PLAYER_NOT_IN_SQUAD':
      return isAr ? 'هذا اللاعب لم يعد في الكشف.' : 'This player is no longer in the squad.';
    case 'INVALID_FORMATION':
      return isAr ? 'التشكيل التكتيكي غير صالح.' : 'The current formation is invalid.';
    case 'INVALID_SLOT_INDEX':
      return isAr ? 'خانة غير صالحة في التشكيلة الأساسية.' : 'Invalid starting-XI slot.';
    case 'INVALID_SUBSTITUTE_INDEX':
      return isAr ? 'خانة غير صالحة في دكة البدلاء.' : 'Invalid substitutes slot.';
    case 'SUBSTITUTES_UNAVAILABLE':
      return isAr ? 'لا توجد خانات بدلاء متاحة لمستواك الحالي.' : 'No substitute slots are available at your current tier.';
    case 'RULE_VIOLATION': {
      const codes = error.violations.map((v) => v.code);
      if (codes.includes('NO_GOALKEEPER_IN_XI')) {
        return isAr ? 'لا يمكن ترك التشكيلة الأساسية بلا حارس مرمى.' : 'The starting XI cannot be left without a goalkeeper.';
      }
      if (codes.includes('GOALKEEPER_OUTSIDE_GK_SLOT')) {
        return isAr ? 'لا يمكن وضع الحارس خارج مركز حراسة المرمى.' : 'A goalkeeper cannot play outside the goalkeeper slot.';
      }
      if (codes.includes('MULTIPLE_GOALKEEPERS_IN_XI')) {
        return isAr ? 'لا يمكن وجود أكثر من حارس مرمى في التشكيلة الأساسية.' : 'The starting XI cannot have more than one goalkeeper.';
      }
      if (codes.includes('TOO_MANY_SUBSTITUTES')) {
        return isAr ? 'دكة البدلاء ممتلئة لمستواك الحالي.' : 'The substitutes bench is full for your current tier.';
      }
      if (codes.includes('DUPLICATE_PLAYER')) {
        return isAr ? 'هذا اللاعب موجود بالفعل في مكان آخر.' : 'This player is already placed elsewhere.';
      }
      return isAr ? 'هذه الحركة غير مسموحة حسب قواعد الفريق.' : 'This move is not allowed by the squad rules.';
    }
  }
}

export const SQUAD_DND_TEXT = {
  pickedHint: t(
    'تم تحديد اللاعب — اضغط على أي خانة أو لاعب آخر للتبديل، أو اضغط عليه مجدداً للإلغاء.',
    'Player selected — tap another slot or player to swap, or tap him again to cancel.',
  ),
  grabHandleLabel: t('إمساك للتحريك', 'Grab to move'),
  infoHandleLabel: t('عرض معلومات اللاعب', 'View player info'),
  dropHere: t('أفلت هنا', 'Drop here'),
  emptySlot: t('خانة فارغة', 'Empty slot'),
  cancel: t('إلغاء', 'Cancel'),
} satisfies Record<string, Bilingual>;

export const PLAYER_PANEL_TEXT = {
  title: t('بطاقة اللاعب', 'Player card'),
  naturalPosition: t('المركز الطبيعي', 'Natural position'),
  currentSlot: t('الخانة الحالية', 'Current slot'),
  overall: t('التقييم', 'Overall'),
  effectiveRating: t('التقييم الفعلي في هذه الخانة', 'Effective rating in this slot'),
  age: t('العمر', 'Age'),
  fitness: t('اللياقة', 'Fitness'),
  fatigue: t('الإرهاق', 'Fatigue'),
  morale: t('المعنويات', 'Morale'),
  form: t('الفورمة', 'Form'),
  section: t('القسم', 'Section'),
  close: t('إغلاق', 'Close'),
} satisfies Record<string, Bilingual>;

export const pick = (b: Bilingual, isAr: boolean): string => (isAr ? b.ar : b.en);
