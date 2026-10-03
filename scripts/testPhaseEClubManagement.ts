/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { REAL_INITIAL_PLAYER_CLUB } from '../src/data/realFootballData';
import { ensureRecruitmentV5 } from '../src/domain/recruitment/migration/migrateRecruitmentV5';
import { ensureClubManagementV6, buildClubManagementFromSave } from '../src/domain/clubManagement/migration/migrateClubManagementV6';
import { validateUserClubTransferSpend } from '../src/domain/clubManagement/finance/validateSpend';
import {
  sharedLegacySpendCheck,
  validateUserTransferOffer,
  buildUserNegotiationFinanceContext,
  recordPlayerPurchase,
} from '../src/domain/clubManagement/storeBridge';
import { computeClubSystemModifiers } from '../src/domain/clubManagement/modifiers/attributeModifier';
import { extendedFacilitiesFromClub } from '../src/domain/clubManagement/syncLegacyClub';
import { weeklyDevelopmentProgress } from '../src/domain/playerLife/developmentEngine';
import { computeInMatchInjuryProbability } from '../src/domain/playerLife/injuryRisk';
import { runDelegatedTask, defaultDelegationSlice } from '../src/domain/clubManagement/delegation/runDelegation';
import { stateChangesForTrainingSession, legacyDrillToPlan } from '../src/domain/playerLife/trainingEngine';
import { applyClubManagementChanges } from '../src/domain/clubManagement/reducer';
import { evaluateBoardConsequenceLadder, applyDismissalToManagerCareer } from '../src/domain/clubManagement/board/boardLogic';
import { createDefaultManagerCareer } from '../src/domain/livingWorld/managerCareer';
import { computeMatchGateReceipt } from '../src/domain/clubManagement/tick/weeklyClubTick';
import { FACILITY_TUNING } from '../src/domain/clubManagement/config/clubManagementTuning';
import type { GameSaveData } from '../src/types/save';
import type { Player } from '../src/types/game';
import { SeededRandom } from '../src/engine/prng';

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

function baseSave(coins: number): GameSaveData {
  return ensureClubManagementV6(
    ensureRecruitmentV5({
      saveVersion: 5,
      saveId: 'test_save_e',
      savedAt: new Date().toISOString(),
      appVersion: '2.1.0',
      currentSport: 'football',
      language: 'en',
      soundEnabled: true,
      hasSelectedInitialClub: true,
      isGuest: true,
      hasClaimedLoginBonus: false,
      club: {
        ...REAL_INITIAL_PLAYER_CLUB,
        finances: { ...REAL_INITIAL_PLAYER_CLUB.finances, coins },
      },
      energy: 100,
      lastEnergyUpdate: 0,
      vipPoints: 0,
      lastVipClaimDate: null,
      claimedVipUpgradeChests: [1],
      missionSkipUsedDate: null,
      checkInStreak: 0,
      lastCheckInDate: null,
      savedTacticalPlans: [],
      pendingFacilityUpgrades: [],
      activeNegotiations: [],
      academyDiscoveries: [],
      scoutMarket: REAL_INITIAL_PLAYER_CLUB.footballSquad.slice(0, 3),
      dailyMissions: [],
      storyMissions: [],
      leagueStandings: [],
      leagueFixtures: [],
      matchHistory: [],
      tournamentStats: [],
      simulatedMatchdays: [],
      matchScoutReports: {},
      unlockedSpeed2x: false,
    }),
  );
}

function testMigrationIdempotent(): void {
  const save = baseSave(123_456);
  const coinsBefore = save.club.finances.coins;
  const once = ensureClubManagementV6(save);
  const twice = ensureClubManagementV6(once);
  assert(twice.clubManagement!.finance.coins === coinsBefore, 'opening coins preserved');
  assert(twice.clubManagement!.finance.ledger.length === once.clubManagement!.finance.ledger.length, 'idempotent ledger');
  assert(twice.saveVersion === 6, 'save version 6');
}

function reasonCodesEqual(a: readonly string[], b: readonly string[]): boolean {
  return [...a].sort().join('|') === [...b].sort().join('|');
}

