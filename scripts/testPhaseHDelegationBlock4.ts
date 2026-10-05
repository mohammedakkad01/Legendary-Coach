/**
 * Phase H Block 4 — staff delegation domain integration tests.
 */

import { assert, assertEqual, finish, section } from './lib/testHarness';
import { REAL_INITIAL_PLAYER_CLUB, REAL_INITIAL_SCOUT_MARKET } from '../src/data/realFootballData';
import { ensurePlayerLifeV4 } from '../src/domain/playerLife/migratePlayerLife';
import { ensureClubManagementV6 } from '../src/domain/clubManagement/migration/migrateClubManagementV6';
import { ensureRecruitmentV5 } from '../src/domain/recruitment/migration/migrateRecruitmentV5';
import {
  applyClubManagementChanges,
  computeClubSystemModifiers,
  defaultDelegationSlice,
  extendedFacilitiesFromClub,
  runDelegatedTask,
  staffQualityFactor,
} from '../src/domain/clubManagement';
import { applyRecruitmentPatches } from '../src/domain/recruitment/reducer';
import { buildMinimalPreMatchData } from '../src/domain/clubManagement/delegation/buildMinimalPreMatchData';
import type { DelegationIntegratorContext } from '../src/domain/clubManagement/delegation/delegationIntegratorContext';
import { stateChangesForTrainingSession, legacyDrillToPlan } from '../src/domain/playerLife/trainingEngine';
import { applyStateChanges } from '../src/domain/livingWorld/reducer';
import { createDefaultManagerCareer } from '../src/domain/livingWorld/managerCareer';
import type { GameSaveData } from '../src/types/save';
import type { Club, Fixture } from '../src/types/game';
import type { LoanDestinationClubContext } from '../src/domain/recruitment/loans/loanTypes';
import { completeScoutingReport } from '../src/domain/recruitment/scouting/completeReport';
import { createScoutingAssignment } from '../src/domain/recruitment/scouting/orchestration';
import { DELEGATION_TUNING } from '../src/domain/clubManagement/config/clubManagementTuning';
import { runAcademyIntake } from '../src/domain/recruitment/academy/runAcademyIntake';
import { defaultRecruitmentFocus } from '../src/domain/recruitment/academy/recruitmentFocus';

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));

