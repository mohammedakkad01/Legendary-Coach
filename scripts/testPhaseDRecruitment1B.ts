/**
 * Phase D Part 1B — scouting network, assignments, reports.
 */

import { assert, assertEqual, finish, section } from './lib/testHarness';
import { REAL_INITIAL_PLAYER_CLUB, REAL_INITIAL_SCOUT_MARKET } from '../src/data/realFootballData';
import { ensurePlayerLifeV4 } from '../src/domain/playerLife/migratePlayerLife';
import {
  ensureRecruitmentV5,
  createScoutingAssignment,
  watchMatchForScoutingAssignment,
  runCompleteScoutingReport,
  applyRecruitmentCommandPatches,
  getObservedPlayerView,
  findScout,
  isPoorScout,
  RECRUITMENT_TUNING,
  revealedGroupsForConfidence,
} from '../src/domain/recruitment';
import type { GameSaveData } from '../src/types/save';

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));

function baseSave(): GameSaveData {
  return ensureRecruitmentV5(
    ensurePlayerLifeV4({
      saveVersion: 4,
      saveId: 'phase_d_1b_save',
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
      scoutMarket: clone(REAL_INITIAL_SCOUT_MARKET.slice(0, 8)),
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

section('Migration seeds scout network (schema v2)');
{
  const save = baseSave();
  assertEqual(save.recruitmentWorld!.schemaVersion, 9, 'schema v9');
  assert(save.recruitmentWorld!.scoutNetwork.length >= 3, 'default scouts');
  assertEqual(save.recruitmentWorld!.scoutingAssignments.length, 0, 'no assignments yet');
}

section('Migration idempotency with scouting slice');
{
  const once = baseSave();
  const twice = ensureRecruitmentV5(clone(once));
  assertEqual(
    JSON.stringify(once.recruitmentWorld?.scoutNetwork),
    JSON.stringify(twice.recruitmentWorld?.scoutNetwork),
    'scouts stable',
  );
}

section('Create player scouting assignment');
{
  const save = baseSave();
  let world = save.recruitmentWorld!;
  const clubId = save.club.id;
  const playerId = save.scoutMarket[0].id;
  const scoutId = world.scoutNetwork[0].id;
  const created = createScoutingAssignment(world, {
    observerClubId: clubId,
    scoutId,
    targetKind: 'player',
    playerId,
    gameWeek: world.gameWeek,
    assignmentId: 'asg_test_1',
  });
  assert(created.ok, 'assignment created');
  world = applyRecruitmentCommandPatches(world, created.patches);
  assertEqual(world.scoutingAssignments.length, 1, 'one assignment stored');
}

section('Matches watched increment on assignment');
{
  const save = baseSave();
  let world = save.recruitmentWorld!;
  const clubId = save.club.id;
  const playerId = save.scoutMarket[1].id;
  const scoutId = world.scoutNetwork[0].id;
  const created = createScoutingAssignment(world, {
    observerClubId: clubId,
    scoutId,
    targetKind: 'player',
    playerId,
    gameWeek: 1,
    assignmentId: 'asg_watch',
  });
  world = applyRecruitmentCommandPatches(world, created.patches);
  const watch = watchMatchForScoutingAssignment(world, 'asg_watch', 2);
  assert(watch.ok, 'watch ok');
  world = applyRecruitmentCommandPatches(world, watch.patches);
  assertEqual(world.scoutingAssignments[0].matchesWatched, 1, 'one match watched');
}

section('Reports increase confidence and narrow observed range');
{
  const save = baseSave();
  let world = save.recruitmentWorld!;
  const clubId = save.club.id;
  const playerId = save.scoutMarket[2].id;
  const scout = world.scoutNetwork.find((s) => !isPoorScout(s)) ?? world.scoutNetwork[0];
  const created = createScoutingAssignment(world, {
    observerClubId: clubId,
    scoutId: scout.id,
    targetKind: 'player',
    playerId,
    gameWeek: 1,
    assignmentId: 'asg_reports',
  });
  world = applyRecruitmentCommandPatches(world, created.patches);
  world = applyRecruitmentCommandPatches(
    world,
    watchMatchForScoutingAssignment(world, 'asg_reports', 1).patches,
  );

  const before = getObservedPlayerView(world, clubId, playerId)!;
  let flow = runCompleteScoutingReport(world, {
    observerClubId: clubId,
    assignmentId: 'asg_reports',
    gameWeek: 2,
    reportId: 'rep_1',
    timestampIso: new Date(0).toISOString(),
    season: 1,
  });
  assert(flow.ok, 'report completed');
  world = flow.world;
  flow = runCompleteScoutingReport(world, {
    observerClubId: clubId,
    assignmentId: 'asg_reports',
    gameWeek: 3,
    reportId: 'rep_2',
    timestampIso: new Date(0).toISOString(),
    season: 1,
  });
  world = flow.world;
  const after = getObservedPlayerView(world, clubId, playerId)!;
  assert(after.confidencePct > before.confidencePct, 'confidence rose after reports');
  assert(
    after.revealedGroups.length >= before.revealedGroups.length,
    'revealed groups grow with scouting reports',
  );
  assert(flow.event?.type === 'recruitment.scouting.report_completed', 'game event emitted');
}

section('Progressive reveal order across confidence levels');
{
  const stagesLow = revealedGroupsForConfidence(5);
  const stagesMid = revealedGroupsForConfidence(45);
  const stagesHigh = revealedGroupsForConfidence(88);
  assert(stagesLow.includes('technical'), 'technical first');
  assert(!stagesLow.includes('personality'), 'personality gated low');
  assert(stagesMid.includes('physical'), 'physical mid');
  assert(stagesHigh.includes('personality'), 'personality high');
  assert(stagesHigh.includes('injury_concerns'), 'injury last stage high');
  const order = RECRUITMENT_TUNING.reveal.stageOrder;
  const idx = (s: string) => order.indexOf(s as (typeof order)[number]);
  for (const list of [stagesMid, stagesHigh]) {
    for (let i = 1; i < list.length; i++) {
      assert(idx(list[i]) >= idx(list[i - 1]), 'stages respect canonical order');
    }
  }
}

section('Poor scout vs good scout — error magnitude (80 runs)');
{
  const save = baseSave();
  const world = save.recruitmentWorld!;
  const clubId = save.club.id;
  const playerId = save.scoutMarket[3].id;
  const truthOverall = world.worldPlayers[playerId].trueOverall;
  const sorted = [...world.scoutNetwork].sort((a, b) => a.reliability - b.reliability);
  const poor = sorted[0];
  const good = sorted[sorted.length - 1];
  assert(poor.reliability < good.reliability, 'setup both scout tiers');

  let poorErrSum = 0;
  let goodErrSum = 0;
  for (let i = 0; i < 40; i++) {
    let w = world;
    const asgId = `asg_p_${i}`;
    w = applyRecruitmentCommandPatches(
      w,
      createScoutingAssignment(w, {
        observerClubId: clubId,
        scoutId: poor!.id,
        targetKind: 'player',
        playerId,
        gameWeek: 1,
        assignmentId: asgId,
      }).patches,
    );
    const rep = runCompleteScoutingReport(w, {
      observerClubId: clubId,
      assignmentId: asgId,
      gameWeek: 2,
      reportId: `rep_p_${i}`,
      timestampIso: new Date(0).toISOString(),
      season: 1,
    });
    poorErrSum += Math.abs((rep.report?.statedOverall ?? 0) - truthOverall);
  }
  for (let i = 0; i < 40; i++) {
    let w = world;
    const asgId = `asg_g_${i}`;
    w = applyRecruitmentCommandPatches(
      w,
      createScoutingAssignment(w, {
        observerClubId: clubId,
        scoutId: good!.id,
        targetKind: 'player',
        playerId,
        gameWeek: 1,
        assignmentId: asgId,
      }).patches,
    );
    const rep = runCompleteScoutingReport(w, {
      observerClubId: clubId,
      assignmentId: asgId,
      gameWeek: 2,
      reportId: `rep_g_${i}`,
      timestampIso: new Date(0).toISOString(),
      season: 1,
    });
    goodErrSum += Math.abs((rep.report?.statedOverall ?? 0) - truthOverall);
  }
  const poorAvg = poorErrSum / 40;
  const goodAvg = goodErrSum / 40;
  assert(
    poorAvg > goodAvg || (poorAvg >= goodAvg && poor.reliability + 8 <= good.reliability),
    `poor scout avg error ${poorAvg.toFixed(2)} vs good ${goodAvg.toFixed(2)} (rel ${poor.reliability}/${good.reliability})`,
  );
}

section('Deterministic report for fixed inputs');
{
  const save = baseSave();
  let world = save.recruitmentWorld!;
  const clubId = save.club.id;
  const playerId = save.scoutMarket[4].id;
  const scoutId = world.scoutNetwork[1].id;

  const setup = (assignmentId: string) => {
    let w = world;
    w = applyRecruitmentCommandPatches(
      w,
      createScoutingAssignment(w, {
        observerClubId: clubId,
        scoutId,
        targetKind: 'player',
        playerId,
        gameWeek: 3,
        assignmentId,
      }).patches,
    );
    return runCompleteScoutingReport(w, {
      observerClubId: clubId,
      assignmentId,
      gameWeek: 3,
      reportId: 'rep_det',
      timestampIso: '2020-01-01T00:00:00.000Z',
      season: 1,
    });
  };

  const a = setup('asg_det_a');
  const b = setup('asg_det_b');
  assert(a.ok && b.ok, 'reports ok');
  assertEqual(a.report?.statedOverall, b.report?.statedOverall, 'same seed/world → same stated overall');
}

finish();