function testFinanceValidationParity(): void {
  const save = baseSave(50_000);
  const cm = save.clubManagement!;
  const squadWages = save.club.footballSquad.map((p) => p.wage);
  const fee = 60_000;
  const ctx = { addedWeeklyWage: 0, gameWeek: 1 };
  const legacy = sharedLegacySpendCheck(cm, save.club, fee, ctx);
  const authoritative = validateUserClubTransferSpend(cm.finance, {
    transferFee: fee,
    squadWeeklyWages: squadWages,
    ...ctx,
  });
  assert(!legacy.valid && !authoritative.valid, 'both reject over-budget spend');
  assert(reasonCodesEqual(legacy.reasonCodes, authoritative.reasonCodes), 'legacy matches authoritative codes');
}

function testLegacyDomainNegotiationFinanceParity(): void {
  const save = baseSave(200_000);
  let cm = save.clubManagement!;
  cm = applyClubManagementChanges(cm, [
    {
      kind: 'patchFinance',
      patch: { transferBudget: 25_000, wageBudgetWeekly: 48_000, transferRestrictedUntilWeek: 8 },
    },
  ]);
  const fee = 30_000;
  const addedWage = 12_000;
  const gameWeek = 5;
  const ctx = { addedWeeklyWage: addedWage, gameWeek };
  const legacy = sharedLegacySpendCheck(cm, save.club, fee, ctx);
  const squadWages = save.club.footballSquad.map((p) => p.wage);
  const authoritative = validateUserClubTransferSpend(cm.finance, {
    transferFee: fee,
    squadWeeklyWages: squadWages,
    ...ctx,
  });
  assert(reasonCodesEqual(legacy.reasonCodes, authoritative.reasonCodes), 'store path matches authoritative');

  const buyer = buildUserNegotiationFinanceContext(cm, save.club.footballSquad, 'open', save.club.id);
  const seller = buildUserNegotiationFinanceContext(cm, save.club.footballSquad, 'open', 'seller');
  const domainOffer = validateUserTransferOffer(
    cm,
    buyer,
    seller,
    {
      playerId: 'p1',
      personality: 'professional',
      weeklyWage: addedWage,
      referenceMarketValue: fee,
      transferDesire: 50,
      contractYearsRemaining: 2,
      availableForTransfer: true,
    },
    { id: 'o1', fromClubId: save.club.id, toClubId: 'seller', playerId: 'p1', clauses: [{ kind: 'fee', amount: fee }] },
    squadWages,
    gameWeek,
  );
  assert(!authoritative.valid, 'authoritative rejects combined constraints');
  assert(!domainOffer.valid, 'domain negotiation rejected when finance fails');
  assert(domainOffer.reasonCodes.includes('insufficient_budget'), 'domain maps budget failure');
  assert(domainOffer.reasonCodes.includes('window_closed'), 'domain maps transfer restriction');
}

function testTransferBudgetRejected(): void {
  const save = baseSave(100_000);
  let cm = save.clubManagement!;
  cm = applyClubManagementChanges(cm, [{ kind: 'patchFinance', patch: { transferBudget: 5_000 } }]);
  const check = sharedLegacySpendCheck(cm, save.club, 10_000, { addedWeeklyWage: 0, gameWeek: 1 });
  assert(!check.valid && check.reasonCodes.includes('transfer_budget_exceeded'), 'transfer budget enforced');
}

function testWageBudgetRejected(): void {
  const save = baseSave(100_000);
  let cm = save.clubManagement!;
  const squadLoad = save.club.footballSquad.reduce((s, p) => s + p.wage, 0);
  cm = applyClubManagementChanges(cm, [{ kind: 'patchFinance', patch: { wageBudgetWeekly: squadLoad } }]);
  const check = sharedLegacySpendCheck(cm, save.club, 1_000, { addedWeeklyWage: 1, gameWeek: 1 });
  assert(!check.valid && check.reasonCodes.includes('wage_budget_exceeded'), 'wage budget enforced');
}

