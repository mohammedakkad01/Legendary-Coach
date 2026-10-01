/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phase 4 tests — Best Tactics. Run: npx tsx scripts/testBestTactics.ts
 */

import { assert, assertEqual, finish, section } from './lib/testHarness';
import { solveAssignment } from '../src/domain/tactics/bestTactics/hungarian';
import { recommendBestTactics, applyRecommendation } from '../src/domain/tactics/bestTactics';
import type { BestTacticsInput, BestTacticsPlayer, BestTacticsRecommendation } from '../src/domain/tactics/bestTactics';
import { createSquadState } from '../src/domain/squad/squadStateAdapter';
import { validateForKickoff } from '../src/domain/squad/squadRules';
import { reasonText } from '../src/i18n/bestTactics';
import type { FootballTactics, Player, PlayerPosition } from '../src/types/game';

// ------------------------------------------------------------------ fixtures
let seq = 0;
const P = (id: string, position: PlayerPosition, overall: number, extra: Partial<BestTacticsPlayer> = {}): BestTacticsPlayer => {
  seq += 1;
  return {
    id, position, overall, secondaryPositions: [], fatigue: 0, morale: 60, form: 6, stamina: 80,
    attributes: {}, injuredWeeks: 0, suspendedMatches: 0, ...extra,
  };
};

const BASE_TACTICS: FootballTactics = {
  formation: '4-3-3', mentality: 'balanced', pressing: 'mid_press', passing: 'mixed', tempo: 'normal',
  width: 'standard', offsideTrap: false, captainId: 'gk1', penaltyTakerId: 'st1', freeKickTakerId: 'cm1', cornerTakerId: 'cm1',
};

/** A balanced 24-man squad. */
function balancedSquad(): BestTacticsPlayer[] {
  return [
    P('gk1', 'GK', 80), P('gk2', 'GK', 68), P('gk3', 'GK', 55),
    P('rb1', 'RB', 74), P('rb2', 'RB', 66), P('lb1', 'LB', 73), P('lb2', 'LB', 65),
    P('cb1', 'CB', 78), P('cb2', 'CB', 77), P('cb3', 'CB', 70), P('cb4', 'CB', 62),
    P('cdm1', 'CDM', 76), P('cdm2', 'CDM', 66),
    P('cm1', 'CM', 79), P('cm2', 'CM', 75), P('cm3', 'CM', 68), P('cam1', 'CAM', 77),
    P('rw1', 'RW', 78), P('rw2', 'RW', 67), P('lw1', 'LW', 77), P('lw2', 'LW', 66),
    P('st1', 'ST', 82), P('st2', 'ST', 72), P('st3', 'ST', 63),
  ];
}

const inputOf = (squad: readonly BestTacticsPlayer[], extra: Partial<BestTacticsInput> = {}): BestTacticsInput => ({
  squad, currentLineup: [], currentTactics: BASE_TACTICS, maxSubstitutes: 7, ...extra,
});

function mustRecommend(input: BestTacticsInput): BestTacticsRecommendation {
  const r = recommendBestTactics(input);
  if (!r.ok) throw new Error(`expected ok, got ${r.error.code}`);
  return r.value;
}

