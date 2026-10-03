/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Maps legacy store `activeNegotiations` into recruitmentWorld.negotiations.
 *
 * Limitations:
 * - Legacy rows never stored a selling club id; migrated negotiations use sellingClubId `'market'`.
 * - `startedWeek` / `updatedWeek` are set from the save game week at migration time; ISO timestamps
 *   are preserved in `legacySnapshot` when present.
 * - `playerName` / `marketValue` are UI listing snapshots only (see NegotiationLegacySnapshot).
 */

import type { PlayerNegotiation } from '../../../types/game';
import type { NegotiationLegacySnapshot, TransferNegotiation, TransferOffer } from './offerTypes';

/** Placeholder selling club when legacy data has no seller (free-agent / market UI flow). */
export const LEGACY_UNKNOWN_SELLING_CLUB_ID = 'market' as const;

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

  const legacySnapshot: NegotiationLegacySnapshot = {
    playerDisplayName: legacy.playerName || undefined,
    listingMarketValue: legacy.marketValue > 0 ? legacy.marketValue : undefined,
    lastMessageAr: legacy.lastMessageAr || undefined,
    lastMessageEn: legacy.lastMessageEn || undefined,
    startedAtIso: legacy.startedAt || undefined,
    updatedAtIso: legacy.updatedAt || undefined,
    ...(sellingClubId === LEGACY_UNKNOWN_SELLING_CLUB_ID
      ? { migratedWithoutSellingClub: true as const }
      : {}),
  };

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
    legacySnapshot,
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
      mapLegacyPlayerNegotiation(leg, LEGACY_UNKNOWN_SELLING_CLUB_ID, userClubId, gameWeek),
    );
  }
  return [...byId.values()];
}
