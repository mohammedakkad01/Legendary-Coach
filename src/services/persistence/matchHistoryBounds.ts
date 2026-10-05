/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Bounds persisted matchHistory while preserving data required by gameplay systems.
 *
 * Consumers (max window):
 * - recentUserResultsFromHistory: 20 recent records (story ingest)
 * - Dashboard / press UI: 3 recent results
 * - resolveEntity: match id lookup for news (older ids may fall back to labels)
 *
 * Long-term aggregates live in livingWorld.phaseF.clubHistory (season summaries, records)
 * and tournamentStats. Dropped full records are folded into clubHistory before trim.
 */

import type { GameSaveData } from '../../types/save';
import type { MatchRecord } from '../../types/game';
import { recentUserResultsFromHistory } from '../../domain/livingWorld/tick/livingWorldTick';
import { ensurePhaseFState } from '../../domain/livingWorld/phaseF/ensurePhaseF';
import { updateRecordsFromMatch } from '../../domain/livingWorld/history/clubHistoryOps';

/** Must be >= recentUserResultsFromHistory default window (20). */
export const MATCH_HISTORY_STORY_WINDOW = 20;

/** Standard league season length + small cup/playoff buffer (Premier League = 38). */
export const MATCH_HISTORY_SEASON_CAPACITY = 42;

/** Retained full MatchRecord rows (most-recent-first in store). */
export const MATCH_HISTORY_MAX_RECENT_RECORDS = Math.max(
  MATCH_HISTORY_STORY_WINDOW * 2,
  MATCH_HISTORY_SEASON_CAPACITY,
);

function foldMatchIntoClubHistory(
  history: import('../../domain/livingWorld/phaseF/types').ClubHistoryState,
  clubId: string,
  m: MatchRecord,
): import('../../domain/livingWorld/phaseF/types').ClubHistoryState {
  if (m.homeClubId !== clubId && m.awayClubId !== clubId) return history;
  const home = m.homeClubId === clubId;
  const gf = home ? m.homeScore : m.awayScore;
  const ga = home ? m.awayScore : m.homeScore;
  const margin = gf - ga;
  const scoreline = `${gf}-${ga}`;
  return updateRecordsFromMatch(history, margin, scoreline, margin > 0);
}

/**
 * Trims oldest match rows and merges evicted user-club results into phaseF clubHistory.
 */
export function boundMatchHistoryForSave(save: GameSaveData): GameSaveData {
  const records = save.matchHistory ?? [];
  if (records.length <= MATCH_HISTORY_MAX_RECENT_RECORDS) {
    return save;
  }

  const clubId = save.club.id;
  const keep = records.slice(0, MATCH_HISTORY_MAX_RECENT_RECORDS);
  const drop = records.slice(MATCH_HISTORY_MAX_RECENT_RECORDS);

  if (!save.livingWorld) {
    return { ...save, matchHistory: keep };
  }

  const phaseF = ensurePhaseFState(save.livingWorld, clubId);
  let clubHistory = phaseF.clubHistory;
  for (const m of drop) {
    clubHistory = foldMatchIntoClubHistory(clubHistory, clubId, m);
  }

  return {
    ...save,
    matchHistory: keep,
    livingWorld: {
      ...save.livingWorld,
      phaseF: {
        ...phaseF,
        clubHistory,
      },
    },
  };
}

/** Test helper: verify story window still computable after bound. */
export function storyResultsPreservedAfterBound(save: GameSaveData, clubId: string): boolean {
  const full = save.matchHistory ?? [];
  const bounded = boundMatchHistoryForSave(save).matchHistory ?? [];
  const fromFull = recentUserResultsFromHistory(clubId, full, MATCH_HISTORY_STORY_WINDOW);
  const fromBounded = recentUserResultsFromHistory(clubId, bounded, MATCH_HISTORY_STORY_WINDOW);
  return JSON.stringify(fromFull) === JSON.stringify(fromBounded);
}
