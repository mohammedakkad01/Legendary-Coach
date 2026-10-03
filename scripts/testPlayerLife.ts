/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phase C — Player Life domain tests.
 */

import { SeededRandom } from '../src/engine/prng';
import { FootballMatchEngine } from '../src/engine/footballEngine';
import { REAL_INITIAL_PLAYER_CLUB, REAL_OPPONENT_CLUBS } from '../src/data/realFootballData';
import { assert, assertEqual, finish, section } from './lib/testHarness';
import { clampMorale } from '../src/domain/livingWorld/playerPsychology';
import {
  ensurePlayerLifeFields,
  ensurePlayerLifeV4,
  computeMatchPerformanceMultiplier,
  computeCaptaincySuitability,
  assignMentoringPair,
  mentoringEffectiveness,
  listPendingInteractions,
  resolveInteraction,
  runWeeklyPlayerLife,
  runPostMatchPlayerLife,
} from '../src/domain/playerLife';
import { frustrationFromMinutesShortfall } from '../src/domain/playerLife/playingTimeExpectation';
import { rollInjury, advanceInjuryWeek } from '../src/domain/playerLife/injuryLifecycle';
import { computeInMatchInjuryProbability } from '../src/domain/playerLife/injuryRisk';
import { createEmptyLivingWorld } from '../src/domain/livingWorld';
import { LIVING_WORLD_SCHEMA_VERSION_V2, LIVING_WORLD_SCHEMA_VERSION_V3 } from '../src/domain/livingWorld/types';
import { CURRENT_SAVE_VERSION } from '../src/types/save';
import { persistenceService } from '../src/services/persistenceService';
import type { Player } from '../src/types/game';

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));

section('Morale clamping');
{
  assertEqual(clampMorale(150), 100, 'clamp high');
  assertEqual(clampMorale(-3), 0, 'clamp low');
}

section('Match performance multiplier neutral at default player-life state');
{
  const base = ensurePlayerLifeFields(REAL_INITIAL_PLAYER_CLUB.footballSquad[0]);
  const p: Player = {
    ...base,
    morale: 50,
    form: 5.5,
    fatigue: 35,
    stamina: 70,
    playerLife: {
      ...base.playerLife!,
      condition: {
        ...base.playerLife!.condition,
        trainingLoad: 0,
        sharpness: 50,
        matchFitness: 70,
        recoveryQuality: 60,
      },
    },
  };
  const m = computeMatchPerformanceMultiplier(p);
  assert(m >= 0.98 && m <= 1.02, `neutral mult ~1.0 got ${m}`);
}

section('Playing time shortfall increases frustration path');
{
  const fr = frustrationFromMinutesShortfall(75, 10, 85);
  assert(fr > frustrationFromMinutesShortfall(75, 70, 85), 'large shortfall > small shortfall');
}

section('Interaction responses differ');
{
  let livingWorld = createEmptyLivingWorld(1000);
  livingWorld = { ...livingWorld, schemaVersion: LIVING_WORLD_SCHEMA_VERSION_V2, pendingInteractions: [] };
  let players = REAL_INITIAL_PLAYER_CLUB.footballSquad.slice(0, 3).map((p) =>
    ensurePlayerLifeFields({
      ...p,
      id: `int_${p.id}`,
      mentalState: { confidence: 50, happiness: 40, frustration: 70, pressure: 50 },
      personalityProfile: p.personalityProfile ?? {
        ambition: 90,
        professionalism: 55,
        loyalty: 40,
        temperament: 45,
        adaptability: 50,
        leadership: 48,
        determination: 60,
      },
    }),
  );
  const interaction = {
    id: 'test_int',
    playerId: players[0].id,
    kind: 'playing_time' as const,
    season: 1,
    matchday: 5,
    severity: 'medium' as const,
    responses: [
      { id: 'promise_minutes', labelEn: 'Promise', labelAr: 'وعد' },
      { id: 'reject_demand', labelEn: 'Reject', labelAr: 'رفض' },
    ],
    context: {},
  };
  livingWorld = { ...livingWorld, pendingInteractions: [interaction] };
  const a = resolveInteraction({ livingWorld, players }, interaction, 'promise_minutes');
  const b = resolveInteraction({ livingWorld, players }, interaction, 'reject_demand');
  assert(a.players[0].morale !== b.players[0].morale, 'different responses → different morale');
}