function baseSave(saveId = 'phase_h_block4'): GameSaveData {
  return ensureClubManagementV6(
    ensureRecruitmentV5(
      ensurePlayerLifeV4({
        saveVersion: 5,
        saveId,
        savedAt: new Date(0).toISOString(),
        appVersion: 'test',
        currentSport: 'football',
        language: 'en',
        soundEnabled: true,
        hasSelectedInitialClub: true,
        isGuest: true,
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
    ),
  );
}

function modifiersFor(save: GameSaveData) {
  const cm = save.clubManagement!;
  return computeClubSystemModifiers({
    staff: cm.staff.members,
    facilities: extendedFacilitiesFromClub(save.club),
    fanMood: cm.fans.mood,
    scoutingNetworkLevel: save.club.facilities.scoutingNetworkLevel,
  });
}

function delegate(cm: GameSaveData['clubManagement'], task: import('../src/domain/clubManagement/types').DelegationTask, staffId?: string) {
  const base = defaultDelegationSlice();
  return applyClubManagementChanges(cm!, [
    {
      kind: 'patchDelegation',
      patch: {
        modes: { ...base.modes, [task]: 'delegate' },
        assigneeByTask: staffId ? { [task]: staffId } : {},
        lastReportWeekByTask: {},
      },
    },
  ]);
}

function integratorFrom(save: GameSaveData, extras?: Partial<DelegationIntegratorContext>): DelegationIntegratorContext {
  return {
    userClubId: save.club.id,
    recruitmentWorld: save.recruitmentWorld,
    livingWorld: save.livingWorld ?? {
      schemaVersion: 3,
      currentSeason: 1,
      managerCareer: createDefaultManagerCareer(1),
      clubMemory: [],
      playerMemories: {},
      relationships: [],
      eventLog: [],
      notifications: [],
      notificationThrottle: { dayBuckets: {} },
    },
    userClub: save.club,
    leagueFixtures: save.leagueFixtures,
    leagueStandings: save.leagueStandings,
    ...extras,
  };
}

const loanDestinations = (): LoanDestinationClubContext[] => [
  {
    clubId: 'loan_dest_a',
    leagueLevel: 1,
    clubReputation: 75,
    trainingFacilitiesLevel: 8,
    expectedPlayingTimePct: 85,
    tacticalCompatibility: 82,
    starterOpportunity: true,
  },
  {
    clubId: 'loan_dest_b',
    leagueLevel: 2,
    clubReputation: 55,
    trainingFacilitiesLevel: 5,
    expectedPlayingTimePct: 55,
    tacticalCompatibility: 60,
    starterOpportunity: false,
  },
];

function opponentClubFromUser(user: Club): Club {
  return {
    ...user,
    id: 'opp_test_club',
    name: 'Opposition FC',
    footballSquad: user.footballSquad.map((p, i) => ({ ...p, id: `opp_p_${i}` })),
  };
}

const sampleFixture: Fixture = {
  matchday: 3,
  opponentClubId: 'opp_test_club',
  opponentClubName: 'Opposition FC',
  opponentBadge: '',
  isHome: true,
  played: false,
};

section('Training & fitness delegation regression');
{
  const save = baseSave('h_train');
  let cm = delegate(save.clubManagement!, 'training', save.clubManagement!.staff.members[0]!.id);
  const mods = modifiersFor(save);
  const playerIds = save.club.footballSquad.map((p) => p.id);
  const manual = stateChangesForTrainingSession(playerIds, legacyDrillToPlan('technical'));
  const del = runDelegatedTask('training', {
    state: cm,
    modifiers: mods,
    playerIds,
    gameWeek: 4,
    season: 1,
    timestampIso: new Date(0).toISOString(),
  });
  assert(del.stateChanges.length === manual.length, 'delegated training change count');
  assert(del.stateChanges.length > 0, 'delegated training non-empty');
  assert(del.report?.summaryCode === 'delegation_training_complete', 'training summary');

  cm = delegate(save.clubManagement!, 'fitness_management', save.clubManagement!.staff.members[0]!.id);
  const fit = runDelegatedTask('fitness_management', {
    state: cm,
    modifiers: mods,
    playerIds: save.club.footballSquad.map((p) => p.id),
    gameWeek: 4,
    season: 1,
    timestampIso: new Date(0).toISOString(),
  });
  assert(fit.stateChanges.length > 0, 'fitness produces changes');
}

section('Set-piece delegation applies player-life patches');
{
  const save = baseSave('h_setpiece');
  const cm = delegate(save.clubManagement!, 'set_pieces', save.clubManagement!.staff.members[0]!.id);
  const mods = modifiersFor(save);
  const del = runDelegatedTask('set_pieces', {
    state: cm,
    modifiers: mods,
    playerIds: save.club.footballSquad.map((p) => p.id),
    gameWeek: 5,
    season: 1,
    timestampIso: new Date(0).toISOString(),
  });
  assert(del.stateChanges.every((c) => c.kind === 'patchPlayerLife'), 'set piece patches');
  const lw = save.livingWorld ?? {
    schemaVersion: 3 as const,
    currentSeason: 1,
    managerCareer: createDefaultManagerCareer(1),
    clubMemory: [],
    playerMemories: {},
    relationships: [],
    eventLog: [],
    notifications: [],
    notificationThrottle: { dayBuckets: {} },
  };
  const applied = applyStateChanges({ livingWorld: lw, players: save.club.footballSquad }, del.stateChanges);
  assert(applied.players.length === save.club.footballSquad.length, 'set piece applied to squad');
}

section('Scouting delegation mutates recruitment world');
{
  const save = baseSave('h_scout');
  const cm = delegate(save.clubManagement!, 'scouting', save.clubManagement!.staff.members[0]!.id);
  const beforeReports = save.recruitmentWorld!.scoutingReports.length;
  const del = runDelegatedTask('scouting', {
    state: cm,
    modifiers: modifiersFor(save),
    playerIds: [],
    gameWeek: 6,
    season: 1,
    timestampIso: new Date(0).toISOString(),
    integrator: integratorFrom(save),
  });
  assert((del.recruitmentPatches?.length ?? 0) > 0, 'scouting patches emitted');
  let world = save.recruitmentWorld!;
  world = applyRecruitmentPatches(world, del.recruitmentPatches ?? []);
  assert(world.scoutingReports.length > beforeReports, 'scouting report stored');
  assert(del.report?.reasonCodes.includes('delegated_scouting') === true, 'reason delegated_scouting');
}

section('Loan search persists club interest without offers');
{
  const save = baseSave('h_loan');
  const youthSquad = save.club.footballSquad.map((p) => ({ ...p, age: 20 }));
  const cm = delegate(save.clubManagement!, 'loan_search', save.clubManagement!.staff.members[0]!.id);
  const del = runDelegatedTask('loan_search', {
    state: cm,
    modifiers: modifiersFor(save),
    playerIds: youthSquad.map((p) => p.id),
    gameWeek: 7,
    season: 1,
    timestampIso: new Date(0).toISOString(),
    integrator: integratorFrom(save, {
      userClub: { ...save.club, footballSquad: youthSquad },
      loanSearch: { destinations: loanDestinations() },
    }),
  });
  assert((del.recruitmentPatches?.length ?? 0) === 1, 'one club interest patch');
  assert(del.recruitmentPatches![0]!.kind === 'appendClubInterest', 'interest patch kind');
  assert(del.report?.summaryCode === 'delegation_loan_recommendations', 'loan summary');
}

section('Youth intake and duplicate-week guard');
{
  const save = baseSave('h_youth');
  const cm = delegate(save.clubManagement!, 'youth_recruitment', save.clubManagement!.staff.members[0]!.id);
  const del = runDelegatedTask('youth_recruitment', {
    state: cm,
    modifiers: modifiersFor(save),
    playerIds: [],
    gameWeek: 8,
    season: 1,
    timestampIso: new Date(0).toISOString(),
    integrator: integratorFrom(save),
  });
  assert((del.recruitmentPatches?.length ?? 0) > 0, 'youth intake patches');
  const world = applyRecruitmentPatches(save.recruitmentWorld!, del.recruitmentPatches ?? []);
  const dup2 = runDelegatedTask('youth_recruitment', {
    state: cm,
    modifiers: modifiersFor(save),
    playerIds: [],
    gameWeek: 8,
    season: 1,
    timestampIso: new Date(0).toISOString(),
    integrator: integratorFrom({ ...save, recruitmentWorld: world }),
  });
  assert(
    dup2.report?.reasonCodes.includes('intake_skipped_duplicate_week'),
    'duplicate guard after world updated',
  );
}

section('Opposition analysis advisory + no-fixture degrade');
{
  const save = baseSave('h_opp');
  const cm = delegate(save.clubManagement!, 'opposition_analysis', save.clubManagement!.staff.members[0]!.id);
  const noFix = runDelegatedTask('opposition_analysis', {
    state: cm,
    modifiers: modifiersFor(save),
    playerIds: [],
    gameWeek: 9,
    season: 1,
    timestampIso: new Date(0).toISOString(),
    integrator: integratorFrom(save, { nextFixture: null, opponentClub: null }),
  });
  assert(noFix.report?.reasonCodes.includes('no_next_fixture'), 'no fixture degrade');

  const opp = opponentClubFromUser(save.club);
  const withFix = runDelegatedTask('opposition_analysis', {
    state: cm,
    modifiers: modifiersFor(save),
    playerIds: [],
    gameWeek: 9,
    season: 1,
    timestampIso: new Date(0).toISOString(),
    integrator: integratorFrom(save, { nextFixture: sampleFixture, opponentClub: opp }),
  });
  assert(withFix.stateChanges.length === 0, 'opposition does not mutate tactics');
  assert(withFix.extraEvents?.[0]?.context.summaryCode === 'delegation_opposition_dossier', 'dossier event');
  assert((withFix.extraEvents?.[0]?.context.findingsCount as number) >= 0, 'findings recorded');
}

section('Manual mode + cooldown');
{
  const save = baseSave('h_manual');
  const cmManual = applyClubManagementChanges(save.clubManagement!, [
    {
      kind: 'patchDelegation',
      patch: { modes: { ...defaultDelegationSlice().modes, scouting: 'manual' } },
    },
  ]);
  const silent = runDelegatedTask('scouting', {
    state: cmManual,
    modifiers: modifiersFor(save),
    playerIds: [],
    gameWeek: 10,
    season: 1,
    timestampIso: new Date(0).toISOString(),
    integrator: integratorFrom(save),
  });
  assert(silent.stateChanges.length === 0 && !silent.report, 'manual mode silent');

  let cm = delegate(save.clubManagement!, 'training', save.clubManagement!.staff.members[0]!.id);
  cm = applyClubManagementChanges(cm, [
    {
      kind: 'patchDelegation',
      patch: { lastReportWeekByTask: { training: 10 } },
    },
  ]);
  const cooled = runDelegatedTask('training', {
    state: cm,
    modifiers: modifiersFor(save),
    playerIds: save.club.footballSquad.map((p) => p.id),
    gameWeek: 10 + DELEGATION_TUNING.reportCooldownWeeks - 1,
    season: 1,
    timestampIso: new Date(0).toISOString(),
  });
  assert(cooled.stateChanges.length === 0 && !cooled.report, 'cooldown blocks');
}

section('Unassigned staff degrades deterministically');
{
  const save = baseSave('h_unassigned');
  const cm = delegate(save.clubManagement!, 'scouting');
  const del = runDelegatedTask('scouting', {
    state: cm,
    modifiers: modifiersFor(save),
    playerIds: [],
    gameWeek: 11,
    season: 1,
    timestampIso: new Date(0).toISOString(),
    integrator: integratorFrom(save),
  });
  assert(del.report?.reasonCodes.includes('staff_unassigned'), 'staff unassigned flagged');
  assert(del.report?.staffId === 'unassigned', 'unassigned staff id');
}

section('Determinism — repeated scouting runs');
{
  const save = baseSave('h_det');
  const cm = delegate(save.clubManagement!, 'scouting', save.clubManagement!.staff.members[0]!.id);
  const runOnce = () =>
    runDelegatedTask('scouting', {
      state: cm,
      modifiers: modifiersFor(save),
      playerIds: [],
      gameWeek: 20,
      season: 1,
      timestampIso: new Date(0).toISOString(),
      integrator: integratorFrom(baseSave('h_det_clone')),
    });
  const a = runOnce();
  const b = runOnce();
  assertEqual(a.recruitmentPatches?.length ?? 0, b.recruitmentPatches?.length ?? 0, 'scouting patch count deterministic');
}

section('Staff quality — scouting report confidence (200 runs)');
{
  const save = baseSave('h_qual_scout');
  const world = save.recruitmentWorld!;
  const clubId = save.club.id;
  const playerId = save.scoutMarket[2]!.id;
  const scoutId = world.scoutNetwork[0]!.id;
  let lowSum = 0;
  let highSum = 0;
  for (let i = 0; i < 200; i++) {
    let w = world;
    const asg = `asg_q_${i}`;
    w = applyRecruitmentPatches(
      w,
      createScoutingAssignment(w, {
        observerClubId: clubId,
        scoutId,
        targetKind: 'player',
        playerId,
        gameWeek: 1,
        assignmentId: asg,
      }).patches,
    );
    const low = completeScoutingReport(w, {
      observerClubId: clubId,
      assignmentId: asg,
      gameWeek: 2,
      reportId: `rep_l_${i}`,
      timestampIso: new Date(0).toISOString(),
      season: 1,
      scoutReportQualityMult: DELEGATION_TUNING.qualityClampMin,
    });
    const high = completeScoutingReport(w, {
      observerClubId: clubId,
      assignmentId: asg,
      gameWeek: 2,
      reportId: `rep_h_${i}`,
      timestampIso: new Date(0).toISOString(),
      season: 1,
      scoutReportQualityMult: DELEGATION_TUNING.qualityClampMax,
    });
    lowSum += low.report?.confidenceDeltaApplied ?? 0;
    highSum += high.report?.confidenceDeltaApplied ?? 0;
  }
  assert(highSum > lowSum, `scout quality mult raises confidence delta (${lowSum} vs ${highSum})`);
}

section('Staff quality — youth intake volume (200 runs)');
{
  let lowTotal = 0;
  let highTotal = 0;
  for (let seed = 0; seed < 200; seed++) {
    const save = baseSave(`h_youth_q_${seed}`);
    const club = save.club;
    const focus = save.recruitmentWorld!.academyFocusByClubId[club.id] ?? defaultRecruitmentFocus();
    const low = runAcademyIntake(save.recruitmentWorld!, {
      worldSeed: save.recruitmentWorld!.worldSeed,
      gameWeek: 30 + seed,
      season: 1,
      timestampIso: new Date(0).toISOString(),
      club: {
        clubId: club.id,
        youthAcademyLevel: club.facilities.youthAcademyLevel,
        recruitmentInvestment: 40,
        coachingQuality: 35,
        facilitiesScore: 40,
        clubReputation: 40,
        regionCode: 'SA',
      },
      focus,
      maxProspects: 1,
    });
    const high = runAcademyIntake(save.recruitmentWorld!, {
      worldSeed: save.recruitmentWorld!.worldSeed,
      gameWeek: 30 + seed,
      season: 1,
      timestampIso: new Date(0).toISOString(),
      club: {
        clubId: club.id,
        youthAcademyLevel: club.facilities.youthAcademyLevel,
        recruitmentInvestment: 90,
        coachingQuality: 92,
        facilitiesScore: 90,
        clubReputation: 90,
        regionCode: 'SA',
      },
      focus,
      maxProspects: 3,
    });
    lowTotal += low.prospects.length;
    highTotal += high.prospects.length;
  }
  assert(highTotal > lowTotal, `higher coaching yields more prospects (${lowTotal} vs ${highTotal})`);
}

section('buildMinimalPreMatchData smoke');
{
  const save = baseSave('h_prematch');
  const opp = opponentClubFromUser(save.club);
  const pm = buildMinimalPreMatchData({
    fixture: sampleFixture,
    competition: 'Test League',
    userClub: save.club,
    opponentClub: opp,
    isScouted: true,
    scoutAccuracy: 80,
  });
  assert(pm.opponentStarters > 0, 'prematch opponent starters');
  assert(pm.winProbability + pm.drawProbability + pm.lossProbability === 100, 'odds sum');
}

section('staffQualityFactor export');
{
  const save = baseSave('h_sqf');
  const staff = save.clubManagement!.staff.members[0]!;
  const mods = modifiersFor(save);
  const q = staffQualityFactor(staff, mods, 'scouting');
  assert(q >= DELEGATION_TUNING.qualityClampMin && q <= DELEGATION_TUNING.qualityClampMax, 'quality clamp');
}

finish('Phase H Block 4 delegation');
