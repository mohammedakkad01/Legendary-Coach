/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Transfer Negotiations Domain Logic
 * Pure function domain business rules for player/agent counter offers and haggling.
 */

import { Player, NegotiationStatus } from '../../types/game';

export function getPersonalityDemandFactor(personality: string): { minAcceptRatio: number; volatile: boolean } {
  switch (personality) {
    case 'leader': return { minAcceptRatio: 1.08, volatile: false };
    case 'ambitious': return { minAcceptRatio: 1.03, volatile: false };
    case 'temperamental': return { minAcceptRatio: 0.98, volatile: true };
    case 'professional': return { minAcceptRatio: 0.95, volatile: false };
    case 'loyal': return { minAcceptRatio: 0.90, volatile: false };
    case 'nervous': return { minAcceptRatio: 0.88, volatile: false };
    default: return { minAcceptRatio: 0.95, volatile: false };
  }
}

export function resolveNegotiationRound(
  player: Player,
  offerAmount: number,
  roundsUsed: number,
  maxRounds: number,
  isAr: boolean
): { status: NegotiationStatus; counterAmount?: number; messageAr: string; messageEn: string } {
  const { minAcceptRatio, volatile } = getPersonalityDemandFactor(player.personality);
  const ratio = offerAmount / player.marketValue;

  // Temperamental players occasionally reject a perfectly fine offer out of pride.
  if (volatile && Math.random() < 0.18 && ratio < 1.15) {
    return {
      status: 'rejected',
      messageAr: `😤 وكيل ${player.name} رفض العرض فجأة ويطلب وقتاً للتفكير — شخصية اللاعب متقلبة المزاج.`,
      messageEn: `😤 ${player.nameEn}'s agent suddenly rejected the offer — his temperamental personality strikes again.`
    };
  }

  if (ratio >= minAcceptRatio) {
    return {
      status: 'accepted',
      messageAr: `✅ وافق ${player.name} ووكيله على الانتقال بهذا العرض!`,
      messageEn: `✅ ${player.nameEn} and his agent accepted the offer!`
    };
  }

  // Too insulting to even counter.
  if (ratio < minAcceptRatio - 0.30) {
    return {
      status: 'rejected',
      messageAr: `❌ اعتبر وكيل ${player.name} العرض مهيناً وأنهى المفاوضات فوراً.`,
      messageEn: `❌ ${player.nameEn}'s agent found the offer insulting and ended talks on the spot.`
    };
  }

  if (roundsUsed >= maxRounds) {
    return {
      status: 'expired',
      messageAr: `⌛ انتهت جولات التفاوض المتاحة دون اتفاق مع ${player.name}.`,
      messageEn: `⌛ Ran out of negotiation rounds with ${player.nameEn} — no deal reached.`
    };
  }

  const counterAmount = Math.round((player.marketValue * (minAcceptRatio - 0.03)) / 5000) * 5000;
  return {
    status: 'countered',
    counterAmount: Math.max(counterAmount, offerAmount + 5000),
    messageAr: `🤝 رفض وكيل ${player.name} العرض الأولي وقدّم طلباً مضاداً.`,
    messageEn: `🤝 ${player.nameEn}'s agent declined the opening bid and made a counter-demand.`
  };
}
