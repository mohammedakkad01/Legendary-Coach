/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Deterministic template rendering — no LLM, no truthFlag in output.
 */

import type { RumorReliability, TransferRumor } from './rumorTypes';

const REL_EN: Record<TransferRumor['reliability'], string> = {
  reliable: 'Sources close to the deal suggest',
  uncertain: 'Reports indicate',
  false: 'Unconfirmed social media claims',
};

const REL_AR: Record<TransferRumor['reliability'], string> = {
  reliable: 'مصادر قريبة من الصفقة تقول',
  uncertain: 'تقارير إعلامية تشير',
  false: 'شائعات غير مؤكدة على وسائل التواصل',
};

function claimEn(rumor: TransferRumor): string {
  switch (rumor.claimKind) {
    case 'monitoring':
      return `${rumor.claimingClubId ?? 'A club'} are monitoring the player.`;
    case 'bid_planned':
      return `${rumor.claimingClubId ?? 'A club'} could submit a bid soon.`;
    case 'loan_interest':
      return `${rumor.claimingClubId ?? 'A club'} are exploring a loan move.`;
    case 'player_unhappy':
      return `The player may be open to leaving ${rumor.subjectClubId ?? 'their club'}.`;
    case 'agent_approached':
      return `The player's agent has been active in the market.`;
    default:
      return 'Transfer activity is being discussed.';
  }
}

function claimAr(rumor: TransferRumor): string {
  switch (rumor.claimKind) {
    case 'monitoring':
      return `${rumor.claimingClubId ?? 'نادٍ'} يراقب اللاعب.`;
    case 'bid_planned':
      return `${rumor.claimingClubId ?? 'نادٍ'} قد يقدّم عرضاً قريباً.`;
    case 'loan_interest':
      return `${rumor.claimingClubId ?? 'نادٍ'} يدرس إعارة اللاعب.`;
    case 'player_unhappy':
      return `اللاعب قد يكون منفتحاً على الرحيل عن ${rumor.subjectClubId ?? 'ناديه'}.`;
    case 'agent_approached':
      return `وكيل اللاعب نشط في سوق الانتقالات.`;
    default:
      return 'يتم الحديث عن نشاط انتقالي.';
  }
}

export function renderRumorTemplate(rumor: TransferRumor, language: 'en' | 'ar'): string {
  const lead = language === 'ar' ? REL_AR[rumor.reliability] : REL_EN[rumor.reliability];
  const body = language === 'ar' ? claimAr(rumor) : claimEn(rumor);
  return `${lead}: ${body}`;
}

/** Public-safe rumor view (no truthFlag). */
export interface PublicRumorView {
  id: string;
  type: TransferRumor['type'];
  subjectPlayerId: string;
  subjectClubId?: string;
  claimingClubId?: string;
  claimKind: TransferRumor['claimKind'];
  reliability: RumorReliability;
  source: TransferRumor['source'];
  createdWeek: number;
  renderedText: string;
}

export function toPublicRumorView(rumor: TransferRumor, language: 'en' | 'ar'): PublicRumorView {
  return {
    id: rumor.id,
    type: rumor.type,
    subjectPlayerId: rumor.subjectPlayerId,
    subjectClubId: rumor.subjectClubId,
    claimingClubId: rumor.claimingClubId,
    claimKind: rumor.claimKind,
    reliability: rumor.reliability,
    source: rumor.source,
    createdWeek: rumor.createdWeek,
    renderedText: renderRumorTemplate(rumor, language),
  };
}
