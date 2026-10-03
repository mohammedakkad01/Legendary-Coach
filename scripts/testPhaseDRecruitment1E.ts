/**
 * Phase D Part 1E — AI club profiles + decideTransferAction tests.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { assert, assertEqual, finish, section } from './lib/testHarness';
import { REAL_INITIAL_PLAYER_CLUB, REAL_INITIAL_SCOUT_MARKET, REAL_INITIAL_STANDINGS } from '../src/data/realFootballData';
import { ensurePlayerLifeV4 } from '../src/domain/playerLife/migratePlayerLife';
import {
  ensureRecruitmentV5,
  getObservedPlayerView,
  knowledgeToObservedView,
  createDefaultAiClubProfile,
  decideTransferAction,
  isAggressiveBuyAction,
  identifyTransferTargets,
  runAiClubWeeklyTransferBatch,
  computeTransferMotivation,
  computePreOfferWillingness,
  buildTransferWindowState,
  isTransferWindowOpen,
  checkPermanentTransferAllowed,
  RECRUITMENT_TUNING,
} from '../src/domain/recruitment';
import type { GameSaveData } from '../src/types/save';
import type { KnowledgeState, ObservedPlayerView } from '../src/domain/recruitment';

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));

function baseSave(): GameSaveData {
  return ensureRecruitmentV5(
    ensurePlayerLifeV4({
      saveVersion: 4,
      saveId: 'phase_d_1e_save',
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
      scoutMarket: clone(REAL_INITIAL_SCOUT_MARKET.slice(0, 6)),
      dailyMissions: [],
      storyMissions: [],
      leagueStandings: clone(REAL_INITIAL_STANDINGS),
      leagueFixtures: [],
      matchHistory: [],
      tournamentStats: [],
      simulatedMatchdays: [1],
      matchScoutReports: {},
      unlockedSpeed2x: false,
    }),
  );
}

function observedFromKnowledge(partial: Partial<KnowledgeState> & { playerId: string; observerClubId: string }): ObservedPlayerView {
  const knowledge: KnowledgeState = {
    confidencePct: partial.confidencePct ?? 55,
    ratingMin: partial.ratingMin ?? 70,
    ratingMax: partial.ratingMax ?? 78,
    potentialBandMin: partial.potentialBandMin ?? 72,
    potentialBandMax: partial.potentialBandMax ?? 86,
    valueMin: partial.valueMin ?? 2_000_000,
    valueMax: partial.valueMax ?? 3_500_000,
    revealedGroups: partial.revealedGroups ?? ['technical'],
    lastUpdatedWeek: partial.lastUpdatedWeek ?? 1,
    ...partial,
  };
  return knowledgeToObservedView(knowledge);
}

function motivationBundle(playerId: string, playingPct: number) {
  const player = REAL_INITIAL_SCOUT_MARKET.find((p) => p.id === playerId) ?? REAL_INITIAL_SCOUT_MARKET[0];
  const signals = {
    playerId,
    personalityArchetype: player.personality,
    morale: player.morale,
    playingTimeFulfillmentPct: playingPct,
    developmentSatisfaction: 50,
    contractSatisfaction: 50,
    contractYearsRemaining: player.contractYears,
    managerTrust: 50,
    managerSatisfaction: 50,
    mentalFrustration: playingPct < 30 ? 70 : 20,
    mentalHappiness: 50,
    currentClubReputation: 60,
    desiredClubLevel: 80,
    seeksChampionsLeague: true,
    wageVsSquadMedianPct: 90,
    suitorClubReputation: 88,
    suitorOffersChampionsLeague: true,
  };
  const motivation = computeTransferMotivation({
    worldSeed: 7,
    gameWeek: 5,
    observerClubId: 'club_man_city',
    signals,
  });
  const willingness = computePreOfferWillingness(motivation, signals);
  return { motivation, willingness };
}

section('Migration seeds AI club profiles (schema v5)');
{
  const save = baseSave();
  assertEqual(save.recruitmentWorld!.schemaVersion, 9, 'schema v9');
  assert(!!save.recruitmentWorld!.aiClubProfiles['club_man_city'], 'man city profile');
  assertEqual(
    save.recruitmentWorld!.aiClubProfiles['club_man_city'].philosophy,
    'galacticos',
    'known override',
  );
  const twice = ensureRecruitmentV5(clone(save));
  assertEqual(
    JSON.stringify(save.recruitmentWorld!.aiClubProfiles),
    JSON.stringify(twice.recruitmentWorld!.aiClubProfiles),
    'profiles idempotent',
  );
}

section('v4 world upgrades to v5 with aiClubProfiles');
{
  const save = baseSave();
  const v4 = clone(save.recruitmentWorld!);
  v4.schemaVersion = 4;
  delete (v4 as { aiClubProfiles?: unknown }).aiClubProfiles;
  const up = ensureRecruitmentV5({ ...save, recruitmentWorld: v4 as GameSaveData['recruitmentWorld'] });
  assertEqual(up.recruitmentWorld!.schemaVersion, 9, 'v5→v9');
  assert(Object.keys(up.recruitmentWorld!.aiClubProfiles).length > 0, 'profiles populated');
}

section('decideTransferAction buy is deterministic');
{
  const profile = createDefaultAiClubProfile('club_test_a', 1);
  const observed = observedFromKnowledge({
    playerId: 'p_det',
    observerClubId: 'club_test_a',
    confidencePct: 70,
  });
  const { willingness } = motivationBundle('p_det', 40);
  const window = buildTransferWindowState(25);
  const input = {
    mode: 'buy' as const,
    worldSeed: 100,
    gameWeek: 3,
    actingClubId: 'club_test_a',
    profile,
    finances: { transferBudget: 10_000_000, wageBudgetRemainingWeekly: 500_000, squadSize: 20, maxSquadSize: 30 },
    squadNeeds: { minEstimatedRating: 65, needUrgency: 70 },
    transferWindowOpen: isTransferWindowOpen(window),
    permanentTransferAllowed: checkPermanentTransferAllowed(window).allowed,
    observedPlayer: observed,
    playerWillingness: willingness,
  };
  const a = decideTransferAction(input);
  const b = decideTransferAction(input);
  assertEqual(a.action, b.action, 'same action');
  assertEqual(a.interestLevel, b.interestLevel, 'same interest');
}

section('Budget cap forces pass or loan');
{
  const profile = createDefaultAiClubProfile('club_man_city', 99);
  const observed = observedFromKnowledge({
    playerId: 'p_expensive',
    observerClubId: 'club_man_city',
    valueMin: 8_000_000,
    valueMax: 12_000_000,
    confidencePct: 80,
  });
  const { willingness } = motivationBundle('p_expensive', 20);
  const window = buildTransferWindowState(25);
  const broke = decideTransferAction({
    mode: 'buy',
    worldSeed: 1,
    gameWeek: 2,
    actingClubId: 'club_man_city',
    profile: { ...profile, loanPreference: 0.1 },
    finances: { transferBudget: 200_000, wageBudgetRemainingWeekly: 100_000, squadSize: 20, maxSquadSize: 30 },
    squadNeeds: { minEstimatedRating: 60, needUrgency: 80 },
    transferWindowOpen: true,
    permanentTransferAllowed: true,
    observedPlayer: observed,
    playerWillingness: willingness,
  });
  assert(broke.action === 'pass' || broke.action === 'offer_loan', `broke action ${broke.action}`);
  assert(broke.reasonCodes.includes('budget_exceeded') || broke.reasonCodes.includes('budget_prefers_loan'), 'budget reason');
}

section('Squad limit blocks buys');
{
  const profile = createDefaultAiClubProfile('club_arsenal', 2);
  const observed = observedFromKnowledge({ playerId: 'p_sq', observerClubId: 'club_arsenal', confidencePct: 90 });
  const { willingness } = motivationBundle('p_sq', 15);
  const r = decideTransferAction({
    mode: 'buy',
    worldSeed: 2,
    gameWeek: 2,
    actingClubId: 'club_arsenal',
    profile,
    finances: { transferBudget: 50_000_000, wageBudgetRemainingWeekly: 1_000_000, squadSize: 30, maxSquadSize: 30 },
    squadNeeds: { minEstimatedRating: 50, needUrgency: 90 },
    transferWindowOpen: true,
    permanentTransferAllowed: true,
    observedPlayer: observed,
    playerWillingness: willingness,
  });
  assertEqual(r.action, 'pass', 'squad full');
  assert(r.reasonCodes.includes('squad_full'), 'squad_full code');
}

section('Low scout confidence → scout_longer');
{
  const profile = createDefaultAiClubProfile('club_liverpool', 3);
  const observed = observedFromKnowledge({
    playerId: 'p_lowconf',
    observerClubId: 'club_liverpool',
    confidencePct: 12,
  });
  const { willingness } = motivationBundle('p_lowconf', 25);
  const r = decideTransferAction({
    mode: 'buy',
    worldSeed: 3,
    gameWeek: 4,
    actingClubId: 'club_liverpool',
    profile,
    finances: { transferBudget: 20_000_000, wageBudgetRemainingWeekly: 800_000, squadSize: 22, maxSquadSize: 30 },
    squadNeeds: { minEstimatedRating: 60, needUrgency: 60 },
    transferWindowOpen: true,
    permanentTransferAllowed: true,
    observedPlayer: observed,
    playerWillingness: willingness,
  });
  assertEqual(r.action, 'scout_longer', 'scout longer');
}

section('Player unwillingness → pass');
{
  const profile = createDefaultAiClubProfile('club_psg', 4);
  const observed = observedFromKnowledge({ playerId: 'p_happy', observerClubId: 'club_psg', confidencePct: 85 });
  const r = decideTransferAction({
    mode: 'buy',
    worldSeed: 4,
    gameWeek: 4,
    actingClubId: 'club_psg',
    profile,
    finances: { transferBudget: 30_000_000, wageBudgetRemainingWeekly: 900_000, squadSize: 22, maxSquadSize: 30 },
    squadNeeds: { minEstimatedRating: 60, needUrgency: 50 },
    transferWindowOpen: true,
    permanentTransferAllowed: true,
    observedPlayer: observed,
    playerWillingness: {
      band: 'refuse',
      opennessScore: 10,
      willInfluenceTransfer: false,
      reasonCodes: ['pre_offer_refused'],
    },
  });
  assertEqual(r.action, 'pass', 'pass unwilling');
  assert(r.reasonCodes.includes('player_unwilling'), 'unwilling code');
}

section('Different club profiles → different aggressive buy rates (200 seeds)');
{
  const observed = observedFromKnowledge({
    playerId: 'p_profile_cmp',
    observerClubId: 'club_man_city',
    confidencePct: 75,
    ratingMin: 82,
    ratingMax: 88,
    valueMin: 4_000_000,
    valueMax: 6_000_000,
  });
  const { willingness } = motivationBundle('p_profile_cmp', 18);
  let cityAggressive = 0;
  let ahlyAggressive = 0;
  for (let seed = 0; seed < 200; seed += 1) {
    const city = createDefaultAiClubProfile('club_man_city', seed);
    const ahly = createDefaultAiClubProfile('club_al_ahly', seed);
    const financesCity = { transferBudget: 80_000_000, wageBudgetRemainingWeekly: 2_000_000, squadSize: 22, maxSquadSize: 30 };
    const financesAhly = { transferBudget: 8_000_000, wageBudgetRemainingWeekly: 400_000, squadSize: 22, maxSquadSize: 30 };
    const base = {
      mode: 'buy' as const,
      gameWeek: 6,
      observedPlayer: observed,
      playerWillingness: willingness,
      transferWindowOpen: true,
      permanentTransferAllowed: true,
      squadNeeds: { minEstimatedRating: 70, needUrgency: 75 },
    };
    const dCity = decideTransferAction({
      ...base,
      worldSeed: seed,
      actingClubId: 'club_man_city',
      profile: city,
      finances: financesCity,
    });
    const dAhly = decideTransferAction({
      ...base,
      worldSeed: seed,
      actingClubId: 'club_al_ahly',
      profile: ahly,
      finances: financesAhly,
    });
    if (isAggressiveBuyAction(dCity.action)) cityAggressive += 1;
    if (isAggressiveBuyAction(dAhly.action)) ahlyAggressive += 1;
  }
  assert(cityAggressive > ahlyAggressive + 15, `city ${cityAggressive} vs ahly ${ahlyAggressive}`);
}

section('Sell/list decision uses motivation not hidden truth');
{
  const profile = createDefaultAiClubProfile('club_al_nassr', 8);
  const observed = observedFromKnowledge({
    playerId: 'p_sell',
    observerClubId: 'club_al_nassr',
    confidencePct: 88,
  });
  const motivation = computeTransferMotivation({
    worldSeed: 9,
    gameWeek: 7,
    observerClubId: 'club_al_nassr',
    signals: {
      playerId: 'p_sell',
      personalityArchetype: 'ambitious',
      morale: 35,
      playingTimeFulfillmentPct: 8,
      developmentSatisfaction: 30,
      contractSatisfaction: 35,
      contractYearsRemaining: 1,
      managerTrust: 25,
      managerSatisfaction: 28,
      mentalFrustration: 80,
      mentalHappiness: 30,
      currentClubReputation: 55,
      desiredClubLevel: 85,
      seeksChampionsLeague: true,
      wageVsSquadMedianPct: 70,
    },
  });
  const sell = decideTransferAction({
    mode: 'sell',
    worldSeed: 9,
    gameWeek: 7,
    actingClubId: 'club_al_nassr',
    profile: { ...profile, financialPressure: 70 },
    finances: { transferBudget: 1_000_000, wageBudgetRemainingWeekly: 200_000, squadSize: 25, maxSquadSize: 30 },
    observedPlayer: observed,
    playerMotivation: motivation,
    hasReplacementReady: true,
  });
  assert(sell.action === 'list_for_sale' || sell.action === 'hold_asset', 'sell path');
  assert(motivation.projectedTransferDesire > RECRUITMENT_TUNING.motivation.lowDesireThreshold, 'high desire');
}

section('identifyTransferTargets uses observed knowledge from recruitmentWorld');
{
  const save = baseSave();
  const world = save.recruitmentWorld!;
  const observer = 'club_man_city';
  const player = save.scoutMarket[0];
  const observed = getObservedPlayerView(world, save.club.id, player.id);
  assert(!!observed, 'user club knowledge exists');
  const profile = world.aiClubProfiles[observer] ?? createDefaultAiClubProfile(observer, world.worldSeed);
  const { willingness, motivation } = motivationBundle(player.id, 12);
  const observedForAi: ObservedPlayerView = {
    ...observed!,
    observerClubId: observer,
  };
  const targets = identifyTransferTargets({
    worldSeed: world.worldSeed,
    gameWeek: world.gameWeek,
    actingClubId: observer,
    profile,
    finances: { transferBudget: 100_000_000, wageBudgetRemainingWeekly: 2_000_000, squadSize: 20, maxSquadSize: 30 },
    squadNeeds: { minEstimatedRating: 50, needUrgency: 80 },
    transferWindowOpen: isTransferWindowOpen(world.transferWindow),
    permanentTransferAllowed: checkPermanentTransferAllowed(world.transferWindow).allowed,
    candidates: [{ playerId: player.id, observed: observedForAi, willingness, motivation }],
    maxTargets: 3,
  });
  assert(targets.length <= 3, 'cap targets');
}

section('Weekly AI batch enforces club and candidate caps');
{
  const clubs = Array.from({ length: 8 }, (_, i) => {
    const clubId = `club_batch_${i}`;
    return {
      clubId,
      profile: createDefaultAiClubProfile(clubId, 50 + i),
      finances: { transferBudget: 5_000_000, wageBudgetRemainingWeekly: 300_000, squadSize: 20, maxSquadSize: 30 },
      squadNeeds: { minEstimatedRating: 55, needUrgency: 50 },
      candidates: Array.from({ length: 20 }, (__, j) => {
        const playerId = `p_${i}_${j}`;
        const observed = observedFromKnowledge({ playerId, observerClubId: clubId, confidencePct: 60 });
        const { willingness } = motivationBundle(playerId, 30);
        return { playerId, observed, willingness };
      }),
    };
  });
  const batch = runAiClubWeeklyTransferBatch({
    worldSeed: 123,
    gameWeek: 10,
    transferWindowOpen: true,
    permanentTransferAllowed: true,
    clubs,
    maxClubsPerWeek: 3,
    maxCandidatesEvaluatedPerClub: 5,
    maxTargetsPerClub: 2,
  });
  assertEqual(batch.processedClubIds.length, 3, 'club cap');
  assert(batch.skippedClubIds.length >= 5, 'skipped clubs');
  assertEqual(batch.capApplied.maxClubsPerWeek, 3, 'cap metadata');
}

section('AI module public API does not reference TrueWorldPlayer');
{
  const aiFiles = [
    'src/domain/recruitment/aiClubs/decideTransferAction.ts',
    'src/domain/recruitment/aiClubs/clubProfileTypes.ts',
    'src/domain/recruitment/index.ts',
  ];
  for (const rel of aiFiles) {
    const text = readFileSync(join(process.cwd(), rel), 'utf8');
    assert(!text.includes('TrueWorldPlayer'), `${rel} must not mention TrueWorldPlayer`);
    assert(!text.includes('trueProfile'), `${rel} must not import trueProfile`);
  }
}

finish();
