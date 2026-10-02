/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { InteractionResponseOption, PlayerInteractionKind } from '../types';

export interface CatalogResponse extends InteractionResponseOption {
  /** Template key resolved in resolver */
  effectKey: string;
}

const RESPONSES: Record<PlayerInteractionKind, CatalogResponse[]> = {
  playing_time: [
    { id: 'promise_minutes', labelEn: 'Promise more minutes', labelAr: 'وعد بدقائق أكثر', effectKey: 'promise_minutes' },
    { id: 'explain_role', labelEn: 'Explain squad rotation', labelAr: 'شرح دور الدور', effectKey: 'explain_role' },
    { id: 'reject_demand', labelEn: 'Stand firm', labelAr: 'تمسك بالقرار', effectKey: 'reject_demand' },
  ],
  training: [
    { id: 'adjust_load', labelEn: 'Reduce training load', labelAr: 'تخفيف الحمل', effectKey: 'adjust_load' },
    { id: 'push_harder', labelEn: 'Push harder', labelAr: 'رفع الشدة', effectKey: 'push_harder' },
  ],
  contract: [
    { id: 'review_soon', labelEn: 'Review contract soon', labelAr: 'مراجعة العقد قريباً', effectKey: 'review_soon' },
    { id: 'not_now', labelEn: 'Not now', labelAr: 'ليس الآن', effectKey: 'not_now' },
  ],
  transfer_request: [
    { id: 'listen', labelEn: 'Listen openly', labelAr: 'استماع', effectKey: 'listen' },
    { id: 'refuse', labelEn: 'Refuse sale', labelAr: 'رفض البيع', effectKey: 'refuse' },
  ],
  role_disagreement: [
    { id: 'compromise', labelEn: 'Find compromise', labelAr: 'حل وسط', effectKey: 'compromise' },
    { id: 'insist', labelEn: 'Insist on plan', labelAr: 'التمسك بالخطة', effectKey: 'insist' },
  ],
  tactical_disagreement: [
    { id: 'tweak', labelEn: 'Minor tweak', labelAr: 'تعديل بسيط', effectKey: 'tweak' },
    { id: 'override', labelEn: 'Override player', labelAr: 'تجاهل الرأي', effectKey: 'override' },
  ],
  development_concern: [
    { id: 'individual_plan', labelEn: 'Individual plan', labelAr: 'خطة فردية', effectKey: 'individual_plan' },
    { id: 'patience', labelEn: 'Ask for patience', labelAr: 'طلب صبر', effectKey: 'patience' },
  ],
  praise_request: [
    { id: 'praise_public', labelEn: 'Public praise', labelAr: 'مدح علني', effectKey: 'praise_public' },
    { id: 'praise_private', labelEn: 'Private word', labelAr: 'كلمة خاصة', effectKey: 'praise_private' },
  ],
  captaincy_concern: [
    { id: 'explain_captain', labelEn: 'Explain choice', labelAr: 'شرح اختيار القائد', effectKey: 'explain_captain' },
    { id: 'consider_later', labelEn: 'Consider later', labelAr: 'النظر لاحقاً', effectKey: 'consider_later' },
  ],
  mentoring_request: [
    { id: 'assign_mentor', labelEn: 'Assign mentor', labelAr: 'تعيين مرشد', effectKey: 'assign_mentor' },
    { id: 'decline', labelEn: 'Decline', labelAr: 'رفض', effectKey: 'decline' },
  ],
  national_team_concern: [
    { id: 'support', labelEn: 'Support selection push', labelAr: 'دعم الترشيح', effectKey: 'support' },
    { id: 'focus_club', labelEn: 'Focus on club', labelAr: 'التركيز على النادي', effectKey: 'focus_club' },
  ],
};

export function catalogForKind(kind: PlayerInteractionKind): CatalogResponse[] {
  return RESPONSES[kind];
}

export function toPendingResponses(kind: PlayerInteractionKind): InteractionResponseOption[] {
  return catalogForKind(kind).map(({ id, labelEn, labelAr }) => ({ id, labelEn, labelAr }));
}
