/**
 * Phase D Part 1I — weekly recruitment orchestration (full domain flow).
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { assert, assertEqual, finish, section } from './lib/testHarness';
import { REAL_INITIAL_PLAYER_CLUB, REAL_INITIAL_SCOUT_MARKET } from '../src/data/realFootballData';
import { ensurePlayerLifeV4 } from '../src/domain/playerLife/migratePlayerLife';
import type { GameSaveData } from '../src/types/save';
import type { KnowledgeState } from '../src/domain/recruitment';
import {
  applyRecruitmentPatches,
  buildTransferWindowState,
  calendarWeekFromGameWeek,
  checkPermanentTransferAllowed,
  computeTransferMotivation,
  computePreOfferWillingness,
  createDefaultAiClubProfile,
  createDraftNegotiation,
  createScoutingAssignment,
  ensureRecruitmentV5,
  isTransferWindowOpen,
  knowledgeToObservedView,
  RECRUITMENT_TUNING,
  runWeeklyRecruitmentTick,
  runWeeklyRecruitmentTickOnSave,
  shouldRunAcademyIntakeForCalendarWeek,
  RECRUITMENT_WORLD_SCHEMA_VERSION,
  validateOffer,
} from '../src/domain/recruitment';

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));

function baseSave(): GameSaveData {
  return ensureRecruitmentV5(
    ensurePlayerLifeV4({
      saveVersion: 4,
      saveId: 'phase_d_1i_save',
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

function observed(partial: Partial<KnowledgeState> & { playerId: string; observerClubId: string }) {
  return knowledgeToObservedView({
    confidencePct: 72,
    ratingMin: 78,
    ratingMax: 84,
    potentialBandMin: 80,
    potentialBandMax: 90,
    valueMin: 2_500_000,
    valueMax: 4_000_000,
    revealedGroups: ['technical'],
    lastUpdatedWeek: 1,
    ...partial,
  });
}

function aiSetup(save: GameSaveData, gameWeek: number) {
  const world = save.recruitmentWorld!;
  const player = save.scoutMarket[0]!;
  const clubId = 'club_man_city';
  const profile = world.aiClubProfiles[clubId] ?? createDefaultAiClubProfile(clubId, world.worldSeed);
  const observedPlayer = observed({ playerId: player.id, observerClubId: clubId });
  const signals = {
    playerId: player.id,
    personalityArchetype: player.personality,
    morale: 38,
    playingTimeFulfillmentPct: 12,
    developmentSatisfaction: 40,
    contractSatisfaction: 42,
    contractYearsRemaining: player.contractYears,
    managerTrust: 32,
    managerSatisfaction: 38,
    mentalFrustration: 60,
    mentalHappiness: 42,
    currentClubReputation: 58,
    desiredClubLevel: 88,
    seeksChampionsLeague: true,
    wageVsSquadMedianPct: 82,
    suitorClubReputation: 90,
    suitorOffersChampionsLeague: true,
  };
  const motivation = computeTransferMotivation({
    worldSeed: world.worldSeed,
    gameWeek,
    observerClubId: clubId,
    signals,
  });
  const willingness = computePreOfferWillingness(motivation, signals);
  return {
    clubId,
    profile,
    player,
    candidate: {
      playerId: player.id,
      observed: observedPlayer,
      willingness,
      motivation,
      sellerClubId: save.club.id,
    },
  };
}

function tickInput(save: GameSaveData, gameWeek: number, extra: Record<string, unknown> = {}) {
  const world = save.recruitmentWorld!;
  const { clubId, profile, candidate } = aiSetup(save, gameWeek);
  return {
    worldSeed: world.worldSeed,
    gameWeek,
    season: 1,
    timestampIso: new Date(0).toISOString(),
    userClubId: save.club.id,
    aiClubEntries: [{
      clubId,
      profile,
      finances: {
        transferBudget: 100_000_000,
        wageBudgetRemainingWeekly: 2_000_000,
        squadSize: 22,
        maxSquadSize: 30,
      },
      squadNeeds: { minEstimatedRating: 70, needUrgency: 80 },
      candidates: [candidate],
    }],
    candidatesByClubId: { [clubId]: [candidate] },
    ...extra,
  };
}

section('Schema stays v8; orchestration marker lives on rumor throttle');
{
  const save = baseSave();
  assertEqual(save.recruitmentWorld!.schemaVersion, 8, 'schema v8');
  assertEqual(RECRUITMENT_WORLD_SCHEMA_VERSION, 8, 'constant v8');
  assertEqual(
    save.recruitmentWorld!.rumorThrottle.orchestrationCompletedWeeks,
    {},
    'orchestration weeks empty',
  );
}

section('v7 world upgrades to v8 with orchestration throttle repair');
{
  const save = baseSave();
  const v7 = clone(save.recruitmentWorld!);
  v7.schemaVersion = 7;
  delete (v7 as { academyFocusByClubId?: unknown }).academyFocusByClubId;
  delete (v7 as { academyIntakeRecords?: unknown }).academyIntakeRecords;
  v7.rumorThrottle = { rumorsCreatedByWeek: {}, lastCreatedWeekByKey: {} };
  const up = ensureRecruitmentV5({ ...save, recruitmentWorld: v7 as GameSaveData['recruitmentWorld'] });
  assertEqual(up.recruitmentWorld!.schemaVersion, 8, 'v7→v8');
  assertEqual(up.recruitmentWorld!.rumorThrottle.orchestrationCompletedWeeks, {}, 'throttle repaired');
}

section('Complete weekly orchestration — calendar, AI, rumors, marker');
{
  const save = baseSave();
  const world = save.recruitmentWorld!;
  const tick = runWeeklyRecruitmentTick(world, tickInput(save, 5));
  assert(!tick.skippedReason, 'runs first time');
  assertEqual(tick.transferWindow.transferWindow.phase, buildTransferWindowState(5).phase, 'window evaluated');
  assert(tick.patches.length > 0, 'patches emitted');
  const next = applyRecruitmentPatches(world, tick.patches);
  assert(next.rumorThrottle.orchestrationCompletedWeeks[5], 'week marked complete');
  assert(tick.aiBatch.processedClubIds.length <= RECRUITMENT_TUNING.aiClubs.maxClubsPerWeek, 'AI club cap');
}

section('Idempotent repeated weekly tick — no duplicate rumors or academy');
{
  const save = baseSave();
  let world = save.recruitmentWorld!;
  const input = tickInput(save, 3, {
    academy: {
      enabled: true,
      club: {
        clubId: save.club.id,
        youthAcademyLevel: 4,
        recruitmentInvestment: 50,
        coachingQuality: 50,
        facilitiesScore: 50,
        clubReputation: 60,
        regionCode: 'SA',
      },
    },
  });
  const first = runWeeklyRecruitmentTick(world, input);
  world = applyRecruitmentPatches(world, first.patches);
  const rumorCount = world.transferRumors.length;
  const intakeCount = world.academyIntakeRecords.length;
  const second = runWeeklyRecruitmentTick(world, input);
  assertEqual(second.skippedReason, 'already_processed_week', 'skipped');
  assertEqual(second.patches.length, 0, 'no duplicate patches');
  assertEqual(world.transferRumors.length, rumorCount, 'rumors preserved');
  assertEqual(world.academyIntakeRecords.length, intakeCount, 'academy preserved');
}

section('Deterministic weekly output for fixed seed/week');
{
  const save = baseSave();
  const world = save.recruitmentWorld!;
  const input = tickInput(save, 7);
  const a = runWeeklyRecruitmentTick(world, input);
  const b = runWeeklyRecruitmentTick(world, input);
  assertEqual(JSON.stringify(a.patches), JSON.stringify(b.patches), 'patches deterministic');
  assertEqual(JSON.stringify(a.events), JSON.stringify(b.events), 'events deterministic');
}

section('Transfer window closed vs open affects AI batch context');
{
  const closedWeek = 10;
  const summerWeek = 25;
  const save = baseSave();
  const world = save.recruitmentWorld!;
  const closed = runWeeklyRecruitmentTick(world, { ...tickInput(save, closedWeek), force: true });
  const open = runWeeklyRecruitmentTick(world, { ...tickInput(save, summerWeek), force: true });
  assert(!closed.transferWindow.transferWindowOpen, 'mid-season closed');
  assert(open.transferWindow.transferWindowOpen, 'summer open');
  assertEqual(
    closed.transferWindow.permanentTransferAllowed,
    checkPermanentTransferAllowed(buildTransferWindowState(closedWeek)).allowed,
    'permanent flag closed',
  );
}

section('Rumor throttling respected inside weekly tick');
{
  const save = baseSave();
  const world = save.recruitmentWorld!;
  const max = RECRUITMENT_TUNING.rumors.maxPerWeek;
  const manyClubs = Array.from({ length: max + 4 }, (_, i) => {
    const clubId = `club_cap_${i}`;
    const { profile, candidate } = aiSetup(save, 6);
    return {
      clubId,
      profile: { ...profile, clubId },
      finances: {
        transferBudget: 100_000_000,
        wageBudgetRemainingWeekly: 2_000_000,
        squadSize: 22,
        maxSquadSize: 30,
      },
      squadNeeds: { minEstimatedRating: 60, needUrgency: 90 },
      candidates: [{ ...candidate, observed: { ...candidate.observed, observerClubId: clubId } }],
    };
  });
  const candidatesByClubId = Object.fromEntries(
    manyClubs.map((c) => [c.clubId, c.candidates]),
  );
  const tick = runWeeklyRecruitmentTick(world, {
    ...tickInput(save, 6),
    force: true,
    aiClubEntries: manyClubs,
    candidatesByClubId,
  });
  assert(tick.rumors.rumors.length <= max, 'rumors capped');
}

section('Scouting assignments progress during weekly tick');
{
  const save = baseSave();
  let world = save.recruitmentWorld!;
  const player = save.scoutMarket[0]!;
  const scout = world.scoutNetwork[0]!;
  const created = createScoutingAssignment(world, {
    observerClubId: save.club.id,
    scoutId: scout.id,
    targetKind: 'player',
    playerId: player.id,
    gameWeek: 1,
    assignmentId: `assign_${world.worldSeed}_1`,
  });
  assert(created.ok, 'assignment created');
  world = applyRecruitmentPatches(world, created.patches);
  const tick = runWeeklyRecruitmentTick(world, tickInput(save, 4));
  assert(tick.scouting.matchesWatched >= 1, 'match watched');
  assert(tick.scouting.reportsCompleted >= 1, 'report completed');
  assert(tick.events.some((e) => e.type === 'recruitment.scouting.report_completed'), 'scout event');
}

section('Negotiation progression via weekly submissions');
{
  const save = baseSave();
  let world = save.recruitmentWorld!;
  const { player, candidate } = aiSetup(save, 25);
  const window = buildTransferWindowState(25);
  const offer = {
    id: 'off_weekly_1',
    fromClubId: 'club_man_city',
    toClubId: save.club.id,
    playerId: player.id,
    clauses: [{ kind: 'fee' as const, amount: 3_000_000 }],
  };
  const negotiation = createDraftNegotiation({
    id: 'neg_weekly_1',
    playerId: player.id,
    buyingClubId: 'club_man_city',
    sellingClubId: save.club.id,
    startedWeek: 25,
    initialOffer: offer,
  });
  world = applyRecruitmentPatches(world, [{ kind: 'upsertNegotiation', negotiation }]);
  const buyer = {
    clubId: 'club_man_city',
    coinsAvailable: 100_000_000,
    wageBudgetRemainingWeekly: 2_000_000,
    squadSize: 22,
    maxSquadSize: 30,
    transferWindow: window,
  };
  const seller = {
    clubId: save.club.id,
    coinsAvailable: 0,
    wageBudgetRemainingWeekly: 0,
    squadSize: 22,
    maxSquadSize: 30,
    transferWindow: window,
  };
  const playerCtx = {
    playerId: player.id,
    personality: player.personality,
    weeklyWage: player.wage,
    contractYearsRemaining: player.contractYears,
    marketValueEstimate: candidate.observed.estimatedValue,
    transferDesire: 55,
  };
  assert(validateOffer(buyer, seller, playerCtx, offer).valid, 'offer valid');
  const tick = runWeeklyRecruitmentTick(world, {
    ...tickInput(save, 25),
    force: true,
    negotiationSubmissions: [{
      negotiation,
      offer,
      buyer,
      seller,
      player: playerCtx,
      gameWeek: 25,
      worldSeed: world.worldSeed,
      timestampIso: new Date(0).toISOString(),
      season: 1,
    }],
  });
  assert(tick.negotiations.processed === 1, 'negotiation processed');
  assert(tick.events.some((e) => e.type === 'recruitment.negotiation.transition'), 'negotiation event');
}

section('Loan search runs statelessly in weekly tick');
{
  const save = baseSave();
  const world = save.recruitmentWorld!;
  const player = save.scoutMarket[0]!;
  const tick = runWeeklyRecruitmentTick(world, {
    ...tickInput(save, 8),
    force: true,
    loanSearches: [{
      worldSeed: world.worldSeed,
      gameWeek: 8,
      borrowerClubId: save.club.id,
      player: {
        playerId: player.id,
        position: player.position,
        observed: observed({ playerId: player.id, observerClubId: save.club.id }),
      },
      filters: {
        minExpectedPlayingTimePct: 40,
        minLeagueLevel: 2,
        minTrainingFacilitiesLevel: 40,
        minClubReputation: 40,
        minTacticalCompatibility: 40,
        minEstimatedRating: 60,
        requiresStarterRole: false,
        maxResults: 3,
      },
      destinations: [{
        clubId: 'loan_dest_1',
        leagueLevel: 2,
        clubReputation: 70,
        trainingFacilitiesLevel: 75,
        expectedPlayingTimePct: 80,
        tacticalCompatibility: 70,
        starterOpportunity: true,
        wageSplitPercentOffered: 50,
        durationWeeksOffered: 20,
      }],
    }],
  });
  assertEqual(tick.loans.length, 1, 'loan result returned');
  assert(tick.loans[0]!.recommendations.length >= 0, 'recommendations array');
}

section('Academy intake on schedule with duplicate guard');
{
  assert(shouldRunAcademyIntakeForCalendarWeek(2), 'week 2 intake');
  const save = baseSave();
  const world = save.recruitmentWorld!;
  assertEqual(calendarWeekFromGameWeek(2), 2, 'calendar align');
  const tick = runWeeklyRecruitmentTick(world, {
    ...tickInput(save, 2),
    academy: {
      enabled: true,
      club: {
        clubId: save.club.id,
        youthAcademyLevel: 6,
        recruitmentInvestment: 70,
        coachingQuality: 60,
        facilitiesScore: 55,
        clubReputation: 68,
        regionCode: 'SA',
      },
    },
  });
  assert(!!tick.academy && tick.academy.prospects.length > 0, 'intake generated');
  for (const p of tick.academy!.prospects) {
    assert(!('truePotential' in p), 'public intake hides truth');
  }
}

section('Existing recruitment state preserved through weekly tick');
{
  const save = baseSave();
  const world = save.recruitmentWorld!;
  const scoutCount = world.scoutNetwork.length;
  const profileKeys = Object.keys(world.aiClubProfiles).length;
  const tick = runWeeklyRecruitmentTick(world, { ...tickInput(save, 11), force: true });
  const next = applyRecruitmentPatches(world, tick.patches);
  assertEqual(next.scoutNetwork.length, scoutCount, 'scouts preserved');
  assertEqual(Object.keys(next.aiClubProfiles).length, profileKeys, 'profiles preserved');
}

section('runWeeklyRecruitmentTickOnSave persists orchestration marker');
{
  const save = baseSave();
  const out = runWeeklyRecruitmentTickOnSave(save, tickInput(save, 4));
  assert(out.recruitmentWorld.rumorThrottle.orchestrationCompletedWeeks[4], 'marker on world');
  assertEqual(out.save.recruitmentWorld!.rumorThrottle.orchestrationCompletedWeeks[4], true, 'marker on save');
}

section('Tick sources avoid TrueWorldPlayer in public orchestration path');
{
  for (const rel of [
    'src/domain/recruitment/tick/weeklyRecruitmentTick.ts',
    'src/domain/recruitment/tick/orchestrationIdempotency.ts',
    'src/domain/recruitment/tick/weeklySteps/scoutingStep.ts',
    'src/domain/recruitment/tick/weeklySteps/negotiationStep.ts',
  ]) {
    const text = readFileSync(join(process.cwd(), rel), 'utf8');
    assert(!text.includes('TrueWorldPlayer'), `${rel} clean`);
  }
}

finish();
