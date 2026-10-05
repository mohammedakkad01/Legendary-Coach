/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Club, Fixture, LeagueStanding } from '../../../types/game';
import type { GameEvent } from '../../livingWorld/types';
import { runPreMatchAnalyst } from '../../assistant/preMatch/runPreMatchAnalyst';
import type { LivingWorldState } from '../../livingWorld/types';
import { buildMinimalPreMatchData } from './buildMinimalPreMatchData';

export interface DelegatedOppositionResult {
  events: GameEvent[];
  reasonCodes: string[];
  summaryCode: string;
  ok: boolean;
  findingsCount: number;
}

export function runDelegatedOppositionAnalysis(params: {
  userClub: Club;
  nextFixture: Fixture | null | undefined;
  opponentClub: Club | null | undefined;
  livingWorld?: LivingWorldState;
  leagueStandings?: readonly LeagueStanding[];
  analyticsDepartmentLevel: number;
  gameWeek: number;
  season: number;
  timestampIso: string;
  quality: number;
}): DelegatedOppositionResult {
  const reasonCodes: string[] = [];

  if (!params.nextFixture || !params.opponentClub) {
    reasonCodes.push('no_next_fixture');
    return {
      events: [],
      reasonCodes,
      summaryCode: 'delegation_opposition_degraded',
      ok: false,
      findingsCount: 0,
    };
  }

  const opponentId = params.nextFixture.opponentClubId;
  const oppScout = params.livingWorld?.opponentTacticalScouting?.[opponentId];
  const samples = oppScout?.samples ?? 0;
  const isScouted = samples >= 1;
  const scoutAccuracy = Math.round(60 + params.quality * 35);

  if (!isScouted && samples < 3) {
    reasonCodes.push('insufficient_scouting_samples');
  }

  const standing = params.leagueStandings?.find((s) => s.clubId === opponentId);

  const preMatch = buildMinimalPreMatchData({
    fixture: params.nextFixture,
    competition: params.userClub.divisionName ?? 'League',
    userClub: params.userClub,
    opponentClub: params.opponentClub,
    isScouted,
    scoutAccuracy,
  });

  const analysis = runPreMatchAnalyst({
    preMatch,
    analyticsDepartmentLevel: params.analyticsDepartmentLevel,
    opponentScouting: oppScout,
    opponentStanding: standing,
    assignedReferee: null,
  });

  const findingsCount =
    analysis.strengths.length +
    analysis.weaknesses.length +
    analysis.defensiveVulnerabilities.length;

  reasonCodes.push(`opponent_${opponentId}`, `findings_${findingsCount}`);

  const findingCodes = [
    ...analysis.strengths.map((f) => f.code),
    ...analysis.weaknesses.map((f) => f.code),
    ...analysis.defensiveVulnerabilities.map((f) => f.code),
  ].join(',');

  const event: GameEvent = {
    id: `evt_delegation_opposition_${params.gameWeek}_${opponentId}`,
    type: 'staff.report',
    timestamp: params.timestampIso,
    season: params.season,
    clubId: params.userClub.id,
    severity: 'low',
    context: {
      task: 'opposition_analysis',
      summaryCode: 'delegation_opposition_dossier',
      opponentClubId: opponentId,
      findingsCount,
      findingCodes,
      overallConfidence: analysis.overallConfidence,
    },
  };

  return {
    events: [event],
    reasonCodes,
    summaryCode: 'delegation_opposition_dossier',
    ok: findingsCount > 0 || isScouted,
    findingsCount,
  };
}
