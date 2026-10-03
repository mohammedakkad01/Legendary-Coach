/**
 * Phase D Part 1H — academy intake & recruitment focus (domain only).
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { assert, assertEqual, finish, section } from './lib/testHarness';
import { REAL_INITIAL_PLAYER_CLUB, REAL_INITIAL_SCOUT_MARKET } from '../src/data/realFootballData';
import { ensurePlayerLifeV4 } from '../src/domain/playerLife/migratePlayerLife';
import type { GameSaveData } from '../src/types/save';
import {
  applyRecruitmentPatches,
  computeAcademyIntakeCapacity,
  defaultRecruitmentFocus,
  ensureRecruitmentV5,
  focusGenerationModifiers,
  normalizeRecruitmentFocus,
  patchesForRecruitmentFocus,
  positionPoolForFocus,
  runAcademyIntake,
  RECRUITMENT_WORLD_SCHEMA_VERSION,
} from '../src/domain/recruitment';

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));

function baseSave(): GameSaveData {
  return ensureRecruitmentV5(
    ensurePlayerLifeV4({
      saveVersion: 4,
      saveId: 'phase_d_1h_save',
      savedAt: new Date(0).toISOString(),
      appVersion: 'test',
      currentSport: 'football',
      language: 'en',
      soundEnabled: true,
      hasSelectedInitialClub: true,
      isGuest: false,
      hasClaimedLoginBonus: false,
      club: clone(REAL_INITIAL_PLAYER_CLUB),
      energy: 100,
      lastEnergyUpdate: 0,
      vipPoints: 0,
      lastVipClaimDate: null,
      claimedVipUpgradeChests: [],
      missionSkipUsedDate: null,
      checkInStreak: 0,
      lastCheckInDate: null,
      savedTacticalPlans: [],
      pendingFacilityUpgrades: [],
      activeNegotiations: [],
      academyDiscoveries: [],
      scoutMarket: clone(REAL_INITIAL_SCOUT_MARKET.slice(0, 5)),
      dailyMissions: [],
      storyMissions: [],
      leagueStandings: [],
      leagueFixtures: [],
      matchHistory: [],
      tournamentStats: [],
      simulatedMatchdays: [1],
      matchScoutReports: {},
      unlockedSpeed2x: false,
    }),
  );
}

const clubCtx = (clubId: string) => ({
  clubId,
  youthAcademyLevel: 6,
  recruitmentInvestment: 70,
  coachingQuality: 65,
  facilitiesScore: 60,
  clubReputation: 72,
  regionCode: 'SA',
});

section('Migration bumps recruitment schema to v9');
{
  const save = baseSave();
  assertEqual(save.recruitmentWorld!.schemaVersion, 9, 'schema v9');
  assertEqual(RECRUITMENT_WORLD_SCHEMA_VERSION, 9, 'constant v9');
  assertEqual(Object.keys(save.recruitmentWorld!.academyFocusByClubId).length, 0, 'empty focus map');
  assertEqual(save.recruitmentWorld!.academyIntakeRecords.length, 0, 'empty intake history');
  const twice = ensureRecruitmentV5(clone(save));
  assertEqual(JSON.stringify(save.recruitmentWorld), JSON.stringify(twice.recruitmentWorld), 'idempotent');
}

section('v8 → v9 upgrade (academy fields from v7 chain)');
{
  const save = baseSave();
  const v8 = clone(save.recruitmentWorld!);
  v8.schemaVersion = 8;
  delete (v8 as { weeklyTick?: unknown }).weeklyTick;
  const up = ensureRecruitmentV5({ ...save, recruitmentWorld: v8 as GameSaveData['recruitmentWorld'] });
  assertEqual(up.recruitmentWorld!.schemaVersion, 9, 'v8→v9');
  assertEqual(up.recruitmentWorld!.weeklyTick.lastProcessedGameWeek, 0, 'weeklyTick init');
}

section('Recruitment focus normalization & position pools');
{
  const defense = normalizeRecruitmentFocus({
    primaryAxis: 'position_group',
    positionGroup: 'defense',
    intensity: 80,
  });
  const pool = positionPoolForFocus(defense);
  assert(pool.includes('CB'), 'defense pool');
  assert(!pool.includes('ST'), 'no striker in defense pool');
  const mods = focusGenerationModifiers(
    normalizeRecruitmentFocus({ primaryAxis: 'high_potential', intensity: 100 }),
  );
  assert(mods.potentialBonus > 0, 'high potential bonus');
}

section('Intake capacity scales with academy level');
{
  const low = computeAcademyIntakeCapacity({ ...clubCtx('c1'), youthAcademyLevel: 2, recruitmentInvestment: 20 });
  const high = computeAcademyIntakeCapacity({ ...clubCtx('c1'), youthAcademyLevel: 9, recruitmentInvestment: 80 });
  assert(high >= low, 'higher academy → capacity');
}

section('Deterministic intake & story events');
{
  const save = baseSave();
  const world = save.recruitmentWorld!;
  const clubId = save.club.id;
  const input = {
    worldSeed: world.worldSeed,
    gameWeek: world.gameWeek,
    season: 1,
    timestampIso: new Date(0).toISOString(),
    club: clubCtx(clubId),
    focus: defaultRecruitmentFocus('SA'),
    maxProspects: 3,
  };

  const a = runAcademyIntake(world, input);
  const b = runAcademyIntake(world, input);
  assertEqual(JSON.stringify(a.prospects), JSON.stringify(b.prospects), 'deterministic prospects');
  assertEqual(a.events.length, 3, 'one event per prospect');
  assertEqual(a.events[0]!.type, 'recruitment.academy.intake_story', 'story event type');
  assert(a.events[0]!.context.storyKind !== undefined, 'story kind in context');
}

section('Focus skew — defense intake favors defensive positions');
{
  const save = baseSave();
  const world = save.recruitmentWorld!;
  const clubId = save.club.id;
  const defenseFocus = normalizeRecruitmentFocus({
    primaryAxis: 'position_group',
    positionGroup: 'defense',
    intensity: 100,
  });
  const result = runAcademyIntake(world, {
    worldSeed: world.worldSeed,
    gameWeek: 12,
    season: 1,
    timestampIso: new Date(0).toISOString(),
    club: clubCtx(clubId),
    focus: defenseFocus,
    maxProspects: 8,
  });
  const defPositions = new Set(['GK', 'CB', 'LB', 'RB']);
  const defCount = result.prospects.filter((p) => defPositions.has(p.position)).length;
  assertEqual(defCount, 8, 'all defense focus slots are defensive positions');
}

section('Public prospect view hides true potential');
{
  const save = baseSave();
  const world = save.recruitmentWorld!;
  const { prospects, patches } = runAcademyIntake(world, {
    worldSeed: world.worldSeed,
    gameWeek: 3,
    season: 1,
    timestampIso: new Date(0).toISOString(),
    club: clubCtx(save.club.id),
    focus: defaultRecruitmentFocus(),
    maxProspects: 2,
  });
  for (const p of prospects) {
    assert(!('truePotential' in p), 'no truePotential on public view');
    assert(p.potentialEstimateBand > 0, 'estimate band present');
    assert(Math.abs(p.potentialEstimate - p.estimatedOverall) <= 24, 'estimate vs overall plausible gap');
  }
  const next = applyRecruitmentPatches(world, patches);
  const pid = prospects[0]!.prospectId;
  const truth = next.worldPlayers[pid];
  assert(!!truth, 'internal truth stored');
  assert(truth!.truePotential >= truth!.trueOverall, 'truth ordering');
  assert(truth!.truePotential !== prospects[0]!.potentialEstimate || truth!.truePotential === prospects[0]!.potentialEstimate, 'estimate may differ from truth');
}

section('Focus patches persist on world');
{
  const save = baseSave();
  let world = save.recruitmentWorld!;
  const focus = normalizeRecruitmentFocus({ primaryAxis: 'creative', intensity: 90 });
  world = applyRecruitmentPatches(world, patchesForRecruitmentFocus(save.club.id, focus));
  assertEqual(world.academyFocusByClubId[save.club.id]!.primaryAxis, 'creative', 'focus stored');
}

section('Public barrel does not export hidden truth types');
{
  const barrel = readFileSync(join(process.cwd(), 'src/domain/recruitment/index.ts'), 'utf8');
  assert(!barrel.includes('TrueWorldPlayer'), 'no TrueWorldPlayer export');
  assert(!barrel.includes('trueProfile'), 'no trueProfile re-export');
  assert(!barrel.includes('generateSingleAcademyProspect'), 'internal generator not exported');
}

finish();
