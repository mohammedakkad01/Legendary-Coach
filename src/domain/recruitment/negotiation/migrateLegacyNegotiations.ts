/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { PlayerNegotiation } from '../../../types/game';
import type { TransferNegotiation, TransferOffer } from './offerTypes';

export function mapLegacyPlayerNegotiation(
  legacy: PlayerNegotiation,
  sellingClubId: string,
  buyingClubId: string,
  gameWeek: number,
): TransferNegotiation {
  const offer: TransferOffer = {
    id: `offer_legacy_${legacy.id}`,
    fromClubId: buyingClubId,
    toClubId: sellingClubId,
    playerId: legacy.playerId,
    clauses: [{ kind: 'fee', amount: legacy.currentOfferAmount }],
  };

  let status: TransferNegotiation['status'] = 'submitted';
  if (legacy.status === 'accepted') status = 'accepted';
  if (legacy.status === 'rejected') status = 'rejected';
  if (legacy.status === 'expired') status = 'expired';
  if (legacy.status === 'countered') status = 'countered';

  const counterOffer: TransferOffer | undefined =
    legacy.counterAmount !== undefined
      ? {
          id: `offer_legacy_counter_${legacy.id}`,
          fromClubId: buyingClubId,
          toClubId: sellingClubId,
          playerId: legacy.playerId,
          clauses: [{ kind: 'fee', amount: legacy.counterAmount }],
        }
      : undefined;

  return {
    id: legacy.id,
    playerId: legacy.playerId,
    sellingClubId,
    buyingClubId,
    status,
    roundsUsed: legacy.roundsUsed,
    maxRounds: legacy.maxRounds,
    currentOffer: offer,
    counterOffer,
    lastReasonCodes: ['migrated_from_legacy'],
    startedWeek: gameWeek,
    updatedWeek: gameWeek,
  };
}

export function mergeLegacyNegotiations(
  existing: readonly TransferNegotiation[],
  legacyList: readonly PlayerNegotiation[],
  userClubId: string,
  gameWeek: number,
): TransferNegotiation[] {
  const byId = new Map(existing.map((n) => [n.id, n]));
  for (const leg of legacyList) {
    if (byId.has(leg.id)) continue;
    byId.set(
      leg.id,
      mapLegacyPlayerNegotiation(leg, 'market', userClubId, gameWeek),
    );
  }
  return [...byId.values()];
}
