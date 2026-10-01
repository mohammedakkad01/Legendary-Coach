/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Captain / set-piece takers and substitutes for the recommended XI.
 * Existing choices are kept when that player is still in the XI.
 */

import type { FootballTactics } from '../../../types/game';
import { positionGroupOf } from '../../squad/positionTaxonomy';
import { attr } from './slotValue';
import type { OptimizedPlacement } from './lineupOptimizer';
import type { BestTacticsPlayer } from './types';

const best = (xs: readonly BestTacticsPlayer[], score: (p: BestTacticsPlayer) => number): BestTacticsPlayer | undefined =>
  [...xs].sort((a, b) => score(b) - score(a) || (a.id < b.id ? -1 : 1))[0];

export function pickRoles(
  xi: readonly OptimizedPlacement[],
  base: Pick<FootballTactics, 'captainId' | 'penaltyTakerId' | 'freeKickTakerId' | 'cornerTakerId'>,
): Pick<FootballTactics, 'captainId' | 'penaltyTakerId' | 'freeKickTakerId' | 'cornerTakerId'> {
  const players = xi.map((x) => x.player);
  const outfield = players.filter((p) => p.position !== 'GK');
  const inXi = (id: string): boolean => players.some((p) => p.id === id);
  const keep = (id: string, fallback: string | undefined): string => (id && inXi(id) ? id : (fallback ?? id));

  return {
    captainId: keep(base.captainId, best(players, (p) => p.overall + (p.morale ?? 50) / 20)?.id),
    penaltyTakerId: keep(base.penaltyTakerId, best(outfield, (p) => attr(p, 'shooting') + (p.form ?? 5.5))?.id),
    freeKickTakerId: keep(base.freeKickTakerId, best(outfield, (p) => (attr(p, 'passing') + attr(p, 'shooting')) / 2)?.id),
    cornerTakerId: keep(base.cornerTakerId, best(outfield, (p) => attr(p, 'passing'))?.id),
  };
}

/** Cheap fatigue-aware ordering for the bench. */
const benchScore = (p: BestTacticsPlayer): number => p.overall * (1 - (p.fatigue ?? 0) / 200);

/** One GK, then one per uncovered line (DEF, MID, ATT), then best remaining. Deterministic. */
export function pickSubstitutes(
  available: readonly BestTacticsPlayer[],
  xiIds: ReadonlySet<string>,
  maxSubstitutes: number,
): string[] {
  const pool = available.filter((p) => !xiIds.has(p.id));
  const chosen: BestTacticsPlayer[] = [];
  const take = (p: BestTacticsPlayer | undefined): void => {
    if (p && chosen.length < maxSubstitutes && !chosen.includes(p)) chosen.push(p);
  };
  const order = (xs: readonly BestTacticsPlayer[]): BestTacticsPlayer[] =>
    [...xs].sort((a, b) => benchScore(b) - benchScore(a) || (a.id < b.id ? -1 : 1));

  take(order(pool.filter((p) => p.position === 'GK'))[0]);
  for (const group of ['DEF', 'MID', 'ATT'] as const) {
    take(order(pool.filter((p) => positionGroupOf(p.position) === group && !chosen.includes(p)))[0]);
  }
  for (const p of order(pool)) take(p);
  return chosen.map((p) => p.id);
}
