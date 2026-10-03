/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { FinanceSlice, FinanceValidationResult } from '../types';
import {
  computeWeeklyWageLoad,
} from './financeLedger';

export interface TransferSpendRequest {
  transferFee: number;
  addedWeeklyWage?: number;
  squadWeeklyWages: readonly number[];
  gameWeek: number;
}

/** Single budget/wage-check interface for user club transfers. */
export function validateTransferSpend(
  finance: FinanceSlice,
  request: TransferSpendRequest,
): FinanceValidationResult {
  const codes: import('../types').FinanceValidationCode[] = [];

  if (request.transferFee > finance.coins) codes.push('insufficient_coins');
  if (request.transferFee > finance.transferBudget) codes.push('transfer_budget_exceeded');
  if (
    finance.transferRestrictedUntilWeek !== undefined &&
    request.gameWeek <= finance.transferRestrictedUntilWeek
  ) {
    codes.push('transfer_restricted');
  }

  const wageLoad = computeWeeklyWageLoad(
    request.squadWeeklyWages,
    request.addedWeeklyWage ?? 0,
  );
  if (wageLoad > finance.wageBudgetWeekly) codes.push('wage_budget_exceeded');

  return { valid: codes.length === 0, reasonCodes: [...new Set(codes)] };
}

/** Authoritative user-club transfer finance check (legacy store + domain negotiation). */
export function validateUserClubTransferSpend(
  finance: FinanceSlice,
  request: TransferSpendRequest,
): FinanceValidationResult {
  return validateTransferSpend(finance, request);
}

export function applyTransferSpend(
  finance: FinanceSlice,
  fee: number,
): FinanceSlice {
  return {
    ...finance,
    coins: finance.coins - fee,
    transferBudget: Math.max(0, finance.transferBudget - fee),
  };
}

export function applyTransferSaleProceeds(
  finance: FinanceSlice,
  proceeds: number,
): FinanceSlice {
  return {
    ...finance,
    coins: finance.coins + proceeds,
    transferBudget: finance.transferBudget + proceeds,
  };
}

/** Coins-only helper for callers not performing a full transfer-budget check (compatibility). */
export function validateLegacyCoinSpend(finance: FinanceSlice, amount: number): FinanceValidationResult {
  if (amount <= 0) return { valid: false, reasonCodes: ['insufficient_coins'] };
  if (amount > finance.coins) return { valid: false, reasonCodes: ['insufficient_coins'] };
  return { valid: true, reasonCodes: [] };
}
