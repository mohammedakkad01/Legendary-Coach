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

import { Player, PlayerPosition } from '../types/game';

type Group = 'GK' | 'DEF' | 'MID' | 'ATT';

const groupOf = (pos: PlayerPosition): Group => {
  switch (pos) {
    case 'GK': return 'GK';
    case 'CB': case 'LB': case 'RB': return 'DEF';
    case 'CDM': case 'CM': case 'CAM': return 'MID';
    default: return 'ATT';
  }
};

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

const weightedAverage = (players: Player[], rate: (p: Player) => number, weights: Record<Group, number>): number => {
  let sum = 0;
  let wSum = 0;
  for (const p of players) {
    const w = weights[groupOf(p.position)];
    if (w <= 0) continue;
    // An unavailable player (injured/suspended) contributes nothing.
    const available = (p.injuredWeeks || 0) > 0 || (p.suspendedMatches || 0) > 0 ? 0.6 : 1;
    sum += rate(p) * w * available;
    wSum += w;
  }
  return wSum > 0 ? sum / wSum : 0;
};

/** Attack power (0-99) of a starting XI, position-aware. */
export const calcAttackPower = (xi: Player[]): number => Math.round(weightedAverage(xi, attackRating, ATTACK_WEIGHT));

/** Defense power (0-99) of a starting XI, position-aware (GK + defenders matter most). */
export const calcDefensePower = (xi: Player[]): number => Math.round(weightedAverage(xi, defenseRating, DEFENSE_WEIGHT));

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
