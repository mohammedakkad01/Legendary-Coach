/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Club } from '../../types/game';
import { SeededRandom } from '../../engine/prng';
import { resolveSetPiece } from '../tactics/setPieces/resolveSetPiece';
import { setPieceStreamSeed, type SetPieceStreamType } from './setPieceRng';
import type { SetPiecePlan, SetPieceType } from '../tactics/setPieces/setPieceTypes';

export interface SetPieceMinuteResult {
  readonly streamType: SetPieceStreamType;
  readonly simType: SetPieceType;
  readonly isHomeAttacking: boolean;
  readonly isGoal: boolean;
  readonly isOnTarget: boolean;
  readonly xg: number;
  readonly scorerId?: string;
  readonly takerId?: string;
  readonly scorerName?: string;
  readonly scorerNameEn?: string;
}

function mapStreamToSimType(stream: SetPieceStreamType): SetPieceType {
  if (stream === 'corner') return 'corner_attack';
  if (stream === 'fk_attack') return 'free_kick_attack';
  return 'throw_in_attack';
}

function attackDefencePlans(
  attackClub: Club,
  defendClub: Club,
  simType: SetPieceType,
): { attackPlan: SetPiecePlan | undefined; defendPlan: SetPiecePlan | undefined } {
  const plans = attackClub.footballTactics.setPiecePlans;
  const defPlans = defendClub.footballTactics.setPiecePlans;
  if (simType === 'corner_attack') {
    return { attackPlan: plans?.cornerAttack, defendPlan: defPlans?.cornerDefence };
  }
  if (simType === 'free_kick_attack') {
    return { attackPlan: plans?.freeKickAttack, defendPlan: defPlans?.freeKickDefence };
  }
  return { attackPlan: plans?.throwInAttack, defendPlan: defPlans?.cornerDefence };
}

export function runSetPieceMinute(
  matchSeed: number,
  minute: number,
  streamType: SetPieceStreamType,
  isHomeAttacking: boolean,
  homeClub: Club,
  awayClub: Club,
): SetPieceMinuteResult {
  const rng = new SeededRandom(setPieceStreamSeed(matchSeed, minute, streamType));
  const simType = mapStreamToSimType(streamType);
  const attackClub = isHomeAttacking ? homeClub : awayClub;
  const defendClub = isHomeAttacking ? awayClub : homeClub;
  const { attackPlan, defendPlan } = attackDefencePlans(attackClub, defendClub, simType);
  const outcome = resolveSetPiece(simType, attackClub, defendClub, attackPlan, defendPlan, rng);
  const scorer = attackClub.footballSquad.find((p) => p.id === outcome.scorerId);
  return {
    streamType,
    simType,
    isHomeAttacking,
    isGoal: outcome.isGoal,
    isOnTarget: outcome.isOnTarget,
    xg: outcome.xg,
    scorerId: outcome.scorerId,
    takerId: outcome.takerId,
    scorerName: scorer?.name,
    scorerNameEn: scorer?.nameEn,
  };
}
