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
  applyRecruitmentPatches,
  RECRUITMENT_TUNING,
  isTerminalNegotiationStatus,
} from '../src/domain/recruitment';
import { mergeLegacyNegotiations } from '../src/domain/recruitment/negotiation/migrateLegacyNegotiations';
import type { GameSaveData } from '../src/types/save';
import type { TransferOffer, TransferNegotiation, RichNegotiationStatus } from '../src/domain/recruitment';

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

function playerCtx(player: (typeof REAL_INITIAL_SCOUT_MARKET)[0], extra?: { availableForTransfer?: boolean }) {
  return {
    playerId: player.id,
    personality: player.personality,
    weeklyWage: player.wage,
    referenceMarketValue: player.marketValue,
    transferDesire: 50,
    contractYearsRemaining: player.contractYears,
    ...extra,
  };
}

function feeOffer(
  playerId: string,
  buyerId: string,
  sellerId: string,
  amount: number,
  id = 'off_fee',
): TransferOffer {
  return {
    id,
    fromClubId: buyerId,
    toClubId: sellerId,
    playerId,
    clauses: [{ kind: 'fee', amount }],
  };
}

function submitCtx(
  neg: TransferNegotiation,
  offer: TransferOffer,
  worldSeed: number,
  closed = false,
) {
  const { buyer, seller } = buyerSeller(closed);
  const player = REAL_INITIAL_SCOUT_MARKET.find((p) => p.id === neg.playerId) ?? REAL_INITIAL_SCOUT_MARKET[0];
  return submitNegotiationOffer({
    negotiation: neg,
    offer,
    buyer,
    seller,
    player: playerCtx(player),
    gameWeek: 2,
    worldSeed,
    timestampIso: new Date(0).toISOString(),
    season: 1,
  });
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
      lastMessageAr: 'msg ar',
      lastMessageEn: 'msg en',
      startedAt: '2020-01-01T00:00:00.000Z',
      updatedAt: '2020-02-01T00:00:00.000Z',
    },
  ];
  const save = baseSave(legacy);
  const mapped = save.recruitmentWorld!.negotiations.find((n) => n.id === 'neg_legacy_1');
  assert(!!mapped, 'legacy negotiation mapped');
  assertEqual(mapped!.legacySnapshot?.playerDisplayName, 'Test', 'playerName preserved');
  assertEqual(mapped!.legacySnapshot?.listingMarketValue, 100_000, 'marketValue preserved');
  assertEqual(mapped!.legacySnapshot?.lastMessageEn, 'msg en', 'lastMessageEn preserved');
  assertEqual(mapped!.legacySnapshot?.migratedWithoutSellingClub, true, 'market seller documented');
  assertEqual(mapped!.sellingClubId, 'market', 'compatibility selling club');
  assert(save.activeNegotiations.length === 1, 'legacy activeNegotiations retained on save');
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
  const v = validateOffer(buyer, seller, playerCtx(player), offer);
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