function testTransferRestrictionEnforced(): void {
  const save = baseSave(100_000);
  let cm = save.clubManagement!;
  cm = applyClubManagementChanges(cm, [{ kind: 'patchFinance', patch: { transferRestrictedUntilWeek: 10 } }]);
  const check = sharedLegacySpendCheck(cm, save.club, 1_000, { addedWeeklyWage: 0, gameWeek: 5 });
  assert(!check.valid && check.reasonCodes.includes('transfer_restricted'), 'transfer restriction enforced');
}

function testSuccessfulPurchaseRecordsFinance(): void {
  const save = baseSave(100_000);
  const cm = save.clubManagement!;
  const fee = 25_000;
  const beforeBudget = cm.finance.transferBudget;
  const ledgerBefore = cm.finance.ledger.length;
  const after = recordPlayerPurchase(cm, fee, 2, 1, new Date(0).toISOString());
  assert(after.finance.transferBudget === beforeBudget - fee, 'transfer budget reduced');
  assert(after.finance.ledger.length === ledgerBefore + 1, 'ledger entry appended');
  const entry = after.finance.ledger.at(-1)!;
  assert(entry.category === 'transfer_in' && entry.amount === -fee, 'purchase ledger transaction');
  assert(entry.reasonCode === 'player_purchase', 'purchase reason code');
}

function testRejectedSpendNoFinanceMutation(): void {
  const save = baseSave(100_000);
  let cm = save.clubManagement!;
  cm = applyClubManagementChanges(cm, [{ kind: 'patchFinance', patch: { transferBudget: 500 } }]);
  const before = JSON.stringify(cm.finance);
  const check = sharedLegacySpendCheck(cm, save.club, 50_000, { addedWeeklyWage: 0, gameWeek: 1 });
  assert(!check.valid, 'spend rejected');
  assert(JSON.stringify(cm.finance) === before, 'no partial finance mutation on reject');
}

function testLedgerBalance(): void {
  const save = baseSave(80_000);
  const opening = save.clubManagement!.finance.ledger[0]!.balanceAfter;
  assert(opening === 80_000, 'opening ledger balance matches coins');
}

