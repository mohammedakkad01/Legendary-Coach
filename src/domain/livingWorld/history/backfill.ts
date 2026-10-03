/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Idempotent history backfill from existing save facts only.
 */

import type { GameSaveData } from '../../../types/save';
import type { MatchRecord } from '../../../types/game';
import { LIVING_WORLD_TUNING } from '../config/livingWorldTuning';
import type { ClubHistoryState, ClubSeasonSummary, LivingWorldPhaseFState } from '../phaseF/types';
import { createEmptyPhaseFState } from '../phaseF/types';
import {
  appendHonour,
  emptyHistoryForClub,
  mergeSeasonSummary,
  updateRecordsFromMatch,
} from './clubHistoryOps';
import { ensurePhaseFState } from '../phaseF/ensurePhaseF';

function userMatchesForClub(save: GameSaveData, clubId: string): MatchRecord[] {
  return (save.matchHistory ?? []).filter(
    (m) => m.homeClubId === clubId || m.awayClubId === clubId,
  );
}

function summarizeFromMatches(
  clubId: string,
  season: number,
  matches: MatchRecord[],
): ClubSeasonSummary | null {
  if (matches.length === 0) return null;
  let won = 0;
  let drawn = 0;
  let lost = 0;
  let goalsFor = 0;
  let goalsAgainst = 0;
  for (const m of matches) {
    const home = m.homeClubId === clubId;
    const gf = home ? m.homeScore : m.awayScore;
    const ga = home ? m.awayScore : m.homeScore;
    goalsFor += gf;
    goalsAgainst += ga;
    if (gf > ga) won += 1;
    else if (gf === ga) drawn += 1;
    else lost += 1;
  }
  return {
    season,
    competitionId: matches[0]?.competition ?? 'league',
    played: matches.length,
    won,
    drawn,
    lost,
    goalsFor,
    goalsAgainst,
    confidence: 'partial',
    source: 'backfill',
  };
}

export function backfillClubHistoryFromSave(save: GameSaveData): LivingWorldPhaseFState {
  const clubId = save.club.id;
  const phaseF = ensurePhaseFState(save.livingWorld, clubId);
  if (phaseF.clubHistory.backfillVersion === LIVING_WORLD_TUNING.history.backfillVersion) {
    return phaseF;
  }

  let history: ClubHistoryState = emptyHistoryForClub(clubId, 'partial');
  const season = save.livingWorld?.currentSeason ?? 1;
  const userMatches = userMatchesForClub(save, clubId);

  const summary = summarizeFromMatches(clubId, season, userMatches);
  if (summary) {
    history = mergeSeasonSummary(history, summary);
  }

  for (const m of userMatches) {
    const home = m.homeClubId === clubId;
    const gf = home ? m.homeScore : m.awayScore;
    const ga = home ? m.awayScore : m.homeScore;
    const margin = gf - ga;
    const scoreline = `${gf}-${ga}`;
    history = updateRecordsFromMatch(history, margin, scoreline, margin > 0);
  }

  const trophies = save.club.trophies ?? 0;
  if (trophies > 0) {
    for (let i = 0; i < trophies; i += 1) {
      history = appendHonour(history, {
        id: `backfill_title_${i}`,
        kind: 'league_title',
        season: Math.max(1, season - i),
        labelKey: 'league_title_inferred',
        confidence: 'limited',
      });
    }
  }

  const standings = save.leagueStandings ?? [];
  const sorted = [...standings].sort(
    (a, b) => b.points - a.points || b.goalDifference - a.goalDifference,
  );
  const rankIdx = sorted.findIndex((s) => s.clubId === clubId);
  if (summary && rankIdx >= 0) {
    summary.leaguePosition = rankIdx + 1;
    history = mergeSeasonSummary(history, summary);
  }

  history = {
    ...history,
    backfillVersion: LIVING_WORLD_TUNING.history.backfillVersion,
    backfillConfidence: userMatches.length > 0 ? 'partial' : 'limited',
  };

  return {
    ...phaseF,
    clubHistory: history,
  };
}

export function applyPhaseFBackfillToSave(save: GameSaveData): GameSaveData {
  if (!save.livingWorld) return save;
  const phaseF = backfillClubHistoryFromSave(save);
  return {
    ...save,
    livingWorld: {
      ...save.livingWorld,
      phaseF,
    },
  };
}

export function createPhaseFWithBackfill(save: GameSaveData): LivingWorldPhaseFState {
  return backfillClubHistoryFromSave(save);
}
