/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { PreMatchAnalysis } from '../assistant/types';
import type { Recommendation } from '../assistant/types';
import type { StaffReportPayload } from '../clubManagement/types';
import type { StateChange } from '../livingWorld/types';
import type { MoveTarget } from '../squad/squadTypes';

export type AutomationFeatureId =
  | 'bench'
  | 'rotation'
  | 'recovery'
  | 'scout'
  | 'loans'
  | 'tactics'
  | 'opponent';

export type AutomationApplyMode = 'suggest' | 'apply';

export interface AutomationFeatureSetting {
  enabled: boolean;
  mode: AutomationApplyMode;
}

export type AutomationSettings = Record<AutomationFeatureId, AutomationFeatureSetting>;

export type AutomationReportStatus = 'suggested' | 'applied' | 'skipped';

export interface AutomationUndoSnapshot {
  feature: 'bench' | 'rotation' | 'recovery';
  footballLineup: string[];
  footballBench: string[];
  /** Recovery-only: player-life patches applied by the session. */
  recoveryChanges?: StateChange[];
  coinsBefore?: number;
  dailyMissionManageFatigueBefore?: number;
  playerFatigueBefore?: Record<string, number>;
  playerStaminaBefore?: Record<string, number>;
  appliedAtIso: string;
}

export interface AutomationExecutionStamps {
  /** Last matchday an apply/suggest report was emitted (per feature). */
  lastMatchdayByFeature: Partial<Record<AutomationFeatureId, number>>;
  /** Last game week recovery automation ran (apply or suggest report). */
  lastRecoveryGameWeek?: number;
  /** Last game week scout/loans automation reported. */
  lastScoutGameWeek?: number;
  lastLoansGameWeek?: number;
}

export interface AutomationPrefsBlob {
  settings: AutomationSettings;
  stamps: AutomationExecutionStamps;
  undo: AutomationUndoSnapshot | null;
}

export interface AutomationChangeSummary {
  playerIds?: readonly string[];
  leavingSubstituteIds?: readonly string[];
  excludedPlayerIds?: readonly string[];
  slotDiffs?: readonly { slotIndex: number; fromPlayerId: string; toPlayerId: string }[];
  coinCost?: number;
  wholeSquad?: boolean;
}

export interface AutomationReport {
  id: string;
  feature: AutomationFeatureId;
  mode: AutomationApplyMode;
  status: AutomationReportStatus;
  summaryCode: string;
  reasonCodes: readonly string[];
  undoable: boolean;
  matchday?: number;
  gameWeek?: number;
  season: number;
  createdAt: string;
  changeSummary: AutomationChangeSummary;
  /** Full objects for UI — not serialized on GameEvent. */
  tacticsRecommendation?: Recommendation | null;
  preMatchAnalysis?: PreMatchAnalysis;
  delegationReport?: StaffReportPayload;
  notificationDelivered: boolean;
}

export interface AutomationRunResult {
  reports: AutomationReport[];
  appliedFeatureIds: AutomationFeatureId[];
}

export interface SquadMovePlan {
  moves: readonly { playerId: string; target: MoveTarget }[];
}

export type UndoFailureReason =
  | 'nothing_to_undo'
  | 'not_undoable'
  | 'undo_stale'
  | 'squad_rules';

export const SUGGEST_ONLY_FEATURES: readonly AutomationFeatureId[] = [
  'scout',
  'loans',
  'tactics',
  'opponent',
];

export const APPLY_CAPABLE_FEATURES: readonly AutomationFeatureId[] = [
  'bench',
  'rotation',
  'recovery',
];
