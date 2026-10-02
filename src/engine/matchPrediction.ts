/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Match Prediction — pure functions (no store / no React).
 *
 * Replaces the old linear "win = 40 + diff*1.8" formula with a Poisson goal
 * model, so the win / draw / loss odds, the expected score and the technical
 * gap all come from the REAL starting XIs of both teams (+ the user's VIP
 * bonus + home advantage). Change a player in your lineup and every number
 * moves; face a stronger opponent and the odds swing accordingly.
 */

import { Club, Player, PlayerPosition } from '../types/game';

import { positionGroupOf } from '../domain/squad/positionTaxonomy';
import type { PositionGroup as Group } from '../domain/squad/positionTaxonomy';
import { evaluatePositionSuitability } from '../domain/squad/positionSuitability';
import { getFormation } from '../domain/squad/formations';
import { computeMatchPerformanceMultiplier } from '../domain/playerLife/matchPerformance';

// Single taxonomy lives in domain/squad/positionTaxonomy.ts. Non-football
// positions keep this file's historical fallback (attack).
const groupOf = (pos: PlayerPosition): Group => positionGroupOf(pos) ?? 'ATT';

// How much each position group contributes to attacking / defending strength.
const ATTACK_WEIGHT: Record<Group, number> = { ATT: 1.0, MID: 0.6, DEF: 0.2, GK: 0.0 };
const DEFENSE_WEIGHT: Record<Group, number> = { GK: 1.0, DEF: 1.0, MID: 0.45, ATT: 0.1 };

const attackRating = (p: Player): number => {
  const a = p.attributes;
  if (!a) return p.overall;
  const o = p.overall;
  return (a.pace ?? o) * 0.2 + (a.shooting ?? o) * 0.35 + (a.passing ?? o) * 0.25 + (a.dribbling ?? o) * 0.2;
};

const defenseRating = (p: Player): number => {
  const a = p.attributes;
  if (!a) return p.overall;
  const core = (p.position === 'GK' ? a.goalkeeping : a.defending) ?? p.overall;
  return core * 0.5 + (a.physical ?? p.overall) * 0.2 + p.overall * 0.3;
};

/**
 * A starting-XI member paired with the formation slot he is ACTUALLY playing
 * (its label, e.g. 'CDM', 'LWB' — see domain/squad/formations.ts), not just
 * his natural position. Both the role weight (attacker vs defender) and the
 * suitability penalty below are driven by this assigned slot: a natural
 * center-back fielded at striker contributes like a (weak) striker, not like
 * a great center-back who happens to be miscounted as an attacker.
 */
export interface SlotAssignment {
  readonly player: Player;
  readonly assignedPosition: string;
}

/** Wraps players at their own natural position — used where no formation slot is known (e.g. a synthetic fallback XI). */
export const atNaturalPositions = (players: readonly Player[]): SlotAssignment[] =>
  players.map((player) => ({ player, assignedPosition: player.position }));

/**
 * A club's REAL starting XI, each player paired with the formation slot he is
 * actually in (club.footballLineup[i] ↔ that formation's slot i). The single
 * place this pairing is built — the pre-match odds preview (useGameStore's
 * nextMatchInsight) and the live match engine both call this, so a player who
 * is out of position shows the same reduced power in both.
 *
 * Falls back to the first 11 squad members at their own natural position if
 * the lineup has fewer than 7 real starters (an unfinished/corrupted squad) —
 * the same safety net the engine has always had for a degenerate lineup.
 */
export function buildSlotAssignments(club: Club): SlotAssignment[] {
  const formation = getFormation(club.footballTactics.formation);
  const assignments: SlotAssignment[] = [];
  club.footballLineup.forEach((id, slotIndex) => {
    if (!id) return; // empty slot
    const player = club.footballSquad.find((p) => p.id === id);
    const label = formation.slots[slotIndex]?.label;
    if (player && label) assignments.push({ player, assignedPosition: label });
  });
  if (assignments.length >= 7) return assignments;
  return atNaturalPositions(club.footballSquad.slice(0, 11));
}

