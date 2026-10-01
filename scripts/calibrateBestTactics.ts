/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Best Tactics calibration (report only — not part of `npm test`).
 * For each scenario, plays the SAME seeded matches through the real
 * FootballMatchEngine with three setups for the user's side:
 *   (a) Best Tactics (recommendation applied via applyRecommendation),
 *   (b) the club's current setup,
 *   (c) a naive "top 11 by overall" XI in the current formation/tactics,
 * and reports points per game (3/1/0) and goal difference per game.
 * Run: npx tsx scripts/calibrateBestTactics.ts [matchesPerScenario=200]
 */

import { FootballMatchEngine } from '../src/engine/footballEngine';
import { REAL_INITIAL_PLAYER_CLUB } from '../src/data/realFootballData';
import { REAL_LEAGUES, generateSyntheticOpponentSquad } from '../src/data/realLeaguesData';
import { calcAttackPower, calcDefensePower, buildSlotAssignments } from '../src/engine/matchPrediction';
import { applyRecommendation, deriveOpponentProfile, recommendBestTactics } from '../src/domain/tactics/bestTactics';
import { getFormation } from '../src/domain/squad/formations';
import { normalizeSlot } from '../src/domain/squad/positionTaxonomy';
import { buildBestTacticsInput } from '../src/hooks/bestTactics/bestTacticsInput';
import { deriveSyntheticOpponentTactics, opponentTacticsWithRoles } from '../src/domain/tactics/deriveSyntheticOpponentTactics';
import type { Club, Player } from '../src/types/game';

const MATCHES = Math.max(10, Number(process.argv[2]) || 200);
const MAX_SUBS = 7;
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

interface Tally { points: number; gd: number; w: number; d: number; l: number }

function play(user: Club, opponent: Club, seeds: readonly number[]): Tally {
  const t: Tally = { points: 0, gd: 0, w: 0, d: 0, l: 0 };
  for (const seed of seeds) {
    const res = new FootballMatchEngine(clone(user), clone(opponent), seed, undefined, undefined, 0, 0).simulateFullMatch();
    const diff = res.homeScore - res.awayScore;
    t.gd += diff;
    if (diff > 0) { t.points += 3; t.w += 1; } else if (diff === 0) { t.points += 1; t.d += 1; } else t.l += 1;
  }
  return t;
}

/** Naive baseline: best GK + 10 best outfielders by overall, slotted greedily (natural position first) into the current formation. */
function topElevenByOverall(club: Club): Club {
  const fit = club.footballSquad.filter((p) => !(p.injuredWeeks > 0) && !(p.suspendedMatches > 0));
  const byOvr = (a: Player, b: Player) => b.overall - a.overall || (a.id < b.id ? -1 : 1);
  const gk = fit.filter((p) => p.position === 'GK').sort(byOvr)[0];
  const outfield = fit.filter((p) => p.position !== 'GK').sort(byOvr).slice(0, 10);
  const slots = getFormation(club.footballTactics.formation).slots;
  const pool = [...outfield];
  const lineup = slots.map((slot) => {
    if (slot.label === 'GK') return gk?.id ?? '';
    const core = normalizeSlot(slot.label);
    const i = Math.max(0, pool.findIndex((p) => p.position === core));
    return pool.splice(i, 1)[0]?.id ?? '';
  });
  const xi = new Set(lineup);
  return { ...club, footballLineup: lineup, footballBench: fit.filter((p) => !xi.has(p.id)).sort(byOvr).slice(0, MAX_SUBS).map((p) => p.id) };
}

function bestTacticsClub(club: Club, opponent: Club): { club: Club; formation: string; mentality: string; alreadyOptimal: boolean } | null {
  const rec = recommendBestTactics(buildBestTacticsInput(club, deriveOpponentProfile(opponent), MAX_SUBS));
  if (!rec.ok) return null;
  const applied = applyRecommendation(club, rec.value, { maxSubstitutes: MAX_SUBS });
  if (!applied.ok) return null;
  return { club: applied.value, formation: rec.value.formation, mentality: rec.value.tactics.mentality, alreadyOptimal: rec.value.alreadyOptimal };
}

