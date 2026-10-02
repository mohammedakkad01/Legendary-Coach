/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Club, FootballTactics } from '../../types/game';
import type { GameSaveData } from '../../types/save';
import { ensureTacticalInstructions } from './migrateTacticsPhaseB';
import { defaultRoleForSlot } from './functionalRoles/roleCatalog';
import { getFormation } from '../squad/formations';
import type { SetPieceAssignment, SetPiecePlan, SetPiecePlans, SetPieceTask } from './setPieces/setPieceTypes';

function defaultSetPiecePlans(tactics: FootballTactics, lineup: readonly string[]): SetPiecePlans {
  const squadIds = new Set(lineup.filter(Boolean));
  const outfield = lineup.filter((id) => id && id !== lineup[0]);
  const pick = (idx: number): string | undefined => outfield[idx];

  const cornerAssignments: SetPieceAssignment[] = (
    [
      { playerId: pick(0) ?? tactics.cornerTakerId, task: 'near_post' as SetPieceTask },
      { playerId: pick(1) ?? pick(0) ?? '', task: 'far_post' as SetPieceTask },
      { playerId: pick(2) ?? pick(1) ?? '', task: 'block_defender' as SetPieceTask },
    ] as SetPieceAssignment[]
  ).filter((a) => a.playerId && squadIds.has(a.playerId));
  const cornerAttack: SetPiecePlan = {
    type: 'corner_attack',
    takerId: tactics.cornerTakerId,
    assignments: cornerAssignments,
  };

  const cornerDefence: SetPiecePlan = {
    type: 'corner_defence',
    assignments: outfield.slice(0, 4).map((id, i) => ({
      playerId: id,
      task: i < 2 ? ('marker' as const) : ('zonal' as const),
    })),
  };

  return {
    cornerAttack,
    cornerDefence,
    freeKickAttack: {
      type: 'free_kick_attack',
      takerId: tactics.freeKickTakerId,
      assignments: outfield.slice(0, 2).map((id) => ({ playerId: id, task: 'edge_of_box' as const })),
    },
  };
}

function defaultPlayerRoles(club: Club): FootballTactics['playerRoles'] {
  const formation = club.footballTactics.formation;
  const slots = getFormation(formation).slots;
  const roles: Array<{ playerId: string; roleId: ReturnType<typeof defaultRoleForSlot> }> = [];
  for (const slot of slots) {
    const playerId = club.footballLineup[slot.index];
    if (!playerId) continue;
    roles.push({ playerId, roleId: defaultRoleForSlot(slot.label) });
  }
  return roles;
}

export function migrateClubFootballTactics(club: Club): Club {
  let tactics = ensureTacticalInstructions(club.footballTactics);
  if (!tactics.setPiecePlans) {
    tactics = { ...tactics, setPiecePlans: defaultSetPiecePlans(tactics, club.footballLineup) };
  }
  if (!tactics.playerRoles || tactics.playerRoles.length === 0) {
    tactics = { ...tactics, playerRoles: defaultPlayerRoles({ ...club, footballTactics: tactics }) };
  }
  return { ...club, footballTactics: tactics };
}

export function ensureFootballSimulationV4(save: GameSaveData): GameSaveData {
  const club = migrateClubFootballTactics(save.club);
  const savedTacticalPlans = (save.savedTacticalPlans ?? []).map((plan) => ({
    ...plan,
    tactics: migrateClubFootballTactics({ ...club, footballTactics: plan.tactics }).footballTactics,
  }));
  return { ...save, club, savedTacticalPlans, saveVersion: 4 };
}