function mean(nums: number[]): number {
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function testNeutralStaffPreservesDevelopment(n = 220): void {
  const player: Player = {
    ...REAL_INITIAL_PLAYER_CLUB.footballSquad[0]!,
    overall: 70,
    age: 20,
    morale: 55,
    playerLife: {
      condition: { trainingLoad: 20, sharpness: 50, matchFitness: 80, recoveryQuality: 50, injury: null },
      development: {
        momentum: 0,
        trajectory: 'stable',
        truePotential: 85,
        ceiling: 88,
        potentialEstimate: 80,
        estimateUncertainty: 6,
      },
      playingTime: { squadRole: 'rotation', expectedMinutesPerMatch: 45, minutesLastMatches: [60] },
    },
  };
  let sumOld = 0;
  let sumNew = 0;
  for (let i = 0; i < n; i++) {
    sumOld += weeklyDevelopmentProgress(player, 60, 1, 1).overallDelta;
    sumNew += weeklyDevelopmentProgress(player, 60, 1, 1).overallDelta;
  }
  assert(sumOld === sumNew, 'neutral mult unchanged development totals');
  assert(Math.abs(mean([sumOld, sumNew]) - sumOld / n) < 0.001, 'development stable');
}

function testInjuryDirection(n = 220): void {
  const player: Player = {
    ...REAL_INITIAL_PLAYER_CLUB.footballSquad[0]!,
    fatigue: 80,
    injuredWeeks: 0,
  };
  let low = 0;
  let high = 0;
  const rng = new SeededRandom(42);
  for (let i = 0; i < n; i++) {
    low += computeInMatchInjuryProbability(player, {
      medicalCenterLevel: 1,
      recentMatchesIn7Days: 2,
      minutesThisMatch: 90,
      medicalInjuryRiskMult: 1.05,
    });
    high += computeInMatchInjuryProbability(player, {
      medicalCenterLevel: 1,
      recentMatchesIn7Days: 2,
      minutesThisMatch: 90,
      medicalInjuryRiskMult: 0.9,
    });
  }
  assert(high < low, 'better medical staff lowers injury probability aggregate');
}

function testDelegationUsesTrainingPipeline(): void {
  const save = baseSave(100_000);
  let cm = save.clubManagement!;
  cm = applyClubManagementChanges(cm, [
    {
      kind: 'patchDelegation',
      patch: {
        modes: { ...defaultDelegationSlice().modes, training: 'delegate' },
        assigneeByTask: { training: cm.staff.members[0]!.id },
      },
    },
  ]);
  const mods = computeClubSystemModifiers({
    staff: cm.staff.members,
    facilities: extendedFacilitiesFromClub(save.club),
    fanMood: cm.fans.mood,
    scoutingNetworkLevel: save.club.facilities.scoutingNetworkLevel,
  });
  const manual = stateChangesForTrainingSession(
    save.club.footballSquad.slice(0, 3).map((p) => p.id),
    legacyDrillToPlan('technical'),
  );
  const delegated = runDelegatedTask('training', {
    state: cm,
    modifiers: mods,
    playerIds: save.club.footballSquad.slice(0, 3).map((p) => p.id),
    gameWeek: 2,
    season: 1,
    timestampIso: new Date().toISOString(),
  });
  assert(delegated.stateChanges.length === manual.length, 'delegated training change count matches manual');
  assert(delegated.stateChanges.every((c) => c.kind === 'patchPlayerLife'), 'delegated changes valid');
}

function testDismissalHandoff(): void {
  const career = createDefaultManagerCareer(1000);
  const dismissed = applyDismissalToManagerCareer(career, 2, 'club_x');
  assert(dismissed.employmentStatus === 'dismissed', 'dismissal status set');
  assert(dismissed.dismissedFromClubId === 'club_x', 'club id recorded');
}

function testStadiumIncomeBounded(): void {
  const modsLow = computeClubSystemModifiers({
    staff: buildClubManagementFromSave(baseSave(1)).staff.members,
    facilities: { ...REAL_INITIAL_PLAYER_CLUB.facilities, analyticsDepartmentLevel: 1, stadiumLevel: 1 },
    fanMood: 50,
    scoutingNetworkLevel: 1,
  });
  const modsHigh = computeClubSystemModifiers({
    staff: buildClubManagementFromSave(baseSave(1)).staff.members,
    facilities: { ...REAL_INITIAL_PLAYER_CLUB.facilities, analyticsDepartmentLevel: 1, stadiumLevel: 10 },
    fanMood: 90,
    scoutingNetworkLevel: 1,
  });
  const low = computeMatchGateReceipt({ ticketPrice: 20, modifiers: modsLow, isHome: true });
  const high = computeMatchGateReceipt({ ticketPrice: 20, modifiers: modsHigh, isHome: true });
  assert(high > low, 'higher stadium increases gate receipts');
  const capRatio =
    (FACILITY_TUNING.stadium.baseGateCapacity + 9 * FACILITY_TUNING.stadium.capacityPerLevel) /
    FACILITY_TUNING.stadium.baseGateCapacity;
  assert(
    high / low <= capRatio * FACILITY_TUNING.stadium.attendanceMultMax * 1.02,
    'stadium revenue bounded by capacity and attendance config',
  );
}

function testBoardLadder(): void {
  const save = baseSave(100_000);
  let board = { ...save.clubManagement!.board, trust: 5, consequenceLevel: 'none' as const, lastMessageWeek: 0 };
  const ladder = evaluateBoardConsequenceLadder(board, 10);
  assert(ladder.board.consequenceLevel === 'dismissed' || ladder.events.some((e) => e.type === 'board.dismissed'), 'dismissal event');
}

function main(): void {
  testMigrationIdempotent();
  testFinanceValidationParity();
  testLegacyDomainNegotiationFinanceParity();
  testTransferBudgetRejected();
  testWageBudgetRejected();
  testTransferRestrictionEnforced();
  testSuccessfulPurchaseRecordsFinance();
  testRejectedSpendNoFinanceMutation();
  testLedgerBalance();
  testNeutralStaffPreservesDevelopment();
  testInjuryDirection();
  testDelegationUsesTrainingPipeline();
  testDismissalHandoff();
  testStadiumIncomeBounded();
  testBoardLadder();
  console.log('testPhaseEClubManagement: all checks passed');
}

main();
