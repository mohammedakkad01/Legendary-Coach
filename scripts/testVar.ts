/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phase 6: VAR reviews on the user's match engine.
 * Offside is a label on an existing goal (see docs/phase6/var-known-limitations.md).
 */

import { readFileSync } from 'node:fs';
import { assert, assertEqual, finish, section } from './lib/testHarness';
import { FootballMatchEngine } from '../src/engine/footballEngine';
import { SeededRandom } from '../src/engine/prng';
import { REAL_INITIAL_PLAYER_CLUB, REAL_OPPONENT_CLUBS } from '../src/data/realFootballData';
import type { Club, MatchEvent, MatchRecord, MatchStats } from '../src/types/game';
import {
  DEFAULT_REFEREE_PROFILE,
  refereeProfileWithTraits,
} from '../src/domain/referee/createRefereeFromSeed';
import { deltasFromUserMatch, type SimTeam } from '../src/engine/matchdaySimulator';
import {
  applyVarDecision,
  commitIncident,
  goalOffsideLabelRate,
  isVarQualifying,
  maxReviewsPerMatch,
  penaltyErrorRate,
  prepareGoalReview,
  redErrorRate,
  scoresAreConsistent,
} from '../src/domain/var';
import type { VARReview, VarMatchState } from '../src/domain/var';

const cloneClub = (club: Club): Club => JSON.parse(JSON.stringify(club));
const homeClub = () => cloneClub(REAL_INITIAL_PLAYER_CLUB);
const awayClub = () => cloneClub(REAL_OPPONENT_CLUBS[0]);

function simulate(seed: number, varEnabled = false, referee?: typeof DEFAULT_REFEREE_PROFILE): MatchRecord {
  return new FootballMatchEngine(
    homeClub(),
    awayClub(),
    seed,
    undefined,
    undefined,
    0,
    0,
    referee,
    varEnabled,
  ).simulateFullMatch();
}

const baseStats = (): MatchStats => ({
  homePossession: 50,
  awayPossession: 50,
  homeShots: 4,
  awayShots: 1,
  homeShotsOnTarget: 2,
  awayShotsOnTarget: 1,
  homeCorners: 1,
  awayCorners: 0,
  homeFouls: 2,
  awayFouls: 1,
  homeYellowCards: 0,
  awayYellowCards: 0,
  homeRedCards: 0,
  awayRedCards: 0,
  homeXg: 0.32,
  awayXg: 0.08,
});

function goalEvent(over: Partial<MatchEvent> = {}): MatchEvent {
  return {
    minute: 20,
    sport: 'football',
    type: 'goal',
    team: 'home',
    playerId: 'p1',
    playerName: 'Ali',
    textAr: 'هدف',
    textEn: 'Goal',
    homeScore: 1,
    awayScore: 0,
    ...over,
  };
}

function review(over: Partial<VARReview> & Pick<VARReview, 'reviewType' | 'initialDecision' | 'finalDecision' | 'eventId'>): VARReview {
  return {
    reviewId: `var_match_1_${over.eventId}`,
    matchId: 'match_1',
    confidence: 0.8,
    timestamp: 20,
    explanationAr: 'مراجعة',
    explanationEn: 'Review',
    ...over,
  };
}

function stateOf(events: MatchEvent[], stats: MatchStats = baseStats(), reviews: VARReview[] = []): VarMatchState {
  let home = 0;
  let away = 0;
  for (const event of events) {
    if (event.type === 'goal' && !event.annulled) {
      if (event.team === 'home') home += 1;
      else away += 1;
    }
  }
  return {
    matchId: 'match_1',
    minute: 20,
    homeScore: home,
    awayScore: away,
    events,
    stats,
    varReviews: reviews,
  };
}

class FixedRoll extends SeededRandom {
  constructor(private readonly roll: number) {
    super(1);
  }
  override nextFloat(): number {
    return this.roll;
  }
}

const neutral = refereeProfileWithTraits(DEFAULT_REFEREE_PROFILE, {
  strictness: 50,
  foulSensitivity: 50,
  varTendency: 50,
});

