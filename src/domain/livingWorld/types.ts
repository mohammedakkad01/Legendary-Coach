/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Living Football World — Phase A domain types (pure, no React/Firebase).
 */

import type { Player, PlayerPersonality } from '../../types/game';
import type {
  CaptaincyHistoryEntry,
  DressingRoomState,
  PendingPlayerInteraction,
  PlayerLifePatch,
} from '../playerLife/types';

/** Numeric personality axes (0–100). Distinct from legacy `PlayerPersonality` archetype string. */
export interface PlayerPersonalityProfile {
  ambition: number;
  professionalism: number;
  loyalty: number;
  temperament: number;
  adaptability: number;
  leadership: number;
  determination: number;
}

/** Mental state without morale — canonical morale remains `Player.morale`. */
export interface PlayerMentalState {
  confidence: number;
  happiness: number;
  frustration: number;
  pressure: number;
}

/**
 * Absolute target values (0–100) for `changePlayerMentalState`.
 * Only keys present in the patch are written; omitted keys keep their current value.
 */
export type PlayerMentalStateAbsolutePatch = Partial<PlayerMentalState>;

/**
 * Additive deltas for `changePlayerMentalStateDelta` (clamped after apply).
 */
export type PlayerMentalStateDelta = Partial<PlayerMentalState>;

export interface ManagerRelationship {
  trust: number;
  respect: number;
  satisfaction: number;
}

export interface PlayerCareerState {
  playingTimeExpectation: number;
  developmentSatisfaction: number;
  contractSatisfaction: number;
  nationalTeamAmbition: number;
  transferDesire: number;
}

export type PlayerMemoryType =
  | 'match_highlight'
  | 'conflict'
  | 'praise'
  | 'benching'
  | 'transfer_rumor'
  | 'training_breakthrough';

export interface PlayerMemoryEntry {
  id: string;
  type: PlayerMemoryType;
  season: number;
  matchday?: number;
  subjectIds: string[];
  intensity: number;
  decayRate: number;
}

export type ClubMemoryType =
  | 'match_result'
  | 'trophy'
  | 'transfer_in'
  | 'transfer_out'
  | 'rivalry_moment';

export interface ClubMemoryEntry {
  id: string;
  type: ClubMemoryType;
  season: number;
  matchday?: number;
  subjectIds: string[];
  intensity: number;
  decayRate: number;
}

export type RelationshipType =
  | 'friendship'
  | 'rivalry'
  | 'mentorship'
  | 'competition'
  | 'respect'
  | 'conflict';

export interface SquadRelationship {
  playerAId: string;
  playerBId: string;
  type: RelationshipType;
  strength: number;
}

export interface ManagerReputationLedgerEntry {
  eventType: string;
  delta: number;
  gameEventId: string;
  season: number;
}

export interface TacticalIdentitySnapshot {
  tags: readonly string[];
  sampleSize: number;
  updatedAt: string;
}

export interface OpponentTacticalScoutingCompact {
  opponentClubId: string;
  samples: number;
  attackLeftShare: number;
  attackRightShare: number;
  avgPossession: number;
  pressSuccessRate: number;
}

export interface TacticalUsageSample {
  formation: string;
  mentality: string;
  pressing: string;
  passing: string;
  won: boolean;
  drew: boolean;
  goalsFor: number;
  goalsAgainst: number;
}

export interface ManagerCareerState {
  reputation: number;
  reputationLedger: ManagerReputationLedgerEntry[];
  tacticalIdentity?: TacticalIdentitySnapshot;
  tacticalUsageHistory?: TacticalUsageSample[];
}

export type EventSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface GameEvent {
  id: string;
  type: string;
  timestamp: string;
  season: number;
  matchId?: string;
  playerId?: string;
  clubId?: string;
  severity: EventSeverity;
  context: Record<string, string | number | boolean>;
}

export type NotificationCategory =
  | 'Critical'
  | 'Important'
  | 'Information'
  | 'Suggestion'
  | 'Story';

export interface GameNotification {
  id: string;
  category: NotificationCategory;
  title: string;
  message: string;
  sourceEventId: string;
  createdAt: string;
  read: boolean;
  dedupeKey: string;
}

export interface NotificationThrottleState {
  /** ISO date (YYYY-MM-DD) → counts per category */
  dayBuckets: Record<string, Partial<Record<NotificationCategory, number>>>;
}

