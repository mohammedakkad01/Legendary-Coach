/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ClubTransferPhilosophy =
  | 'youth_development'
  | 'balanced'
  | 'galacticos'
  | 'sell_to_buy';

export type ClubRiskTolerance = 'low' | 'medium' | 'high';

/** Persisted / configurable AI transfer posture (no hidden player data). */
export interface AiClubTransferProfile {
  clubId: string;
  philosophy: ClubTransferPhilosophy;
  riskTolerance: ClubRiskTolerance;
  /** 0–100 board expectation to improve squad. */
  boardAmbition: number;
  /** 0–100 pressure to raise cash via sales. */
  financialPressure: number;
  /** Weight on estimated potential when scoring targets (0–1). */
  youthPolicyWeight: number;
  /** Weight on estimated current rating (0–1). */
  starPolicyWeight: number;
  /** 0–1 preference to pursue loans instead of permanent deals when budget tight. */
  loanPreference: number;
  /** Max share of transfer budget for one incoming deal (0–1). */
  maxTransferFeePctOfBudget: number;
  /** Minimum scout confidence % before a bid (observed knowledge). */
  minScoutConfidenceToBid: number;
  rivalClubIds: readonly string[];
  preferredBuyerClubIds: readonly string[];
  /** Baseline willingness to listen to offers for own players (0–100). */
  sellWillingnessBase: number;
}

export interface AiClubFinanceContext {
  transferBudget: number;
  wageBudgetRemainingWeekly: number;
  squadSize: number;
  maxSquadSize: number;
}

export interface SquadNeedContext {
  minEstimatedRating: number;
  minEstimatedPotential?: number;
  /** 0–100 positional/squad gap urgency. */
  needUrgency: number;
}

export type AiTransferActionKind =
  | 'pass'
  | 'wait'
  | 'scout_longer'
  | 'register_interest'
  | 'negotiate'
  | 'bid_immediately'
  | 'offer_loan'
  | 'list_for_sale'
  | 'hold_asset';

export interface TransferDecisionBuyInput {
  mode: 'buy';
  worldSeed: number;
  gameWeek: number;
  actingClubId: string;
  profile: AiClubTransferProfile;
  finances: AiClubFinanceContext;
  squadNeeds: SquadNeedContext;
  transferWindowOpen: boolean;
  permanentTransferAllowed: boolean;
  observedPlayer: import('../types').ObservedPlayerView;
  playerWillingness: import('../motivation/motivationTypes').PreOfferWillingnessResult;
  playerMotivation?: import('../motivation/motivationTypes').TransferMotivationResult;
  sellerClubId?: string;
  estimatedWeeklyWage?: number;
}

export interface TransferDecisionSellInput {
  mode: 'sell';
  worldSeed: number;
  gameWeek: number;
  actingClubId: string;
  profile: AiClubTransferProfile;
  finances: AiClubFinanceContext;
  observedPlayer: import('../types').ObservedPlayerView;
  playerMotivation: import('../motivation/motivationTypes').TransferMotivationResult;
  hasReplacementReady: boolean;
  inboundOfferFee?: number;
}

export type DecideTransferActionInput = TransferDecisionBuyInput | TransferDecisionSellInput;

export interface DecideTransferActionResult {
  action: AiTransferActionKind;
  /** 0–100 recruitment interest (not rumor). */
  interestLevel: number;
  reasonCodes: readonly string[];
  /** Suggested max fee from observed value + profile (buy paths). */
  suggestedMaxFee?: number;
}

export interface TransferTargetCandidate {
  playerId: string;
  observed: import('../types').ObservedPlayerView;
  willingness: import('../motivation/motivationTypes').PreOfferWillingnessResult;
  motivation?: import('../motivation/motivationTypes').TransferMotivationResult;
  sellerClubId?: string;
  estimatedWeeklyWage?: number;
}

export interface IdentifiedTransferTarget {
  playerId: string;
  interestLevel: number;
  fitScore: number;
  decision: DecideTransferActionResult;
}