// --------------------------------------------------------------- Test 1
section('Test 1: qualifying incidents can open a review; ordinary events cannot');
{
  assert(isVarQualifying('goal') && isVarQualifying('penalty') && isVarQualifying('red_card'), 'goal, penalty, and red are qualifying');
  assert(!isVarQualifying('foul') && !isVarQualifying('yellow_card'), 'foul and yellow never qualify');
  assert(!isVarQualifying('save') && !isVarQualifying('corner') && !isVarQualifying('shot'), 'save, corner, and shot never qualify');

  const eager = refereeProfileWithTraits(neutral, { varTendency: 100 });
  let sample: MatchRecord | null = null;
  for (let seed = 1; seed <= 40; seed += 1) {
    const record = simulate(seed, true, eager);
    if ((record.varReviews?.length ?? 0) > 0) {
      sample = record;
      break;
    }
  }
  assert(sample !== null && (sample.varReviews?.length ?? 0) > 0, 'VAR on, high tendency: at least one review in seeds 1..40');
  if (sample?.varReviews) {
    for (const item of sample.varReviews) {
      const event = sample.events.find((candidate) => candidate.eventId === item.eventId);
      assert(!!event, `review ${item.reviewId} points at a real event`);
      if (!event) continue;
      if (item.reviewType === 'goal') assertEqual(event.type, 'goal', 'goal review is attached to a goal');
      if (item.reviewType === 'red_card') assertEqual(event.type, 'red_card', 'red review is attached to a red card');
      if (item.reviewType === 'penalty') {
        assert(event.type === 'goal' || event.type === 'foul', 'penalty review is attached to the penalty incident');
      }
      assert(event.type !== 'yellow_card' && event.type !== 'save', 'a review is never attached to a yellow or a save');
    }
  }
}

// --------------------------------------------------------------- Test 2
section('Test 2: goal confirmed, goal overturned, truth not stored after the review');
{
  const confirmed = applyVarDecision(
    stateOf([goalEvent({ eventId: 'e0', incidentTruth: 'goal' })]),
    review({ reviewType: 'goal', eventId: 'e0', initialDecision: 'goal', finalDecision: 'goal' }),
  );
  assertEqual(confirmed.homeScore, 1, 'confirmed goal keeps the score');
  assert(!confirmed.events[0]?.annulled, 'confirmed goal is not annulled');
  assert(confirmed.events.every((event) => !('incidentTruth' in event)), 'incidentTruth is removed after a confirmed review');
  assert(scoresAreConsistent(confirmed), 'score matches non-annulled goals after a confirmation');

  const later = goalEvent({ minute: 44, eventId: 'e1', homeScore: 2, playerId: 'p2' });
  const overturned = applyVarDecision(
    stateOf([
      goalEvent({ eventId: 'e0', incidentTruth: 'no_goal', homeScore: 1 }),
      later,
    ]),
    review({ reviewType: 'goal', eventId: 'e0', initialDecision: 'goal', finalDecision: 'no_goal' }),
  );
  assertEqual(overturned.homeScore, 1, 'overturning the first goal leaves the later goal');
  assert(overturned.events[0]?.annulled === true, 'the disallowed goal stays in the log');
  assertEqual(overturned.events[1]?.homeScore, 1, 'later events carry the corrected score');
  assertEqual(overturned.stats.homeShots, 4, 'overturning a goal does not change shots');
  assert(overturned.events.every((event) => !('incidentTruth' in event)), 'incidentTruth is removed after an overturn');
  assert(scoresAreConsistent(overturned), 'score matches non-annulled goals after an overturn');
}

