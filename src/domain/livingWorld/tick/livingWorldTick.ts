/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Club, MatchRecord } from '../../../types/game';
import type { GameEvent, ReducerInput, StateChange } from '../types';
import { ingestGameEventBatch } from '../events/ingest';
import { applyStateChanges } from '../reducer';
import {
  buildSeasonEndLivingWorldUpdates,
  type SeasonEndInput,
} from '../history/seasonEnd';

export interface RunSeasonEndLivingWorldInput extends SeasonEndInput {
  players: ReducerInput['players'];
}

export interface RunSeasonEndLivingWorldResult {
  livingWorld: ReducerInput['livingWorld'];
  players: ReducerInput['players'];
  events: GameEvent[];
}

export function runSeasonEndLivingWorld(input: RunSeasonEndLivingWorldInput): RunSeasonEndLivingWorldResult {
  const { players, ...seasonEnd } = input;
  const built = buildSeasonEndLivingWorldUpdates(seasonEnd);
  let acc = applyStateChanges(
    { livingWorld: seasonEnd.livingWorld, players },
    built.changes,
  );
  acc = ingestGameEventBatch(acc, built.events, {
    clubId: seasonEnd.club.id,
    gameWeek: 999,
  });
  return { livingWorld: acc.livingWorld, players: acc.players, events: built.events };
}

export function recentUserResultsFromHistory(
  clubId: string,
  matchHistory: readonly MatchRecord[],
  window = 20,
): ('W' | 'D' | 'L')[] {
  const results: ('W' | 'D' | 'L')[] = [];
  for (const m of matchHistory.slice(0, window)) {
    if (m.homeClubId !== clubId && m.awayClubId !== clubId) continue;
    const home = m.homeClubId === clubId;
    const gf = home ? m.homeScore : m.awayScore;
    const ga = home ? m.awayScore : m.homeScore;
    if (gf > ga) results.push('W');
    else if (gf === ga) results.push('D');
    else results.push('L');
  }
  return results.reverse();
}

export function buildMatchCompletedEvent(
  record: MatchRecord,
  club: Club,
  timestampIso: string,
  season: number,
): GameEvent {
  const home = record.homeClubId === club.id;
  const gf = home ? record.homeScore : record.awayScore;
  const ga = home ? record.awayScore : record.homeScore;
  const won = gf > ga;
  const drew = gf === ga;
  return {
    id: `evt_match_user_${record.id}`,
    type: 'match.user_completed',
    timestamp: timestampIso,
    season,
    clubId: club.id,
    matchId: record.id,
    severity: won ? 'medium' : drew ? 'low' : 'high',
    context: {
      won,
      drew,
      goalMargin: gf - ga,
      homeScore: gf,
      awayScore: ga,
    },
  };
}

export function applyWeeklyLivingWorldPostMatchIngest(input: {
  reducer: ReducerInput;
  matchEvent: GameEvent;
  gameWeek: number;
  recentUserResults: readonly ('W' | 'D' | 'L')[];
  clubId: string;
}): ReducerInput {
  const out = ingestGameEventBatch(input.reducer, [input.matchEvent], {
    gameWeek: input.gameWeek,
    recentUserResults: input.recentUserResults,
    clubId: input.clubId,
  });
  return out;
}

export function weeklyLivingWorldTickIdempotent(
  livingWorld: ReducerInput['livingWorld'],
  lastProcessedGameWeek: number,
  gameWeek: number,
): StateChange[] {
  if (lastProcessedGameWeek >= gameWeek) return [];
  return [];
}