section('Development hides true potential');
{
  const p = ensurePlayerLifeFields(REAL_INITIAL_PLAYER_CLUB.footballSquad[4]);
  assert(p.playerLife !== undefined, 'playerLife exists');
  assert(
    Math.abs((p.playerLife!.development.potentialEstimate ?? 0) - (p.playerLife!.development.truePotential ?? 0)) <=
      p.playerLife!.development.estimateUncertainty + 1,
    'estimate within uncertainty band of true potential',
  );
}

section('Injury risk sensitivity (200 seeds)');
{
  let hurtHigh = 0;
  let hurtLow = 0;
  const base = ensurePlayerLifeFields({
    ...REAL_INITIAL_PLAYER_CLUB.footballSquad[5],
    fatigue: 85,
    playerLife: {
      ...ensurePlayerLifeFields(REAL_INITIAL_PLAYER_CLUB.footballSquad[5]).playerLife!,
      condition: {
        trainingLoad: 80,
        sharpness: 50,
        matchFitness: 70,
        recoveryQuality: 50,
      },
    },
  });
  const rested = ensurePlayerLifeFields({
    ...base,
    fatigue: 10,
    playerLife: {
      ...base.playerLife!,
      condition: { ...base.playerLife!.condition, trainingLoad: 5 },
    },
  });
  for (let i = 0; i < 200; i++) {
    const rng = new SeededRandom(10_000 + i);
    if (rng.nextChance(computeInMatchInjuryProbability(base, { medicalCenterLevel: 3, recentMatchesIn7Days: 3, minutesThisMatch: 90 }))) hurtHigh++;
    if (rng.nextChance(computeInMatchInjuryProbability(rested, { medicalCenterLevel: 8, recentMatchesIn7Days: 1, minutesThisMatch: 90 }))) hurtLow++;
  }
  assert(hurtHigh > hurtLow, `high fatigue/load injuries (${hurtHigh}) > low (${hurtLow}) over 200 seeds`);
}

section('Injury lifecycle and diagnosis uncertainty');
{
  const rng = new SeededRandom(77);
  const inj = rollInjury(rng, { medicalCenterLevel: 4 });
  assert(inj.estimatedWeeksRemaining >= 1, 'estimated weeks');
  assert(Math.abs(inj.estimatedWeeksRemaining - inj.trueWeeksRemaining) <= 3, 'estimate near true within error band');
  const next = advanceInjuryWeek(inj, 9);
  assert(next === null || next.trueWeeksRemaining < inj.trueWeeksRemaining, 'recovery progresses');
}

section('Captaincy suitability');
{
  const lw = createEmptyLivingWorld(900);
  const squad = REAL_INITIAL_PLAYER_CLUB.footballSquad.map(ensurePlayerLifeFields);
  const scores = squad.map((p) => computeCaptaincySuitability(p, lw.relationships));
  assert(scores.some((s) => s > 40), 'at least one viable captain candidate');
}

section('Mentoring effectiveness uses relationship');
{
  const mentor = ensurePlayerLifeFields(REAL_INITIAL_PLAYER_CLUB.footballSquad[0]);
  const mentee = ensurePlayerLifeFields(REAL_INITIAL_PLAYER_CLUB.footballSquad[10]);
  const rels = [
    { playerAId: mentor.id, playerBId: mentee.id, type: 'mentorship' as const, strength: 80 },
  ];
  const strong = mentoringEffectiveness(mentor, mentee, rels);
  const weak = mentoringEffectiveness(mentor, mentee, []);
  assert(strong > weak, 'mentorship relationship boosts effectiveness');
}

section('Dressing room crisis is rare');
{
  let crises = 0;
  let livingWorld = {
    ...createEmptyLivingWorld(800),
    schemaVersion: LIVING_WORLD_SCHEMA_VERSION_V2 as const,
    dressingRoom: { cohesion: 25, hierarchyStability: 40, activeConflictPlayerIds: [] },
  };
  const players = REAL_INITIAL_PLAYER_CLUB.footballSquad.slice(0, 5).map(ensurePlayerLifeFields);
  for (let w = 0; w < 500; w++) {
    const rng = new SeededRandom(50_000 + w);
    const out = runWeeklyPlayerLife(
      { livingWorld, players },
      {
        season: 1,
        matchday: w + 20,
        medicalCenterLevel: 5,
        trainingGroundLevel: 5,
        lineupIds: players.slice(0, 11).map((p) => p.id),
        benchIds: players.slice(11).map((p) => p.id),
      },
      rng,
    );
    livingWorld = out.livingWorld;
    if (out.livingWorld.eventLog.some((e) => e.type === 'playerLife.dressing_room_crisis')) crises++;
  }
  assert(crises < 80, `crisis rate reasonable: ${crises}/500 weeks`);
}