// --------------------------------------------------------------- Test 3
section('Test 3: penalty awarded, penalty cancelled');
{
  const takerId = homeClub().footballSquad.find((player) => player.position !== 'GK')!.id;
  const awarded = applyVarDecision(
    stateOf([goalEvent({ type: 'foul', eventId: 'e0', playerId: takerId, playerName: 'Taker', homeScore: 0, textAr: 'play', textEn: 'play' })]),
    review({
      reviewType: 'penalty',
      eventId: 'e0',
      initialDecision: 'no_penalty',
      finalDecision: 'penalty',
      awardedKickScored: true,
      awardedPlayerId: takerId,
      awardedPlayerName: 'Taker',
      awardedPlayerNameEn: 'Taker',
    }),
  );
  const awardedGoals = awarded.events.filter((event) => event.type === 'goal' && !event.annulled);
  assertEqual(awardedGoals.length, 1, 'VAR awards a penalty by appending a goal');
  assertEqual(awarded.homeScore, 1, 'the awarded penalty updates the score');
  assertEqual(awardedGoals[0]?.playerId, takerId, 'the awarded goal uses the real penalty taker id');
  assertEqual(awarded.stats.homeShots, 4, 'awarding a penalty does not invent a shot');
  assert(awarded.events.every((event) => !('incidentTruth' in event)), 'awarding a penalty does not keep incidentTruth');
  assert(scoresAreConsistent(awarded), 'score matches goals after a penalty is awarded');

  const cancelled = applyVarDecision(
    stateOf([goalEvent({ eventId: 'e0', playerId: takerId })]),
    review({ reviewType: 'penalty', eventId: 'e0', initialDecision: 'penalty', finalDecision: 'no_penalty' }),
  );
  assertEqual(cancelled.homeScore, 0, 'cancelling a scored penalty removes the goal from the score');
  assert(cancelled.events[0]?.annulled === true && cancelled.events[0]?.type === 'goal', 'the cancelled penalty goal is annulled, not deleted');
  assertEqual(cancelled.stats.homeShots, 4, 'cancelling a penalty does not change shots');
  assert(scoresAreConsistent(cancelled), 'score matches goals after a penalty is cancelled');
}

// --------------------------------------------------------------- Test 4
section('Test 4: red card confirmed and overturned');
{
  const stats = { ...baseStats(), homeRedCards: 1 };
  const red = goalEvent({ type: 'red_card', eventId: 'e0', homeScore: 0, textAr: 'أحمر', textEn: 'Red' });
  const confirmed = applyVarDecision(
    stateOf([red], stats),
    review({ reviewType: 'red_card', eventId: 'e0', initialDecision: 'red', finalDecision: 'red' }),
  );
  assertEqual(confirmed.stats.homeRedCards, 1, 'a confirmed red keeps the card count');
  assert(!confirmed.events[0]?.annulled, 'a confirmed red stays in force');
  assert(scoresAreConsistent(confirmed), 'state stays consistent when a red is confirmed');

  const overturned = applyVarDecision(
    stateOf([red], stats),
    review({ reviewType: 'red_card', eventId: 'e0', initialDecision: 'red', finalDecision: 'no_red' }),
  );
  assertEqual(overturned.stats.homeRedCards, 0, 'an overturned red decrements the card count');
  assert(overturned.events[0]?.annulled === true, 'the overturned red stays in the log');
  assert(scoresAreConsistent(overturned), 'state stays consistent when a red is overturned');
}

// --------------------------------------------------------------- Test 5
section('Test 5: review limit, and a thrown review leaves the match unchanged');
{
  const events = Array.from({ length: 6 }, (_, index) => goalEvent({
    minute: 10 + index,
    eventId: undefined,
    homeScore: index + 1,
    playerId: `p${index}`,
  }));
  let state = stateOf(events, { ...baseStats(), homeShots: 6, homeShotsOnTarget: 6 });
  state = { ...state, homeScore: 6 };
  const rng = new FixedRoll(0);
  let opened = 0;
  for (let index = 0; index < events.length; index += 1) {
    const planned = prepareGoalReview(state, index, rng, neutral);
    const next = commitIncident(state, planned.prepared, planned.review);
    if (planned.review) opened += 1;
    state = next;
  }
  assertEqual(opened, maxReviewsPerMatch(), 'the review cap stops further reviews');
  assertEqual(state.varReviews.length, maxReviewsPerMatch(), 'stored reviews equal the cap');
  assertEqual(state.homeScore, 6 - maxReviewsPerMatch(), 'only the capped reviews overturn goals');
  assertEqual(state.stats.homeShots, 6, 'the cap path does not touch shots');
  assert(state.events.every((event) => !('incidentTruth' in event)), 'capped reviews do not keep incidentTruth');
  assert(scoresAreConsistent(state), 'state stays consistent at the review cap');

  const intact = stateOf([goalEvent({ eventId: 'e0', incidentTruth: 'goal' })]);
  const snapshot = JSON.stringify(intact);
  const broken = review({ reviewType: 'goal', eventId: 'missing', initialDecision: 'goal', finalDecision: 'no_goal' });
  const rolledBack = commitIncident(intact, intact, broken);
  assert(rolledBack === intact, 'a thrown review returns the pre-review state');
  assertEqual(JSON.stringify(intact), snapshot, 'a thrown review does not mutate the input');
  const continued = applyVarDecision(
    stateOf([goalEvent({ eventId: 'e0' })]),
    review({ reviewType: 'goal', eventId: 'e0', initialDecision: 'goal', finalDecision: 'goal' }),
  );
  assertEqual(continued.varReviews.length, 1, 'the match can still accept a later review');
}

