/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Matchday Simulator — plays the rest of a league round in the background.
 *
 * Pure functions only (no store / no React). The Zustand store calls these from
 * `simulateMatchday()`. Responsibilities:
 *  - Work out who plays whom on a given matchday (`leagueFixtures` only holds
 *    the USER's own fixtures, so the other pairings are derived here).
 *  - Generate realistic scores from squad strength (Poisson model).
 *  - Assign scorers / assist providers / cards and 4.0–10.0 match ratings.
 *  - Turn the user's own live match events into the same per-player deltas.
 */

import {
  Fixture,
  LeagueStanding,
  MatchRecord,
  Player,
  PlayerPosition,
  PlayerStats,
} from '../types/game';
import { SeededRandom } from './prng';

// ---------------------------------------------------------------------------
// Squad cache (in-memory, per session) — lets non-user clubs keep the same
// player identities from round to round.
// ---------------------------------------------------------------------------
const clubSquadCache = new Map<string, Player[]>();

export const registerClubSquad = (clubId: string, players: Player[]) => {
  clubSquadCache.set(clubId, players);
};
export const getCachedClubSquad = (clubId: string): Player[] | undefined => clubSquadCache.get(clubId);
export const hasClubSquad = (clubId: string) => clubSquadCache.has(clubId);

/** Stable id for API-synced players (their converter uses Math.random ids). */
export const withStableIds = (clubId: string, players: Player[]): Player[] => {
  const used = new Set<string>();
  return players.map((p) => {
    const slug = (p.nameEn || p.name).toLowerCase().trim().replace(/\s+/g, '-');
    let id = `${clubId}__${slug}`;
    let n = 2;
    while (used.has(id)) id = `${clubId}__${slug}_${n++}`;
    used.add(id);
    return { ...p, id };
  });
};

// ---------------------------------------------------------------------------
// Positions, starting XI, strength
// ---------------------------------------------------------------------------
type Group = 'GK' | 'DEF' | 'MID' | 'ATT';

export const positionGroup = (pos: PlayerPosition): Group => {
  switch (pos) {
    case 'GK': return 'GK';
    case 'CB': case 'LB': case 'RB': return 'DEF';
    case 'CDM': case 'CM': case 'CAM': return 'MID';
    case 'LW': case 'RW': case 'ST': return 'ATT';
    default: return 'MID';
  }
};

const byOverall = (a: Player, b: Player) => b.overall - a.overall;

/** Best available XI: 1 GK + 4 DEF + 3 MID + 3 ATT, topped up by overall. */
export const pickStartingXI = (players: Player[]): Player[] => {
  let pool = players.filter((p) => (p.injuredWeeks || 0) <= 0 && (p.suspendedMatches || 0) <= 0);
  if (pool.length < 11) pool = [...players];
  const take = (g: Group, n: number) => pool.filter((p) => positionGroup(p.position) === g).sort(byOverall).slice(0, n);
  const xi = [...take('GK', 1), ...take('DEF', 4), ...take('MID', 3), ...take('ATT', 3)];
  if (xi.length < 11) {
    const ids = new Set(xi.map((p) => p.id));
    const rest = pool.filter((p) => !ids.has(p.id) && positionGroup(p.position) !== 'GK').sort(byOverall);
    xi.push(...rest.slice(0, 11 - xi.length));
  }
  return xi;
};

export const teamStrength = (xi: Player[]): { attack: number; defense: number } => {
  if (xi.length === 0) return { attack: 70, defense: 70 };
  const wA: Record<Group, number> = { GK: 0, DEF: 0.25, MID: 0.8, ATT: 1.2 };
  const wD: Record<Group, number> = { GK: 1.3, DEF: 1.0, MID: 0.4, ATT: 0.1 };
  let sa = 0, wa = 0, sd = 0, wd = 0;
  for (const p of xi) {
    const g = positionGroup(p.position);
    sa += p.overall * wA[g]; wa += wA[g];
    sd += p.overall * wD[g]; wd += wD[g];
  }
  return { attack: wa ? sa / wa : 70, defense: wd ? sd / wd : 70 };
};

// ---------------------------------------------------------------------------
// Random helpers
// ---------------------------------------------------------------------------
const poisson = (lambda: number, rng: SeededRandom): number => {
  const limit = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= rng.nextFloat();
  } while (p > limit && k < 12);
  return k - 1;
};

const weightedPick = <T,>(items: T[], weight: (t: T) => number, rng: SeededRandom): T | null => {
  if (items.length === 0) return null;
  const weights = items.map((i) => Math.max(0, weight(i)));
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) return items[Math.floor(rng.nextFloat() * items.length)];
  let r = rng.nextFloat() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
};

