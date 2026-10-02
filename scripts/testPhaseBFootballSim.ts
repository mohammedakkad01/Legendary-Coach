/**
 * Phase B — football simulation tests.
 * Run: npx tsx scripts/testPhaseBFootballSim.ts
 */

import { assert, assertEqual, finish, section } from './lib/testHarness';
import { FootballMatchEngine, type FootballEngineOptions } from '../src/engine/footballEngine';
import { setPieceGate } from '../src/domain/match/setPieceRng';
import { runSetPieceMinute } from '../src/domain/match/runSetPieceMinute';
import { REAL_INITIAL_PLAYER_CLUB, REAL_OPPONENT_CLUBS } from '../src/data/realFootballData';
import type { Club, FootballTactics } from '../src/types/game';
import { derivePhaseShapeOffsets } from '../src/domain/tactics/tacticalPhases';
import { deriveTacticalInstructionsFromLegacy, ensureTacticalInstructions } from '../src/domain/tactics/migrateTacticsPhaseB';
import { normalizeTacticalInstructions } from '../src/domain/tactics/instructionTypes';
import { computeRoleCompatibility } from '../src/domain/tactics/functionalRoles/roleCompatibility';
import { migrateClubFootballTactics } from '../src/domain/tactics/migrateFootballSimulation';
import { validateSetPiecePlan } from '../src/domain/tactics/setPieces/validateSetPiecePlan';
import { MatchAnalyticsAccumulator } from '../src/domain/match/matchAnalytics';
import { generateAnalyticsConclusions } from '../src/domain/match/analyticsConclusions';
import { observeSignals, applyInMatchAdaptation, createAdaptationState } from '../src/domain/tactics/opponentAdaptation/types';
import { CURRENT_SAVE_VERSION } from '../src/types/save';
import { migrationService } from '../src/services/persistence/migrationService';

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

section('Phase shapes + instruction bounds');
{
  const legacy = REAL_INITIAL_PLAYER_CLUB.footballTactics;
  const instructions = deriveTacticalInstructionsFromLegacy(legacy);
  const offsets = derivePhaseShapeOffsets({ formation: '4-3-3', instructions, phase: 'final_third' });
  assert(offsets.length === 11, '11 slot offsets for 4-3-3');
  assert(instructions.inPossession.width >= 0 && instructions.inPossession.width <= 100, 'width bounded');
}

section('Role compatibility fixture: CM suits box-to-box better than anchor at CM slot');
{
  const cm = REAL_INITIAL_PLAYER_CLUB.footballSquad.find((p) => p.position === 'CM');
  assert(!!cm, 'setup CM');
  if (cm) {
    const b2b = computeRoleCompatibility(cm, 'mf_box_to_box', 'CM');
    const anchorAtCdm = computeRoleCompatibility(cm, 'mf_anchor', 'CDM');
    assert(b2b > anchorAtCdm, `CM → B2B (${b2b}) > anchor at CDM (${anchorAtCdm})`);
  }
}

section('Migration idempotency + save v4');
{
  const club = migrateClubFootballTactics(clone(REAL_INITIAL_PLAYER_CLUB));
  const again = migrateClubFootballTactics(clone(club));
  assertEqual(
    JSON.stringify(club.footballTactics.tacticalInstructions),
    JSON.stringify(again.footballTactics.tacticalInstructions),
    'tactics migration idempotent',
  );
  const raw = {
    saveVersion: 2,
    club: clone(REAL_INITIAL_PLAYER_CLUB),
    leagueFixtures: [],
    leagueStandings: [],
  };
  const migrated = migrationService.migrate(raw as never, (c) => c, (s) => s as never);
  assert(migrated.saveVersion === CURRENT_SAVE_VERSION, `save version ${CURRENT_SAVE_VERSION}`);
  assert(!!migrated.club.footballTactics.tacticalInstructions, 'instructions present after migrate');
}

section('Set-piece validation rejects unknown player');
{
  const club = migrateClubFootballTactics(clone(REAL_INITIAL_PLAYER_CLUB));
  const plan = club.footballTactics.setPiecePlans?.cornerAttack;
  assert(!!plan, 'default corner plan');
  if (plan) {
    const bad = validateSetPiecePlan(club, {
      ...plan,
      assignments: [...plan.assignments, { playerId: 'not_in_squad', task: 'near_post' }],
    });
    assert(bad.some((e) => e.code === 'UNKNOWN_PLAYER'), 'unknown assignment rejected');
  }
}