function stripSetPieceEvents(events: MatchEvent[]): MatchEvent[] {
  return events.filter((e) => !e.setPieceKind);
}

function outcomeBucket(h: number, a: number): 'H' | 'D' | 'A' {
  if (h > a) return 'H';
  if (h < a) return 'A';
  return 'D';
}

// --------------------------------------------------------------- Test 6
section('Test 6: same seed, same reviews; VAR off matches set-piece-aware snapshot');
{
  const seed = 42424242;
  const fixture = JSON.parse(readFileSync('scripts/fixtures/preVar-seed-42424242.json', 'utf8')) as {
    seed: number;
    homeScore: number;
    awayScore: number;
    referee: unknown;
    stats: MatchStats;
    events: MatchEvent[];
  };

  // Aggregate proof: set pieces change the event stream/stats but not score distribution (200 seeds).
  const sampleSeeds = 200;
  const buckets = { H: 0, D: 0, A: 0 };
  let totalGoals = 0;
  let totalReds = 0;
  for (let s = 1; s <= sampleSeeds; s += 1) {
    const r = simulate(s, false);
    const b = outcomeBucket(r.homeScore, r.awayScore);
    buckets[b] += 1;
    totalGoals += r.homeScore + r.awayScore;
    totalReds += r.stats.homeRedCards + r.stats.awayRedCards;
  }
  const homeWinPct = (buckets.H / sampleSeeds) * 100;
  const drawPct = (buckets.D / sampleSeeds) * 100;
  const awayWinPct = (buckets.A / sampleSeeds) * 100;
  assert(homeWinPct >= 20 && homeWinPct <= 60, `home win % in sane band (${homeWinPct.toFixed(1)})`);
  assert(drawPct >= 10 && drawPct <= 40, `draw % in sane band (${drawPct.toFixed(1)})`);
  assert(awayWinPct >= 20 && awayWinPct <= 60, `away win % in sane band (${awayWinPct.toFixed(1)})`);
  assert(totalGoals / sampleSeeds >= 1.5 && totalGoals / sampleSeeds <= 5.5, `goals/match mean ${(totalGoals / sampleSeeds).toFixed(2)}`);
  assert(totalReds / sampleSeeds <= 0.35, `red cards/match mean ${(totalReds / sampleSeeds).toFixed(3)}`);

  const off = simulate(seed, false);
  assert(off.varReviews === undefined, 'VAR off does not attach reviews');

  const setPieceOnly =
    off.events.filter((e) => e.setPieceKind).length > 0 &&
    stripSetPieceEvents(off.events).length < off.events.length;
  assert(setPieceOnly, 'current engine emits set-piece-tagged events for golden seed');

  assertEqual(
    { seed: off.seed, homeScore: off.homeScore, awayScore: off.awayScore, referee: off.referee, stats: off.stats, events: off.events },
    fixture,
    'VAR off matches set-piece-aware snapshot (seed 42424242)',
  );

  const withoutSetPieces = {
    ...off,
    events: stripSetPieceEvents(off.events),
    stats: fixture.stats,
  };
  const legacyCore = {
    seed: fixture.seed,
    homeScore: fixture.homeScore,
    awayScore: fixture.awayScore,
    referee: fixture.referee,
    events: stripSetPieceEvents(fixture.events),
  };
  assertEqual(
    {
      seed: withoutSetPieces.seed,
      homeScore: withoutSetPieces.homeScore,
      awayScore: withoutSetPieces.awayScore,
      referee: withoutSetPieces.referee,
      events: withoutSetPieces.events,
    },
    legacyCore,
    'score/referee/non-set-piece events align with legacy core (seed 42424242)',
  );

  const referee = refereeProfileWithTraits(neutral, { varTendency: 80 });
  const first = simulate(seed, true, referee);
  const second = simulate(seed, true, referee);
  assertEqual(first.varReviews ?? [], second.varReviews ?? [], 'the same seed produces the same reviews');
  assertEqual(
    { home: first.homeScore, away: first.awayScore, events: first.events, stats: first.stats },
    { home: second.homeScore, away: second.awayScore, events: second.events, stats: second.stats },
    'the same seed produces the same score, events, and stats',
  );
  assert(JSON.stringify(first).includes('incidentTruth') === false, 'a finished VAR match does not store incidentTruth');
  assert(scoresAreConsistent({ homeScore: first.homeScore, awayScore: first.awayScore, events: first.events, stats: first.stats }), 'VAR-on match score matches its goals');
}

