/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Caller-provided signals for recruitment motivation (no TrueWorldPlayer / Phase C imports).
 */

export type TransferMotiveKind =
  | 'playing_time'
  | 'salary'
  | 'bigger_club'
  | 'champions_league'
  | 'home_country'
  | 'manager_relationship'
  | 'career_development'
  | 'club_ambition'
  | 'contract';

/** Observed life/club signals supplied by integrator (typically from Phase A/C overlays). */
export interface TransferMotivationSignalContext {
  playerId: string;
  personalityArchetype: string;
  morale: number;
  /** Minutes share vs expectation (0 = benched, 100 = exceeds expectation). */
  playingTimeFulfillmentPct: number;
  developmentSatisfaction: number;
  contractSatisfaction: number;
  contractYearsRemaining: number;
  managerTrust: number;
  managerSatisfaction: number;
  mentalFrustration: number;
  mentalHappiness: number;
  /** 0–100 club stature at current employer. */
  currentClubReputation: number;
  /** 0–100 player ambition for club level (observed estimate). */
  desiredClubLevel: number;
  /** Whether player publicly seeks UCL football (observed). */
  seeksChampionsLeague: boolean;
  /** Wage vs squad median (100 = at median, lower = underpaid). */
  wageVsSquadMedianPct: number;
  /** Recent transfer rumor intensity 0–100 (memory overlay). */
  transferRumorIntensity?: number;
  /** When evaluating a specific suitor (pre-offer). */
  suitorClubReputation?: number;
  suitorOffersChampionsLeague?: boolean;
  suitorIsHomeCountry?: boolean;
}

export interface TransferMotivationResult {
  /** Recruitment-side projection for negotiation/willingness (not persisted as canonical career state). */
  projectedTransferDesire: number;
  motiveScores: Record<TransferMotiveKind, number>;
  dominantMotives: readonly TransferMotiveKind[];
  reasonCodes: readonly string[];
}

export type PreOfferWillingnessBand = 'refuse' | 'reluctant' | 'open' | 'keen' | 'desperate';

export interface PreOfferWillingnessResult {
  band: PreOfferWillingnessBand;
  /** 0–100 likelihood agent entertains discussions before an official bid. */
  opennessScore: number;
  willInfluenceTransfer: boolean;
  reasonCodes: readonly string[];
}

export interface AgentDemandContext {
  referenceMarketValue: number;
  personalityArchetype: string;
  motivation: TransferMotivationResult;
}

export interface AgentDemandResult {
  /** Minimum fee ratio vs reference value agent expects before engaging seriously. */
  minFeeAcceptRatio: number;
  /** Suggested opening ask ratio (may exceed min). */
  openingAskRatio: number;
  reasonCodes: readonly string[];
}
