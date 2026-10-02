/**
 * Phase D Part 1C — negotiation domain tests.
 */

import { assert, assertEqual, finish, section } from './lib/testHarness';
import { REAL_INITIAL_PLAYER_CLUB, REAL_INITIAL_SCOUT_MARKET } from '../src/data/realFootballData';
import { ensurePlayerLifeV4 } from '../src/domain/playerLife/migratePlayerLife';
import {
  ensureRecruitmentV5,
  validateOffer,
  evaluateOffer,
  submitNegotiationOffer,
  withdrawNegotiation,
  acceptCounterOffer,
  createDraftNegotiation,
  applyRecruitmentCommandPatches,
  buildTransferWindowState,
  computeUpfrontCash,
} from '../src/domain/recruitment';
import type { GameSaveData } from '../src/types/save';
import type { TransferOffer } from '../src/domain/recruitment';

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));

function baseSave(activeNegotiations: GameSaveData['activeNegotiations'] = []): GameSaveData {
  return ensureRecruitmentV5(
    ensurePlayerLifeV4({
      saveVersion: 4,
      saveId: 'phase_d_1c_save',
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
      activeNegotiations,
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

function buyerSeller(closed = false) {
  const window = buildTransferWindowState(closed ? 10 : 25);
  const buyer = {
    clubId: REAL_INITIAL_PLAYER_CLUB.id,
    coinsAvailable: 5_000_000,
    wageBudgetRemainingWeekly: 500_000,
    squadSize: 20,
    maxSquadSize: 30,
    transferWindow: window,
  };
  const seller = {
    clubId: 'market',
    coinsAvailable: 0,
    wageBudgetRemainingWeekly: 0,
    squadSize: 0,
    maxSquadSize: 30,
    transferWindow: window,
  };
  return { buyer, seller };
}

section('Migration maps legacy activeNegotiations into recruitmentWorld');
{
  const legacy = [
    {
      id: 'neg_legacy_1',
      playerId: 'p_x',
      playerName: 'Test',
      marketValue: 100_000,
      currentOfferAmount: 80_000,
      counterAmount: 95_000,
      roundsUsed: 1,
      maxRounds: 4,
      status: 'countered' as const,
      lastMessageAr: '',
      lastMessageEn: '',
      startedAt: '',
      updatedAt: '',
    },
  ];
  const save = baseSave(legacy);
  assert(save.recruitmentWorld!.negotiations.some((n) => n.id === 'neg_legacy_1'), 'legacy negotiation mapped');
}

section('validateOffer rejects closed window for permanent transfer');
{
  const { buyer, seller } = buyerSeller(true);
  const player = REAL_INITIAL_SCOUT_MARKET[0];
  const offer: TransferOffer = {
    id: 'off_1',
    fromClubId: buyer.clubId,
    toClubId: seller.clubId,
    playerId: player.id,
    clauses: [{ kind: 'fee', amount: player.marketValue }],
  };
  const v = validateOffer(buyer, seller, {
    playerId: player.id,
    personality: player.personality,
    weeklyWage: player.wage,
    referenceMarketValue: player.marketValue,
    transferDesire: 50,
    contractYearsRemaining: player.contractYears,
  }, offer);
  assert(!v.valid, 'invalid when window closed');
  assert(v.reasonCodes.includes('window_closed'), 'window_closed code');
}

section('validateOffer accepts fee + installments within budget');
{
  const { buyer, seller } = buyerSeller(false);
  const player = REAL_INITIAL_SCOUT_MARKET[0];
  const offer: TransferOffer = {
    id: 'off_inst',
    fromClubId: buyer.clubId,
    toClubId: seller.clubId,
    playerId: player.id,
    clauses: [
      { kind: 'installments', upfront: 50_000, installments: [{ amount: 30_000, dueWeek: 10 }] },
      { kind: 'sell_on', percent: 15 },
    ],
  };
  const v = validateOffer(buyer, seller, {
    playerId: player.id,
    personality: 'professional',
    weeklyWage: player.wage,
    referenceMarketValue: player.marketValue,
    transferDesire: 55,
    contractYearsRemaining: 2,
  }, offer);
  assert(v.valid, `installment offer valid: ${v.reasonCodes.join(',')}`);
  assertEqual(computeUpfrontCash(offer.clauses), 80_000, 'upfront cash total');
}

section('validateOffer rejects insufficient budget');
{
  const { buyer, seller } = buyerSeller(false);
  buyer.coinsAvailable = 1000;
  const player = REAL_INITIAL_SCOUT_MARKET[0];
  const offer: TransferOffer = {
    id: 'off_poor',
    fromClubId: buyer.clubId,
    toClubId: seller.clubId,
    playerId: player.id,
    clauses: [{ kind: 'fee', amount: 500_000 }],
  };
  const v = validateOffer(buyer, seller, {
    playerId: player.id,
    personality: 'professional',
    weeklyWage: player.wage,
    referenceMarketValue: player.marketValue,
    transferDesire: 60,
    contractYearsRemaining: 2,
  }, offer);
  assert(!v.valid && v.reasonCodes.includes('insufficient_budget'), 'budget check');
}

section('State machine: submit → counter → accept');
{
  const save = baseSave();
  const world = save.recruitmentWorld!;
  const player = save.scoutMarket[0];
  const { buyer, seller } = buyerSeller(false);
  const offer: TransferOffer = {
    id: 'off_sm',
    fromClubId: buyer.clubId,
    toClubId: seller.clubId,
    playerId: player.id,
    clauses: [{ kind: 'fee', amount: Math.round(player.marketValue * 0.85) }],
  };
  let neg = createDraftNegotiation({
    id: 'neg_sm',
    playerId: player.id,
    sellingClubId: seller.clubId,
    buyingClubId: buyer.clubId,
    startedWeek: 1,
    initialOffer: offer,
  });
  let w = applyRecruitmentCommandPatches(world, [{ kind: 'upsertNegotiation', negotiation: neg }]);

  const submit = submitNegotiationOffer({
    negotiation: neg,
    offer,
    buyer,
    seller,
    player: {
      playerId: player.id,
      personality: player.personality,
      weeklyWage: player.wage,
      referenceMarketValue: player.marketValue,
      transferDesire: 45,
      contractYearsRemaining: player.contractYears,
    },
    gameWeek: 2,
    worldSeed: w.worldSeed,
    timestampIso: new Date(0).toISOString(),
    season: 1,
  });
  assert(submit.ok, 'submit ok');
  w = applyRecruitmentCommandPatches(w, submit.patches);
  neg = submit.negotiation!;
  assert(neg.status === 'countered' || neg.status === 'accepted', 'counter or accept');

  if (neg.status === 'countered') {
    const accept = acceptCounterOffer(neg, 3);
    assert(accept.ok, 'accept counter');
    neg = accept.negotiation!;
    assertEqual(neg.status, 'accepted', 'accepted after counter');
  }
}

section('withdraw transitions to withdrawn');
{
  const player = REAL_INITIAL_SCOUT_MARKET[1];
  const { buyer, seller } = buyerSeller(false);
  const offer: TransferOffer = {
    id: 'off_w',
    fromClubId: buyer.clubId,
    toClubId: seller.clubId,
    playerId: player.id,
    clauses: [{ kind: 'fee', amount: player.marketValue }],
  };
  const neg = createDraftNegotiation({
    id: 'neg_w',
    playerId: player.id,
    sellingClubId: seller.clubId,
    buyingClubId: buyer.clubId,
    startedWeek: 1,
    initialOffer: offer,
  });
  const withdrawn = withdrawNegotiation({ ...neg, status: 'countered' }, 2);
  assert(withdrawn.ok, 'withdraw ok');
  assertEqual(withdrawn.negotiation!.status, 'withdrawn', 'withdrawn status');
}

section('evaluateOffer deterministic for fixed seed');
{
  const player = REAL_INITIAL_SCOUT_MARKET[0];
  const input = {
    worldSeed: 42,
    gameWeek: 5,
    sellingClubId: 'market',
    player: {
      playerId: player.id,
      personality: 'professional' as const,
      weeklyWage: player.wage,
      referenceMarketValue: player.marketValue,
      transferDesire: 50,
      contractYearsRemaining: 3,
    },
    offer: {
      id: 'off_det',
      fromClubId: REAL_INITIAL_PLAYER_CLUB.id,
      toClubId: 'market',
      playerId: player.id,
      clauses: [{ kind: 'fee' as const, amount: Math.round(player.marketValue * 0.9) }],
    },
    roundsUsed: 1,
    maxRounds: 4,
  };
  const a = evaluateOffer(input);
  const b = evaluateOffer(input);
  assertEqual(a.response, b.response, 'same evaluation');
  assertEqual(a.counterOffer?.clauses[0]?.kind === 'fee' ? (a.counterOffer.clauses[0] as { amount: number }).amount : 0,
    b.counterOffer?.clauses[0]?.kind === 'fee' ? (b.counterOffer.clauses[0] as { amount: number }).amount : 0,
    'same counter fee');
}

section('Loan clause validates when window closed if disallowed');
{
  const { buyer, seller } = buyerSeller(true);
  const player = REAL_INITIAL_SCOUT_MARKET[0];
  const offer: TransferOffer = {
    id: 'off_loan',
    fromClubId: buyer.clubId,
    toClubId: seller.clubId,
    playerId: player.id,
    clauses: [{ kind: 'loan', wageSplitPercent: 50, durationWeeks: 20 }],
  };
  const v = validateOffer(buyer, seller, {
    playerId: player.id,
    personality: 'professional',
    weeklyWage: player.wage,
    referenceMarketValue: player.marketValue,
    transferDesire: 50,
    contractYearsRemaining: 2,
  }, offer);
  assert(!v.valid && v.reasonCodes.includes('loan_not_allowed_outside_window'), 'loan blocked');
}

finish();