// Attackers/midfielders are far more likely to score / assist.
const SCORER_W: Record<PlayerPosition, number> = {
  ST: 6, LW: 4, RW: 4, CAM: 3.5, CM: 1.8, CDM: 0.8, LB: 0.7, RB: 0.7, CB: 0.6, GK: 0.02,
  PG: 2, SG: 2, SF: 2, PF: 2, C: 2,
};
const ASSIST_W: Record<PlayerPosition, number> = {
  CAM: 4, LW: 4, RW: 4, CM: 3, ST: 2, LB: 2, RB: 2, CDM: 1.2, CB: 0.5, GK: 0.05,
  PG: 2, SG: 2, SF: 2, PF: 2, C: 2,
};
const YELLOW_W: Record<PlayerPosition, number> = {
  CDM: 4, CB: 3.5, CM: 3, LB: 2.5, RB: 2.5, CAM: 1.8, LW: 1.5, RW: 1.5, ST: 1.8, GK: 0.4,
  PG: 2, SG: 2, SF: 2, PF: 2, C: 2,
};

const scorerWeight = (p: Player) => SCORER_W[p.position] * Math.pow(Math.max(40, p.overall) / 70, 2);
const assistWeight = (p: Player) => ASSIST_W[p.position] * Math.pow(Math.max(40, p.overall) / 70, 1.5);

// ---------------------------------------------------------------------------
// Per-match player deltas
// ---------------------------------------------------------------------------
export interface PlayerMatchDelta {
  playerId: string;
  name: string;
  clubId: string;
  position: PlayerPosition;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  rating: number;
}

export interface SimTeam {
  clubId: string;
  clubName: string;
  xi: Player[];
}

const newDelta = (p: Player, clubId: string): PlayerMatchDelta => ({
  playerId: p.id, name: p.name, clubId, position: p.position,
  goals: 0, assists: 0, yellowCards: 0, redCards: 0, rating: 0,
});

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Ratings: base 6.0–7.2, ±0.3 for the result, +1.5 per goal, +1.0 per assist,
 * +0.5 clean sheet for GK/DEF, −0.5 yellow, −2.0 red. Clamped to 4.0–10.0.
 */
const rateTeam = (
  team: SimTeam,
  deltas: Map<string, PlayerMatchDelta>,
  goalsFor: number,
  goalsAgainst: number,
  rng: SeededRandom,
) => {
  const resultAdj = goalsFor > goalsAgainst ? 0.3 : goalsFor < goalsAgainst ? -0.3 : 0;
  for (const p of team.xi) {
    const d = deltas.get(p.id);
    if (!d) continue;
    let r = 6.0 + rng.nextFloat() * 1.2 + resultAdj + (p.overall - 75) / 80;
    r += d.goals * 1.5 + d.assists * 1.0;
    const g = positionGroup(p.position);
    if (goalsAgainst === 0 && (g === 'GK' || g === 'DEF')) r += 0.5;
    r -= d.yellowCards * 0.5 + d.redCards * 2.0;
    d.rating = Math.round(clamp(r, 4.0, 10.0) * 10) / 10;
  }
};

/** Distinct random players for cards: yellows first, then a rare straight red. */
const assignCards = (team: SimTeam, deltas: Map<string, PlayerMatchDelta>, rng: SeededRandom) => {
  const yellows = Math.min(4, poisson(1.6, rng));
  const carded = new Set<string>();
  for (let i = 0; i < yellows; i++) {
    const pool = team.xi.filter((p) => !carded.has(p.id));
    const p = weightedPick(pool, (x) => YELLOW_W[x.position], rng);
    if (!p) break;
    carded.add(p.id);
    deltas.get(p.id)!.yellowCards += 1;
  }
  if (rng.nextChance(0.05)) {
    const pool = team.xi.filter((p) => !carded.has(p.id) && p.position !== 'GK');
    const p = weightedPick(pool, (x) => YELLOW_W[x.position], rng);
    if (p) deltas.get(p.id)!.redCards += 1;
  }
};

const initDeltas = (team: SimTeam) => {
  const m = new Map<string, PlayerMatchDelta>();
  team.xi.forEach((p) => m.set(p.id, newDelta(p, team.clubId)));
  return m;
};

const creditGoal = (
  team: SimTeam,
  deltas: Map<string, PlayerMatchDelta>,
  rng: SeededRandom,
  forcedScorerId?: string,
) => {
  const forced = forcedScorerId ? team.xi.find((p) => p.id === forcedScorerId) : undefined;
  const scorer = forced || weightedPick(team.xi, scorerWeight, rng);
  if (!scorer) return;
  deltas.get(scorer.id)!.goals += 1;
  if (rng.nextChance(0.75)) {
    const helper = weightedPick(team.xi.filter((p) => p.id !== scorer.id), assistWeight, rng);
    if (helper) deltas.get(helper.id)!.assists += 1;
  }
};