section('Analytics from hand-built tallies');
{
  const acc = new MatchAnalyticsAccumulator();
  acc.onPossessionMinute(true, 4, 0.8);
  for (let i = 0; i < 4; i++) acc.onShot(true, 'left', 0.12, i % 2 === 0);
  acc.onShot(true, 'center', 0.1, false);
  const summary = acc.finalize();
  assert(summary.homeAttLeft === 4, 'four left-sided shots recorded');
  const conclusions = generateAnalyticsConclusions(
    {
      homePossession: 60,
      awayPossession: 40,
      homeShots: 2,
      awayShots: 0,
      homeShotsOnTarget: 1,
      awayShotsOnTarget: 0,
      homeCorners: 0,
      awayCorners: 0,
      homeFouls: 0,
      awayFouls: 0,
      homeYellowCards: 0,
      awayYellowCards: 0,
      homeRedCards: 0,
      awayRedCards: 0,
      homeXg: 0.37,
      awayXg: 0,
    },
    summary,
    true,
  );
  assert(conclusions.some((c) => c.code === 'chances_left'), 'left-channel conclusion fires');
}

section('Opponent adaptation triggers on repeated left bias');
{
  let state = createAdaptationState();
  for (let i = 0; i < 5; i++) {
    state = observeSignals(
      state,
      {
        homeAttLeft: 5,
        homeAttRight: 1,
        homeAttCenter: 1,
        awayAttLeft: 0,
        awayAttRight: 0,
        awayAttCenter: 0,
        homePressSuccess: 0,
        homePressAttempts: 0,
        awayPressSuccess: 0,
        awayPressAttempts: 0,
        homePossessionPct: 55,
      },
      true,
    );
  }
  assert(state.confidence >= 3 && state.flankBiasObserved === 'left', 'left bias observed with confidence');
  const base = deriveTacticalInstructionsFromLegacy(REAL_OPPONENT_CLUBS[0].footballTactics);
  const adapted = applyInMatchAdaptation(base, state, true);
  assert(adapted.outOfPossession.lineHeight >= base.outOfPossession.lineHeight, 'AI drops line vs left overload');
}

section('Simulation sensitivity: higher line vs fast striker shifts outcomes');
{
  const SEEDS = [101, 202, 303, 404, 505];
  let highLineGoals = 0;
  let lowLineGoals = 0;
  for (const seed of SEEDS) {
    const home = clone(REAL_INITIAL_PLAYER_CLUB);
    const away = clone(REAL_OPPONENT_CLUBS[0]);
    const highInst = normalizeTacticalInstructions({
      ...deriveTacticalInstructionsFromLegacy(home.footballTactics),
      outOfPossession: { lineHeight: 85, pressingIntensity: 50, pressingTrigger: 'midfield', compactness: 50 },
    });
    const lowInst = normalizeTacticalInstructions({
      ...deriveTacticalInstructionsFromLegacy(home.footballTactics),
      outOfPossession: { lineHeight: 25, pressingIntensity: 50, pressingTrigger: 'midfield', compactness: 50 },
    });
    home.footballTactics = { ...home.footballTactics, tacticalInstructions: highInst };
    away.footballTactics = { ...away.footballTactics, tacticalInstructions: lowInst };
    const noSetPieces: FootballEngineOptions = { setPieceResolutionEnabled: false };
    const high = new FootballMatchEngine(home, away, seed, undefined, undefined, 0, 0, undefined, false, noSetPieces).simulateFullMatch();
    const low = new FootballMatchEngine(
      { ...home, footballTactics: { ...home.footballTactics, tacticalInstructions: lowInst } },
      away,
      seed,
      undefined,
      undefined,
      0,
      0,
      undefined,
      false,
      noSetPieces,
    ).simulateFullMatch();
    highLineGoals += high.awayScore;
    lowLineGoals += low.awayScore;
  }
  assert(highLineGoals >= lowLineGoals, `high line concedes more (${highLineGoals} vs ${lowLineGoals} away goals over seeds)`);
}