section('Save migration v3 → v4 idempotent');
{
  const v3 = {
    saveVersion: 3,
    saveId: 'pl_test',
    savedAt: new Date().toISOString(),
    appVersion: '2.1.0',
    currentSport: 'football' as const,
    language: 'en' as const,
    soundEnabled: true,
    hasSelectedInitialClub: true,
    isGuest: false,
    hasClaimedLoginBonus: false,
    club: REAL_INITIAL_PLAYER_CLUB,
    energy: 100,
    lastEnergyUpdate: Date.now(),
    vipPoints: 0,
    lastVipClaimDate: null,
    claimedVipUpgradeChests: [1],
    missionSkipUsedDate: null,
    checkInStreak: 0,
    lastCheckInDate: null,
    savedTacticalPlans: [],
    pendingFacilityUpgrades: [],
    activeNegotiations: [],
    academyDiscoveries: [],
    scoutMarket: [],
    dailyMissions: [],
    storyMissions: [],
    leagueStandings: [],
    leagueFixtures: [],
    matchHistory: [],
    tournamentStats: [],
    simulatedMatchdays: [],
    matchScoutReports: {},
    unlockedSpeed2x: false,
  };
  const once = persistenceService.migrate(v3);
  const twice = persistenceService.migrate(once);
  assertEqual(once.saveVersion, CURRENT_SAVE_VERSION, 'migrated to v4');
  assert(once.club.footballSquad.every((p) => p.playerLife !== undefined), 'playerLife on all players');
  assert(
    once.livingWorld?.schemaVersion === LIVING_WORLD_SCHEMA_VERSION_V2 ||
      once.livingWorld?.schemaVersion === LIVING_WORLD_SCHEMA_VERSION_V3,
    'livingWorld v2 or v3 after migration',
  );
  assertEqual(JSON.stringify(once.livingWorld?.dressingRoom), JSON.stringify(twice.livingWorld?.dressingRoom), 'idempotent dressingRoom');
}

section('Golden re-baseline: 200 seeds goals/match (±0.15 mean tolerance)');
{
  const home = clone(REAL_INITIAL_PLAYER_CLUB);
  const away = clone(REAL_OPPONENT_CLUBS[0]);
  const seeds = 200;
  let goalsOld = 0;
  let goalsNew = 0;
  let shotsOld = 0;
  let shotsNew = 0;
  let xgOld = 0;
  let xgNew = 0;

  for (let i = 0; i < seeds; i++) {
    const seed = 1_000_000 + i;
    const squadNeutral = home.footballSquad.map((p) => {
      const pl = ensurePlayerLifeFields(p);
      return {
        ...pl,
        playerLife: {
          ...pl.playerLife!,
          condition: { trainingLoad: 0, sharpness: 50, matchFitness: 70, recoveryQuality: 60 },
        },
        morale: 70,
        form: 5.5,
        fatigue: 0,
        stamina: 95,
      };
    });
    const hOld = { ...home, footballSquad: squadNeutral };
    const hNew = { ...home, footballSquad: squadNeutral };
    const eOld = new FootballMatchEngine(hOld, away, seed);
    const rOld = eOld.simulateFullMatch();
    goalsOld += rOld.homeScore + rOld.awayScore;
    shotsOld += rOld.stats.homeShots + rOld.stats.awayShots;
    xgOld += rOld.stats.homeXg + rOld.stats.awayXg;

    const eNew = new FootballMatchEngine(hNew, away, seed);
    const rNew = eNew.simulateFullMatch();
    goalsNew += rNew.homeScore + rNew.awayScore;
    shotsNew += rNew.stats.homeShots + rNew.stats.awayShots;
    xgNew += rNew.stats.homeXg + rNew.stats.awayXg;
  }

  const mean = (n: number) => n / seeds;
  const gOld = mean(goalsOld);
  const gNew = mean(goalsNew);
  console.log(`  Goals/match  old=${gOld.toFixed(3)} new=${gNew.toFixed(3)} delta=${(gNew - gOld).toFixed(3)}`);
  console.log(`  Shots/match  old=${mean(shotsOld).toFixed(3)} new=${mean(shotsNew).toFixed(3)}`);
  console.log(`  xG/match     old=${mean(xgOld).toFixed(3)} new=${mean(xgNew).toFixed(3)}`);
  assert(Math.abs(gNew - gOld) <= 0.15, `goals/match mean within ±0.15 (delta ${(gNew - gOld).toFixed(3)})`);
}

finish('testPlayerLife.ts');
