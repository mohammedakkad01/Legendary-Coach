/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type SetPieceType =
  | 'corner_attack'
  | 'corner_defence'
  | 'free_kick_attack'
  | 'free_kick_defence'
  | 'throw_in_attack';

export type SetPieceTask =
  | 'near_post'
  | 'far_post'
  | 'block_defender'
  | 'edge_of_box'
  | 'rebound'
  | 'marker'
  | 'zonal';

export interface SetPieceAssignment {
  readonly playerId: string;
  readonly task: SetPieceTask;
}

export interface SetPiecePlan {
  readonly type: SetPieceType;
  readonly takerId?: string;
  readonly assignments: readonly SetPieceAssignment[];
}

export interface SetPiecePlans {
  readonly cornerAttack?: SetPiecePlan;
  readonly cornerDefence?: SetPiecePlan;
  readonly freeKickAttack?: SetPiecePlan;
  readonly freeKickDefence?: SetPiecePlan;
  readonly throwInAttack?: SetPiecePlan;
}

export const SET_PIECE_ATTACK_TASKS: readonly SetPieceTask[] = [
  'near_post',
  'far_post',
  'block_defender',
  'edge_of_box',
  'rebound',
];

export const SET_PIECE_DEFENCE_TASKS: readonly SetPieceTask[] = ['marker', 'zonal'];
