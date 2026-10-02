/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Club, Player } from '../../types/game';
import { buildSlotAssignments, calcAttackPower, calcDefensePower } from '../../engine/matchPrediction';
import type { TacticalState } from '../tactics/tacticalTypes';
import type { TacticalInstructions } from '../tactics/instructionTypes';
import { defaultRoleForSlot, type FunctionalRoleId } from '../tactics/functionalRoles/roleCatalog';
import { computeRoleCompatibility, roleCompatibilityMultiplier } from '../tactics/functionalRoles/roleCompatibility';
import { modifiersFromInstructions, phasePowerMultiplier, pickPhaseForMinute } from './simWeights';
import type { TacticalPhase } from '../tactics/tacticalPhases';

export interface PlayerRoleAssignment {
  readonly playerId: string;
  readonly roleId: FunctionalRoleId;
}

export interface TeamSimProfile {
  readonly attack: number;
  readonly defense: number;
  readonly lineup: Player[];
}

export function averageRoleCompatibility(
  club: Club,
  roleAssignments: readonly PlayerRoleAssignment[] | undefined,
): number {
  const assignments = buildSlotAssignments(club);
  if (assignments.length === 0) return 1;
  const roleByPlayer = new Map(roleAssignments?.map((r) => [r.playerId, r.roleId] as const) ?? []);
  let sum = 0;
  let n = 0;
  for (const { player, assignedPosition } of assignments) {
    const roleId = roleByPlayer.get(player.id) ?? defaultRoleForSlot(assignedPosition);
    const compat = computeRoleCompatibility(player, roleId, assignedPosition);
    sum += roleCompatibilityMultiplier(compat);
    n++;
  }
  return n > 0 ? sum / n : 1;
}

export function buildTeamSimProfile(
  club: Club,
  tactics: TacticalState,
  instructions: TacticalInstructions,
  roleAssignments: readonly PlayerRoleAssignment[] | undefined,
  minute: number,
  homePossession: number,
  isHome: boolean,
): TeamSimProfile {
  const phase: TacticalPhase = pickPhaseForMinute(minute, isHome ? homePossession : 100 - homePossession);
  const phaseMul = phasePowerMultiplier(phase);
  const instr = modifiersFromInstructions(instructions);
  const roleMul = averageRoleCompatibility(club, roleAssignments);

  const assignments = buildSlotAssignments(club);
  const baseAtk = calcAttackPower(assignments);
  const baseDef = calcDefensePower(assignments);

  const attack = Math.round(
    (baseAtk + tactics.attackingIntensity * 0.02 + instr.attackBonus) * phaseMul.attack * roleMul,
  );
  const defense = Math.round((baseDef + instr.defenseBonus) * phaseMul.defense * (2 - roleMul * 0.15));

  const lineup = assignments.map((a) => a.player);
  return { attack, defense, lineup };
}
