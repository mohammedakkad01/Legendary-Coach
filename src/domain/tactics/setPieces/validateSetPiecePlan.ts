/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Club } from '../../../types/game';
import type { SetPiecePlan, SetPieceType } from './setPieceTypes';
import { SET_PIECE_ATTACK_TASKS, SET_PIECE_DEFENCE_TASKS } from './setPieceTypes';

export type SetPieceValidationError =
  | { readonly code: 'UNKNOWN_PLAYER'; readonly playerId: string }
  | { readonly code: 'DUPLICATE_ASSIGNMENT'; readonly playerId: string }
  | { readonly code: 'INVALID_TASK'; readonly task: string }
  | { readonly code: 'TAKER_NOT_IN_SQUAD'; readonly playerId: string }
  | { readonly code: 'GK_IN_ATTACK_TASK'; readonly playerId: string };

const allowedTasks = (type: SetPieceType): readonly string[] =>
  type.includes('defence') ? SET_PIECE_DEFENCE_TASKS : SET_PIECE_ATTACK_TASKS;

export function validateSetPiecePlan(club: Club, plan: SetPiecePlan): readonly SetPieceValidationError[] {
  const errors: SetPieceValidationError[] = [];
  const squadIds = new Set(club.footballSquad.map((p) => p.id));
  const gkIds = new Set(club.footballSquad.filter((p) => p.position === 'GK').map((p) => p.id));
  const seen = new Set<string>();
  const tasks = allowedTasks(plan.type);

  if (plan.takerId && !squadIds.has(plan.takerId)) {
    errors.push({ code: 'TAKER_NOT_IN_SQUAD', playerId: plan.takerId });
  }

  for (const a of plan.assignments) {
    if (!squadIds.has(a.playerId)) errors.push({ code: 'UNKNOWN_PLAYER', playerId: a.playerId });
    if (seen.has(a.playerId)) errors.push({ code: 'DUPLICATE_ASSIGNMENT', playerId: a.playerId });
    seen.add(a.playerId);
    if (!tasks.includes(a.task)) errors.push({ code: 'INVALID_TASK', task: a.task });
    if (!plan.type.includes('defence') && gkIds.has(a.playerId)) {
      errors.push({ code: 'GK_IN_ATTACK_TASK', playerId: a.playerId });
    }
  }
  return errors;
}