/** Scenario helpers: start from the shipped club and stress it. */
function withTiredStarters(club: Club, n: number): Club {
  const tired = new Set(club.footballLineup.slice(1, 1 + n));
  return { ...club, footballSquad: club.footballSquad.map((p) => (tired.has(p.id) ? { ...p, fatigue: 90, stamina: 30 } : p)) };
}
function withInjuredStarters(club: Club, n: number): Club {
  const hurt = new Set(club.footballLineup.slice(1, 1 + n));
  return { ...club, footballSquad: club.footballSquad.map((p) => (hurt.has(p.id) ? { ...p, injuredWeeks: 3 } : p)) };
}

/**
 * Opponents are built exactly like useGameStore.buildPreMatchData builds them:
 * the per-club synthetic squad, GK + first 10 outfielders as the XI, and the
 * default club tactics (the static REAL_OPPONENT_CLUBS are all clones of one
 * squad, so they cannot be used to compare opponents).
 */
function syntheticClub(configIndex: number): Club {
  const config = REAL_LEAGUES.flatMap((l) => l.clubs)[configIndex];
  const squad = generateSyntheticOpponentSquad(config);
  const gk = squad.find((p) => p.position === 'GK');
  const outfield = squad.filter((p) => p.position !== 'GK');
  const lineup = [gk, ...outfield.slice(0, 10)].filter((p): p is Player => !!p).map((p) => p.id);
  const tacticsCore = deriveSyntheticOpponentTactics(config.id, config.starRating);
  return {
    ...clone(REAL_INITIAL_PLAYER_CLUB),
    id: config.id,
    name: config.name,
    nameEn: config.nameEn || config.name,
    footballSquad: squad,
    footballLineup: lineup,
    footballBench: outfield.slice(10, 10 + 5).map((p) => p.id),
    footballTactics: opponentTacticsWithRoles(tacticsCore, lineup),
  };
}

const power = (c: Club) => {
  const xi = buildSlotAssignments(c);
  return Math.round((calcAttackPower(xi) + calcDefensePower(xi)) / 2);
};

const allClubs = REAL_LEAGUES.flatMap((l) => l.clubs).map((_, i) => syntheticClub(i));
const byPower = [...allClubs].sort((a, b) => power(b) - power(a) || (a.id < b.id ? -1 : 1));
const strong = byPower[0];
const mid = byPower[Math.floor(byPower.length / 2)];
const weak = byPower[byPower.length - 1];

const seeds = Array.from({ length: MATCHES }, (_, i) => (0x5eed + i * 2654435761) >>> 0);
const base: Club = clone(REAL_INITIAL_PLAYER_CLUB);
const label = (c: Club) => `${c.nameEn || c.id} (power ${power(c)})`;
const scenarios: { name: string; user: Club; opponent: Club }[] = [
  ...[strong, mid, weak].map((o) => ({ name: `shipped club (power ${power(base)}) vs ${label(o)}`, user: base, opponent: o })),
  { name: `shipped club, 4 tired starters vs ${label(mid)}`, user: withTiredStarters(base, 4), opponent: mid },
  { name: `shipped club, 3 injured starters vs ${label(mid)}`, user: withInjuredStarters(base, 3), opponent: mid },
  { name: `${label(mid)} as user vs ${label(strong)}`, user: mid, opponent: strong },
  { name: `${label(weak)} as user vs ${label(mid)}`, user: weak, opponent: mid },
];

const BLOCKS = 10;
const BLOCK_SIZE = Math.floor(MATCHES / BLOCKS);

const ppg = (t: Tally) => (t.points / MATCHES).toFixed(3);
const gdpg = (t: Tally) => (t.gd / MATCHES >= 0 ? '+' : '') + (t.gd / MATCHES).toFixed(2);

