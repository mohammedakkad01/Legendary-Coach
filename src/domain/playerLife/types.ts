/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phase C — Player Life domain types (pure, no React/Firebase).
 */

export type InjurySeverity = 'minor' | 'moderate' | 'major' | 'recurring';

export interface PlayerInjuryState {
  severity: InjurySeverity;
  fatigueInjury: boolean;
  muscleRisk: number;
  trueWeeksRemaining: number;
  estimatedWeeksRemaining: number;
  diagnosisConfidence: number;
}

export interface PlayerConditionSlice {
  trainingLoad: number;
  sharpness: number;
  matchFitness: number;
  recoveryQuality: number;
  injury?: PlayerInjuryState;
}

export type DevelopmentArchetype =
  | 'late_bloomer'
  | 'early_breakthrough'
  | 'stalled'
  | 'unexpected_breakthrough'
  | 'decline'
  | 'wonderkid_failure'
  | 'steady';

export type DevelopmentTrajectory = 'rising' | 'stable' | 'declining';

export interface PlayerDevelopmentSlice {
  truePotential: number;
  potentialEstimate: number;
  estimateUncertainty: number;
  momentum: number;
  ceiling: number;
  archetype: DevelopmentArchetype;
  trajectory: DevelopmentTrajectory;
}

export interface PlayerPlayingTimeSlice {
  expectedMinutesPerMatch: number;
  minutesLastMatches: number[];
  squadRole: 'starter' | 'rotation' | 'youth' | 'fringe';
}

export interface PlayerMentoringSlice {
  mentorId?: string;
  menteeIds: string[];
}

export interface PlayerLifeState {
  condition: PlayerConditionSlice;
  development: PlayerDevelopmentSlice;
  playingTime: PlayerPlayingTimeSlice;
  mentoring?: PlayerMentoringSlice;
}

export type TrainingCategory =
  | 'technical'
  | 'tactical'
  | 'physical'
  | 'mental'
  | 'position_specific'
  | 'recovery'
  | 'team_cohesion'
  | 'set_pieces';

export type TrainingIntensity = 'low' | 'normal' | 'high' | 'very_high';

export interface TrainingSessionPlan {
  category: TrainingCategory;
  intensity: TrainingIntensity;
}

export type PlayerInteractionKind =
  | 'playing_time'
  | 'training'
  | 'contract'
  | 'transfer_request'
  | 'role_disagreement'
  | 'tactical_disagreement'
  | 'development_concern'
  | 'praise_request'
  | 'captaincy_concern'
  | 'mentoring_request'
  | 'national_team_concern';

export interface InteractionResponseOption {
  id: string;
  labelEn: string;
  labelAr: string;
}

export interface PendingPlayerInteraction {
  id: string;
  playerId: string;
  kind: PlayerInteractionKind;
  season: number;
  matchday: number;
  severity: 'low' | 'medium' | 'high';
  responses: InteractionResponseOption[];
  context: Record<string, string | number | boolean>;
}

export interface DressingRoomState {
  cohesion: number;
  hierarchyStability: number;
  activeConflictPlayerIds: string[];
  lastCrisisMatchday?: number;
}

/** Partial update; numeric fields may use *Delta suffix for additive apply. */
export type DressingRoomPatch = Partial<DressingRoomState> & {
  cohesionDelta?: number;
  hierarchyStabilityDelta?: number;
};

export interface CaptaincyHistoryEntry {
  captainId: string;
  sinceMatchday: number;
  season: number;
}

export interface PostMatchPlayerSummary {
  playerId: string;
  minutes: number;
  goals: number;
  assists: number;
  matchRating: number;
  wasStarter: boolean;
}

export interface PostMatchTickInput {
  season: number;
  matchday: number;
  won: boolean;
  drawn: boolean;
  goalsFor: number;
  goalsAgainst: number;
  playerSummaries: PostMatchPlayerSummary[];
  medicalCenterLevel: number;
  trainingGroundLevel: number;
  recentMatchesIn7Days: number;
  /** VIP fatigue protection (1 = no reduction). */
  fatigueProtectionMult?: number;
}

export interface WeeklyTickInput {
  season: number;
  matchday: number;
  medicalCenterLevel: number;
  trainingGroundLevel: number;
  captainId?: string;
  lineupIds: string[];
  benchIds: string[];
}

export type PlayerLifePatch = {
  condition?: Partial<Omit<PlayerConditionSlice, 'injury'>> & { injury?: PlayerInjuryState | null };
  development?: Partial<PlayerDevelopmentSlice>;
  playingTime?: Partial<PlayerPlayingTimeSlice>;
  mentoring?: Partial<PlayerMentoringSlice>;
};
