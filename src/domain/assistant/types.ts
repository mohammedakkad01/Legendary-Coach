/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phase G — AI Assistant & Tactical Analyst domain types.
 * Pure TypeScript domain definitions (no React / DOM dependencies).
 */

import type { FootballTactics, MatchMentality, PressingStyle, TeamTempo, PassingStyle, DefensiveWidth } from '../../types/game';
import type { BestTacticsRecommendation } from '../tactics/bestTactics/types';
import type { AnalyticsConclusion } from '../match/analyticsConclusions';

export type AssistantSource =
  | 'pre_match'
  | 'live_match'
  | 'post_match'
  | 'tactics'
  | 'scouting';

export type RecommendationSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface TacticalChangesDiff {
  formation?: string;
  mentality?: MatchMentality;
  pressing?: PressingStyle;
  tempo?: TeamTempo;
  passing?: PassingStyle;
  width?: DefensiveWidth;
  lineupSwaps?: Array<{
    playerOutId: string;
    playerOutName: string;
    playerInId: string;
    playerInName: string;
    reasonEn: string;
    reasonAr: string;
  }>;
  bestTacticsRec?: BestTacticsRecommendation;
}

export interface AssistantRecommendation {
  id: string;
  source: AssistantSource;
  severity: RecommendationSeverity;
  /** 0-100 score reflecting confidence derived from data quality, sample size, and scouting accuracy. */
  confidence: number;
  titleEn: string;
  titleAr: string;
  summaryEn: string;
  summaryAr: string;
  reasonCodes: string[];
  reasonDetailsEn?: string[];
  reasonDetailsAr?: string[];
  suggestedChanges?: TacticalChangesDiff;
  expiryMinute?: number;
  expiryMatchday?: number;
  status: 'pending' | 'applied' | 'ignored';
  createdAt: string;
}

export interface PreMatchAnalysis {
  opponentClubId: string;
  opponentFormation: string;
  strengths: Array<{ labelEn: string; labelAr: string; confidence: number }>;
  weaknesses: Array<{ labelEn: string; labelAr: string; confidence: number }>;
  mainThreat: {
    playerId?: string;
    playerName: string;
    role: string;
    threatReasonEn: string;
    threatReasonAr: string;
  };
  defensiveVulnerabilities: Array<{
    zone: 'left' | 'center' | 'right';
    detailEn: string;
    detailAr: string;
  }>;
  setPieceDanger: {
    riskLevel: 'low' | 'medium' | 'high';
    aerialPower: number;
    noteEn: string;
    noteAr: string;
  };
  keyPlayers: Array<{
    name: string;
    position: string;
    ratingEst: number;
    formTrend: 'hot' | 'normal' | 'cold';
  }>;
  refereeProfile?: {
    name: string;
    strictness: string;
    cardTendency: string;
    penaltyTendency: string;
    adviceEn: string;
    adviceAr: string;
  };
  overallConfidence: number;
  dataQualityNoticeEn: string;
  dataQualityNoticeAr: string;
  recommendations: AssistantRecommendation[];
}

export interface LiveMatchAnalysis {
  minute: number;
  zonesSummary: {
    leftAttacks: number;
    centerAttacks: number;
    rightAttacks: number;
    dominantThreatZone: 'left' | 'center' | 'right' | null;
  };
  midfieldControl: {
    duelWinRate: number;
    possessionPct: number;
    ppda: number;
    verdictEn: string;
    verdictAr: string;
  };
  pressingEffectiveness: 'dominant' | 'adequate' | 'failing';
  fatigueWarnings: Array<{
    playerId: string;
    playerName: string;
    stamina: number;
    recommendation: 'sub_off' | 'rest_in_possession';
  }>;
  opponentTacticalShift?: {
    descriptionEn: string;
    descriptionAr: string;
    detectedAtMinute: number;
  };
  activeAlerts: AssistantRecommendation[];
}

export interface PostMatchAnalysis {
  matchRecordId: string;
  summaryEn: string;
  summaryAr: string;
  keyConclusions: AnalyticsConclusion[];
  actionableTakeaways: AssistantRecommendation[];
}

export interface ScoutingSummary {
  playerId: string;
  confidencePct: number;
  ratingBand: string;
  potentialBand: string;
  estimatedValueFormatted: string;
  strengthsEn: string[];
  strengthsAr: string[];
  risksEn: string[];
  risksAr: string[];
  tacticalFitEn: string;
  tacticalFitAr: string;
  recommendation: AssistantRecommendation;
}

export interface AssistantExplanation {
  recommendationId: string;
  explanation: string;
  keyPoints: string[];
  isAiEnhanced: boolean;
  cached: boolean;
}

export interface AssistantState {
  ignoredRecommendationIds: string[];
  appliedRecommendationIds: string[];
  liveTriggerCooldowns: Record<string, number>;
  activeRecommendations: AssistantRecommendation[];
  explanationCache: Record<string, {
    explanation: string;
    keyPoints: string[];
    timestamp: string;
  }>;
}

export const ASSISTANT_SCHEMA_VERSION = 1 as const;
