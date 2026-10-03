/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type TransferRumorType =
  | 'club_interest'
  | 'player_seeks_move'
  | 'agent_activity'
  | 'fee_speculation';

export type RumorReliability = 'reliable' | 'uncertain' | 'false';

export type RumorClaimKind =
  | 'monitoring'
  | 'bid_planned'
  | 'loan_interest'
  | 'player_unhappy'
  | 'agent_approached';

export type RumorSourceKind = 'press' | 'agent' | 'club_leak' | 'fan_media';

/** Structured rumor row (text via templates). */
export interface TransferRumor {
  id: string;
  type: TransferRumorType;
  subjectPlayerId: string;
  subjectClubId?: string;
  claimingClubId?: string;
  claimKind: RumorClaimKind;
  reliability: RumorReliability;
  source: RumorSourceKind;
  /**
   * Hidden simulation truth (whether the rumor matches underlying recruitment state).
   * UI should use `reliability` + templates — not expose this field to players.
   */
  truthFlag: boolean;
  createdWeek: number;
}

/** Hidden club interest before/without public confirmation. */
export interface ClubInterestRecord {
  id: string;
  interestedClubId: string;
  playerId: string;
  sellerClubId?: string;
  interestLevel: number;
  createdWeek: number;
  linkedRumorId?: string;
}

export interface RumorThrottleState {
  /** gameWeek -> count created that week */
  rumorsCreatedByWeek: Record<number, number>;
  /** dedupe key -> last created week */
  lastCreatedWeekByKey: Record<string, number>;
  /** gameWeek -> weekly recruitment orchestration already applied (schema v8 idempotency). */
  orchestrationCompletedWeeks: Record<number, boolean>;
}