const weightedAverage = (
  assignments: readonly SlotAssignment[],
  rate: (p: Player) => number,
  weights: Record<Group, number>,
): number => {
  let sum = 0;
  let wSum = 0;
  for (const { player: p, assignedPosition } of assignments) {
    const suitability = evaluatePositionSuitability(p, assignedPosition);
    const group = groupOf(suitability.assignedCore ?? p.position);
    const w = weights[group];
    if (w <= 0) continue;
    // An unavailable player (injured/suspended) contributes nothing.
    const available = (p.injuredWeeks || 0) > 0 || (p.suspendedMatches || 0) > 0 ? 0.6 : 1;
    const perf = computeMatchPerformanceMultiplier(p);
    sum += rate(p) * suitability.multiplier * w * available * perf;
    wSum += w;
  }
  return wSum > 0 ? sum / wSum : 0;
};

/** Attack power (0-99) of a starting XI, position-aware — a player out of his assigned slot contributes less. */
export const calcAttackPower = (xi: readonly SlotAssignment[]): number => Math.round(weightedAverage(xi, attackRating, ATTACK_WEIGHT));

/** Defense power (0-99) of a starting XI, position-aware (GK + defenders matter most; also slot-penalized). */
export const calcDefensePower = (xi: readonly SlotAssignment[]): number => Math.round(weightedAverage(xi, defenseRating, DEFENSE_WEIGHT));

export interface MatchOdds {
  win: number;   // %
  draw: number;  // %
  loss: number;  // %
  expectedUserGoals: number;
  expectedOpponentGoals: number;
  mostLikelyScore: string; // "2-1" from the user's point of view
}

const poissonPmf = (lambda: number, maxGoals: number): number[] => {
  const out: number[] = [];
  let p = Math.exp(-lambda);
  out.push(p);
  for (let k = 1; k <= maxGoals; k++) {
    p = (p * lambda) / k;
    out.push(p);
  }
  return out;
};

const BASE_GOALS = 1.35;      // average goals per team in a level match
const STRENGTH_EXPONENT = 3;  // how sharply rating gaps translate into goals
const HOME_FACTOR = 1.1;
const AWAY_FACTOR = 0.92;

/**
 * Odds from both teams' attack/defense. The rating ratio (attack ÷ opposing
 * defense) drives each side's expected goals; the Poisson grid then gives the
 * exact win/draw/loss split (always sums to 100).
 */
export const predictMatch = (
  userAtk: number,
  userDef: number,
  oppAtk: number,
  oppDef: number,
  userIsHome: boolean,
): MatchOdds => {
  const safe = (n: number) => Math.max(30, n || 30);
  const clamp = (n: number) => Math.max(0.25, Math.min(4.2, n));

  const lamUser = clamp(BASE_GOALS * Math.pow(safe(userAtk) / safe(oppDef), STRENGTH_EXPONENT) * (userIsHome ? HOME_FACTOR : AWAY_FACTOR));
  const lamOpp = clamp(BASE_GOALS * Math.pow(safe(oppAtk) / safe(userDef), STRENGTH_EXPONENT) * (userIsHome ? AWAY_FACTOR : HOME_FACTOR));

  const MAX = 9;
  const pu = poissonPmf(lamUser, MAX);
  const po = poissonPmf(lamOpp, MAX);

  let win = 0;
  let draw = 0;
  let loss = 0;
  let best = { p: -1, u: 1, o: 1 };
  for (let u = 0; u <= MAX; u++) {
    for (let o = 0; o <= MAX; o++) {
      const p = pu[u] * po[o];
      if (u > o) win += p;
      else if (u === o) draw += p;
      else loss += p;
      if (p > best.p) best = { p, u, o };
    }
  }
  const total = win + draw + loss || 1;
  let w = Math.round((win / total) * 100);
  let l = Math.round((loss / total) * 100);
  const d = 100 - w - l;
  if (d < 0) { // rounding guard
    if (w >= l) w += d; else l += d;
  }

  return {
    win: w,
    loss: l,
    draw: Math.max(0, 100 - w - l),
    expectedUserGoals: Math.round(lamUser * 10) / 10,
    expectedOpponentGoals: Math.round(lamOpp * 10) / 10,
    mostLikelyScore: `${best.u}-${best.o}`,
  };
};
