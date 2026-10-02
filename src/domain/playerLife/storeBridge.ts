/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Thin helpers for Zustand store integration (still pure).
 */

import type { Club } from '../../types/game';
import type { LivingWorldState } from '../livingWorld/types';
import type { PlayerMatchDelta } from '../../engine/matchdaySimulator';
import { SeededRandom } from '../../engine/prng';
import { hashStringToSeed } from '../shared/seed';
import { runPostMatchPlayerLife, runWeeklyPlayerLife } from './integration';
import { summariesFromUserDeltas } from './postMatchSummaries';
import type { PostMatchTickInput } from './types';

export function applyUserPostMatchPlayerLife(params: {
  club: Club;
  livingWorld: LivingWorldState;
  saveId: string;
  matchday: number;
  won: boolean;
  drawn: boolean;
  goalsFor: number;
  goalsAgainst: number;
  deltas: PlayerMatchDelta[];
  fatigueProtectionMult: number;
  recentMatchesIn7Days: number;
}): { club: Club; livingWorld: LivingWorldState } {
  const { club, livingWorld } = params;
  const summaries = summariesFromUserDeltas(
    params.deltas,
    club.id,
    club.footballLineup,
  );
  const tick: PostMatchTickInput = {
    season: livingWorld.currentSeason,
    matchday: params.matchday,
    won: params.won,
    drawn: params.drawn,
    goalsFor: params.goalsFor,
    goalsAgainst: params.goalsAgainst,
    playerSummaries: summaries,
    medicalCenterLevel: club.facilities.medicalCenterLevel,
    trainingGroundLevel: club.facilities.trainingGroundLevel,
    recentMatchesIn7Days: params.recentMatchesIn7Days,
    fatigueProtectionMult: params.fatigueProtectionMult,
  };

  const rng = new SeededRandom(hashStringToSeed(`${params.saveId}_pm_${params.matchday}`));
  const result = runPostMatchPlayerLife(
    { livingWorld, players: club.footballSquad },
    tick,
    club.footballLineup,
    club.footballBench,
    rng,
  );

  return {
    club: { ...club, footballSquad: result.players },
    livingWorld: result.livingWorld,
  };
}

export function applyUserWeeklyPlayerLife(params: {
  club: Club;
  livingWorld: LivingWorldState;
  saveId: string;
  matchday: number;
}): { club: Club; livingWorld: LivingWorldState } {
  const rng = new SeededRandom(hashStringToSeed(`${params.saveId}_wk_${params.matchday}`));
  const result = runWeeklyPlayerLife(
    { livingWorld: params.livingWorld, players: params.club.footballSquad },
    {
      season: params.livingWorld.currentSeason,
      matchday: params.matchday,
      medicalCenterLevel: params.club.facilities.medicalCenterLevel,
      trainingGroundLevel: params.club.facilities.trainingGroundLevel,
      captainId: params.club.footballTactics.captainId,
      lineupIds: params.club.footballLineup,
      benchIds: params.club.footballBench,
    },
    rng,
  );
  return {
    club: { ...params.club, footballSquad: result.players },
    livingWorld: result.livingWorld,
  };
}