const xiIds = (r: BestTacticsRecommendation): string[] => r.lineup.map((l) => l.playerId);
const shuffle = <T,>(xs: readonly T[], seed: number): T[] => {
  const a = [...xs]; let s = seed;
  for (let i = a.length - 1; i > 0; i--) { s = (s * 1664525 + 1013904223) >>> 0; const j = s % (i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};

// ------------------------------------------------------------------ 1. Hungarian
section('1) Assignment solver is optimal (brute force on small matrices)');
{
  const perms = (n: number, k: number, used: number[] = []): number[][] =>
    used.length === k ? [used] : Array.from({ length: n }, (_, i) => i).filter((i) => !used.includes(i)).flatMap((i) => perms(n, k, [...used, i]));
  let allOk = true;
  let s = 7;
  for (let trial = 0; trial < 40; trial++) {
    const rows = 3 + (trial % 2), cols = rows + (trial % 3);
    const m = Array.from({ length: rows }, () => Array.from({ length: cols }, () => { s = (s * 1103515245 + 12345) >>> 0; return (s % 1000) / 10; }));
    const a = solveAssignment(m);
    const got = a.reduce((sum, c, r) => sum + m[r][c], 0);
    const want = Math.min(...perms(cols, rows).map((p) => p.reduce((sum, c, r) => sum + m[r][c], 0)));
    if (Math.abs(got - want) > 1e-9 || new Set(a).size !== a.length) allOk = false;
  }
  assert(allOk, '40 random matrices: cost equals brute-force minimum, columns distinct');
}

// ------------------------------------------------------------------ 2. basic output
section('2) Basic recommendation');
const squad = balancedSquad();
const base = mustRecommend(inputOf(squad));
assert(base.lineup.length === 11, 'XI has 11 players');
assert(new Set(xiIds(base)).size === 11, 'no duplicate players in XI');
assert(base.score > 0 && base.score <= 100 && Number.isFinite(base.score), 'score within 0–100');
assert(base.reasons.length > 0, 'has human-readable reasons');
assert(base.lineup[0].suitability.level === 'natural' && squad.find((p) => p.id === base.lineup[0].playerId)?.position === 'GK', 'GK slot holds a natural goalkeeper');
assert(xiIds(base).includes(base.tactics.captainId), 'captain is in the XI');
assert(xiIds(base).includes(base.tactics.penaltyTakerId) && xiIds(base).includes(base.tactics.freeKickTakerId), 'set-piece takers are in the XI');

// ------------------------------------------------------------------ 3. availability
section('3) Unavailable players are NEVER selected');
{
  const hurt = balancedSquad().map((p) =>
    p.id === 'st1' ? { ...p, injuredWeeks: 3 } :
    p.id === 'gk1' ? { ...p, injuredWeeks: 1 } :
    p.id === 'cm1' ? { ...p, suspendedMatches: 1 } : p);
  const r = mustRecommend(inputOf(hurt, { currentLineup: ['gk1', 'rb1', 'cb1', 'cb2', 'lb1', 'cdm1', 'cm1', 'cm2', 'rw1', 'st1', 'lw1'] }));
  const picked = new Set([...xiIds(r), ...r.substitutes]);
  assert(!picked.has('st1') && !picked.has('gk1') && !picked.has('cm1'), 'injured/suspended players absent from XI and substitutes');
  assert(r.excluded.length === 3, 'all three listed as excluded');
  assert(squad.find((p) => p.id === r.lineup[0].playerId)?.position === 'GK' && r.lineup[0].playerId !== 'gk1', 'injured first-choice GK replaced by another goalkeeper');
  assert(r.reasons.some((x) => x.code === 'excluded_unavailable'), 'reason explains the exclusions');
  assert(r.reasons.some((x) => x.code === 'current_xi_has_unavailable'), 'reason flags the unavailable players in the current XI');
  assert(!r.alreadyOptimal, 'a current XI with unavailable players is never "already optimal"');

  // Fuzz: many random injury sets, never a leak.
  let leaks = 0;
  for (let k = 0; k < 60; k++) {
    const sq = shuffle(balancedSquad(), k + 1).map((p, i) => (((i * 7 + k * 3) % 5 === 0) ? { ...p, injuredWeeks: 1 + (i % 4) } : ((i + k) % 11 === 0 ? { ...p, suspendedMatches: 1 } : p)));
    const res = recommendBestTactics(inputOf(sq));
    if (!res.ok) continue;
    const bad = new Set(sq.filter((p) => p.injuredWeeks > 0 || p.suspendedMatches > 0).map((p) => p.id));
    if ([...res.value.lineup.map((l) => l.playerId), ...res.value.substitutes].some((id) => bad.has(id))) leaks += 1;
  }
  assert(leaks === 0, '60 randomized injury/suspension sets: zero unavailable players selected');
}

// ------------------------------------------------------------------ 4. not top-11 by overall
section('4) Not simply the top 11 by overall');
{
  // Five 90-rated centre-backs + normal others. Top-11-by-overall would field CBs everywhere.
  const sq = balancedSquad().map((p) => (p.id.startsWith('cb') ? { ...p, overall: 90 } : p));
  sq.push(P('cb5', 'CB', 90));
  const r = mustRecommend(inputOf(sq));
  const top11 = [...sq].sort((a, b) => b.overall - a.overall || (a.id < b.id ? -1 : 1)).slice(0, 11).map((p) => p.id);
  assert(JSON.stringify([...xiIds(r)].sort()) !== JSON.stringify([...top11].sort()), 'XI differs from the top 11 by overall');
  const cbs = r.lineup.filter((l) => sq.find((p) => p.id === l.playerId)?.position === 'CB').length;
  assert(cbs <= 3, `at most 3 centre-backs fielded (got ${cbs}) — no wasted stars out of position`);
  const poor = r.lineup.filter((l) => l.suitability.level === 'poor').length;
  assert(poor === 0, 'no "poor fit" placements when natural options exist');
}

// ------------------------------------------------------------------ 5. different squads / opponents
section('5) Different squads and opponents → different recommendations');
{
  const wingers = balancedSquad().map((p) =>
    p.position === 'RW' || p.position === 'LW'
      ? { ...p, overall: p.overall + 8, attributes: { pace: 92, dribbling: 90, shooting: 80 } } : p);
  const noWingers = balancedSquad().filter((p) => p.position !== 'RW' && p.position !== 'LW');
  const a = mustRecommend(inputOf(wingers));
  const b = mustRecommend(inputOf(noWingers));
  assert(a.id !== b.id, 'winger-rich vs winger-less squad get different recommendations');
  assert(JSON.stringify(xiIds(a)) !== JSON.stringify(xiIds(b)), 'different XIs');
  assert(!xiIds(b).some((id) => id.startsWith('rw') || id.startsWith('lw')), 'sanity: no wingers exist in squad B');

  const weak = mustRecommend(inputOf(balancedSquad(), { opponent: { attack: 50, defense: 50 } }));
  const strong = mustRecommend(inputOf(balancedSquad(), { opponent: { attack: 92, defense: 92 } }));
  assert(strong.tactics.attackingIntensity < weak.tactics.attackingIntensity,
    `stronger opponent → more cautious (${strong.tactics.attackingIntensity} < ${weak.tactics.attackingIntensity})`);
  assert(weak.reasons.some((x) => x.code === 'opponent_weaker') && strong.reasons.some((x) => x.code === 'opponent_stronger'), 'reasons mention the opponent gap');
  assert(weak.expectedPoints > strong.expectedPoints, 'expected points are higher against the weaker opponent');
  assert(base.reasons.some((x) => x.code === 'opponent_unknown'), 'no opponent info → says so, evaluates against an average opponent');

  const press = mustRecommend(inputOf(balancedSquad(), { opponent: { attack: 70, defense: 70, pressing: 'gegenpress', formation: '3-5-2' } }));
  assert(press.reasons.length > 0 && Number.isFinite(press.score), 'opponent formation/pressing info is accepted');
}

// ------------------------------------------------------------------ 6. determinism / purity
section('6) Deterministic, order-independent and non-mutating');
{
  const r1 = mustRecommend(inputOf(balancedSquad()));
  const r2 = mustRecommend(inputOf(balancedSquad()));
  assertEqual(r1, r2, 'same input → identical output');
  let same = true;
  for (let k = 1; k <= 8; k++) {
    const r = recommendBestTactics(inputOf(shuffle(balancedSquad(), k)));
    if (!r.ok || JSON.stringify(r.value) !== JSON.stringify(r1)) same = false;
  }
  assert(same, 'shuffling the squad order never changes the recommendation (8 shuffles)');

  const frozenSquad = balancedSquad().map((p) => Object.freeze({ ...p, attributes: Object.freeze({ ...p.attributes }) })) as BestTacticsPlayer[];
  const frozenInput = Object.freeze({ ...inputOf(frozenSquad), currentTactics: Object.freeze({ ...BASE_TACTICS }) });
  let threw = false;
  try { recommendBestTactics(frozenInput); } catch { threw = true; }
  assert(!threw, 'frozen (immutable) input is accepted — nothing is mutated');
}

// ------------------------------------------------------------------ 7. robustness
section('7) Robustness — never crashes');
{
  const few = recommendBestTactics(inputOf(balancedSquad().slice(0, 9)));
  assert(!few.ok && few.error.code === 'NOT_ENOUGH_AVAILABLE_PLAYERS', 'fewer than 11 players → Err, no throw');
  const mostlyHurt = recommendBestTactics(inputOf(balancedSquad().map((p, i) => (i < 15 ? { ...p, injuredWeeks: 2 } : p))));
  assert(!mostlyHurt.ok && mostlyHurt.error.code === 'NOT_ENOUGH_AVAILABLE_PLAYERS', 'fewer than 11 AVAILABLE → Err');
  assert(!recommendBestTactics(inputOf([])).ok, 'empty squad → Err');

  const sparse = balancedSquad().map((p) => ({ ...p, attributes: {}, form: undefined as unknown as number, stamina: undefined as unknown as number, morale: undefined as unknown as number }));
  const r = recommendBestTactics(inputOf(sparse));
  assert(r.ok && Number.isFinite(r.value.score), 'missing attributes/form/stamina/morale handled (no NaN)');

  const noGk = recommendBestTactics(inputOf(balancedSquad().filter((p) => p.position !== 'GK')));
  assert(noGk.ok, 'no goalkeeper at all still returns a (degraded) recommendation instead of crashing');

  const dupes = recommendBestTactics(inputOf([...balancedSquad(), P('gk1', 'GK', 99)]));
  assert(dupes.ok && new Set(xiIds(dupes.value)).size === 11, 'duplicate ids in the input are never double-picked');
}

// ------------------------------------------------------------------ 8. fitness
section('8) Fatigue and form influence the pick');
{
  const sq = balancedSquad().map((p) => (p.id === 'st1' ? { ...p, fatigue: 100, stamina: 20 } : p));
  const r = mustRecommend(inputOf(sq));
  const exhausted = r.lineup.some((l) => l.playerId === 'st1');
  assert(!exhausted, 'an exhausted 82-rated striker is rested in favour of a fresh 72-rated one');
  assert(r.reasons.some((x) => x.code === 'rested_tired_player'), 'the reason says a tired player was rested');

  const form = balancedSquad().map((p) => (p.id === 'st2' ? { ...p, overall: 80, form: 10 } : p.id === 'st1' ? { ...p, overall: 80, form: 1 } : p));
  const f = mustRecommend(inputOf(form, { currentTactics: { ...BASE_TACTICS, penaltyTakerId: '' } }));
  const strikerPicked = f.lineup.find((l) => l.assignedPosition === 'ST')?.playerId;
  assert(strikerPicked === 'st2', 'equal overall → the in-form striker starts over the out-of-form one');
}

// ------------------------------------------------------------------ 9. substitutes
section('9) Substitutes');
{
  const r = mustRecommend(inputOf(balancedSquad().map((p) => (p.id === 'gk2' ? { ...p, injuredWeeks: 2 } : p)), { maxSubstitutes: 5 }));
  const xi = new Set(xiIds(r));
  assert(r.substitutes.length === 5, 'fills exactly the cap');
  assert(r.substitutes.every((id) => !xi.has(id)), 'no substitute is also in the XI');
  assert(new Set(r.substitutes).size === r.substitutes.length, 'no duplicate substitutes');
  assert(!r.substitutes.includes('gk2'), 'injured goalkeeper not on the bench');
  assert(r.substitutes.some((id) => id.startsWith('gk')), 'a healthy backup goalkeeper is on the bench');
  assert(mustRecommend(inputOf(balancedSquad(), { maxSubstitutes: 0 })).substitutes.length === 0, 'cap 0 → no substitutes');
}

// ------------------------------------------------------------------ 10. apply
section('10) Applying (explicit, atomic, validated)');
{
  const players = balancedSquad();
  const club = {
    footballSquad: players as unknown as Player[],
    footballLineup: players.slice(0, 11).map((p) => p.id),
    footballBench: ['gk2'],
    footballTactics: BASE_TACTICS,
  };
  const snapshot = JSON.stringify(club);
  const rec = mustRecommend(inputOf(players, { currentLineup: club.footballLineup, currentTactics: BASE_TACTICS }));
  const applied = applyRecommendation(club, rec, { maxSubstitutes: 7 });
  assert(JSON.stringify(club) === snapshot, 'the original club object is not mutated');
  assert(applied.ok, 'recommendation applies cleanly');
  if (applied.ok) {
    const { state } = createSquadState(applied.value, { maxSubstitutes: 7 });
    assertEqual(validateForKickoff(state), [], 'applied squad passes validateForKickoff');
    assertEqual(applied.value.footballLineup, rec.lineup.map((l) => l.playerId), 'lineup written in slot order');
    assert(applied.value.footballTactics.formation === rec.formation && applied.value.footballTactics.tacticalStateVersion === rec.tactics.version, 'tactics written with the version stamp');

    // Re-running on the applied state recognises it as already optimal.
    const again = mustRecommend(inputOf(players, { currentLineup: applied.value.footballLineup, currentTactics: applied.value.footballTactics }));
    assert(again.alreadyOptimal && again.currentScore !== null && Math.abs(again.currentScore - again.score) < 0.01, 'after applying, the setup is reported as already optimal');
    assert(again.id === rec.id, 'same recommendation id → stable');
  }

  // Stale recommendation: a player got injured after the preview was shown.
  const stale = { ...club, footballSquad: players.map((p) => (p.id === rec.lineup[3].playerId ? { ...p, injuredWeeks: 2 } : p)) as unknown as Player[] };
  const blocked = applyRecommendation(stale, rec, { maxSubstitutes: 7 });
  assert(!blocked.ok && blocked.error.code === 'UNAVAILABLE_PLAYER', 'stale recommendation containing a newly injured player is rejected');
}

// ------------------------------------------------------------------ 11. i18n
section('11) Every produced reason is localized (ar + en)');
{
  const names = new Map(balancedSquad().map((p) => [p.id, p.id.toUpperCase()]));
  const codes = new Set<string>();
  const samples = [
    mustRecommend(inputOf(balancedSquad().map((p) => (p.id === 'st1' ? { ...p, injuredWeeks: 2, form: 10 } : p.id === 'cm1' ? { ...p, fatigue: 95 } : p)),
      { currentLineup: ['gk1', 'rb1', 'cb1', 'cb2', 'lb1', 'cdm1', 'cm1', 'cm2', 'rw1', 'st1', 'lw1'], opponent: { attack: 80, defense: 78, formation: '3-5-2', pressing: 'high_press', mentality: 'attacking' } })),
    mustRecommend(inputOf(balancedSquad().filter((p) => p.position !== 'RW' && p.position !== 'LW'))),
    base,
  ];
  samples.forEach((s) => s.reasons.forEach((x) => codes.add(x.code)));
  let allText = true;
  for (const s of samples) for (const x of s.reasons) {
    const ar = reasonText(x, names, true), en = reasonText(x, names, false);
    if (ar === x.code || en === x.code || ar === en || /undefined|NaN|\[object/.test(ar + en)) { allText = false; console.error('   bad text for', x.code, '|', ar, '|', en); }
  }
  assert(allText, `all ${codes.size} distinct reason codes render clean Arabic and English`);
}

finish('Best Tactics (Phase 4)');
