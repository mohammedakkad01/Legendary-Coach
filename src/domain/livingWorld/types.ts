/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Living Football World — Phase A domain types (pure, no React/Firebase).
 */

import type { Player, PlayerPersonality } from '../../types/game';

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

export interface ManagerCareerState {
  reputation: number;
  reputationLedger: ManagerReputationLedgerEntry[];
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
  schemaVersion: 1;
  currentSeason: number;
  managerCareer: ManagerCareerState;
  clubMemory: ClubMemoryEntry[];
  playerMemories: Record<string, PlayerMemoryEntry[]>;
  relationships: SquadRelationship[];
  eventLog: GameEvent[];
  notifications: GameNotification[];
  notificationThrottle: NotificationThrottleState;
}

export const LIVING_WORLD_SCHEMA_VERSION = 1 as const;
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

export type PlayerMentalPatch = Partial<PlayerMentalState>;
export type ManagerRelationshipPatch = Partial<ManagerRelationship>;
export type PlayerCareerPatch = Partial<PlayerCareerState>;

export type StateChange =
  | { kind: 'changePlayerMorale'; playerId: string; delta: number; reason?: string }
  | { kind: 'changePlayerMentalState'; playerId: string; patch: PlayerMentalPatch }
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
  | { kind: 'setLivingWorldSeason'; season: number };

export interface ReducerInput {
  livingWorld: LivingWorldState;
  players: Player[];
}

export interface ReducerResult {
  livingWorld: LivingWorldState;
  players: Player[];
}