const meanStd = (xs: readonly number[]): { mean: number; std: number } => {
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  const std = Math.sqrt(xs.reduce((s, x) => s + (x - mean) ** 2, 0) / Math.max(1, xs.length - 1));
  return { mean, std };
};

function blockPpgs(user: Club, opponent: Club): { mean: number; std: number } {
  const blocks: number[] = [];
  for (let b = 0; b < BLOCKS; b++) {
    let pts = 0;
    for (let j = 0; j < BLOCK_SIZE; j++) {
      const seed = seeds[b * BLOCK_SIZE + j]!;
      const res = new FootballMatchEngine(clone(user), clone(opponent), seed, undefined, undefined, 0, 0).simulateFullMatch();
      const diff = res.homeScore - res.awayScore;
      pts += diff > 0 ? 3 : diff === 0 ? 1 : 0;
    }
    blocks.push(pts / BLOCK_SIZE);
  }
  return meanStd(blocks);
}

const oppStyle = (c: Club) =>
  `${c.footballTactics.formation}/${c.footballTactics.mentality}/${c.footballTactics.pressing}`;

console.log(
  `Best Tactics calibration — ${MATCHES} matches/setup (${BLOCKS}×${BLOCK_SIZE} blocks), identical seeds for (a)(b)(c) per scenario, user = home\n`,
);
let gainsVsCurrent = 0;
let gainsVsTop11 = 0;
for (const s of scenarios) {
  const bt = bestTacticsClub(s.user, s.opponent);
  if (!bt) { console.log(`- ${s.name}: recommendation failed`); continue; }
  const a = play(bt.club, s.opponent, seeds);
  const b = play(s.user, s.opponent, seeds);
  const c = play(topElevenByOverall(s.user), s.opponent, seeds);
  const d = play({ ...bt.club, footballTactics: { ...s.user.footballTactics, formation: bt.club.footballTactics.formation } }, s.opponent, seeds);
  const e = play({ ...s.user, footballTactics: { ...bt.club.footballTactics, formation: s.user.footballTactics.formation } }, s.opponent, seeds);
  const statA = blockPpgs(bt.club, s.opponent);
  const statB = blockPpgs(s.user, s.opponent);
  const delta = statA.mean - statB.mean;
  const deltaSe = Math.sqrt(statA.std ** 2 + statB.std ** 2);
  if (a.points > b.points) gainsVsCurrent += 1;
  if (a.points > c.points) gainsVsTop11 += 1;
  console.log(`- ${s.name}`);
  console.log(`    opponent style: ${oppStyle(s.opponent)}`);
  console.log(`    (a) Best Tactics [${bt.formation}, ${bt.mentality}${bt.alreadyOptimal ? ', alreadyOptimal' : ''}]: PPG ${ppg(a)} ± ${statA.std.toFixed(3)} (blocks)  GD/g ${gdpg(a)}  W-D-L ${a.w}-${a.d}-${a.l}`);
  console.log(`    (b) current setup                : PPG ${ppg(b)} ± ${statB.std.toFixed(3)} (blocks)  GD/g ${gdpg(b)}  W-D-L ${b.w}-${b.d}-${b.l}`);
  console.log(`    Δ(a−b) block means: ${delta >= 0 ? '+' : ''}${delta.toFixed(3)} ± ${deltaSe.toFixed(3)} PPG`);
  console.log(`    (c) top 11 by overall            : PPG ${ppg(c)}  GD/g ${gdpg(c)}  W-D-L ${c.w}-${c.d}-${c.l}`);
  console.log(`    (d) BT XI+formation, current settings : PPG ${ppg(d)}  GD/g ${gdpg(d)}`);
  console.log(`    (e) current XI, BT settings           : PPG ${ppg(e)}  GD/g ${gdpg(e)}`);
}
console.log(`\nBest Tactics out-scored the current setup in ${gainsVsCurrent}/${scenarios.length} scenarios and top-11-by-overall in ${gainsVsTop11}/${scenarios.length}.`);
