/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Club, Player } from '../../../types/game';
import type { SeededRandom } from '../../../engine/prng';
import { SIM_WEIGHTS } from '../../match/simWeights';
import type { SetPiecePlan, SetPieceType } from './setPieceTypes';
export interface SetPieceOutcome {
  readonly isGoal: boolean;
  readonly isOnTarget: boolean;
  readonly xg: number;
  readonly scorerId?: string;
  readonly takerId?: string;
}

const attr = (p: Player, key: keyof NonNullable<Player['attributes']>): number => {
  const v = p.attributes?.[key];
  return typeof v === 'number' && Number.isFinite(v) ? v : p.overall;
};

const headingProxy = (p: Player): number => (attr(p, 'physical') * 0.55 + attr(p, 'shooting') * 0.45);

const markingProxy = (p: Player): number => (attr(p, 'defending') * 0.6 + attr(p, 'physical') * 0.4);

function findPlayer(club: Club, id: string | undefined): Player | undefined {
  if (!id) return undefined;
  return club.footballSquad.find((p) => p.id === id);
}

function aerialThreat(plan: SetPiecePlan, club: Club): number {
  let sum = 0;
  let n = 0;
  for (const a of plan.assignments) {
    const p = findPlayer(club, a.playerId);
    if (!p) continue;
    if (a.task === 'near_post' || a.task === 'far_post' || a.task === 'rebound') {
      sum += headingProxy(p);
      n++;
    }
  }
  return n > 0 ? sum / n : 60;
}

function defenceAerial(plan: SetPiecePlan | undefined, club: Club): number {
  if (!plan || plan.assignments.length === 0) {
    const cbs = club.footballSquad.filter((p) => p.position === 'CB' || p.position === 'GK');
    if (cbs.length === 0) return 65;
    return cbs.reduce((s, p) => s + markingProxy(p), 0) / cbs.length;
  }
  let sum = 0;
  let n = 0;
  for (const a of plan.assignments) {
    const p = findPlayer(club, a.playerId);
    if (!p) continue;
    sum += markingProxy(p) * (a.task === 'marker' ? 1.05 : 0.95);
    n++;
  }
  return n > 0 ? sum / n : 65;
}

export function resolveSetPiece(
  type: SetPieceType,
  attackClub: Club,
  defendClub: Club,
  attackPlan: SetPiecePlan | undefined,
  defendPlan: SetPiecePlan | undefined,
  rng: SeededRandom,
  setPieceQualityMult = 1,
): SetPieceOutcome {
  const defaultTaker =
    type === 'corner_attack'
      ? attackClub.footballTactics.cornerTakerId
      : type === 'free_kick_attack'
        ? attackClub.footballTactics.freeKickTakerId
        : undefined;

  const taker = findPlayer(attackClub, attackPlan?.takerId ?? defaultTaker);
  let delivery = taker ? attr(taker, 'passing') : 65;
  let attackAerial = aerialThreat(attackPlan ?? { type, assignments: [] }, attackClub);
  if (type === 'free_kick_attack' && taker) {
    delivery = (attr(taker, 'passing') + attr(taker, 'shooting')) / 2;
    const edge = attackPlan?.assignments.filter((a) => a.task === 'edge_of_box') ?? [];
    if (edge.length > 0) {
      let s = 0;
      for (const a of edge) {
        const p = findPlayer(attackClub, a.playerId);
        if (p) s += attr(p, 'shooting');
      }
      attackAerial = s / edge.length;
    }
  }
  if (type === 'throw_in_attack') {
    delivery = taker ? attr(taker, 'passing') * 0.85 : 58;
    attackAerial *= 0.75;
  }
  const defAerial = defenceAerial(defendPlan, defendClub);
  const blockers = attackPlan?.assignments.filter((a) => a.task === 'block_defender') ?? [];
  let blockBonus = 0;
  for (const b of blockers) {
    const p = findPlayer(attackClub, b.playerId);
    if (p) blockBonus += attr(p, 'physical') * 0.02;
  }

  const quality = Math.max(0.5, Math.min(1.5, setPieceQualityMult));
  const attackScore =
    (delivery * SIM_WEIGHTS.setPieceDeliveryWeight +
      attackAerial * SIM_WEIGHTS.setPieceAerialWeight +
      blockBonus +
      (100 - defAerial) * (1 - SIM_WEIGHTS.setPieceDeliveryWeight - SIM_WEIGHTS.setPieceAerialWeight)) *
    quality;

  const onTarget = rng.nextFloat() < Math.min(0.55, Math.max(0.18, 0.22 + attackScore / 400));
  const ratio = attackScore / Math.max(40, defAerial);
  const xg = Math.min(0.55, Math.max(0.06, 0.12 + ratio * 0.08));
  const isGoal = onTarget && rng.nextFloat() < Math.min(0.42, xg + 0.05);

  let scorerId = taker?.id;
  if (isGoal && attackPlan && attackPlan.assignments.length > 0) {
    const targets = attackPlan.assignments.filter((a) => a.task === 'near_post' || a.task === 'far_post' || a.task === 'rebound');
    if (targets.length > 0) scorerId = rng.pick(targets).playerId;
  }

  return { isGoal, isOnTarget: onTarget, xg, scorerId, takerId: taker?.id };
}
