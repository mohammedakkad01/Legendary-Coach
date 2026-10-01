/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * VAR review model for the user's own matches (Phase 6).
 * Pure data. The match engine is the only writer; the UI only reads reviews.
 */

import type { MatchEvent, MatchStats } from '../../types/game';

export type VarReviewType = 'goal' | 'penalty' | 'red_card';

/** What the referee called, and what VAR finally ruled. */
export type VarDecision = 'goal' | 'no_goal' | 'penalty' | 'no_penalty' | 'red' | 'no_red';

export interface VARReview {
  readonly reviewId: string;
  readonly matchId: string;
  readonly eventId: string;
  readonly reviewType: VarReviewType;
  readonly initialDecision: VarDecision;
  readonly finalDecision: VarDecision;
  /** 0–1. Derived from the referee's varTendency, not from Date.now(). */
  readonly confidence: number;
  /** Match minute. Same clock as MatchEvent.minute — never wall-clock time. */
  readonly timestamp: number;
  readonly explanationAr: string;
  readonly explanationEn: string;
  /** Set only when VAR awards a penalty the referee had withheld. Drawn on the VAR stream. */
  readonly awardedKickScored?: boolean;
  readonly awardedPlayerId?: string;
  readonly awardedPlayerName?: string;
  readonly awardedPlayerNameEn?: string;
}

/** Snapshot the pure reducer reads and returns. The engine adopts it or keeps the previous one. */
export interface VarMatchState {
  readonly matchId: string;
  readonly minute: number;
  readonly homeScore: number;
  readonly awayScore: number;
  readonly events: readonly MatchEvent[];
  readonly stats: MatchStats;
  readonly varReviews: readonly VARReview[];
}

export interface VarPlayerRef {
  readonly id: string;
  readonly name: string;
  readonly nameEn: string;
}
