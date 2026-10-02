/**
 * Phase B.5 — golden scorelines with full set-piece resolution + aggregate tolerance.
 * Run: npx tsx scripts/testPhaseB5GoldenRebaseline.ts
 */

import { assert, assertEqual, finish, section } from './lib/testHarness';
import { FootballMatchEngine } from '../src/engine/footballEngine';
import { REAL_INITIAL_PLAYER_CLUB, REAL_OPPONENT_CLUBS } from '../src/data/realFootballData';
import { migrateClubFootballTactics } from '../src/domain/tactics/migrateFootballSimulation';

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

/** Re-baselined with baseline-relative instructions + live set pieces (Phase B.5). */
const BASELINE_B5: Record<number, string> = {
  20260929: '0-2',
  42424242: '0-2',
  777001: '2-1',
  99123: '1-1',
  555777: '2-2',
  123456: '2-0',
  908070: '0-0',
  314159: '2-0',
  271828: '0-1',
  161803: '0-0',
};

section('B.5 golden scorelines (10 seeds, set pieces on)');
{
  const home = migrateClubFootballTactics(clone(REAL_INITIAL_PLAYER_CLUB));
  const away = migrateClubFootballTactics(clone(REAL_OPPONENT_CLUBS[0]));
  const seeds = Object.keys(BASELINE_B5).map(Number);
  let match = 0;
  for (const seed of seeds) {
    const a = new FootballMatchEngine(home, away, seed, undefined, undefined, 0, 0).simulateFullMatch();
    const b = new FootballMatchEngine(home, away, seed, undefined, undefined, 0, 0).simulateFullMatch();
    const score = `${a.homeScore}-${a.awayScore}`;
    assertEqual(score, `${b.homeScore}-${b.awayScore}`, `deterministic B.5 seed ${seed}`);
    if (score === BASELINE_B5[seed]) match++;
    // Print for manual rebaseline if tolerance fails:
    if (score !== BASELINE_B5[seed]) {
      console.log(`seed ${seed}: expected ${BASELINE_B5[seed]} got ${score}`);
    }
  }
  assert(match / seeds.length >= 0.85, `≥85% B.5 scorelines (${match}/${seeds.length})`);
}

section('B.5 aggregate tolerance (200 seeds)');
{
  const home = migrateClubFootballTactics(clone(REAL_INITIAL_PLAYER_CLUB));
  const away = migrateClubFootballTactics(clone(REAL_OPPONENT_CLUBS[0]));
  let homeGoals = 0;
  let awayGoals = 0;
  let homeShots = 0;
  for (let seed = 1; seed <= 200; seed++) {
    const r = new FootballMatchEngine(home, away, seed * 9973, undefined, undefined, 0, 0).simulateFullMatch();
    homeGoals += r.homeScore;
    awayGoals += r.awayScore;
    homeShots += r.stats.homeShots;
  }
  assert(homeGoals >= 180 && homeGoals <= 420, `home goals band 200 seeds (${homeGoals})`);
  assert(awayGoals >= 180 && awayGoals <= 420, `away goals band 200 seeds (${awayGoals})`);
  assert(homeShots >= 1200 && homeShots <= 5500, `home shots band (${homeShots})`);
}

finish('Phase B.5 golden rebaseline');
