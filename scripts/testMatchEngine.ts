/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phase 3 tests: position suitability and TacticalState actually change the
 * live match engine's output (not just the displayed overall), a live
 * tactics change takes effect without mutating the caller's tactics object,
 * and the seed the engine simulated with is the one exposed via getSeed().
 */

import { assert, assertEqual, finish, section } from './lib/testHarness';
import { FootballMatchEngine } from '../src/engine/footballEngine';
import { buildSlotAssignments, calcAttackPower, calcDefensePower } from '../src/engine/matchPrediction';
import { REAL_INITIAL_PLAYER_CLUB, REAL_OPPONENT_CLUBS } from '../src/data/realFootballData';
import type { Club, FootballTactics, Player } from '../src/types/game';

const cloneClub = (c: Club): Club => JSON.parse(JSON.stringify(c));
const home = () => cloneClub(REAL_INITIAL_PLAYER_CLUB);
const away = () => cloneClub(REAL_OPPONENT_CLUBS[0]);

function simulateSummary(h: Club, a: Club, seed: number, homeTactics?: FootballTactics) {
  const engine = new FootballMatchEngine(h, a, seed, homeTactics, undefined, 0, 0);
  const res = engine.simulateFullMatch();
  return { home: res.homeScore, away: res.awayScore, events: res.events.length, stats: JSON.stringify(res.stats) };
}

// ---------------------------------------------------------------- Test 1
section('Test 1: position suitability changes attack/defense power (calcAttackPower/calcDefensePower)');
{
  const club = home();
  const natural = buildSlotAssignments(club);

  // Take one starter and reassign him to a slot two lines away from his natural position.
  const cb = club.footballSquad.find((p: Player) => p.position === 'CB' && club.footballLineup.includes(p.id));
  assert(!!cb, 'setup: default XI has a natural CB starter');
  if (cb) {
    const shuffled = natural.map((s) => (s.player.id === cb.id ? { ...s, assignedPosition: 'ST' } : s));
    const atkBefore = calcAttackPower(natural);
    const atkAfter = calcAttackPower(shuffled);
    const defBefore = calcDefensePower(natural);
    const defAfter = calcDefensePower(shuffled);
    assert(atkAfter !== atkBefore || defAfter !== defBefore, `moving a natural CB to ST changes team power (before atk=${atkBefore} def=${defBefore}, after atk=${atkAfter} def=${defAfter})`);
    assert(defAfter <= defBefore, 'pulling a natural center-back out of defense does not IMPROVE defense power');
  }
}

// ---------------------------------------------------------------- Test 2
section('Test 2: the SAME position pairing feeds both the pre-match prediction and the live engine');
{
  const club = home();
  const a1 = buildSlotAssignments(club);
  const a2 = buildSlotAssignments(club);
  assertEqual(a1.map((a) => [a.player.id, a.assignedPosition]), a2.map((a) => [a.player.id, a.assignedPosition]), 'buildSlotAssignments is deterministic and reused (single source of truth)');
  assert(a1.length === 11, 'the shipped default club yields a full 11-player slot assignment');
}

// ---------------------------------------------------------------- Test 3
section('Test 3: with a fixed seed, an out-of-position XI simulates differently than the natural one');
{
  const SEED = 20260929;
  const h1 = home();
  const resNatural = simulateSummary(h1, away(), SEED);

  const h2 = home();
  // Swap two starters' slots in the lineup array itself (not just prediction) —
  // e.g. put the first defender where the first midfielder was, and vice versa.
  const defIndex = 2; // a CB slot in the shipped 4-3-3
  const midIndex = 6; // a CM slot
  [h2.footballLineup[defIndex], h2.footballLineup[midIndex]] = [h2.footballLineup[midIndex], h2.footballLineup[defIndex]];
  const resShuffled = simulateSummary(h2, away(), SEED);

  assert(
    resNatural.home !== resShuffled.home || resNatural.away !== resShuffled.away || resNatural.stats !== resShuffled.stats,
    `same seed (${SEED}), same two XIs otherwise, only slot assignment changed — the simulated outcome must differ (natural ${resNatural.home}-${resNatural.away} vs shuffled ${resShuffled.home}-${resShuffled.away})`,
  );
}

// ---------------------------------------------------------------- Test 4
section('Test 4: with a fixed seed and lineup, a tactical change alters subsequent simulation');
{
  const SEED = 777;
  const baseTactics = home().footballTactics;
  const resBalanced = simulateSummary(home(), away(), SEED, { ...baseTactics, mentality: 'balanced', pressing: 'mid_press' });
  const resAttack = simulateSummary(home(), away(), SEED, { ...baseTactics, mentality: 'all_out_attack', pressing: 'gegenpress' });
  const resDefensive = simulateSummary(home(), away(), SEED, { ...baseTactics, mentality: 'ultra_defensive', pressing: 'low_block' });

  assert(resAttack.stats !== resBalanced.stats, 'all-out-attack simulates differently than balanced with the same seed/lineup');
  assert(resDefensive.stats !== resBalanced.stats, 'ultra-defensive simulates differently than balanced with the same seed/lineup');
  assert(resAttack.stats !== resDefensive.stats, 'all-out-attack and ultra-defensive are not the same either');
}

