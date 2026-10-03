/**
 * Phase D — store integration (weekly matchday → recruitment tick).
 */

import { assert, assertEqual, finish, section } from './lib/testHarness';
import { REAL_INITIAL_PLAYER_CLUB, REAL_INITIAL_SCOUT_MARKET, REAL_INITIAL_STANDINGS } from '../src/data/realFootballData';
import { ensurePlayerLifeV4 } from '../src/domain/playerLife/migratePlayerLife';
import { ensureRecruitmentV5 } from '../src/domain/recruitment/migration/migrateRecruitmentV5';
import {
  applyUserWeeklyRecruitment,
  buildWeeklyRecruitmentTickInputFromSave,
  createDefaultAiClubProfile,
  decideTransferAction,
  getObservedPlayerView,
  knowledgeToObservedView,
  toPublicRumorView,
  computeTransferMotivation,
  computePreOfferWillingness,
  buildTransferMotivationSignalsFromPlayer,
} from '../src/domain/recruitment';
import type { GameSaveData } from '../src/types/save';
import { SaveService } from '../src/services/persistence/saveService';

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));

function careerSave(simulatedMatchdays: number[]): GameSaveData {
  return ensureRecruitmentV5(
    ensurePlayerLifeV4({
      saveVersion: 5,
      saveId: 'store_integration_save',
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
      leagueStandings: clone(REAL_INITIAL_STANDINGS),
      leagueFixtures: [],
      matchHistory: [],
      tournamentStats: [],
      simulatedMatchdays,
      matchScoutReports: {},
      unlockedSpeed2x: false,
      livingWorld: {
        schemaVersion: 2,
        currentSeason: 1,
        managerCareer: { reputation: 50, reputationLedger: [] },
        clubMemory: [],
        playerMemories: {},
        relationships: [],
        eventLog: [],
        notifications: [],
        notificationThrottle: { dayBuckets: {} },
      },
    }),
  );
}

section('Weekly progression hook builds AI context from save (observed + motivation)');
{
  const save = careerSave([1, 2]);
  const input = buildWeeklyRecruitmentTickInputFromSave(save);
  assert(input.aiClubEntries.length > 0, 'AI clubs');
  const entry = input.aiClubEntries.find((e) => e.clubId === 'club_man_city');
  assert(!!entry && entry.candidates.length > 0, 'candidates for city');
  const c = entry!.candidates[0]!;
  assert(!('truePotential' in c.observed), 'observed safe');
  assert(!!c.motivation && !!c.willingness, 'motivation bridge');
}

section('applyUserWeeklyRecruitment persists recruitmentWorld and Living World events');
{
  const save = careerSave([1, 2, 3]);
  const first = applyUserWeeklyRecruitment({
    club: save.club,
    livingWorld: save.livingWorld!,
    scoutMarket: save.scoutMarket,
    leagueStandings: save.leagueStandings,
    simulatedMatchdays: save.simulatedMatchdays,
    activeNegotiations: save.activeNegotiations,
    recruitmentWorld: save.recruitmentWorld!,
    saveId: save.saveId,
  });
  assert(first.skippedReason === undefined, 'first tick runs');
  assert(first.recruitmentWorld.rumorThrottle.orchestrationCompletedWeeks[3], 'idempotency marker');
  const recruitmentEvents = first.events.filter((e) => e.type.startsWith('recruitment.'));
  assert(recruitmentEvents.length > 0, 'recruitment events emitted');
  const logged = first.livingWorld.eventLog.filter((e) => e.type.startsWith('recruitment.'));
  assert(logged.length >= recruitmentEvents.length, 'events reach livingWorld eventLog');

  const second = applyUserWeeklyRecruitment({
    ...first,
    scoutMarket: save.scoutMarket,
    leagueStandings: save.leagueStandings,
    simulatedMatchdays: save.simulatedMatchdays,
    activeNegotiations: save.activeNegotiations,
    saveId: save.saveId,
  });
  assertEqual(second.skippedReason, 'already_processed_week', 'idempotent same week');
  assertEqual(second.events.length, 0, 'no duplicate events');
}

