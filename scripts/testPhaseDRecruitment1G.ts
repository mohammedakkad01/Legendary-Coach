/**
 * Phase D Part 1G — loan search & scoring (domain only, no lifecycle).
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { assert, assertEqual, finish, section } from './lib/testHarness';
import { REAL_INITIAL_PLAYER_CLUB, REAL_INITIAL_SCOUT_MARKET } from '../src/data/realFootballData';
import { ensurePlayerLifeV4 } from '../src/domain/playerLife/migratePlayerLife';
import {
  ensureRecruitmentV5,
  knowledgeToObservedView,
  searchLoanTargets,
  applyLoanHardFilters,
  scoreLoanDestination,
  RECRUITMENT_TUNING,
} from '../src/domain/recruitment';
import type { GameSaveData, KnowledgeState, LoanDestinationClubContext, LoanSearchFilters } from '../src/domain/recruitment';

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));

function baseSave(): GameSaveData {
  return ensureRecruitmentV5(
    ensurePlayerLifeV4({
      saveVersion: 4,
      saveId: 'phase_d_1g_save',
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
    confidencePct: 62,
    ratingMin: 72,
    ratingMax: 78,
    potentialBandMin: 74,
    potentialBandMax: 86,
    valueMin: 1_000_000,
    valueMax: 2_000_000,
    revealedGroups: ['technical'],
    lastUpdatedWeek: 1,
    ...partial,
  });
}

const defaultFilters = (): LoanSearchFilters => ({
  minExpectedPlayingTimePct: 50,
  minLeagueLevel: 3,
  minTrainingFacilitiesLevel: 50,
  minClubReputation: 45,
  minTacticalCompatibility: 50,
  minEstimatedRating: 68,
  requiresStarterRole: false,
  maxResults: 5,
});

function dest(overrides: Partial<LoanDestinationClubContext> & { clubId: string }): LoanDestinationClubContext {
  return {
    leagueLevel: 2,
    clubReputation: 70,
    trainingFacilitiesLevel: 75,
    expectedPlayingTimePct: 70,
    tacticalCompatibility: 72,
    starterOpportunity: true,
    wageSplitPercentOffered: 50,
    durationWeeksOffered: 24,
    ...overrides,
  };
}

section('Migration bumps recruitment schema to v9 (loan search is stateless)');
{
  const save = baseSave();
  assertEqual(save.recruitmentWorld!.schemaVersion, 9, 'schema v9');
  const twice = ensureRecruitmentV5(clone(save));
  assertEqual(JSON.stringify(save.recruitmentWorld), JSON.stringify(twice.recruitmentWorld), 'idempotent');
}

section('v6 → v9 upgrade');
{
  const save = baseSave();
  const v6 = clone(save.recruitmentWorld!);
  v6.schemaVersion = 6;
  const up = ensureRecruitmentV5({ ...save, recruitmentWorld: v6 as GameSaveData['recruitmentWorld'] });
  assertEqual(up.recruitmentWorld!.schemaVersion, 9, 'v6→v9');
}

section('Hard filters reject weak destinations');
{
  const player = REAL_INITIAL_SCOUT_MARKET[0];
  const ctx = {
    playerId: player.id,
    position: player.position,
    observed: observed({ playerId: player.id, observerClubId: REAL_INITIAL_PLAYER_CLUB.id }),
  };
  const filters = defaultFilters();
  const bad = applyLoanHardFilters(
    ctx,
    dest({ clubId: 'club_bad', expectedPlayingTimePct: 20, leagueLevel: 5, clubReputation: 30 }),
    filters,
  );
  assert(!bad.passed, 'reject weak dest');
  assert(bad.rejectReasons.includes('playing_time_too_low'), 'playing time');
  assert(bad.rejectReasons.includes('reputation_too_low'), 'reputation');
}

section('Starter requirement filter');
{
  const player = REAL_INITIAL_SCOUT_MARKET[1];
  const ctx = {
    playerId: player.id,
    position: player.position,
    observed: observed({ playerId: player.id, observerClubId: REAL_INITIAL_PLAYER_CLUB.id }),
  };
  const filters = { ...defaultFilters(), requiresStarterRole: true };
  const r = applyLoanHardFilters(
    ctx,
    dest({ clubId: 'club_rot', starterOpportunity: false }),
    filters,
  );
  assert(!r.passed && r.rejectReasons.includes('starter_required'), 'starter required');
}

section('Low scout confidence rejects');
{
  const player = REAL_INITIAL_SCOUT_MARKET[0];
  const ctx = {
    playerId: player.id,
    position: player.position,
    observed: observed({
      playerId: player.id,
      observerClubId: REAL_INITIAL_PLAYER_CLUB.id,
      confidencePct: 10,
    }),
  };
  const r = applyLoanHardFilters(ctx, dest({ clubId: 'club_ok' }), defaultFilters());
  assert(!r.passed && r.rejectReasons.includes('confidence_too_low'), 'confidence gate');
}

section('searchLoanTargets ranks strong playing time higher');
{
  const player = REAL_INITIAL_SCOUT_MARKET[2];
  const ctx = {
    playerId: player.id,
    position: player.position,
    observed: observed({ playerId: player.id, observerClubId: REAL_INITIAL_PLAYER_CLUB.id, confidencePct: 70 }),
  };
  const result = searchLoanTargets({
    worldSeed: 42,
    gameWeek: 6,
    borrowerClubId: REAL_INITIAL_PLAYER_CLUB.id,
    player: ctx,
    filters: defaultFilters(),
    destinations: [
      dest({ clubId: 'club_low_minutes', expectedPlayingTimePct: 52 }),
      dest({ clubId: 'club_high_minutes', expectedPlayingTimePct: 85, starterOpportunity: true }),
    ],
  });
  const ranked = result.recommendations.filter((r) => r.rank > 0);
  assert(ranked.length >= 1, 'has ranked');
  assertEqual(ranked[0].destinationClubId, 'club_high_minutes', 'best playing time first');
  assert(ranked[0].scoreReasons.includes('strong_playing_time'), 'reason tag');
}

section('Deterministic search for fixed seed');
{
  const player = REAL_INITIAL_SCOUT_MARKET[0];
  const ctx = {
    playerId: player.id,
    position: player.position,
    observed: observed({ playerId: player.id, observerClubId: REAL_INITIAL_PLAYER_CLUB.id }),
  };
  const input = {
    worldSeed: 999,
    gameWeek: 3,
    borrowerClubId: REAL_INITIAL_PLAYER_CLUB.id,
    player: ctx,
    filters: defaultFilters(),
    destinations: [
      dest({ clubId: 'club_a', expectedPlayingTimePct: 60 }),
      dest({ clubId: 'club_b', expectedPlayingTimePct: 75 }),
      dest({ clubId: 'club_c', expectedPlayingTimePct: 55 }),
    ],
  };
  const a = searchLoanTargets(input);
  const b = searchLoanTargets(input);
  assertEqual(
    a.recommendations.filter((r) => r.rank > 0).map((r) => r.destinationClubId).join(','),
    b.recommendations.filter((r) => r.rank > 0).map((r) => r.destinationClubId).join(','),
    'same order',
  );
}

section('Evaluation cap limits destinations processed');
{
  const player = REAL_INITIAL_SCOUT_MARKET[0];
  const ctx = {
    playerId: player.id,
    position: player.position,
    observed: observed({ playerId: player.id, observerClubId: REAL_INITIAL_PLAYER_CLUB.id }),
  };
  const many = Array.from({ length: 30 }, (_, i) => dest({ clubId: `club_${i}`, expectedPlayingTimePct: 55 + i }));
  const result = searchLoanTargets({
    worldSeed: 1,
    gameWeek: 1,
    borrowerClubId: REAL_INITIAL_PLAYER_CLUB.id,
    player: ctx,
    filters: defaultFilters(),
    destinations: many,
    maxDestinationsEvaluated: 5,
  });
  assertEqual(result.evaluatedCount, 5, 'cap respected');
  assertEqual(result.capApplied, 5, 'cap metadata');
}

section('scoreLoanDestination uses observed estimates only');
{
  const player = REAL_INITIAL_SCOUT_MARKET[0];
  const ctx = {
    playerId: player.id,
    position: player.position,
    observed: observed({
      playerId: player.id,
      observerClubId: REAL_INITIAL_PLAYER_CLUB.id,
      ratingMin: 80,
      ratingMax: 84,
      potentialBandMin: 82,
      potentialBandMax: 90,
    }),
  };
  const high = scoreLoanDestination(ctx, dest({ clubId: 'club_dev', leagueLevel: 2 }));
  assert(high.score >= RECRUITMENT_TUNING.loans.minRecommendScore, 'decent score');
  assert(high.scoreReasons.length > 0, 'reasons present');
}

section('Loan modules avoid TrueWorldPlayer');
{
  for (const rel of [
    'src/domain/recruitment/loans/searchLoanTargets.ts',
    'src/domain/recruitment/loans/loanScore.ts',
    'src/domain/recruitment/index.ts',
  ]) {
    const text = readFileSync(join(process.cwd(), rel), 'utf8');
    assert(!text.includes('TrueWorldPlayer'), `${rel} clean`);
    assert(!text.includes('trueProfile'), `${rel} no trueProfile`);
  }
}

finish();
