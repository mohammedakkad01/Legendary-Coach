/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { KnowledgeRevealStage } from '../config/recruitmentTuning';

export type ScoutingTargetKind = 'player' | 'league' | 'region' | 'role_focus';

export type ScoutingAssignmentStatus = 'active' | 'completed' | 'cancelled';

export interface ScoutingAssignment {
  id: string;
  observerClubId: string;
  scoutId: string;
  targetKind: ScoutingTargetKind;
  playerId?: string;
  leagueId?: string;
  regionId?: string;
  roleFocus?: string;
  status: ScoutingAssignmentStatus;
  matchesWatched: number;
  reportsCompleted: number;
  createdWeek: number;
  updatedWeek: number;
}

export interface ScoutingReportClaim {
  stage: KnowledgeRevealStage;
  /** Observed aggregate 1–99 (may be wrong vs truth). */
  value: number;
}

export interface ScoutingReport {
  id: string;
  assignmentId: string;
  observerClubId: string;
  playerId: string;
  scoutId: string;
  gameWeek: number;
  /** Scout-stated overall (biased/noisy). */
  statedOverall: number;
  statedPotentialMid: number;
  claims: readonly ScoutingReportClaim[];
  scoutQualityScore: number;
  confidenceDeltaApplied: number;
}
