/**
 * Phase D Part 1I — weekly recruitment tick orchestration.
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
  calendarWeekFromGameWeek,
  checkPermanentTransferAllowed,
  computeTransferMotivation,
  computePreOfferWillingness,
  createDefaultAiClubProfile,
  ensureRecruitmentV5,
  isTransferWindowOpen,
  knowledgeToObservedView,
  runWeeklyRecruitmentTick,
  runWeeklyRecruitmentTickOnSave,
  shouldRunAcademyIntakeForCalendarWeek,
  RECRUITMENT_WORLD_SCHEMA_VERSION,
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
  const observedPlayer = observed({
    playerId: player.id,
    observerClubId: clubId,
  });
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
  const candidate = {
    playerId: player.id,
    observed: observedPlayer,
    willingness,
    motivation,
    sellerClubId: save.club.id,
  };
  return {
    clubId,
    profile,
    candidate,
    windowOpen: isTransferWindowOpen(world.transferWindow),
    permanentAllowed: checkPermanentTransferAllowed(world.transferWindow).allowed,
  };
}

section('Migration bumps recruitment schema to v9 (weekly tick cursor)');
{
  const save = baseSave();
  assertEqual(save.recruitmentWorld!.schemaVersion, 9, 'schema v9');
  assertEqual(RECRUITMENT_WORLD_SCHEMA_VERSION, 9, 'constant v9');
  assertEqual(save.recruitmentWorld!.weeklyTick.lastProcessedGameWeek, 0, 'tick cursor init');
  const twice = ensureRecruitmentV5(clone(save));
  assertEqual(JSON.stringify(save.recruitmentWorld), JSON.stringify(twice.recruitmentWorld), 'idempotent');
}

section('v8 → v9 upgrade');
{
  const save = baseSave();
  const v8 = clone(save.recruitmentWorld!);
  v8.schemaVersion = 8;
  delete (v8 as { weeklyTick?: unknown }).weeklyTick;
  const up = ensureRecruitmentV5({ ...save, recruitmentWorld: v8 as GameSaveData['recruitmentWorld'] });
  assertEqual(up.recruitmentWorld!.schemaVersion, 9, 'v8→v9');
  assertEqual(up.recruitmentWorld!.weeklyTick.lastProcessedGameWeek, 0, 'weeklyTick init');
}

section('Weekly tick idempotency for same game week');
{
  const save = baseSave();
  const world = save.recruitmentWorld!;
  const { clubId, profile, candidate } = aiSetup(save, 3);
  const input = {
    worldSeed: world.worldSeed,
    gameWeek: 3,
    season: 1,
    timestampIso: new Date(0).toISOString(),
    userClubId: save.club.id,
    aiClubEntries: [{
      clubId,
      profile,
      finances: { transferBudget: 100_000_000, wageBudgetRemainingWeekly: 2_000_000, squadSize: 22, maxSquadSize: 30 },
      squadNeeds: { minEstimatedRating: 70, needUrgency: 80 },
      candidates: [candidate],
    }],
    candidatesByClubId: { [clubId]: [candidate] },
  };
  const first = runWeeklyRecruitmentTick(world, input);
  assert(first.patches.length > 0, 'first tick applies patches');
  const after = applyRecruitmentPatches(world, first.patches);
  const second = runWeeklyRecruitmentTick(after, input);
  assertEqual(second.skippedReason, 'already_processed_week', 'skip duplicate week');
  assertEqual(second.patches.length, 0, 'no duplicate patches');
}

section('Weekly tick advances cursor and persists rumors');
{
  const save = baseSave();
  let world = save.recruitmentWorld!;
  const { clubId, profile, candidate } = aiSetup(save, 5);
  const tick = runWeeklyRecruitmentTick(world, {
    worldSeed: world.worldSeed,
    gameWeek: 5,
    season: 1,
    timestampIso: new Date(0).toISOString(),
    userClubId: save.club.id,
    aiClubEntries: [{
      clubId,
      profile,
      finances: { transferBudget: 100_000_000, wageBudgetRemainingWeekly: 2_000_000, squadSize: 22, maxSquadSize: 30 },
      squadNeeds: { minEstimatedRating: 70, needUrgency: 80 },
      candidates: [candidate],
    }],
    candidatesByClubId: { [clubId]: [candidate] },
  });
  world = applyRecruitmentPatches(world, tick.patches);
  assertEqual(world.weeklyTick.lastProcessedGameWeek, 5, 'cursor advanced');
  assert(tick.rumors.rumors.length > 0 || tick.aiBatch.processedClubIds.length > 0, 'AI/rumor pipeline ran');
  if (tick.rumors.rumors.length > 0) {
    assert(world.transferRumors.some((r) => r.id === tick.rumors.rumors[0]!.id), 'rumor persisted');
    assert(tick.events.some((e) => e.type === 'recruitment.rumor.created'), 'rumor event');
  }
}

section('Academy intake runs on configured calendar weeks during tick');
{
  assert(shouldRunAcademyIntakeForCalendarWeek(2), 'week 2 scheduled');
  const save = baseSave();
  const world = save.recruitmentWorld!;
  const gameWeek = 2;
  assertEqual(calendarWeekFromGameWeek(gameWeek), 2, 'calendar week 2');
  const { clubId, profile, candidate } = aiSetup(save, gameWeek);
  const tick = runWeeklyRecruitmentTick(world, {
    worldSeed: world.worldSeed,
    gameWeek,
    season: 1,
    timestampIso: new Date(0).toISOString(),
    userClubId: save.club.id,
    aiClubEntries: [{
      clubId,
      profile,
      finances: { transferBudget: 50_000_000, wageBudgetRemainingWeekly: 1_000_000, squadSize: 22, maxSquadSize: 30 },
      squadNeeds: { minEstimatedRating: 65, needUrgency: 50 },
      candidates: [candidate],
    }],
    candidatesByClubId: { [clubId]: [candidate] },
    academy: {
      enabled: true,
      club: {
        clubId: save.club.id,
        youthAcademyLevel: 5,
        recruitmentInvestment: 60,
        coachingQuality: 55,
        facilitiesScore: 50,
        clubReputation: 65,
        regionCode: 'SA',
      },
    },
  });
  assert(!!tick.academy, 'academy slice present');
  assert(tick.academy!.prospects.length > 0, 'prospects generated');
  assert(tick.events.some((e) => e.type === 'recruitment.academy.intake_story'), 'intake story event');
}

section('Deterministic weekly tick for fixed seed/week');
{
  const save = baseSave();
  const world = save.recruitmentWorld!;
  const { clubId, profile, candidate } = aiSetup(save, 7);
  const baseInput = {
    worldSeed: world.worldSeed,
    gameWeek: 7,
    season: 1,
    timestampIso: new Date(0).toISOString(),
    userClubId: save.club.id,
    aiClubEntries: [{
      clubId,
      profile,
      finances: { transferBudget: 80_000_000, wageBudgetRemainingWeekly: 1_500_000, squadSize: 22, maxSquadSize: 30 },
      squadNeeds: { minEstimatedRating: 68, needUrgency: 70 },
      candidates: [candidate],
    }],
    candidatesByClubId: { [clubId]: [candidate] },
  };
  const a = runWeeklyRecruitmentTick(world, baseInput);
  const b = runWeeklyRecruitmentTick(world, baseInput);
  assertEqual(JSON.stringify(a.patches), JSON.stringify(b.patches), 'same patches');
  assertEqual(JSON.stringify(a.events), JSON.stringify(b.events), 'same events');
}

section('runWeeklyRecruitmentTickOnSave integration boundary');
{
  const save = baseSave();
  const { clubId, profile, candidate } = aiSetup(save, 4);
  const out = runWeeklyRecruitmentTickOnSave(save, {
    gameWeek: 4,
    season: 1,
    timestampIso: new Date(0).toISOString(),
    aiClubEntries: [{
      clubId,
      profile,
      finances: { transferBudget: 90_000_000, wageBudgetRemainingWeekly: 1_800_000, squadSize: 22, maxSquadSize: 30 },
      squadNeeds: { minEstimatedRating: 70, needUrgency: 75 },
      candidates: [candidate],
    }],
    candidatesByClubId: { [clubId]: [candidate] },
  });
  assertEqual(out.recruitmentWorld.weeklyTick.lastProcessedGameWeek, 4, 'save cursor');
  assertEqual(out.save.recruitmentWorld!.weeklyTick.lastProcessedGameWeek, 4, 'persisted on save');
}

section('Weekly tick module avoids TrueWorldPlayer in public barrel');
{
  const tickSrc = readFileSync(
    join(process.cwd(), 'src/domain/recruitment/tick/weeklyRecruitmentTick.ts'),
    'utf8',
  );
  assert(!tickSrc.includes('TrueWorldPlayer'), 'tick source clean');
  const barrel = readFileSync(join(process.cwd(), 'src/domain/recruitment/index.ts'), 'utf8');
  assert(barrel.includes('runWeeklyRecruitmentTick'), 'exported from index');
}

finish();