section('SaveService extractSaveData persists recruitmentWorld from store-shaped state');
{
  const save = careerSave([1]);
  const after = applyUserWeeklyRecruitment({
    club: save.club,
    livingWorld: save.livingWorld!,
    scoutMarket: save.scoutMarket,
    leagueStandings: save.leagueStandings,
    simulatedMatchdays: [1, 2],
    activeNegotiations: [],
    recruitmentWorld: save.recruitmentWorld!,
    saveId: save.saveId,
  });
  const svc = new SaveService();
  const extracted = svc.extractSaveData({
    club: after.club,
    livingWorld: after.livingWorld,
    recruitmentWorld: after.recruitmentWorld,
    saveId: save.saveId,
    scoutMarket: save.scoutMarket,
    leagueStandings: save.leagueStandings,
    simulatedMatchdays: [1, 2],
    currentSport: 'football',
    language: 'en',
    soundEnabled: true,
    hasSelectedInitialClub: true,
    isGuest: false,
    hasClaimedLoginBonus: false,
    energy: 100,
    lastEnergyUpdate: 0,
    vipPoints: 0,
    dailyMissions: [],
    storyMissions: [],
    leagueFixtures: [],
    matchHistory: [],
    tournamentStats: [],
    activeNegotiations: [],
    academyDiscoveries: [],
  });
  assertEqual(extracted.recruitmentWorld!.schemaVersion, 8, 'schema v8 persisted');
  assert(extracted.recruitmentWorld!.rumorThrottle.orchestrationCompletedWeeks[2], 'marker round-trips');
}

section('Hidden-information boundary on store-facing views');
{
  const save = careerSave([1]);
  const playerId = save.scoutMarket[0]!.id;
  const view = getObservedPlayerView(save.recruitmentWorld!, save.club.id, playerId)!;
  assert(!!view);
  assert(!('trueOverall' in view) && !('truePotential' in view) && !('trueMarketValue' in view));
  const after = applyUserWeeklyRecruitment({
    club: save.club,
    livingWorld: save.livingWorld!,
    scoutMarket: save.scoutMarket,
    leagueStandings: save.leagueStandings,
    simulatedMatchdays: [4],
    activeNegotiations: [],
    recruitmentWorld: save.recruitmentWorld!,
    saveId: save.saveId,
  });
  for (const rumor of after.recruitmentWorld.transferRumors) {
    const pub = toPublicRumorView(rumor, 'en');
    assert(!('truthFlag' in pub), 'public rumor view');
  }
}

section('AI club behavioral diversity (same seed, observed, finances)');
{
  const WORLD_SEED = 7777;
  const save = careerSave([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25]);
  save.recruitmentWorld!.worldSeed = WORLD_SEED;
  const player = save.scoutMarket[0]!;
  const observed = knowledgeToObservedView({
    observerClubId: save.club.id,
    playerId: player.id,
    confidencePct: 78,
    ratingMin: 81,
    ratingMax: 87,
    potentialBandMin: 84,
    potentialBandMax: 92,
    valueMin: 5_000_000,
    valueMax: 8_000_000,
    revealedGroups: ['technical', 'physical'],
    lastUpdatedWeek: 25,
  });
  const signals = buildTransferMotivationSignalsFromPlayer(player, {
    userClub: save.club,
    sellerClubId: save.club.id,
    suitorClubId: 'club_man_city',
    suitorReputation: 90,
  });
  const motivation = computeTransferMotivation({
    worldSeed: WORLD_SEED,
    gameWeek: 25,
    observerClubId: 'club_man_city',
    signals,
  });
  const willingness = computePreOfferWillingness(motivation, signals);
  const finances = {
    transferBudget: 12_000_000,
    wageBudgetRemainingWeekly: 800_000,
    squadSize: 22,
    maxSquadSize: 30,
  };
  const base = {
    mode: 'buy' as const,
    worldSeed: WORLD_SEED,
    gameWeek: 25,
    observedPlayer: observed,
    playerWillingness: willingness,
    transferWindowOpen: true,
    permanentTransferAllowed: true,
    squadNeeds: { minEstimatedRating: 70, needUrgency: 72 },
    finances,
  };
  const clubs = ['club_man_city', 'club_barcelona', 'club_al_ahly', 'club_al_hilal'] as const;
  const decisions = clubs.map((clubId) => {
    const profile = createDefaultAiClubProfile(clubId, WORLD_SEED);
    const d = decideTransferAction({ ...base, actingClubId: clubId, profile });
    return { clubId, philosophy: profile.philosophy, action: d.action, interest: d.interestLevel, reasons: d.reasonCodes };
  });
  console.log(JSON.stringify(decisions, null, 2));
  const unique = new Set(decisions.map((d) => d.action));
  assert(unique.size >= 2, `distinct actions: ${[...unique].join(', ')}`);
}

finish();