section('validateOffer — clause types');
{
  const { buyer, seller } = buyerSeller(false);
  const player = REAL_INITIAL_SCOUT_MARKET[0];
  const base = {
    fromClubId: buyer.clubId,
    toClubId: seller.clubId,
    playerId: player.id,
  };
  const ctx = playerCtx(player);

  const cases: { label: string; clauses: TransferOffer['clauses']; valid: boolean; code?: string }[] = [
    { label: 'fee zero', clauses: [{ kind: 'fee', amount: 0 }], valid: false, code: 'invalid_clause_amount' },
    {
      label: 'installments valid',
      clauses: [{ kind: 'installments', upfront: 10_000, installments: [{ amount: 5_000, dueWeek: 8 }] }],
      valid: true,
    },
    {
      label: 'installments bad week',
      clauses: [{ kind: 'installments', upfront: 0, installments: [{ amount: 5_000, dueWeek: 99 }] }],
      valid: false,
      code: 'invalid_installment_schedule',
    },
    {
      label: 'bonus valid',
      clauses: [{ kind: 'bonus', label: 'Goals', amount: 10_000, condition: 'goal' }],
      valid: true,
    },
    {
      label: 'bonus empty label',
      clauses: [{ kind: 'bonus', label: '  ', amount: 10_000, condition: 'goal' }],
      valid: false,
      code: 'invalid_bonus_fields',
    },
    {
      label: 'sell_on valid',
      clauses: [{ kind: 'sell_on', percent: RECRUITMENT_TUNING.negotiation.maxSellOnPercent }],
      valid: true,
    },
    {
      label: 'sell_on over max',
      clauses: [{ kind: 'sell_on', percent: RECRUITMENT_TUNING.negotiation.maxSellOnPercent + 1 }],
      valid: false,
      code: 'invalid_sell_on_percent',
    },
    {
      label: 'player exchange in squad',
      clauses: [{ kind: 'player_exchange', playerId: REAL_INITIAL_PLAYER_CLUB.footballSquad[0].id, valuedAt: 50_000 }],
      valid: true,
    },
    {
      label: 'player exchange unknown',
      clauses: [{ kind: 'player_exchange', playerId: 'not_in_squad', valuedAt: 50_000 }],
      valid: false,
      code: 'unknown_player_exchange',
    },
    { label: 'loan valid', clauses: [{ kind: 'loan', wageSplitPercent: 50, durationWeeks: 20 }], valid: true },
    {
      label: 'loan bad split',
      clauses: [{ kind: 'loan', wageSplitPercent: 0, durationWeeks: 20 }],
      valid: false,
      code: 'invalid_loan_terms',
    },
    {
      label: 'loan with option',
      clauses: [{ kind: 'loan_with_option', wageSplitPercent: 60, durationWeeks: 12, optionFee: 100_000 }],
      valid: true,
    },
    {
      label: 'loan with option zero fee',
      clauses: [{ kind: 'loan_with_option', wageSplitPercent: 60, durationWeeks: 12, optionFee: 0 }],
      valid: false,
      code: 'invalid_loan_terms',
    },
    {
      label: 'loan with obligation',
      clauses: [{ kind: 'loan_with_obligation', wageSplitPercent: 40, durationWeeks: 16, obligationFee: 200_000 }],
      valid: true,
    },
    {
      label: 'performance bonus',
      clauses: [{ kind: 'performance_bonus', amount: 5_000, metric: 'goals', threshold: 10 }],
      valid: true,
    },
    {
      label: 'performance bonus bad metric',
      clauses: [{ kind: 'performance_bonus', amount: 5_000, metric: '', threshold: 10 }],
      valid: false,
      code: 'invalid_performance_bonus',
    },
    { label: 'release clause', clauses: [{ kind: 'release_clause', amount: 1_000_000 }], valid: true },
  ];

  for (const c of cases) {
    const offer: TransferOffer = { id: `off_${c.label}`, ...base, clauses: c.clauses };
    const v = validateOffer(buyer, seller, ctx, offer, {
      exchangePlayerIdsInBuyerSquad: REAL_INITIAL_PLAYER_CLUB.footballSquad.map((p) => p.id),
    });
    assert(v.valid === c.valid, `${c.label}: expected valid=${c.valid} got ${v.reasonCodes.join(',')}`);
    if (!c.valid && c.code) assert(v.reasonCodes.includes(c.code as never), `${c.label} includes ${c.code}`);
  }
}

section('validateOffer rejects unavailable player when context establishes it');
{
  const { buyer, seller } = buyerSeller(false);
  const player = REAL_INITIAL_SCOUT_MARKET[0];
  const offer = feeOffer(player.id, buyer.clubId, seller.clubId, player.marketValue);
  const v = validateOffer(buyer, seller, playerCtx(player, { availableForTransfer: false }), offer);
  assert(!v.valid && v.reasonCodes.includes('player_unavailable'), 'player_unavailable');
}

section('submitNegotiationOffer rejects every terminal status');
{
  const save = baseSave();
  const player = save.scoutMarket[0];
  const { buyer, seller } = buyerSeller(false);
  const offer = feeOffer(player.id, buyer.clubId, seller.clubId, player.marketValue, 'off_term');
  const terminals: RichNegotiationStatus[] = ['accepted', 'rejected', 'expired', 'withdrawn'];

  for (const status of terminals) {
    const neg: TransferNegotiation = {
      ...createDraftNegotiation({
        id: `neg_term_${status}`,
        playerId: player.id,
        sellingClubId: seller.clubId,
        buyingClubId: buyer.clubId,
        startedWeek: 1,
        initialOffer: offer,
      }),
      status,
      roundsUsed: 2,
    };
    const result = submitNegotiationOffer({
      negotiation: neg,
      offer,
      buyer,
      seller,
      player: playerCtx(player),
      gameWeek: 3,
      worldSeed: save.recruitmentWorld!.worldSeed,
      timestampIso: new Date(0).toISOString(),
      season: 1,
    });
    assert(!result.ok, `submit blocked for ${status}`);
    assert(result.validationCodes?.includes('negotiation_not_open'), `${status} negotiation_not_open`);
    assertEqual(neg.roundsUsed, 2, `${status} rounds unchanged`);
  }
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
    player: playerCtx(player),
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
    const accept = acceptCounterOffer({
      negotiation: neg,
      buyer,
      seller,
      player: playerCtx(player),
      gameWeek: 3,
    });
    assert(accept.ok, 'accept counter');
    neg = accept.negotiation!;
    assertEqual(neg.status, 'accepted', 'accepted after counter');
  }
}

