/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phase D — recruitment save-safe & public types (no internal truth types).
 */

import type { KnowledgeRevealStage } from './config/recruitmentTuning';
import type { ScoutStaff } from './scouts/scoutTypes';
import type { ScoutingAssignment, ScoutingReport } from './scouting/types';
import type { AiClubTransferProfile } from './aiClubs/clubProfileTypes';
import type { TransferNegotiation } from './negotiation/offerTypes';
import type {
  ClubInterestRecord,
  RumorThrottleState,
  TransferRumor,
} from './rumors/rumorTypes';

export const RECRUITMENT_WORLD_SCHEMA_VERSION = 7 as const;

export type TransferWindowPhase = 'closed' | 'summer' | 'winter';

export interface TransferWindowState {
  phase: TransferWindowPhase;
  /** 1-based week index in the seasonal calendar used by window rules. */
  calendarWeek: number;
}

export type RevealedAttributeGroup = KnowledgeRevealStage;

export interface KnowledgeState {
  observerClubId: string;
  playerId: string;
  confidencePct: number;
  ratingMin: number;
  ratingMax: number;
  potentialBandMin: number;
  potentialBandMax: number;
  valueMin: number;
  valueMax: number;
  revealedGroups: readonly RevealedAttributeGroup[];
  personalityIndicators?: readonly string[];
  injuryConcernLevel?: number;
  lastUpdatedWeek: number;
}

/** UI / AI safe projection — never includes exact hidden potential or true overall. */
export interface ObservedPlayerView {
  playerId: string;
  observerClubId: string;
  confidencePct: number;
  ratingRange: { min: number; max: number };
  potentialBand: { min: number; max: number };
  valueRange: { min: number; max: number };
  revealedGroups: readonly RevealedAttributeGroup[];
  personalityIndicators?: readonly string[];
  injuryConcernLevel?: number;
  /** Midpoint estimates derived from ranges only (not ground truth). */
  estimatedRating: number;
  estimatedPotential: number;
  estimatedValue: number;
}

export interface RecruitmentWorldState {
  schemaVersion: typeof RECRUITMENT_WORLD_SCHEMA_VERSION;
  /** Deterministic world seed (from saveId); not a RNG runtime seed alone. */
  worldSeed: number;
  gameWeek: number;
  transferWindow: TransferWindowState;
  /** Sparse recruitment truth keyed by player id — persisted but not exposed via public API. */
  worldPlayers: Record<string, import('./trueProfile/types').TrueWorldPlayer>;
  knowledgeByObserverClubId: Record<string, Record<string, KnowledgeState>>;
  /** Placeholder scout staff until Phase E hiring. */
  scoutNetwork: ScoutStaff[];
  scoutingAssignments: ScoutingAssignment[];
  scoutingReports: ScoutingReport[];
  negotiations: TransferNegotiation[];
  /** Configurable AI transfer profiles keyed by club id. */
  aiClubProfiles: Record<string, AiClubTransferProfile>;
  transferRumors: TransferRumor[];
  clubInterestRecords: ClubInterestRecord[];
  rumorThrottle: RumorThrottleState;
}

export interface RecruitmentTickContext {
  saveId: string;
  userClubId: string;
  gameWeek: number;
}

export type RecruitmentPatch =
  | { kind: 'setGameWeek'; gameWeek: number }
  | { kind: 'setTransferWindow'; transferWindow: TransferWindowState }
  | { kind: 'upsertKnowledge'; knowledge: KnowledgeState }
  | { kind: 'mergeWorldPlayer'; playerId: string; patch: Partial<import('./trueProfile/types').TrueWorldPlayer> }
  | { kind: 'setScoutNetwork'; scouts: ScoutStaff[] }
  | { kind: 'upsertScoutingAssignment'; assignment: ScoutingAssignment }
  | { kind: 'appendScoutingReport'; report: ScoutingReport }
  | { kind: 'upsertNegotiation'; negotiation: TransferNegotiation }
  | { kind: 'upsertAiClubProfile'; profile: AiClubTransferProfile }
  | { kind: 'appendTransferRumor'; rumor: TransferRumor }
  | { kind: 'appendClubInterest'; interest: ClubInterestRecord }
  | { kind: 'setRumorThrottle'; throttle: RumorThrottleState };