// ---------------------------------------------------------------------------
// AI vs AI match
// ---------------------------------------------------------------------------
export interface SimMatchOutcome {
  homeScore: number;
  awayScore: number;
  deltas: PlayerMatchDelta[];
}

export const simulateAiMatch = (home: SimTeam, away: SimTeam, rng: SeededRandom): SimMatchOutcome => {
  const h = teamStrength(home.xi);
  const a = teamStrength(away.xi);
  // Strength ratio ^3 keeps upsets possible but favours the better side.
  const lambdaHome = clamp(1.35 * Math.pow(h.attack / a.defense, 3), 0.25, 4.0) * (0.85 + rng.nextFloat() * 0.3);
  const lambdaAway = clamp(1.1 * Math.pow(a.attack / h.defense, 3), 0.2, 3.6) * (0.85 + rng.nextFloat() * 0.3);
  const homeScore = poisson(lambdaHome, rng);
  const awayScore = poisson(lambdaAway, rng);

  const hd = initDeltas(home);
  const ad = initDeltas(away);
  for (let i = 0; i < homeScore; i++) creditGoal(home, hd, rng);
  for (let i = 0; i < awayScore; i++) creditGoal(away, ad, rng);
  assignCards(home, hd, rng);
  assignCards(away, ad, rng);
  rateTeam(home, hd, homeScore, awayScore, rng);
  rateTeam(away, ad, awayScore, homeScore, rng);

  return { homeScore, awayScore, deltas: [...hd.values(), ...ad.values()] };
};

// ---------------------------------------------------------------------------
// The user's own (live-engine) match -> per-player deltas
// ---------------------------------------------------------------------------
/**
 * The live engine tracks scorers but not assists/card-takers/ratings, so those
 * are filled in here with the same weighting used for AI matches. Home = user.
 */
export const deltasFromUserMatch = (
  record: MatchRecord,
  user: SimTeam,
  opponent: SimTeam,
  rng: SeededRandom,
): PlayerMatchDelta[] => {
  const ud = initDeltas(user);
  const od = initDeltas(opponent);
  const carded = { home: new Set<string>(), away: new Set<string>() };

  for (const ev of record.events) {
    const side = ev.team === 'home' ? 'home' : 'away';
    const team = side === 'home' ? user : opponent;
    const deltas = side === 'home' ? ud : od;

    if (ev.type === 'goal') {
      creditGoal(team, deltas, rng, ev.playerId);
    } else if (ev.type === 'yellow_card' || ev.type === 'red_card') {
      const known = ev.playerId ? team.xi.find((p) => p.id === ev.playerId) : undefined;
      const pool = team.xi.filter((p) => !carded[side].has(p.id) && (ev.type === 'yellow_card' || p.position !== 'GK'));
      const p = known || weightedPick(pool, (x) => YELLOW_W[x.position], rng);
      if (p) {
        carded[side].add(p.id);
        if (ev.type === 'yellow_card') deltas.get(p.id)!.yellowCards += 1;
        else deltas.get(p.id)!.redCards += 1;
      }
    }
  }

  rateTeam(user, ud, record.homeScore, record.awayScore, rng);
  rateTeam(opponent, od, record.awayScore, record.homeScore, rng);
  return [...ud.values(), ...od.values()];
};

// ---------------------------------------------------------------------------
// Accumulate deltas into tournamentStats
// ---------------------------------------------------------------------------
export const applyDeltasToStats = (stats: PlayerStats[], deltas: PlayerMatchDelta[]): PlayerStats[] => {
  const map = new Map<string, PlayerStats>(stats.map((s) => [s.playerId, { ...s, matchRatings: [...s.matchRatings] }]));
  for (const d of deltas) {
    const cur = map.get(d.playerId) || {
      playerId: d.playerId, name: d.name, clubId: d.clubId,
      goals: 0, assists: 0, yellowCards: 0, redCards: 0, matchRatings: [],
    };
    cur.goals += d.goals;
    cur.assists += d.assists;
    cur.yellowCards += d.yellowCards;
    cur.redCards += d.redCards;
    cur.matchRatings.push(d.rating);
    cur.clubId = d.clubId;
    map.set(d.playerId, cur);
  }
  return [...map.values()];
};

// ---------------------------------------------------------------------------
// Standings
// ---------------------------------------------------------------------------
export const applyResultToStandings = (
  standings: LeagueStanding[],
  homeId: string,
  awayId: string,
  homeScore: number,
  awayScore: number,
): LeagueStanding[] =>
  standings.map((s) => {
    const isHome = s.clubId === homeId;
    if (!isHome && s.clubId !== awayId) return s;
    const gf = isHome ? homeScore : awayScore;
    const ga = isHome ? awayScore : homeScore;
    const won = gf > ga;
    const drawn = gf === ga;
    return {
      ...s,
      played: s.played + 1,
      won: s.won + (won ? 1 : 0),
      drawn: s.drawn + (drawn ? 1 : 0),
      lost: s.lost + (!won && !drawn ? 1 : 0),
      goalsFor: s.goalsFor + gf,
      goalsAgainst: s.goalsAgainst + ga,
      goalDifference: s.goalDifference + (gf - ga),
      points: s.points + (won ? 3 : drawn ? 1 : 0),
      form: [(won ? 'W' : drawn ? 'D' : 'L') as 'W' | 'D' | 'L', ...s.form.slice(0, 4)],
    };
  });

