/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Club, LeagueStanding, Player } from '../../../types/game';
import type { GameEvent, StateChange } from '../types';
import type { ClubSeasonSummary } from '../phaseF/types';
import { ensurePhaseFState } from '../phaseF/ensurePhaseF';
import type { LivingWorldState } from '../types';
import { appendHonour, appendMilestone, mergeSeasonSummary } from './clubHistoryOps';
import { computePlayerLegendScore, evaluateLegendLifecycle } from '../legends/scoring';
import { LIVING_WORLD_TUNING } from '../config/livingWorldTuning';

export interface SeasonEndInput {
  livingWorld: LivingWorldState;
  club: Club;
  leagueStandings: LeagueStanding[];
  finalRank: number;
  timestampIso: string;
}

export interface SeasonEndResult {
  changes: StateChange[];
  events: GameEvent[];
}

export function buildSeasonEndLivingWorldUpdates(input: SeasonEndInput): SeasonEndResult {
  const { livingWorld, club, finalRank, timestampIso } = input;
  const season = livingWorld.currentSeason;
  const phaseF = ensurePhaseFState(livingWorld, club.id);
  let history = phaseF.clubHistory;

  const standing = input.leagueStandings.find((s) => s.clubId === club.id);
  const summary: ClubSeasonSummary = {
    season,
    competitionId: club.divisionId,
    leaguePosition: finalRank,
    played: standing?.played ?? 0,
    won: standing?.won ?? 0,
    drawn: standing?.drawn ?? 0,
    lost: standing?.lost ?? 0,
    goalsFor: standing?.goalsFor ?? 0,
    goalsAgainst: standing?.goalsAgainst ?? 0,
    confidence: standing ? 'full' : 'partial',
    source: 'live',
  };
  history = mergeSeasonSummary(history, summary);

  const changes: StateChange[] = [];
  const events: GameEvent[] = [];

  const titleEventId = `evt_season_end_${club.id}_${season}`;
  if (finalRank === 1) {
    history = appendHonour(history, {
      id: `honour_title_${season}`,
      kind: 'league_title',
      season,
      labelKey: 'league_title',
      confidence: 'full',
    });
    history = appendMilestone(history, {
      id: `ms_title_${season}`,
      kind: 'league_title',
      season,
      subjectIds: [club.id],
      factKeys: ['final_rank_1'],
      confidence: 'full',
      sourceEventId: titleEventId,
    });
    events.push({
      id: `${titleEventId}_rep_title_won`,
      type: 'manager.reputation.title_won',
      timestamp: timestampIso,
      season,
      clubId: club.id,
      severity: 'high',
      context: { catalogKey: 'title_won', delta: LIVING_WORLD_TUNING.reputation.deltas.title_won },
    });
  } else if (finalRank <= 4) {
    events.push({
      id: `${titleEventId}_rep_top_four`,
      type: 'manager.reputation.top_four',
      timestamp: timestampIso,
      season,
      clubId: club.id,
      severity: 'medium',
      context: { catalogKey: 'top_four', delta: LIVING_WORLD_TUNING.reputation.deltas.top_four },
    });
  }

  let legends = phaseF.legends;
  const captainId = club.footballTactics.captainId;
  const trophies = club.trophies ?? 0;
  for (const player of club.footballSquad) {
    const existing = legends.find((l) => l.entityKind === 'player' && l.entityId === player.id);
    const scored = computePlayerLegendScore({
      player,
      history,
      trophiesAtClub: trophies,
      isCaptain: player.id === captainId,
      academyGraduate: player.age <= 21,
    });
    const entry = evaluateLegendLifecycle(
      existing,
      scored.score,
      LIVING_WORLD_TUNING.legend.thresholdPlayer,
      season,
      'player',
      player.id,
      scored.reasons,
    );
    if (existing) {
      legends = legends.map((l) => (l.entityId === player.id && l.entityKind === 'player' ? entry : l));
    } else if (entry.lifecycle !== 'candidate' || scored.score > LIVING_WORLD_TUNING.legend.thresholdPlayer - 8) {
      legends = [...legends, entry].slice(-40);
    }
  }

  changes.push({
    kind: 'patchPhaseF',
    clubId: club.id,
    patch: { clubHistory: history, legends },
  });
  changes.push({ kind: 'setLivingWorldSeason', season: season + 1 });

  return { changes, events };
}

export function evaluateLegendsForSquad(
  livingWorld: LivingWorldState,
  club: Club,
  players: Player[],
): StateChange[] {
  const phaseF = ensurePhaseFState(livingWorld, club.id);
  let legends = phaseF.legends;
  const season = livingWorld.currentSeason;
  const captainId = club.footballTactics.captainId;
  for (const player of players) {
    const existing = legends.find((l) => l.entityKind === 'player' && l.entityId === player.id);
    const scored = computePlayerLegendScore({
      player,
      history: phaseF.clubHistory,
      trophiesAtClub: club.trophies ?? 0,
      isCaptain: player.id === captainId,
      academyGraduate: player.age <= 21,
    });
    const entry = evaluateLegendLifecycle(
      existing,
      scored.score,
      LIVING_WORLD_TUNING.legend.thresholdPlayer,
      season,
      'player',
      player.id,
      scored.reasons,
    );
    if (existing) {
      legends = legends.map((l) => (l.entityId === player.id && l.entityKind === 'player' ? entry : l));
    }
  }
  return [{ kind: 'patchPhaseF', clubId: club.id, patch: { legends } }];
}
