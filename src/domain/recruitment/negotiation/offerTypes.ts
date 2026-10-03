/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type TransferOfferClause =
  | { kind: 'fee'; amount: number }
  | {
      kind: 'installments';
      upfront: number;
      installments: readonly { amount: number; dueWeek: number }[];
    }
  | { kind: 'bonus'; label: string; amount: number; condition: 'appearance' | 'goal' | 'promotion' }
  | { kind: 'sell_on'; percent: number }
  | { kind: 'player_exchange'; playerId: string; valuedAt: number }
  | { kind: 'loan'; wageSplitPercent: number; durationWeeks: number }
  | {
      kind: 'loan_with_option';
      wageSplitPercent: number;
      durationWeeks: number;
      optionFee: number;
    }
  | {
      kind: 'loan_with_obligation';
      wageSplitPercent: number;
      durationWeeks: number;
      obligationFee: number;
    }
  | { kind: 'performance_bonus'; amount: number; metric: string; threshold: number }
  | { kind: 'release_clause'; amount: number };

export interface TransferOffer {
  id: string;
  fromClubId: string;
  toClubId: string;
  playerId: string;
  clauses: readonly TransferOfferClause[];
}

export type RichNegotiationStatus =
  | 'draft'
  | 'submitted'
  | 'countered'
  | 'accepted'
  | 'rejected'
  | 'withdrawn'
  | 'expired';

/**
 * Non-authoritative UI fields preserved from legacy `activeNegotiations` during migration.
 * Does not replace recruitment knowledge or world player truth.
 */
export interface NegotiationLegacySnapshot {
  playerDisplayName?: string;
  listingMarketValue?: number;
  lastMessageAr?: string;
  lastMessageEn?: string;
  startedAtIso?: string;
  updatedAtIso?: string;
  /**
   * Legacy saves did not record a selling club; migrated rows use `sellingClubId: 'market'`.
   */
  migratedWithoutSellingClub?: true;
}

export interface TransferNegotiation {
  id: string;
  playerId: string;
  sellingClubId: string;
  buyingClubId: string;
  status: RichNegotiationStatus;
  roundsUsed: number;
  maxRounds: number;
  currentOffer: TransferOffer;
  counterOffer?: TransferOffer;
  lastReasonCodes: readonly string[];
  startedWeek: number;
  updatedWeek: number;
  legacySnapshot?: NegotiationLegacySnapshot;
}

export const TERMINAL_NEGOTIATION_STATUSES: readonly RichNegotiationStatus[] = [
  'accepted',
  'rejected',
  'expired',
  'withdrawn',
] as const;

export function isTerminalNegotiationStatus(status: RichNegotiationStatus): boolean {
  return (TERMINAL_NEGOTIATION_STATUSES as readonly string[]).includes(status);
}

export function computeUpfrontCash(clauses: readonly TransferOfferClause[]): number {
  let total = 0;
  for (const c of clauses) {
    switch (c.kind) {
      case 'fee':
        total += c.amount;
        break;
      case 'installments':
        total += c.upfront + c.installments.reduce((s, i) => s + i.amount, 0);
        break;
      case 'bonus':
      case 'performance_bonus':
        total += Math.round(c.amount * 0.35);
        break;
      case 'player_exchange':
        total += c.valuedAt;
        break;
      case 'loan_with_option':
        total += Math.round(c.optionFee * 0.5);
        break;
      case 'loan_with_obligation':
        total += c.obligationFee;
        break;
      case 'loan':
      case 'sell_on':
      case 'release_clause':
        break;
      default:
        break;
    }
  }
  return total;
}

export function isLoanOffer(clauses: readonly TransferOfferClause[]): boolean {
  return clauses.some(
    (c) => c.kind === 'loan' || c.kind === 'loan_with_option' || c.kind === 'loan_with_obligation',
  );
}
