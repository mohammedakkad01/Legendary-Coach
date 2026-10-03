/**
 * Phase D Part 1F — transfer rumors & club interest (domain only).
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { assert, assertEqual, finish, section } from './lib/testHarness';
import { REAL_INITIAL_PLAYER_CLUB, REAL_INITIAL_SCOUT_MARKET, REAL_INITIAL_STANDINGS } from '../src/data/realFootballData';
import { ensurePlayerLifeV4 } from '../src/domain/playerLife/migratePlayerLife';
import {
  ensureRecruitmentV5,
  knowledgeToObservedView,
  applyRecruitmentPatches,
  runAiClubWeeklyTransferBatch,
  buildRumorsFromAiWeeklyBatch,
  createDefaultAiClubProfile,
  computeTransferMotivation,
  computePreOfferWillingness,
  generateWeeklyRumors,
  emptyRumorThrottleState,
  canCreateRumor,
  rumorDedupeKey,
  renderRumorTemplate,
  toPublicRumorView,
  isTransferWindowOpen,
  checkPermanentTransferAllowed,
  RECRUITMENT_TUNING,
} from '../src/domain/recruitment';
import type { GameSaveData } from '../src/types/save';
import type { KnowledgeState } from '../src/domain/recruitment';

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));

function baseSave(): GameSaveData {
  return ensureRecruitmentV5(
    ensurePlayerLifeV4({
      saveVersion: 4,
      saveId: 'phase_d_1f_save',
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

function observed(partial: Partial<KnowledgeState> & { playerId: string; observerClubId: string }) {
  return knowledgeToObservedView({
    confidencePct: 60,
    ratingMin: 75,
    ratingMax: 82,
    potentialBandMin: 70,
    potentialBandMax: 88,
    valueMin: 2_000_000,
    valueMax: 4_000_000,
    revealedGroups: ['technical'],
    lastUpdatedWeek: 1,
    ...partial,
  });
}

section('Migration initializes rumor slices (schema v7)');
{
  const save = baseSave();
  assertEqual(save.recruitmentWorld!.schemaVersion, 7, 'schema v7');
  assert(Array.isArray(save.recruitmentWorld!.transferRumors), 'rumors array');
  assert(Array.isArray(save.recruitmentWorld!.clubInterestRecords), 'interests array');
  assert(!!save.recruitmentWorld!.rumorThrottle, 'throttle state');
  const twice = ensureRecruitmentV5(clone(save));
  assertEqual(JSON.stringify(save.recruitmentWorld), JSON.stringify(twice.recruitmentWorld), 'idempotent');
}

section('v5 world upgrades through chain to current schema');
{
  const save = baseSave();
  const v5 = clone(save.recruitmentWorld!);
  v5.schemaVersion = 5;
  delete (v5 as { transferRumors?: unknown }).transferRumors;
  const up = ensureRecruitmentV5({ ...save, recruitmentWorld: v5 as GameSaveData['recruitmentWorld'] });
  assertEqual(up.recruitmentWorld!.schemaVersion, 7, 'v5→v7');
  assert(!!up.recruitmentWorld!.aiClubProfiles['club_man_city'], 'profiles kept');
}

section('Weekly rumor generation is deterministic');
{
  const input = {
    worldSeed: 77,
    gameWeek: 4,
    userClubId: REAL_INITIAL_PLAYER_CLUB.id,
    throttle: emptyRumorThrottleState(),
    clubInterests: [{
      interestedClubId: 'club_man_city',
      playerId: 'p_det',
      sellerClubId: 'club_arsenal',
      target: {
        playerId: 'p_det',
        interestLevel: 80,
        fitScore: 75,
        decision: {
          action: 'negotiate' as const,
          interestLevel: 80,
          reasonCodes: ['strong_interest'],
          suggestedMaxFee: 3_000_000,
        },
      },
      observed: observed({ playerId: 'p_det', observerClubId: 'club_man_city', confidencePct: 80 }),
    }],
    agentActivities: [],
  };
  const a = generateWeeklyRumors(input);
  const b = generateWeeklyRumors(input);
  assertEqual(a.rumors.length, b.rumors.length, 'count');
  assertEqual(a.rumors[0]?.reliability, b.rumors[0]?.reliability, 'reliability');
  assertEqual(a.rumors[0]?.claimKind, b.rumors[0]?.claimKind, 'claim');
}

section('Weekly cap blocks excess rumors');
{
  let throttle = emptyRumorThrottleState();
  const base = {
    worldSeed: 1,
    gameWeek: 9,
    userClubId: REAL_INITIAL_PLAYER_CLUB.id,
    agentActivities: [] as const,
  };
  let total = 0;
  for (let i = 0; i < 20; i += 1) {
    const res = generateWeeklyRumors({
      ...base,
      throttle,
      clubInterests: [{
        interestedClubId: `club_${i}`,
        playerId: `player_${i}`,
        target: {
          playerId: `player_${i}`,
          interestLevel: 70,
          fitScore: 70,
          decision: { action: 'register_interest', interestLevel: 70, reasonCodes: [] },
        },
        observed: observed({ playerId: `player_${i}`, observerClubId: `club_${i}`, confidencePct: 50 }),
      }],
    });
    total += res.rumors.length;
    throttle = res.throttle;
  }
  assert(total <= RECRUITMENT_TUNING.rumors.maxPerWeek, `created ${total} capped`);
}

section('Dedupe cooldown prevents duplicate keys same week chain');
{
  const key = rumorDedupeKey({
    type: 'club_interest',
    playerId: 'p1',
    claimingClubId: 'club_a',
    claimKind: 'monitoring',
  });
  let throttle = emptyRumorThrottleState();
  const gate1 = canCreateRumor(throttle, 3, key);
  assert(gate1.allowed, 'first allowed');
  throttle = {
    ...throttle,
    lastCreatedWeekByKey: { [key]: 3 },
    rumorsCreatedByWeek: { 3: 1 },
  };
  const gate2 = canCreateRumor(throttle, 3, key);
  assert(!gate2.allowed && gate2.reason === 'cooldown', 'cooldown blocks');
}

section('Truth-aligned rumors trend reliable with high confidence (200 runs)');
{
  let reliable = 0;
  let falseCount = 0;
  for (let i = 0; i < 200; i += 1) {
    const res = generateWeeklyRumors({
      worldSeed: i,
      gameWeek: 5,
      userClubId: 'club_user',
      throttle: emptyRumorThrottleState(),
      clubInterests: [{
        interestedClubId: 'club_man_city',
        playerId: 'p_truth',
        target: {
          playerId: 'p_truth',
          interestLevel: 85,
          fitScore: 80,
          decision: { action: 'bid_immediately', interestLevel: 85, reasonCodes: [] },
        },
        observed: observed({ playerId: 'p_truth', observerClubId: 'club_man_city', confidencePct: 88 }),
      }],
      agentActivities: [],
      allowFabricatedRumors: true,
    });
    for (const r of res.rumors) {
      if (r.truthFlag && r.reliability === 'reliable') reliable += 1;
      if (!r.truthFlag && r.reliability === 'false') falseCount += 1;
    }
  }
  assert(reliable > falseCount, `reliable ${reliable} vs false-labeled ${falseCount}`);
}

section('Public rumor view hides truthFlag');
{
  const res = generateWeeklyRumors({
    worldSeed: 5,
    gameWeek: 2,
    userClubId: REAL_INITIAL_PLAYER_CLUB.id,
    throttle: emptyRumorThrottleState(),
    clubInterests: [{
      interestedClubId: 'club_psg',
      playerId: 'p_pub',
      target: {
        playerId: 'p_pub',
        interestLevel: 70,
        fitScore: 70,
        decision: { action: 'register_interest', interestLevel: 70, reasonCodes: [] },
      },
      observed: observed({ playerId: 'p_pub', observerClubId: 'club_psg', confidencePct: 55 }),
    }],
    agentActivities: [],
  });
  assert(res.rumors.length > 0, 'rumor exists');
  const pub = toPublicRumorView(res.rumors[0], 'en');
  assert(!('truthFlag' in pub), 'no truthFlag on public view');
  assert(pub.renderedText.includes('Reports indicate') || pub.renderedText.includes('Sources close'), 'template text');
  assert(!pub.renderedText.toLowerCase().includes('truthflag'), 'no leak in text');
}

section('End-to-end: AI batch → rumors → patches');
{
  const save = baseSave();
  const world = save.recruitmentWorld!;
  const player = save.scoutMarket[0];
  const clubId = 'club_man_city';
  const profile = world.aiClubProfiles[clubId] ?? createDefaultAiClubProfile(clubId, world.worldSeed);
  const observedPlayer = observed({
    playerId: player.id,
    observerClubId: clubId,
    confidencePct: 78,
    ratingMin: 80,
    ratingMax: 86,
    valueMin: 3_000_000,
    valueMax: 5_000_000,
  });
  const signals = {
    playerId: player.id,
    personalityArchetype: player.personality,
    morale: 40,
    playingTimeFulfillmentPct: 15,
    developmentSatisfaction: 40,
    contractSatisfaction: 45,
    contractYearsRemaining: player.contractYears,
    managerTrust: 35,
    managerSatisfaction: 40,
    mentalFrustration: 65,
    mentalHappiness: 40,
    currentClubReputation: 60,
    desiredClubLevel: 90,
    seeksChampionsLeague: true,
    wageVsSquadMedianPct: 80,
    suitorClubReputation: 92,
    suitorOffersChampionsLeague: true,
  };
  const motivation = computeTransferMotivation({
    worldSeed: world.worldSeed,
    gameWeek: world.gameWeek,
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
  const batch = runAiClubWeeklyTransferBatch({
    worldSeed: world.worldSeed,
    gameWeek: world.gameWeek,
    transferWindowOpen: isTransferWindowOpen(world.transferWindow),
    permanentTransferAllowed: checkPermanentTransferAllowed(world.transferWindow).allowed,
    clubs: [{
      clubId,
      profile,
      finances: { transferBudget: 120_000_000, wageBudgetRemainingWeekly: 2_000_000, squadSize: 22, maxSquadSize: 30 },
      squadNeeds: { minEstimatedRating: 70, needUrgency: 85 },
      candidates: [candidate],
    }],
  });
  const built = buildRumorsFromAiWeeklyBatch({
    worldSeed: world.worldSeed,
    gameWeek: world.gameWeek,
    userClubId: save.club.id,
    throttle: world.rumorThrottle,
    batch,
    candidatesByClubId: { [clubId]: [candidate] },
    agentActivities: [{ playerId: player.id, subjectClubId: save.club.id, willingness }],
  });
  assert(built.rumors.length > 0, 'rumors generated from AI/motivation pipeline');
  if (built.rumors.some((r) => r.type === 'club_interest')) {
    assert(built.interests.length > 0, 'interest linked to club_interest rumor');
  }
  const next = applyRecruitmentPatches(world, built.patches);
  assert(next.transferRumors.some((r) => r.id === built.rumors[0].id), 'persisted rumor');
  assert(built.events.some((e) => e.type === 'recruitment.rumor.created'), 'rumor event shape');
}

section('Rumor modules avoid TrueWorldPlayer');
{
  for (const rel of [
    'src/domain/recruitment/rumors/generateRumors.ts',
    'src/domain/recruitment/rumors/rumorTemplates.ts',
    'src/domain/recruitment/index.ts',
  ]) {
    const text = readFileSync(join(process.cwd(), rel), 'utf8');
    assert(!text.includes('TrueWorldPlayer'), `${rel} clean`);
    assert(!text.includes('trueProfile'), `${rel} no trueProfile`);
  }
}

section('Template rendering EN/AR');
{
  const sample = {
    id: 'r1',
    type: 'club_interest' as const,
    subjectPlayerId: 'p1',
    claimingClubId: 'club_a',
    claimKind: 'monitoring' as const,
    reliability: 'uncertain' as const,
    source: 'press' as const,
    truthFlag: true,
    createdWeek: 1,
  };
  const en = renderRumorTemplate(sample, 'en');
  const ar = renderRumorTemplate(sample, 'ar');
  assert(en.length > 10 && ar.length > 10, 'non-empty templates');
}

finish();
