/**
 * Phase D Part 1D — transfer motivation domain tests.
 */

import { assert, assertEqual, finish, section } from './lib/testHarness';
import { REAL_INITIAL_PLAYER_CLUB, REAL_INITIAL_SCOUT_MARKET } from '../src/data/realFootballData';
import { ensurePlayerLifeV4 } from '../src/domain/playerLife/migratePlayerLife';
import {
  ensureRecruitmentV5,
  computeTransferMotivation,
  computePreOfferWillingness,
  computeAgentDemands,
  withMotivationForNegotiation,
  evaluateOffer,
  RECRUITMENT_TUNING,
} from '../src/domain/recruitment';
import type { TransferMotivationSignalContext } from '../src/domain/recruitment';
import type { GameSaveData } from '../src/types/save';

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));

function baseSave(): GameSaveData {
  return ensureRecruitmentV5(
    ensurePlayerLifeV4({
      saveVersion: 4,
      saveId: 'phase_d_1d_save',
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
      scoutMarket: clone(REAL_INITIAL_SCOUT_MARKET.slice(0, 4)),
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

function signals(overrides: Partial<TransferMotivationSignalContext>): TransferMotivationSignalContext {
  const player = REAL_INITIAL_SCOUT_MARKET[0];
  return {
    playerId: player.id,
    personalityArchetype: player.personality,
    morale: player.morale,
    playingTimeFulfillmentPct: 70,
    developmentSatisfaction: 60,
    contractSatisfaction: 55,
    contractYearsRemaining: player.contractYears,
    managerTrust: 55,
    managerSatisfaction: 52,
    mentalFrustration: 30,
    mentalHappiness: 55,
    currentClubReputation: 55,
    desiredClubLevel: 70,
    seeksChampionsLeague: false,
    wageVsSquadMedianPct: 95,
    ...overrides,
  };
}

section('Migration bumps recruitment schema to v4 (motivation slice — stateless)');
{
  const save = baseSave();
  assertEqual(save.recruitmentWorld!.schemaVersion, 4, 'schema v4');
  const twice = ensureRecruitmentV5(clone(save));
  assertEqual(JSON.stringify(save.recruitmentWorld), JSON.stringify(twice.recruitmentWorld), 'idempotent');
}

section('v3 recruitmentWorld upgrades to v4 without data loss');
{
  const save = baseSave();
  const v3 = clone(save.recruitmentWorld!);
  v3.schemaVersion = 3;
  const upgraded = ensureRecruitmentV5({ ...save, recruitmentWorld: v3 as GameSaveData['recruitmentWorld'] });
  assertEqual(upgraded.recruitmentWorld!.schemaVersion, 4, 'v3→v4');
  assertEqual(upgraded.recruitmentWorld!.negotiations.length, save.recruitmentWorld!.negotiations.length, 'negotiations kept');
}

section('Low playing time + low morale yields higher transfer desire than happy starter');
{
  const worldSeed = baseSave().recruitmentWorld!.worldSeed;
  const unhappy = computeTransferMotivation({
    worldSeed,
    gameWeek: 4,
    observerClubId: REAL_INITIAL_PLAYER_CLUB.id,
    signals: signals({
      playingTimeFulfillmentPct: 15,
      morale: 35,
      mentalFrustration: 70,
      managerTrust: 30,
      developmentSatisfaction: 35,
    }),
  });
  const happy = computeTransferMotivation({
    worldSeed,
    gameWeek: 4,
    observerClubId: REAL_INITIAL_PLAYER_CLUB.id,
    signals: signals({
      playingTimeFulfillmentPct: 95,
      morale: 82,
      mentalFrustration: 10,
      managerTrust: 78,
      developmentSatisfaction: 80,
    }),
  });
  assert(
    unhappy.projectedTransferDesire > happy.projectedTransferDesire + 8,
    `bench frustration ${unhappy.projectedTransferDesire} vs starter ${happy.projectedTransferDesire}`,
  );
  assert(unhappy.dominantMotives.includes('playing_time'), 'playing_time dominant when benched');
}

section('Pre-offer willingness active before any official offer');
{
  const worldSeed = baseSave().recruitmentWorld!.worldSeed;
  const motivation = computeTransferMotivation({
    worldSeed,
    gameWeek: 6,
    observerClubId: REAL_INITIAL_PLAYER_CLUB.id,
    signals: signals({
      playingTimeFulfillmentPct: 10,
      morale: 38,
      suitorClubReputation: 85,
      suitorOffersChampionsLeague: true,
      seeksChampionsLeague: true,
    }),
  });
  const pre = computePreOfferWillingness(motivation, signals({
    playingTimeFulfillmentPct: 10,
    suitorClubReputation: 85,
    suitorOffersChampionsLeague: true,
    seeksChampionsLeague: true,
  }));
  assert(pre.willInfluenceTransfer, 'agent can push move pre-offer');
  assert(pre.band === 'keen' || pre.band === 'desperate' || pre.band === 'open', `band=${pre.band}`);
}

section('Motivation feeds negotiation evaluateOffer via bridge');
{
  const player = REAL_INITIAL_SCOUT_MARKET[0];
  const worldSeed = baseSave().recruitmentWorld!.worldSeed;
  const lowMotivation = computeTransferMotivation({
    worldSeed,
    gameWeek: 3,
    observerClubId: REAL_INITIAL_PLAYER_CLUB.id,
    signals: signals({ playingTimeFulfillmentPct: 90, morale: 85, mentalFrustration: 5 }),
  });
  const highMotivation = computeTransferMotivation({
    worldSeed,
    gameWeek: 3,
    observerClubId: REAL_INITIAL_PLAYER_CLUB.id,
    signals: signals({ playingTimeFulfillmentPct: 8, morale: 32, mentalFrustration: 75 }),
  });

  const offer = {
    id: 'off_mot',
    fromClubId: REAL_INITIAL_PLAYER_CLUB.id,
    toClubId: 'market',
    playerId: player.id,
    clauses: [{ kind: 'fee' as const, amount: Math.round(player.marketValue * 0.92) }],
  };

  const lowCtx = withMotivationForNegotiation(
    {
      playerId: player.id,
      personality: player.personality,
      weeklyWage: player.wage,
      referenceMarketValue: player.marketValue,
      transferDesire: 50,
      contractYearsRemaining: player.contractYears,
    },
    lowMotivation,
  );
  const highCtx = withMotivationForNegotiation(
    {
      playerId: player.id,
      personality: player.personality,
      weeklyWage: player.wage,
      referenceMarketValue: player.marketValue,
      transferDesire: 50,
      contractYearsRemaining: player.contractYears,
    },
    highMotivation,
  );

  const evalLow = evaluateOffer({
    worldSeed,
    gameWeek: 3,
    sellingClubId: 'market',
    player: lowCtx,
    offer,
    roundsUsed: 1,
    maxRounds: 4,
  });
  const evalHigh = evaluateOffer({
    worldSeed,
    gameWeek: 3,
    sellingClubId: 'market',
    player: highCtx,
    offer,
    roundsUsed: 1,
    maxRounds: 4,
  });

  assert(
    evalLow.response === 'rejected_player_unwilling' || evalHigh.response !== evalLow.response,
    'motivation changes negotiation posture',
  );
}

section('Agent demands scale with projected desire');
{
  const player = REAL_INITIAL_SCOUT_MARKET[1];
  const low = computeTransferMotivation({
    worldSeed: 1,
    gameWeek: 1,
    observerClubId: 'c1',
    signals: signals({ playerId: player.id, playingTimeFulfillmentPct: 88, morale: 80 }),
  });
  const high = computeTransferMotivation({
    worldSeed: 1,
    gameWeek: 1,
    observerClubId: 'c1',
    signals: signals({ playerId: player.id, playingTimeFulfillmentPct: 5, morale: 30, wageVsSquadMedianPct: 60 }),
  });
  const demandLow = computeAgentDemands({
    referenceMarketValue: player.marketValue,
    personalityArchetype: player.personality,
    motivation: low,
  });
  const demandHigh = computeAgentDemands({
    referenceMarketValue: player.marketValue,
    personalityArchetype: player.personality,
    motivation: high,
  });
  assert(demandHigh.minFeeAcceptRatio >= demandLow.minFeeAcceptRatio, 'higher desire → higher fee floor');
  assert(demandHigh.openingAskRatio >= demandLow.openingAskRatio, 'opening ask rises with desire');
}

section('Deterministic motivation for fixed seed/week/player');
{
  const input = {
    worldSeed: 99,
    gameWeek: 8,
    observerClubId: REAL_INITIAL_PLAYER_CLUB.id,
    signals: signals({ playingTimeFulfillmentPct: 40 }),
  };
  const a = computeTransferMotivation(input);
  const b = computeTransferMotivation(input);
  assertEqual(a.projectedTransferDesire, b.projectedTransferDesire, 'same desire');
  assertEqual(a.dominantMotives.join(','), b.dominantMotives.join(','), 'same motives');
}

section('Loyal archetype dampens desire vs ambitious under same stress');
{
  const stressed = {
    playingTimeFulfillmentPct: 20,
    morale: 40,
    mentalFrustration: 55,
  };
  const loyal = computeTransferMotivation({
    worldSeed: 5,
    gameWeek: 2,
    observerClubId: 'c',
    signals: signals({ ...stressed, personalityArchetype: 'loyal' }),
  });
  const ambitious = computeTransferMotivation({
    worldSeed: 5,
    gameWeek: 2,
    observerClubId: 'c',
    signals: signals({ ...stressed, personalityArchetype: 'ambitious' }),
  });
  assert(
    ambitious.projectedTransferDesire > loyal.projectedTransferDesire,
    `ambitious ${ambitious.projectedTransferDesire} > loyal ${loyal.projectedTransferDesire}`,
  );
  assert(
    RECRUITMENT_TUNING.motivation.archetypeBias.loyal < RECRUITMENT_TUNING.motivation.archetypeBias.ambitious,
    'tuning bias ordering',
  );
}

finish();
