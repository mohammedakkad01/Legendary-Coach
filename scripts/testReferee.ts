/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phase 5: seeded referee profiles and discipline effects in FootballMatchEngine.
 */

import { assert, assertEqual, finish, section } from './lib/testHarness';
import { FootballMatchEngine } from '../src/engine/footballEngine';
import { REAL_INITIAL_PLAYER_CLUB, REAL_OPPONENT_CLUBS } from '../src/data/realFootballData';
import type { Club, MatchRecord } from '../src/types/game';
import {
  createRefereeFromSeed,
  DEFAULT_REFEREE_PROFILE,
  refereeProfileWithTraits,
} from '../src/domain/referee/createRefereeFromSeed';

const cloneClub = (c: Club): Club => JSON.parse(JSON.stringify(c));
const home = () => cloneClub(REAL_INITIAL_PLAYER_CLUB);
const away = () => cloneClub(REAL_OPPONENT_CLUBS[0]);

function simulate(seed: number, referee = createRefereeFromSeed(seed)) {
  return new FootballMatchEngine(home(), away(), seed, undefined, undefined, 0, 0, referee).simulateFullMatch();
}

function totalCards(stats: MatchRecord['stats']): number {
  return (
    stats.homeYellowCards +
    stats.awayYellowCards +
    stats.homeRedCards +
    stats.awayRedCards
  );
}

function totalFouls(stats: MatchRecord['stats']): number {
  return stats.homeFouls + stats.awayFouls;
}

// ---------------------------------------------------------------- Test 1
section('Test 1: same match seed → same referee profile and discipline outcome');
{
  const SEED = 42424242;
  const refA = createRefereeFromSeed(SEED);
  const refB = createRefereeFromSeed(SEED);
  assertEqual(refA.id, refB.id, 'referee id is seed-stable');
  assertEqual(refA.strictness, refB.strictness, 'strictness is seed-stable');

  const run1 = simulate(SEED, refA);
  const run2 = simulate(SEED, refB);
  assertEqual(run1.referee?.id, run2.referee?.id, 'record carries the same referee');
  assertEqual(totalFouls(run1.stats), totalFouls(run2.stats), 'fouls replay identically');
  assertEqual(totalCards(run1.stats), totalCards(run2.stats), 'cards replay identically');
  assertEqual(run1.homeScore, run2.homeScore, 'score replay identically');
}

// ---------------------------------------------------------------- Test 2
section('Test 2: strict/card-heavy referee yields more discipline than lenient (Monte Carlo)');
{
  const N = 120;
  const strictRef = refereeProfileWithTraits(DEFAULT_REFEREE_PROFILE, {
    strictness: 95,
    foulSensitivity: 95,
    cardTendency: 95,
    penaltyTendency: 50,
    advantageTendency: 5,
  });
  const lenientRef = refereeProfileWithTraits(DEFAULT_REFEREE_PROFILE, {
    strictness: 5,
    foulSensitivity: 5,
    cardTendency: 5,
    penaltyTendency: 50,
    advantageTendency: 95,
  });

  let strictFouls = 0;
  let lenientFouls = 0;
  let strictCards = 0;
  let lenientCards = 0;

  for (let i = 0; i < N; i++) {
    const seed = 900_000 + i;
    const strictRun = simulate(seed, strictRef);
    const lenientRun = simulate(seed + 50_000, lenientRef);
    strictFouls += totalFouls(strictRun.stats);
    lenientFouls += totalFouls(lenientRun.stats);
    strictCards += totalCards(strictRun.stats);
    lenientCards += totalCards(lenientRun.stats);
  }

  assert(
    strictFouls > lenientFouls,
    `high foul sensitivity raises foul count (${strictFouls} strict vs ${lenientFouls} lenient over ${N} matches)`,
  );
  assert(
    strictCards > lenientCards,
    `strict/card-heavy profile raises card count (${strictCards} strict vs ${lenientCards} lenient over ${N} matches)`,
  );
}

// ---------------------------------------------------------------- Test 3
section('Test 3: missing referee on record is re-derived from match seed');
{
  const SEED = 7777777;
  const withRef = simulate(SEED);
  const engineNoRef = new FootballMatchEngine(home(), away(), SEED, undefined, undefined, 0, 0);
  const derived = engineNoRef.getReferee();
  assertEqual(withRef.referee?.id, derived.id, 'engine derives the same referee id from seed alone');
}

finish('testReferee');
