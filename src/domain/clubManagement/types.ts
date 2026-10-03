/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ClubFacilities } from '../../types/game';
import type { GameEvent } from '../livingWorld/types';

export const CLUB_MANAGEMENT_SCHEMA_VERSION = 1 as const;

export type LedgerCategory =
  | 'opening_balance'
  | 'player_wages'
  | 'staff_wages'
  | 'facility_running'
  | 'match_revenue'
  | 'transfer_in'
  | 'transfer_out'
  | 'sponsor'
  | 'prize_money'
  | 'adjustment'
  | 'monthly_summary';

export interface LedgerEntry {
  id: string;
  gameWeek: number;
  season: number;
  category: LedgerCategory;
  amount: number;
  balanceAfter: number;
  reasonCode: string;
  timestampIso: string;
}

export interface FinanceSlice {
  coins: number;
  transferBudget: number;
  wageBudgetWeekly: number;
  ledger: LedgerEntry[];
  /** When set, transfer spend capped / blocked until this game week. */
  transferRestrictedUntilWeek?: number;
  seasonRevenueTotal: number;
  seasonExpenseTotal: number;
}

export type StaffCategory =
  | 'assistant_manager'
  | 'head_coach'
  | 'fitness_coach'
  | 'goalkeeping_coach'
  | 'scout'
  | 'recruitment_analyst'
  | 'medical_staff'
  | 'physio'
  | 'sports_scientist'
  | 'director_of_football'
  | 'youth_director';

export interface StaffAttributes {
  tacticalKnowledge: number;
  manManagement: number;
  youthDevelopment: number;
  judgingAbility: number;
  injuryPrevention: number;
  diagnosisAccuracy: number;
  setPieceCoaching: number;
  fitnessCoaching: number;
  scoutingRange: number;
}

export interface StaffMember {
  id: string;
  name: string;
  category: StaffCategory;
  attributes: StaffAttributes;
  reputation: number;
  weeklyWage: number;
  contractWeeksRemaining: number;
  /** Links recruitment ScoutStaff id when category is scout. */
  linkedScoutId?: string;
}

export interface StaffSlice {
  members: StaffMember[];
  staffReputation: number;
}

export type ClubFacilitiesExtended = ClubFacilities & {
  analyticsDepartmentLevel: number;
};

export interface DelegationTaskId {
  readonly _brand: 'DelegationTask';
}

export type DelegationTask =
  | 'training'
  | 'scouting'
  | 'loan_search'
  | 'youth_recruitment'
  | 'opposition_analysis'
  | 'fitness_management'
  | 'set_pieces';

export type DelegationMode = 'manual' | 'delegate';

export interface DelegationSlice {
  modes: Record<DelegationTask, DelegationMode>;
  assigneeByTask: Partial<Record<DelegationTask, string>>;
  lastReportWeekByTask: Partial<Record<DelegationTask, number>>;
}

export type BoardObjectiveKind =
  | 'league_position'
  | 'cup_progress'
  | 'youth_development'
  | 'financial_stability'
  | 'player_sales'
  | 'club_growth';

export interface BoardObjective {
  id: string;
  kind: BoardObjectiveKind;
  targetLabel: string;
  progressPct: number;
  met: boolean;
}

export type BoardConsequenceLevel = 'none' | 'warning' | 'transfer_restricted' | 'ultimatum' | 'dismissed';

export interface BoardSlice {
  trust: number;
  patience: number;
  expectations: number;
  vision: 'stability' | 'growth' | 'youth' | 'titles';
  objectives: BoardObjective[];
  consequenceLevel: BoardConsequenceLevel;
  lastMessageWeek: number;
  transferRestrictedUntilWeek?: number;
}

export interface FansSlice {
  mood: number;
  confidence: number;
  trust: number;
  lastEventWeek: number;
}

export interface InfluenceSnapshot {
  score: number;
  unlocked: {
    transferBudgetSay: boolean;
    staffDecisions: boolean;
    academyDecisions: boolean;
    infrastructureRequests: boolean;
    playerAuthority: boolean;
    tacticalAutonomy: boolean;
  };
  computedAtGameWeek: number;
}

export interface ScheduledClubData {
  lastProcessedGameWeek: number;
  lastMonthlySummaryWeek: number;
}

export interface ClubManagementState {
  schemaVersion: typeof CLUB_MANAGEMENT_SCHEMA_VERSION;
  finance: FinanceSlice;
  staff: StaffSlice;
  facilities: { analyticsDepartmentLevel: number };
  delegation: DelegationSlice;
  board: BoardSlice;
  fans: FansSlice;
  influence: InfluenceSnapshot;
  scheduled: ScheduledClubData;
}

export type FinanceValidationCode =
  | 'insufficient_coins'
  | 'transfer_budget_exceeded'
  | 'wage_budget_exceeded'
  | 'transfer_restricted';

export interface FinanceValidationResult {
  valid: boolean;
  reasonCodes: readonly FinanceValidationCode[];
}

export interface ClubSystemModifiers {
  trainingEffectiveness: number;
  developmentRate: number;
  medicalInjuryRiskMult: number;
  medicalRecoveryMult: number;
  medicalDiagnosisMult: number;
  scoutReportQualityMult: number;
  academyCoachingQuality: number;
  academyRecruitmentInvestment: number;
  oppositionAnalysisMult: number;
  setPieceQualityMult: number;
  stadiumAttendanceMult: number;
  gateCapacity: number;
}

export type ClubManagementChange =
  | { kind: 'setFinance'; finance: FinanceSlice }
  | { kind: 'patchFinance'; patch: Partial<Omit<FinanceSlice, 'ledger'>> & { ledgerAppend?: LedgerEntry } }
  | { kind: 'setStaff'; staff: StaffSlice }
  | { kind: 'upsertStaffMember'; member: StaffMember }
  | { kind: 'removeStaffMember'; staffId: string }
  | { kind: 'setAnalyticsLevel'; level: number }
  | { kind: 'patchDelegation'; patch: Partial<DelegationSlice> }
  | { kind: 'patchBoard'; patch: Partial<BoardSlice> }
  | { kind: 'patchFans'; patch: Partial<FansSlice> }
  | { kind: 'setInfluence'; influence: InfluenceSnapshot }
  | { kind: 'patchScheduled'; patch: Partial<ScheduledClubData> };

export interface StaffReportPayload {
  task: DelegationTask;
  staffId: string;
  reasonCodes: string[];
  summaryCode: string;
  gameWeek: number;
  season: number;
}

export interface WeeklyClubTickResult {
  state: ClubManagementState;
  livingWorldEvents: GameEvent[];
  playerLifeChanges?: import('../livingWorld/types').StateChange[];
  recruitmentPatches?: import('../recruitment/types').RecruitmentPatch[];
}