// --------------------------------------------------------------- Test 7
section('Test 7: error and overturn rates stay inside the configured bounds');
{
  const seeds = 160;
  let goalReviews = 0;
  let goalOverturns = 0;
  let penaltyReviews = 0;
  let penaltyOverturns = 0;
  let redReviews = 0;
  let redOverturns = 0;
  const pGoal = goalOffsideLabelRate(neutral);
  const pPenalty = penaltyErrorRate(neutral);
  const pRed = redErrorRate(neutral);
  let badSeed: string | null = null;
  for (let index = 0; index < seeds; index += 1) {
    const record = simulate(20_000 + index, true, neutral);
    const consistent = scoresAreConsistent({ homeScore: record.homeScore, awayScore: record.awayScore, events: record.events, stats: record.stats });
    if (!consistent) badSeed = `seed ${20_000 + index} score/stats diverged`;
    if (JSON.stringify(record.events).includes('incidentTruth')) badSeed = `seed ${20_000 + index} kept incidentTruth`;
    for (const item of record.varReviews ?? []) {
      const overturn = item.initialDecision !== item.finalDecision;
      if (item.reviewType === 'goal') {
        goalReviews += 1;
        if (overturn) goalOverturns += 1;
      } else if (item.reviewType === 'penalty') {
        penaltyReviews += 1;
        if (overturn) penaltyOverturns += 1;
      } else {
        redReviews += 1;
        if (overturn) redOverturns += 1;
      }
    }
  }

  const within = (successes: number, total: number, probability: number, label: string) => {
    if (total < 30) {
      assert(successes <= total, `${label} sample ${successes}/${total} is inside 0..n (rare incident)`);
      return;
    }
    const mean = total * probability;
    const sd = Math.sqrt(total * probability * (1 - probability));
    const z = sd === 0 ? 0 : (successes - mean) / sd;
    assert(Math.abs(z) < 4, `${label} overturns ${successes}/${total} vs p=${probability.toFixed(3)} (z=${z.toFixed(2)})`);
  };
  assert(badSeed === null, badSeed ?? `all ${seeds} VAR matches stay consistent and drop incidentTruth`);
  within(goalOverturns, goalReviews, pGoal, 'goal offside-label');
  within(penaltyOverturns, penaltyReviews, pPenalty, 'penalty');
  within(redOverturns, redReviews, pRed, 'red');
  assert(goalReviews > 0 && penaltyReviews > 0, `neutral sample contains goal and penalty reviews (goals ${goalReviews}, penalties ${penaltyReviews}, reds ${redReviews})`);
}

