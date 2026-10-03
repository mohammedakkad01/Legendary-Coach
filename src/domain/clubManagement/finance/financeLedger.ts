/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FINANCE_TUNING, FACILITY_TUNING } from '../config/clubManagementTuning';
import type { FinanceSlice, LedgerCategory, LedgerEntry } from '../types';
import { clamp } from '../../shared/math';

export function appendLedgerEntry(
  finance: FinanceSlice,
  entry: Omit<LedgerEntry, 'balanceAfter'> & { balanceAfter?: number },
): FinanceSlice {
  const coins = finance.coins + entry.amount;
  const balanceAfter = entry.balanceAfter ?? coins;
  const ledger = [...finance.ledger, { ...entry, balanceAfter }].slice(-FINANCE_TUNING.maxLedgerEntries);
  let seasonRevenueTotal = finance.seasonRevenueTotal;
  let seasonExpenseTotal = finance.seasonExpenseTotal;
  if (entry.amount > 0) seasonRevenueTotal += entry.amount;
  else seasonExpenseTotal += Math.abs(entry.amount);

  return {
    ...finance,
    coins: balanceAfter,
    ledger,
    seasonRevenueTotal,
    seasonExpenseTotal,
  };
}

export function sumSquadWeeklyWages(wages: readonly number[]): number {
  return wages.reduce((a, b) => a + b, 0);
}

export function deriveInitialWageBudgetWeekly(squadWeeklyWages: number): number {
  const headroom = FINANCE_TUNING.wageBudgetHeadroom;
  return Math.max(
    FINANCE_TUNING.wageBudgetWeeklyFloor,
    Math.round(squadWeeklyWages * headroom),
  );
}

export function createOpeningFinance(params: {
  coins: number;
  squadWeeklyWages: number;
  gameWeek: number;
  season: number;
  timestampIso: string;
  entryId: string;
}): FinanceSlice {
  const wageBudgetWeekly = deriveInitialWageBudgetWeekly(params.squadWeeklyWages);
  const transferBudget = Math.round(params.coins * FINANCE_TUNING.defaultTransferBudgetPctOfCoins);
  const opening: LedgerEntry = {
    id: params.entryId,
    gameWeek: params.gameWeek,
    season: params.season,
    category: FINANCE_TUNING.openingBalanceCategory,
    amount: 0,
    balanceAfter: params.coins,
    reasonCode: 'migration_opening_balance',
    timestampIso: params.timestampIso,
  };
  return {
    coins: params.coins,
    transferBudget,
    wageBudgetWeekly,
    ledger: [opening],
    seasonRevenueTotal: 0,
    seasonExpenseTotal: 0,
  };
}

export function postFinanceTransaction(
  finance: FinanceSlice,
  params: {
    amount: number;
    category: LedgerCategory;
    reasonCode: string;
    gameWeek: number;
    season: number;
    timestampIso: string;
    entryId: string;
  },
): FinanceSlice {
  return appendLedgerEntry(finance, {
    id: params.entryId,
    gameWeek: params.gameWeek,
    season: params.season,
    category: params.category,
    amount: params.amount,
    reasonCode: params.reasonCode,
    timestampIso: params.timestampIso,
  });
}

export function computeWeeklyWageLoad(squadWages: readonly number[], addedWeeklyWage = 0): number {
  return sumSquadWeeklyWages(squadWages) + addedWeeklyWage;
}

export function computeStaffWeeklyWages(staffWages: readonly number[]): number {
  return sumSquadWeeklyWages(staffWages);
}

export function facilityWeeklyRunningCost(
  facilities: Record<string, number>,
): number {
  let total = 0;
  const base = FACILITY_TUNING.runningCostBasePerLevel;
  const mults = FACILITY_TUNING.runningCostByKey;
  for (const key of Object.keys(mults) as (keyof typeof mults)[]) {
    const level = clamp(facilities[key] ?? 1, 1, 10);
    total += Math.round(base * level * mults[key]);
  }
  return total;
}
