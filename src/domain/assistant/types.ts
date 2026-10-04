/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { FootballTactics } from '../../types/game';
import type { BestTacticsRecommendation } from '../tactics/bestTactics/types';
import type { MoveTarget } from '../squad/squadTypes';

export type AssistantSource = 'pre_match' | 'live' | 'post_match' | 'best_tactics' | 'scouting';

export type RecommendationSeverity = 'info' | 'warning' | 'critical';

export type SuggestedChangeKind =
  | 'tactics'
  | 'lineup'
  | 'live_tactics'
  | 'best_tactics_apply';

export interface SuggestedChange {
  readonly kind: SuggestedChangeKind;
  readonly patch?: Partial<FootballTactics>;
  readonly lineupMoves?: readonly { readonly playerId: string; readonly target: MoveTarget }[];
  readonly bestTacticsRec?: BestTacticsRecommendation;
}

export interface Recommendation {
  readonly id: string;
  readonly dedupeKey: string;
  readonly source: AssistantSource;
  readonly severity: RecommendationSeverity;
  readonly confidence: number;
  readonly reasonCodes: readonly string[];
  readonly reasonParams?: Readonly<Record<string, string | number>>;
  readonly titleEn: string;
  readonly titleAr: string;
  readonly summaryEn: string;
  readonly summaryAr: string;
  readonly suggestedChanges: readonly SuggestedChange[];
  readonly expiryMinute?: number;
  readonly fixtureMatchday?: number;
  readonly importance: number;
}

export interface AnalysisFinding {
  readonly code: string;
  readonly confidence: number;
  readonly params?: Readonly<Record<string, string | number>>;
}

export interface PreMatchAnalysis {
  readonly opponentFormation: string;
  readonly strengths: readonly AnalysisFinding[];
  readonly weaknesses: readonly AnalysisFinding[];
  readonly mainThreat: AnalysisFinding | null;
  readonly defensiveVulnerabilities: readonly AnalysisFinding[];
  readonly setPieceDanger: { readonly level: 'low' | 'medium' | 'high'; readonly confidence: number };
  readonly keyPlayers: readonly { readonly playerId: string; readonly reasonCode: string; readonly confidence: number }[];
  readonly recentForm: { readonly w: number; readonly d: number; readonly l: number; readonly sampleSize: number };
  readonly tendencies: readonly AnalysisFinding[];
  readonly refereeMode: 'generic' | 'assigned';
  readonly refereeProfile?: {
    readonly strictness: number;
    readonly cardTendency: number;
    readonly penaltyTendency: number;
    readonly foulSensitivity: number;
  };
  readonly overallConfidence: number;
  readonly uncertaintyNoteCode?: string;
}

export interface PostMatchAnalysis {
  readonly conclusionCodes: readonly string[];
  readonly recommendations: readonly Recommendation[];
  readonly overallConfidence: number;
}

export interface ScoutingSummary {
  readonly playerId: string;
  readonly headlineEn: string;
  readonly headlineAr: string;
  readonly bulletCodes: readonly string[];
  readonly confidencePct: number;
}

export interface LiveAnalystInput {
  readonly minute: number;
  readonly events: readonly import('../../types/game').MatchEvent[];
  readonly stats: import('../../types/game').MatchStats;
  readonly analytics: import('../match/matchAnalytics').MatchAnalyticsSummary;
  readonly cooldowns: Readonly<Record<string, number>>;
  readonly alertsEmitted: number;
  readonly avgSquadFatigueAtKickoff: number | null;
}

export interface LiveAnalystResult {
  readonly recommendations: readonly Recommendation[];
  readonly cooldowns: Readonly<Record<string, number>>;
  readonly alertsEmitted: number;
}

export const ASSISTANT_DISMISS_EVENT_TYPE = 'assistant.advice_dismissed' as const;
