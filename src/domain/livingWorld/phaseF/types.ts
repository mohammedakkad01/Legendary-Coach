/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phase F bounded persistent slice (nested under LivingWorldState.phaseF).
 */

export const PHASE_F_SCHEMA_VERSION = 1 as const;

export type HistoryConfidence = 'full' | 'partial' | 'limited';

export interface ClubSeasonSummary {
  season: number;
  competitionId: string;
  leaguePosition?: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  confidence: HistoryConfidence;
  source: 'live' | 'backfill';
}

export interface ClubHistoryMilestone {
  id: string;
  kind: string;
  season: number;
  subjectIds: string[];
  factKeys: string[];
  confidence: HistoryConfidence;
  sourceEventId?: string;
}

export interface ClubHistoryRecords {
  biggestWinMargin?: number;
  biggestWinScoreline?: string;
  heaviestDefeatMargin?: number;
  heaviestDefeatScoreline?: string;
  topSeasonGoalsFor?: number;
}

export interface ClubHistoryHonour {
  id: string;
  kind: 'league_title' | 'cup' | 'other';
  season: number;
  labelKey: string;
  confidence: HistoryConfidence;
}

export interface ClubHistoryTransferEntry {
  id: string;
  playerId: string;
  direction: 'in' | 'out';
  season: number;
  feeKnown: boolean;
  feeAmount?: number;
  confidence: HistoryConfidence;
}

export interface ClubHistoryState {
  clubId: string;
  seasonSummaries: ClubSeasonSummary[];
  milestones: ClubHistoryMilestone[];
  records: ClubHistoryRecords;
  honours: ClubHistoryHonour[];
  transferHighlights: ClubHistoryTransferEntry[];
  aggregatedOlderSeasons?: {
    throughSeason: number;
    totalPlayed: number;
    totalWon: number;
    totalDrawn: number;
    totalLost: number;
  };
  backfillVersion?: number;
  backfillConfidence: HistoryConfidence;
}

export type LegendLifecycle = 'candidate' | 'inducted' | 'retained';

export interface LegendReason {
  code: string;
  weight: number;
  detail?: string;
}

export interface ClubLegendEntry {
  entityKind: 'player' | 'manager';
  entityId: string;
  lifecycle: LegendLifecycle;
  score: number;
  inductedSeason?: number;
  reasons: LegendReason[];
}

export type StoryArcPhase = 'started' | 'developing' | 'resolved' | 'abandoned';

export interface StoryArc {
  id: string;
  detectorKind: string;
  phase: StoryArcPhase;
  startedSeason: number;
  startedGameWeek: number;
  subjectIds: string[];
  triggerEventIds: string[];
  importance: number;
  lastUpdatedGameWeek: number;
}

export interface StoryCooldownState {
  lastGlobalGameWeek: number;
  lastByDetector: Record<string, number>;
  lastBySubject: Record<string, number>;
}

export type NewsTone = 'neutral' | 'positive' | 'negative' | 'dramatic' | 'analytical';

export interface NewsItemFacts {
  readonly [key: string]: string | number | boolean;
}

export interface NewsItem {
  id: string;
  type: string;
  subjectIds: string[];
  facts: NewsItemFacts;
  tone: NewsTone;
  importance: number;
  sourceEventId: string;
  createdAt: string;
  season: number;
}

export interface NewsThrottleState {
  dayBuckets: Record<string, number>;
}

export interface PressCooldownState {
  lastConferenceGameWeek: number;
  sessionsThisSeason: number;
}

export interface NarrativeCacheEntry {
  contextHash: string;
  headline?: string;
  body?: string;
  locale: 'en' | 'ar';
  cachedAt: string;
}

export interface LivingWorldPhaseFState {
  schemaVersion: typeof PHASE_F_SCHEMA_VERSION;
  clubHistory: ClubHistoryState;
  legends: ClubLegendEntry[];
  storyArcs: StoryArc[];
  storyCooldowns: StoryCooldownState;
  newsFeed: NewsItem[];
  newsThrottle: NewsThrottleState;
  pressCooldowns: PressCooldownState;
  narrativeCache: NarrativeCacheEntry[];
}

export function createEmptyPhaseFState(clubId: string): LivingWorldPhaseFState {
  return {
    schemaVersion: PHASE_F_SCHEMA_VERSION,
    clubHistory: {
      clubId,
      seasonSummaries: [],
      milestones: [],
      records: {},
      honours: [],
      transferHighlights: [],
      backfillConfidence: 'limited',
    },
    legends: [],
    storyArcs: [],
    storyCooldowns: { lastGlobalGameWeek: 0, lastByDetector: {}, lastBySubject: {} },
    newsFeed: [],
    newsThrottle: { dayBuckets: {} },
    pressCooldowns: { lastConferenceGameWeek: 0, sessionsThisSeason: 0 },
    narrativeCache: [],
  };
}