// --------------------------------------------------------------- Test 8
section('Test 8: annulled goals and cards are not credited; the league simulator never calls VAR');
{
  const club = homeClub();
  const opponent = awayClub();
  const user: SimTeam = {
    clubId: club.id,
    clubName: club.name,
    xi: club.footballLineup.slice(0, 11).map((id) => club.footballSquad.find((player) => player.id === id)!),
  };
  const opp: SimTeam = {
    clubId: opponent.id,
    clubName: opponent.name,
    xi: opponent.footballLineup.slice(0, 11).map((id) => opponent.footballSquad.find((player) => player.id === id)!),
  };
  const scorer = user.xi[1]!;
  const recordFor = (annulled: boolean, type: 'goal' | 'red_card'): MatchRecord => ({
    id: 'match_stats',
    sport: 'football',
    seed: 1,
    homeClubId: club.id,
    homeClubName: club.name,
    awayClubId: opponent.id,
    awayClubName: opponent.name,
    homeScore: type === 'goal' && !annulled ? 1 : 0,
    awayScore: 0,
    events: [goalEvent({ type, playerId: scorer.id, playerName: scorer.name, annulled, homeScore: type === 'goal' && !annulled ? 1 : 0 })],
    stats: baseStats(),
    isFinished: true,
    competition: 'league',
    matchDay: 1,
    date: '2026-10-01',
  });
  const sum = (record: MatchRecord, field: 'goals' | 'redCards' | 'assists') =>
    deltasFromUserMatch(record, user, opp, new SeededRandom(3))
      .filter((delta) => delta.clubId === club.id)
      .reduce((total, delta) => total + delta[field], 0);

  assertEqual(sum(recordFor(true, 'goal'), 'goals'), 0, 'an annulled goal is not credited');
  assertEqual(sum(recordFor(true, 'goal'), 'assists'), 0, 'an annulled goal does not invent an assist');
  assertEqual(sum(recordFor(false, 'goal'), 'goals'), 1, 'a standing goal is still credited');
  assertEqual(sum(recordFor(true, 'red_card'), 'redCards'), 0, 'an annulled red is not credited');
  assertEqual(sum(recordFor(false, 'red_card'), 'redCards'), 1, 'a standing red is still credited');

  const simulator = readFileSync('src/engine/matchdaySimulator.ts', 'utf8');
  assert(!simulator.includes('domain/var'), 'matchdaySimulator does not import VAR');
  assert(!simulator.includes('applyVarDecision') && !simulator.includes('prepareGoalReview'), 'matchdaySimulator does not call VAR');
  assert(simulator.includes('ev.annulled'), 'user-match stat credit skips annulled events');

  const store = readFileSync('src/state/useGameStore.ts', 'utf8');
  assertEqual((store.match(/matchReferee,\n\s+true,/g) ?? []).length, 2, 'live kickoff and skip pass varEnabled true');
  const tuning = readFileSync('src/config/gameTuning.ts', 'utf8');
  const varBlock = tuning.slice(tuning.indexOf('export const VAR'), tuning.indexOf('deepFreeze(VAR)'));
  assert(!varBlock.includes('enabled'), 'the VAR on/off switch is not a tuning constant');
  const notes = readFileSync('docs/phase6/var-known-limitations.md', 'utf8');
  assert(notes.includes('does not simulate offside') && tuning.includes('KNOWN LIMITATION'), 'the offside label is documented as a known limitation');
}

// --------------------------------------------------------------- Test 9
section('Test 9: the engine itself awards, cancels, confirms, and overturns');
{
  const harsh = refereeProfileWithTraits(neutral, {
    strictness: 0,
    foulSensitivity: 100,
    cardTendency: 100,
    penaltyTendency: 100,
    advantageTendency: 0,
    varTendency: 100,
  });
  let awarded = 0;
  let cancelled = 0;
  let goalsKept = 0;
  let goalsOverturned = 0;
  let redsKept = 0;
  let redsOverturned = 0;
  for (let seed = 4000; seed < 4400; seed += 1) {
    const record = simulate(seed, true, harsh);
    for (const item of record.varReviews ?? []) {
      if (item.reviewType === 'penalty' && item.initialDecision === 'no_penalty' && item.finalDecision === 'penalty') awarded += 1;
      if (item.reviewType === 'penalty' && item.initialDecision === 'penalty' && item.finalDecision === 'no_penalty') cancelled += 1;
      if (item.reviewType === 'goal' && item.finalDecision === 'goal') goalsKept += 1;
      if (item.reviewType === 'goal' && item.finalDecision === 'no_goal') goalsOverturned += 1;
      if (item.reviewType === 'red_card' && item.finalDecision === 'red') redsKept += 1;
      if (item.reviewType === 'red_card' && item.finalDecision === 'no_red') redsOverturned += 1;
    }
  }
  assert(awarded > 0, `engine awards a withheld penalty (${awarded} in 400 matches)`);
  assert(cancelled > 0, `engine cancels a wrongly given penalty (${cancelled} in 400 matches)`);
  assert(goalsKept > 0 && goalsOverturned > 0, `engine confirms and overturns goals (${goalsKept} kept, ${goalsOverturned} overturned)`);
  assert(redsKept > 0 && redsOverturned > 0, `engine confirms and overturns reds (${redsKept} kept, ${redsOverturned} overturned)`);
}

finish('VAR (Phase 6)');