section('acceptCounterOffer revalidates budget and leaves negotiation countered on failure');
{
  const player = REAL_INITIAL_SCOUT_MARKET[0];
  const { buyer, seller } = buyerSeller(false);
  buyer.coinsAvailable = 50_000;
  const counterOffer = feeOffer(player.id, buyer.clubId, seller.clubId, 500_000, 'off_counter');
  const neg: TransferNegotiation = {
    ...createDraftNegotiation({
      id: 'neg_counter_fail',
      playerId: player.id,
      sellingClubId: seller.clubId,
      buyingClubId: buyer.clubId,
      startedWeek: 1,
      initialOffer: feeOffer(player.id, buyer.clubId, seller.clubId, 100_000),
    }),
    status: 'countered',
    counterOffer,
    roundsUsed: 1,
  };
  const accept = acceptCounterOffer({
    negotiation: neg,
    buyer,
    seller,
    player: playerCtx(player),
    gameWeek: 4,
  });
  assert(!accept.ok, 'accept fails validation');
  assert(accept.validationCodes?.includes('insufficient_budget'), 'budget code');
  assert(!accept.negotiation, 'no mutated negotiation on failure');
}

section('acceptCounterOffer twice does not mutate state twice');
{
  const player = REAL_INITIAL_SCOUT_MARKET[1];
  const { buyer, seller } = buyerSeller(false);
  const counterOffer = feeOffer(player.id, buyer.clubId, seller.clubId, player.marketValue, 'off_counter2');
  let neg: TransferNegotiation = {
    ...createDraftNegotiation({
      id: 'neg_double_accept',
      playerId: player.id,
      sellingClubId: seller.clubId,
      buyingClubId: buyer.clubId,
      startedWeek: 1,
      initialOffer: feeOffer(player.id, buyer.clubId, seller.clubId, Math.round(player.marketValue * 0.8)),
    }),
    status: 'countered',
    counterOffer,
    roundsUsed: 1,
  };
  const first = acceptCounterOffer({
    negotiation: neg,
    buyer,
    seller,
    player: playerCtx(player),
    gameWeek: 5,
  });
  assert(first.ok, 'first accept ok');
  neg = first.negotiation!;
  const second = acceptCounterOffer({
    negotiation: neg,
    buyer,
    seller,
    player: playerCtx(player),
    gameWeek: 6,
  });
  assert(!second.ok, 'second accept rejected');
  assertEqual(neg.status, 'accepted', 'still single accept');
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

section('withdraw rejects terminal negotiations');
{
  const player = REAL_INITIAL_SCOUT_MARKET[0];
  const { buyer, seller } = buyerSeller(false);
  const base = createDraftNegotiation({
    id: 'neg_wd',
    playerId: player.id,
    sellingClubId: seller.clubId,
    buyingClubId: buyer.clubId,
    startedWeek: 1,
    initialOffer: feeOffer(player.id, buyer.clubId, seller.clubId, 1),
  });
  for (const status of ['accepted', 'rejected', 'expired', 'withdrawn'] as const) {
    const r = withdrawNegotiation({ ...base, status }, 2);
    assert(!r.ok && r.validationCodes?.includes('negotiation_not_open'), `withdraw blocked ${status}`);
  }
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

section('v2 recruitmentWorld migrates to schema v3 with negotiations initialized');
{
  const seeded = ensureRecruitmentV5(baseSave());
  const v2World = clone(seeded.recruitmentWorld!);
  v2World.schemaVersion = 2;
  delete (v2World as { negotiations?: unknown }).negotiations;
  const assignmentCount = v2World.scoutingAssignments.length;
  const reportCount = v2World.scoutingReports.length;
  const scoutCount = v2World.scoutNetwork.length;

  const saveV2: GameSaveData = {
    ...seeded,
    recruitmentWorld: v2World as GameSaveData['recruitmentWorld'],
    activeNegotiations: [],
  };

  const once = ensureRecruitmentV5(saveV2);
  assertEqual(once.recruitmentWorld!.schemaVersion, 9, 'schema v9');
  assert(Array.isArray(once.recruitmentWorld!.negotiations), 'negotiations array');
  assertEqual(once.recruitmentWorld!.scoutNetwork.length, scoutCount, 'scouts intact');
  assertEqual(once.recruitmentWorld!.scoutingAssignments.length, assignmentCount, 'assignments intact');
  assertEqual(once.recruitmentWorld!.scoutingReports.length, reportCount, 'reports intact');

  const twice = ensureRecruitmentV5(clone(once));
  assertEqual(JSON.stringify(once.recruitmentWorld), JSON.stringify(twice.recruitmentWorld), 'idempotent v2→v3');
}

section('v2 world with legacy activeNegotiations merges without duplicates');
{
  const legacy = [
    {
      id: 'neg_v2_legacy',
      playerId: REAL_INITIAL_SCOUT_MARKET[0].id,
      playerName: 'Legacy',
      marketValue: 200_000,
      currentOfferAmount: 150_000,
      roundsUsed: 0,
      maxRounds: 4,
      status: 'countered' as const,
      counterAmount: 180_000,
      lastMessageAr: '',
      lastMessageEn: '',
      startedAt: '',
      updatedAt: '',
    },
  ];
  const seeded = baseSave(legacy);
  const v2World = clone(seeded.recruitmentWorld!);
  v2World.schemaVersion = 2;
  v2World.negotiations = [];

  const saveV2: GameSaveData = {
    ...seeded,
    recruitmentWorld: v2World as GameSaveData['recruitmentWorld'],
    activeNegotiations: legacy,
  };

  const migrated = ensureRecruitmentV5(saveV2);
  const ids = migrated.recruitmentWorld!.negotiations.map((n) => n.id);
  assertEqual(ids.filter((id) => id === 'neg_v2_legacy').length, 1, 'single legacy negotiation');
  const again = ensureRecruitmentV5(clone(migrated));
  assertEqual(
    again.recruitmentWorld!.negotiations.length,
    migrated.recruitmentWorld!.negotiations.length,
    'no duplicate negotiations on re-migrate',
  );
}

section('mergeLegacyNegotiations idempotent when existing already populated');
{
  const legacy = [
    {
      id: 'neg_merge',
      playerId: 'p1',
      playerName: 'X',
      marketValue: 1,
      currentOfferAmount: 1,
      roundsUsed: 0,
      maxRounds: 4,
      status: 'countered' as const,
      lastMessageAr: '',
      lastMessageEn: '',
      startedAt: '',
      updatedAt: '',
    },
  ];
  const first = mergeLegacyNegotiations([], legacy, REAL_INITIAL_PLAYER_CLUB.id, 3);
  const second = mergeLegacyNegotiations(first, legacy, REAL_INITIAL_PLAYER_CLUB.id, 3);
  assertEqual(first.length, 1, 'one merged');
  assertEqual(JSON.stringify(first), JSON.stringify(second), 'merge idempotent');
}

section('reducer upsert applies invalid lifecycle without correcting it');
{
  const save = baseSave();
  let world = save.recruitmentWorld!;
  const player = save.scoutMarket[0];
  const { buyer, seller } = buyerSeller(false);
  const offer = feeOffer(player.id, buyer.clubId, seller.clubId, player.marketValue);
  const draft = createDraftNegotiation({
    id: 'neg_reducer',
    playerId: player.id,
    sellingClubId: seller.clubId,
    buyingClubId: buyer.clubId,
    startedWeek: 1,
    initialOffer: offer,
  });
  world = applyRecruitmentPatches(world, [{ kind: 'upsertNegotiation', negotiation: draft }]);
  const invalidJump: TransferNegotiation = { ...draft, status: 'accepted', roundsUsed: 99 };
  world = applyRecruitmentPatches(world, [{ kind: 'upsertNegotiation', negotiation: invalidJump }]);
  const stored = world.negotiations.find((n) => n.id === 'neg_reducer');
  assertEqual(stored!.status, 'accepted', 'reducer stores invalid transition');
  assert(isTerminalNegotiationStatus(stored!.status), 'terminal without machine guard');
}

section('double submit to terminal negotiation after accept');
{
  const save = baseSave();
  const player = save.scoutMarket[0];
  const { buyer, seller } = buyerSeller(false);
  const offer = feeOffer(player.id, buyer.clubId, seller.clubId, player.marketValue * 2, 'off_double');
  let neg = createDraftNegotiation({
    id: 'neg_double_submit',
    playerId: player.id,
    sellingClubId: seller.clubId,
    buyingClubId: buyer.clubId,
    startedWeek: 1,
    initialOffer: offer,
  });
  const first = submitCtx(neg, offer, save.recruitmentWorld!.worldSeed);
  assert(first.ok, 'first submit');
  neg = first.negotiation!;
  if (neg.status !== 'accepted') {
    neg = { ...neg, status: 'accepted' };
  }
  const second = submitCtx(neg, offer, save.recruitmentWorld!.worldSeed);
  assert(!second.ok, 'second submit rejected');
  assertEqual(neg.roundsUsed, first.negotiation!.roundsUsed, 'rounds not incremented on rejected resubmit');
}

finish();
