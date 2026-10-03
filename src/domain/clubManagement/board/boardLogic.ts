/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { clamp } from '../../shared/math';
import { BOARD_TUNING } from '../config/clubManagementTuning';
import type { BoardConsequenceLevel, BoardObjective, BoardSlice, ClubManagementChange } from '../types';
import type { GameEvent } from '../../livingWorld/types';
import type { ManagerCareerState } from '../../livingWorld/types';

export function createDefaultBoard(trust: number): BoardSlice {
  return {
    trust: clamp(trust, 0, 100),
    patience: BOARD_TUNING.initialPatience,
    expectations: 55,
    vision: 'growth',
    objectives: [],
    consequenceLevel: 'none',
    lastMessageWeek: 0,
  };
}

export function generateSeasonObjectives(clubReputation: number, squadSize: number): BoardObjective[] {
  const targetPos = clubReputation > 5000 ? 4 : clubReputation > 2000 ? 8 : 12;
  return [
    {
      id: 'obj_league',
      kind: 'league_position' as const,
      targetLabel: `Finish top ${targetPos}`,
      progressPct: 0,
      met: false,
    },
    {
      id: 'obj_youth',
      kind: 'youth_development' as const,
      targetLabel: 'Promote or intake academy talent',
      progressPct: 0,
      met: false,
    },
    {
      id: 'obj_finance',
      kind: 'financial_stability' as const,
      targetLabel: 'Keep wage bill within budget',
      progressPct: 50,
      met: false,
    },
  ].slice(0, squadSize > 22 ? 3 : 2);
}

export function applyResultToBoardTrust(
  board: BoardSlice,
  won: boolean,
  drawn: boolean,
): BoardSlice {
  let delta = BOARD_TUNING.trustFromDraw;
  if (won) delta = BOARD_TUNING.trustFromWin;
  else if (!drawn) delta = BOARD_TUNING.trustFromLoss;
  return {
    ...board,
    trust: clamp(board.trust + delta, 0, 100),
  };
}

export function evaluateBoardConsequenceLadder(
  board: BoardSlice,
  gameWeek: number,
  season: number,
  clubId: string,
): { board: BoardSlice; events: GameEvent[]; changes: ClubManagementChange[] } {
  const events: GameEvent[] = [];
  const changes: ClubManagementChange[] = [];
  let next = { ...board };
  let level: BoardConsequenceLevel = 'none';

  if (next.trust <= BOARD_TUNING.dismissalTrustThreshold) {
    level = 'dismissed';
  } else if (next.trust <= BOARD_TUNING.ultimatumTrustThreshold) {
    level = 'ultimatum';
  } else if (next.trust <= BOARD_TUNING.warningTrustThreshold) {
    level = next.consequenceLevel === 'transfer_restricted' ? 'transfer_restricted' : 'warning';
  }

  const cooldownOk = gameWeek - next.lastMessageWeek >= BOARD_TUNING.messageCooldownWeeks;

  if (level === 'warning' && cooldownOk && next.consequenceLevel !== 'warning') {
    events.push(boardEvent('board.warning', gameWeek, season, clubId, 'medium', { level: 'warning' }));
    next = { ...next, consequenceLevel: 'warning', lastMessageWeek: gameWeek };
  }

  if (
    level === 'ultimatum' &&
    cooldownOk &&
    next.consequenceLevel !== 'ultimatum' &&
    next.consequenceLevel !== 'transfer_restricted'
  ) {
    const until = gameWeek + BOARD_TUNING.transferRestrictionWeeks;
    events.push(boardEvent('board.ultimatum', gameWeek, season, clubId, 'high', { restrictedUntilWeek: until }));
    next = {
      ...next,
      consequenceLevel: 'transfer_restricted',
      transferRestrictedUntilWeek: until,
      lastMessageWeek: gameWeek,
    };
    changes.push({
      kind: 'patchFinance',
      patch: { transferRestrictedUntilWeek: until },
    });
  }

  if (level === 'dismissed' && next.consequenceLevel !== 'dismissed') {
    events.push(boardEvent('board.dismissed', gameWeek, season, clubId, 'critical', {}));
    next = { ...next, consequenceLevel: 'dismissed', lastMessageWeek: gameWeek };
  }

  changes.push({ kind: 'patchBoard', patch: next });
  return { board: next, events, changes };
}

function boardEvent(
  type: string,
  gameWeek: number,
  season: number,
  clubId: string,
  severity: GameEvent['severity'],
  context: Record<string, string | number | boolean>,
): GameEvent {
  return {
    id: `evt_${type}_${gameWeek}_${season}`,
    type,
    timestamp: new Date().toISOString(),
    season,
    clubId,
    severity,
    context: { gameWeek, ...context },
  };
}

export function applyDismissalToManagerCareer(
  career: ManagerCareerState,
  season: number,
  clubId: string,
): ManagerCareerState {
  return {
    ...career,
    employmentStatus: 'dismissed',
    dismissedFromClubId: clubId,
    dismissedAtSeason: season,
  };
}

export function updateObjectivesFromStandings(
  objectives: BoardObjective[],
  leaguePosition: number,
  targetTop: number,
): BoardObjective[] {
  return objectives.map((o) => {
    if (o.kind !== 'league_position') return o;
    const progressPct = clamp(Math.round((1 - (leaguePosition - 1) / Math.max(1, targetTop)) * 100), 0, 100);
    return { ...o, progressPct, met: leaguePosition <= targetTop };
  });
}