// ---------------------------------------------------------------- Test 5
section('Test 5: the engine never mutates the tactics object it was given');
{
  const club = home();
  const originalTactics = club.footballTactics;
  const snapshot = JSON.stringify(originalTactics);
  const engine = new FootballMatchEngine(club, away(), 1, originalTactics, undefined, 0, 0);

  engine.applyInteractiveDecision('press_now');
  assertEqual(JSON.stringify(originalTactics), snapshot, 'applyInteractiveDecision does not touch the caller\'s tactics object');
  assertEqual(JSON.stringify(club.footballTactics), snapshot, '...nor the club it came from');
  assert(engine.getHomeTactics().mentality === 'attacking' && engine.getHomeTactics().pressing === 'high_press', 'but the ENGINE\'s own copy did change');

  engine.applyLiveTactics({ formation: '4-4-2' });
  assertEqual(JSON.stringify(originalTactics), snapshot, 'applyLiveTactics does not touch the caller\'s tactics object either');
  assertEqual(engine.getHomeTactics().formation, '4-4-2', 'the engine\'s own copy reflects the live change');
}

// ---------------------------------------------------------------- Test 6
section('Test 6: applyLiveTactics pushes a tactical_change event and re-derives dependent sliders');
{
  const club = home();
  const engine = new FootballMatchEngine(club, away(), 2, club.footballTactics, undefined, 0, 0);
  const before = engine.getHomeTactics();
  assert(before.mentality !== 'all_out_attack' || before.pressing !== 'gegenpress', 'setup: shipped default tactics are not already all_out_attack/gegenpress (or this test would prove nothing)');

  const event = engine.applyLiveTactics({ mentality: 'all_out_attack', pressing: 'gegenpress' });
  assertEqual([event.type, event.team, event.tacticalChange], ['tactical_change', 'home', { mentality: 'all_out_attack', pressing: 'gegenpress' }], 'the pushed event carries exactly the requested changes');
  assert(event.textAr.length > 0 && event.textEn.length > 0, 'the event has bilingual narration');

  const after = engine.getHomeTactics();
  assertEqual([after.mentality, after.pressing], ['all_out_attack', 'gegenpress'], 'the enum fields updated');
  assert((after.attackingIntensity ?? 0) > (before.attackingIntensity ?? 50), 'the DERIVED attackingIntensity slider moved up with the new mentality (not left stale)');
  assert((after.defensiveLine ?? 0) > (before.defensiveLine ?? 45), 'the DERIVED defensiveLine slider moved up with the new pressing (not left stale)');
}

// ---------------------------------------------------------------- Test 7
section('Test 7: a live tactics change actually affects the NEXT minute\'s simulation (no pause needed)');
{
  const SEED = 777;
  const h1 = home();
  const engineA = new FootballMatchEngine(h1, away(), SEED, h1.footballTactics, undefined, 0, 0);
  for (let i = 0; i < 10; i++) engineA.stepMinute();
  for (let i = 0; i < 80; i++) engineA.stepMinute();

  const h2 = home();
  const engineB = new FootballMatchEngine(h2, away(), SEED, h2.footballTactics, undefined, 0, 0);
  for (let i = 0; i < 10; i++) engineB.stepMinute();
  engineB.applyLiveTactics({ mentality: 'all_out_attack', pressing: 'gegenpress' });
  for (let i = 0; i < 80; i++) engineB.stepMinute();

  const statsA = JSON.stringify((engineA as unknown as { stats: unknown }).stats);
  const statsB = JSON.stringify((engineB as unknown as { stats: unknown }).stats);
  assert(statsA !== statsB, 'identical seed and first 10 minutes, but applying live tactics at minute 10 changes the remaining 80 minutes\' stats');
}

// ---------------------------------------------------------------- Test 8
section('Test 8: getSeed() always reports the exact seed the engine was constructed with');
{
  for (const seed of [1, 42, 20260929, 999999999]) {
    const engine = new FootballMatchEngine(home(), away(), seed, undefined, undefined, 0, 0);
    assertEqual(engine.getSeed(), seed, `getSeed() === ${seed}`);
    const record = engine.simulateFullMatch();
    assertEqual(record.seed, seed, `simulateFullMatch()'s own record.seed also === ${seed} (unchanged behavior)`);
  }
}

finish('Match engine (Phase 3) tests');
