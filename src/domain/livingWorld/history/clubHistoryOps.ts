/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LIVING_WORLD_TUNING } from '../config/livingWorldTuning';
import type {
  ClubHistoryHonour,
  ClubHistoryMilestone,
  ClubHistoryState,
  ClubSeasonSummary,
  HistoryConfidence,
} from '../phaseF/types';

const H = LIVING_WORLD_TUNING.history;

export function mergeSeasonSummary(
  history: ClubHistoryState,
  summary: ClubSeasonSummary,
): ClubHistoryState {
  const without = history.seasonSummaries.filter((s) => s.season !== summary.season);
  let seasonSummaries = [...without, summary].sort((a, b) => b.season - a.season);
  if (seasonSummaries.length > H.maxSeasonSummaries) {
    const sortedAsc = [...seasonSummaries].sort((a, b) => a.season - b.season);
    const overflow = sortedAsc.length - H.maxSeasonSummaries;
    const removed = sortedAsc.slice(0, overflow);
    seasonSummaries = sortedAsc.slice(overflow);
    const aggChunk = removed.reduce(
      (acc, s) => ({
        totalPlayed: acc.totalPlayed + s.played,
        totalWon: acc.totalWon + s.won,
        totalDrawn: acc.totalDrawn + s.drawn,
        totalLost: acc.totalLost + s.lost,
      }),
      { totalPlayed: 0, totalWon: 0, totalDrawn: 0, totalLost: 0 },
    );
    const prev = history.aggregatedOlderSeasons;
    return {
      ...history,
      seasonSummaries,
      aggregatedOlderSeasons: {
        throughSeason: removed[removed.length - 1]?.season ?? prev?.throughSeason ?? 0,
        totalPlayed: (prev?.totalPlayed ?? 0) + aggChunk.totalPlayed,
        totalWon: (prev?.totalWon ?? 0) + aggChunk.totalWon,
        totalDrawn: (prev?.totalDrawn ?? 0) + aggChunk.totalDrawn,
        totalLost: (prev?.totalLost ?? 0) + aggChunk.totalLost,
      },
    };
  }
  return { ...history, seasonSummaries };
}

export function appendMilestone(
  history: ClubHistoryState,
  milestone: ClubHistoryMilestone,
): ClubHistoryState {
  if (history.milestones.some((m) => m.id === milestone.id)) return history;
  const milestones = [...history.milestones, milestone].slice(-H.maxMilestones);
  return { ...history, milestones };
}

export function appendHonour(history: ClubHistoryState, honour: ClubHistoryHonour): ClubHistoryState {
  if (history.honours.some((h) => h.id === honour.id)) return history;
  return { ...history, honours: [...history.honours, honour].slice(-H.maxHonourEntries) };
}

export function updateRecordsFromMatch(
  history: ClubHistoryState,
  margin: number,
  scoreline: string,
  won: boolean,
): ClubHistoryState {
  const records = { ...history.records };
  if (won) {
    if (records.biggestWinMargin === undefined || margin > records.biggestWinMargin) {
      records.biggestWinMargin = margin;
      records.biggestWinScoreline = scoreline;
    }
  } else if (margin < 0) {
    const defeat = Math.abs(margin);
    if (records.heaviestDefeatMargin === undefined || defeat > records.heaviestDefeatMargin) {
      records.heaviestDefeatMargin = defeat;
      records.heaviestDefeatScoreline = scoreline;
    }
  }
  return { ...history, records };
}

export function emptyHistoryForClub(clubId: string, confidence: HistoryConfidence = 'limited'): ClubHistoryState {
  return {
    clubId,
    seasonSummaries: [],
    milestones: [],
    records: {},
    honours: [],
    transferHighlights: [],
    backfillConfidence: confidence,
  };
}