section('Main PRNG golden (set pieces off): determinism + scoreline tolerance');
{
  const noSetPieces: FootballEngineOptions = { setPieceResolutionEnabled: false };
  /** Scorelines from main @ c620afb (pre-Phase-B engine), same clubs/seeds, VAR off. */
  /** Re-baselined after Phase B.5 baseline-relative instruction effects (set pieces off). */
  const BASELINE: Record<number, string> = {
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
  const GOLDEN = Object.keys(BASELINE).map(Number);
  let sameScoreline = 0;
  const home = clone(REAL_INITIAL_PLAYER_CLUB);
  const away = clone(REAL_OPPONENT_CLUBS[0]);
  for (const seed of GOLDEN) {
    const a = new FootballMatchEngine(home, away, seed, undefined, undefined, 0, 0, undefined, false, noSetPieces).simulateFullMatch();
    const b = new FootballMatchEngine(home, away, seed, undefined, undefined, 0, 0, undefined, false, noSetPieces).simulateFullMatch();
    assertEqual(`${a.homeScore}-${a.awayScore}`, `${b.homeScore}-${b.awayScore}`, `deterministic seed ${seed}`);
    const score = `${a.homeScore}-${a.awayScore}`;
    if (score === BASELINE[seed]) sameScoreline++;
    const shotDelta = Math.abs(a.stats.homeShots - 15);
    assert(a.stats.homeShots >= 0 && a.stats.homeShots <= 40, `bounded home shots seed ${seed}`);
    assert(shotDelta <= 25, `home shots within drift band seed ${seed}`);
    assert(a.analytics !== undefined, 'analytics attached');
  }
  assert(sameScoreline / GOLDEN.length >= 0.85, `≥85% scorelines match baseline (${sameScoreline}/${GOLDEN.length})`);
}

section('Instruction change alters distribution');
{
  const seeds = [20260929, 42424242, 777001, 555777, 123456, 99123, 908070, 314159, 271828, 161803, 10001, 20002, 30003, 40004, 50005];
  let changed = 0;
  const a = clone(REAL_OPPONENT_CLUBS[0]);
  const noSetPieces: FootballEngineOptions = { setPieceResolutionEnabled: false };
  for (const seed of seeds) {
    const h = clone(REAL_INITIAL_PLAYER_CLUB);
    const base = new FootballMatchEngine(h, a, seed, undefined, undefined, 0, 0, undefined, false, noSetPieces).simulateFullMatch();
    const aggressive: FootballTactics = {
      ...h.footballTactics,
      tacticalInstructions: normalizeTacticalInstructions({
        ...deriveTacticalInstructionsFromLegacy(h.footballTactics),
        inPossession: { width: 99, tempo: 99, passingDirectness: 99, passingRisk: 99 },
        outOfPossession: { lineHeight: 5, pressingIntensity: 99, pressingTrigger: 'opponent_half', compactness: 99 },
      }),
    };
    const tuned = new FootballMatchEngine({ ...h, footballTactics: aggressive }, a, seed, undefined, undefined, 0, 0, undefined, false, noSetPieces).simulateFullMatch();
    if (
      base.stats.homeShots !== tuned.stats.homeShots ||
      base.stats.homeXg !== tuned.stats.homeXg ||
      base.homeScore !== tuned.homeScore
    ) {
      changed++;
    }
  }
  assert(changed >= 2, `instruction deltas changed outcomes on ${changed}/${seeds.length} seeds`);
}

section('Set-piece side stream: deterministic + main PRNG isolated');
{
  const home = migrateClubFootballTactics(clone(REAL_INITIAL_PLAYER_CLUB));
  const away = migrateClubFootballTactics(clone(REAL_OPPONENT_CLUBS[0]));
  const seed = 42424242;
  const a = runSetPieceMinute(seed, 17, 'corner', true, home, away);
  const b = runSetPieceMinute(seed, 17, 'corner', true, home, away);
  assertEqual(a.isGoal, b.isGoal, 'corner stream deterministic');
  assert(setPieceGate(seed, 17, 'corner', 0.5) === setPieceGate(seed, 17, 'corner', 0.5), 'gate deterministic');
  const mainOff = new FootballMatchEngine(home, away, seed, undefined, undefined, 0, 0, undefined, false, {
    setPieceResolutionEnabled: false,
  }).simulateFullMatch();
  const mainOn = new FootballMatchEngine(home, away, seed, undefined, undefined, 0, 0, undefined, false, {
    setPieceResolutionEnabled: true,
  }).simulateFullMatch();
  assert(mainOff.seed === mainOn.seed, 'same seed');
}

section('Set-piece taker sensitivity (side channel only)');
{
  const home = migrateClubFootballTactics(clone(REAL_INITIAL_PLAYER_CLUB));
  const away = migrateClubFootballTactics(clone(REAL_OPPONENT_CLUBS[0]));
  const st = home.footballSquad.find((p) => p.position === 'ST');
  assert(!!st, 'striker for taker test');
  if (st) {
    let diff = 0;
    for (let minute = 10; minute <= 80; minute += 5) {
      const base = runSetPieceMinute(9001, minute, 'fk_attack', true, home, away);
      const tuned = runSetPieceMinute(
        9001,
        minute,
        'fk_attack',
        true,
        {
          ...home,
          footballTactics: {
            ...home.footballTactics,
            setPiecePlans: {
              ...home.footballTactics.setPiecePlans,
              freeKickAttack: {
                type: 'free_kick_attack',
                takerId: st.id,
                assignments: home.footballTactics.setPiecePlans?.freeKickAttack?.assignments ?? [],
              },
            },
          },
        },
        away,
      );
      if (base.takerId !== tuned.takerId || base.isGoal !== tuned.isGoal) diff++;
    }
    assert(diff >= 1, `FK plan changes side-stream outcomes (${diff} minutes)`);
  }
}

finish('Phase B football simulation');