export interface LivingWorldState {
  schemaVersion: 1 | 2;
  currentSeason: number;
  managerCareer: ManagerCareerState;
  clubMemory: ClubMemoryEntry[];
  playerMemories: Record<string, PlayerMemoryEntry[]>;
  relationships: SquadRelationship[];
  eventLog: GameEvent[];
  notifications: GameNotification[];
  notificationThrottle: NotificationThrottleState;
  /** Phase C — player life (optional until migration). */
  dressingRoom?: DressingRoomState;
  interactionCooldowns?: Record<string, number>;
  pendingInteractions?: PendingPlayerInteraction[];
  captaincyHistory?: CaptaincyHistoryEntry[];
  /** Opponent → compact scouting tendencies (Phase B). */
  opponentTacticalScouting?: Record<string, OpponentTacticalScoutingCompact>;
}

export const LIVING_WORLD_SCHEMA_VERSION = 1 as const;
export const LIVING_WORLD_SCHEMA_VERSION_V2 = 2 as const;
export const MAX_PLAYER_MEMORIES = 24;
export const MAX_CLUB_MEMORIES = 48;
export const MAX_RELATIONSHIPS_PER_PLAYER = 6;
export const MAX_EVENT_LOG = 200;
export const MAX_NOTIFICATIONS_STORED = 100;

export const NOTIFICATION_DAILY_CAP: Record<NotificationCategory, number> = {
  Critical: 10,
  Important: 8,
  Information: 12,
  Suggestion: 6,
  Story: 4,
};

/** Snapshot passed into pure living-world functions. */
export interface LivingWorldClubSnapshot {
  clubId: string;
  players: Player[];
  lineupIds: string[];
  benchIds: string[];
  captainId?: string;
}

/** @deprecated alias — use PlayerMentalStateAbsolutePatch */
export type PlayerMentalPatch = PlayerMentalStateAbsolutePatch;
export type ManagerRelationshipPatch = Partial<ManagerRelationship>;
export type PlayerCareerPatch = Partial<PlayerCareerState>;

export type StateChange =
  | { kind: 'changePlayerMorale'; playerId: string; delta: number; reason?: string }
  /** Sets mental fields to absolute clamped values (partial patch). Not a delta. */
  | { kind: 'changePlayerMentalState'; playerId: string; patch: PlayerMentalStateAbsolutePatch }
  /** Adds clamped deltas to the current mental state. */
  | { kind: 'changePlayerMentalStateDelta'; playerId: string; delta: PlayerMentalStateDelta }
  | { kind: 'changeManagerRelationship'; playerId: string; patch: ManagerRelationshipPatch }
  | { kind: 'changePlayerCareerState'; playerId: string; patch: PlayerCareerPatch }
  | { kind: 'addPlayerMemory'; playerId: string; entry: PlayerMemoryEntry }
  | { kind: 'decayPlayerMemories'; playerId: string; factor: number }
  | { kind: 'addClubMemory'; entry: ClubMemoryEntry }
  | { kind: 'changeManagerReputation'; delta: number; eventType: string; gameEventId: string; season: number }
  | { kind: 'addRelationship'; relationship: SquadRelationship }
  | { kind: 'updateRelationshipStrength'; playerAId: string; playerBId: string; delta: number }
  | { kind: 'appendGameEvent'; event: GameEvent }
  | { kind: 'addNotification'; notification: GameNotification }
  | { kind: 'mergeNotifications'; notifications: GameNotification[] }
  | { kind: 'setLivingWorldSeason'; season: number }
  | {
      kind: 'patchPlayerLife';
      playerId: string;
      patch?: PlayerLifePatch;
      conditionDelta?: Partial<{
        trainingLoad: number;
        sharpness: number;
        matchFitness: number;
        recoveryQuality: number;
      }>;
      legacyDelta?: Partial<{
        morale: number;
        fatigue: number;
        stamina: number;
        form: number;
        overall: number;
      }>;
      legacySet?: Partial<{ injuredWeeks: number }>;
    }
  | { kind: 'patchDressingRoom'; patch: import('../playerLife/types').DressingRoomPatch }
  | { kind: 'addPendingInteraction'; interaction: PendingPlayerInteraction }
  | { kind: 'removePendingInteraction'; interactionId: string }
  | { kind: 'setInteractionCooldown'; key: string; matchday: number }
  | { kind: 'appendCaptaincyHistory'; entry: CaptaincyHistoryEntry }
  | { kind: 'setManagerTacticalIdentity'; identity: TacticalIdentitySnapshot }
  | { kind: 'appendTacticalUsage'; sample: TacticalUsageSample }
  | { kind: 'mergeOpponentScouting'; entry: OpponentTacticalScoutingCompact };

export interface ReducerInput {
  livingWorld: LivingWorldState;
  players: Player[];
}

export interface ReducerResult {
  livingWorld: LivingWorldState;
  players: Player[];
}