// ---------------------------------------------------------------------------
// Who plays whom (non-user matches) on a given matchday
// ---------------------------------------------------------------------------
const USER = '__USER__';
const BYE = '__BYE__';

/** Classic circle-method round-robin: returns rounds of [a, b] pairs. */
const circleRounds = (teams: string[]): [string, string][][] => {
  const list = [...teams];
  const n = list.length;
  const rounds: [string, string][][] = [];
  for (let r = 0; r < n - 1; r++) {
    const pairs: [string, string][] = [];
    for (let i = 0; i < n / 2; i++) {
      const a = list[i];
      const b = list[n - 1 - i];
      pairs.push((r + i) % 2 === 0 ? [a, b] : [b, a]);
    }
    rounds.push(pairs);
    list.splice(1, 0, list.pop() as string); // rotate everything but the first
  }
  return rounds;
};

/**
 * The user's fixture list is a shuffled opponent order (first leg) followed by
 * the reverse order (second leg). We build a full round-robin, then relabel its
 * teams so the USER's opponent each round matches the real fixture list; all
 * other pairings follow from that relabelling, so every pair still meets once
 * per leg. Leg two mirrors leg one with venues swapped.
 *
 * Odd league size: the user has no bye in the fixture list, so the pairings of
 * the round where the user would rest are played on the last matchday of each
 * leg instead (a club may therefore play twice on that day). Without this, tiny
 * leagues would never see their other clubs meet.
 */
export const getOtherPairings = (
  allClubIds: string[],
  userClubId: string,
  fixtures: Fixture[],
  matchday: number,
): [string, string][] => {
  const sorted = [...fixtures].sort((a, b) => a.matchday - b.matchday);
  const current = sorted.find((f) => f.matchday === matchday);
  if (!current) return [];

  const others = allClubIds.filter((id) => id !== userClubId).sort();
  if (others.length < 2) return [];

  const half = Math.floor(sorted.length / 2);
  const secondLeg = matchday > half;
  const firstLegRound = secondLeg ? 2 * half - matchday + 1 : matchday;

  const teams = [USER, ...others];
  if (teams.length % 2 === 1) teams.push(BYE);
  const rounds = circleRounds(teams);

  // Rounds where the user actually plays (drop the user's bye round).
  const userRounds = rounds
    .map((pairs) => {
      const mine = pairs.find(([a, b]) => a === USER || b === USER)!;
      const opp = mine[0] === USER ? mine[1] : mine[0];
      return { opp, pairs };
    })
    .filter((r) => r.opp !== BYE);

  const byeRound = rounds.find((pairs) => pairs.some(([a, b]) => (a === USER && b === BYE) || (b === USER && a === BYE)));
  const target = userRounds[firstLegRound - 1];
  const firstLeg = sorted.slice(0, half);
  const valid = !!target && firstLeg.length === userRounds.length;

  if (valid) {
    const relabel = new Map<string, string>();
    userRounds.forEach((r, i) => relabel.set(r.opp, firstLeg[i].opponentClubId));

    const relabelPairs = (source: [string, string][]) => {
      const out: [string, string][] = [];
      for (const [a, b] of source) {
        if (a === USER || b === USER || a === BYE || b === BYE) continue;
        const ra = relabel.get(a) ?? a;
        const rb = relabel.get(b) ?? b;
        out.push(secondLeg ? [rb, ra] : [ra, rb]);
      }
      return out;
    };

    const pairs = relabelPairs(target.pairs);
    const flat = pairs.flat();
    const ok =
      !flat.includes(current.opponentClubId) &&
      new Set(flat).size === flat.length &&
      flat.every((id) => others.includes(id));
    if (ok) {
      const isLegEnd = matchday === half || matchday === sorted.length;
      if (isLegEnd && byeRound) pairs.push(...relabelPairs(byeRound));
      return pairs;
    }
  }

  // Fallback (club list changed mid-season): deterministic random pairing.
  const rng = new SeededRandom(matchday * 2654435761);
  const pool = others.filter((id) => id !== current.opponentClubId);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = rng.nextRange(0, i);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const out: [string, string][] = [];
  for (let i = 0; i + 1 < pool.length; i += 2) out.push([pool[i], pool[i + 1]]);
  return out;
};
