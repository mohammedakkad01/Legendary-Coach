/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Club, Fixture, Player } from '../../types/game';
import type { GameSaveData } from '../../types/save';
import type { LivingWorldState } from '../livingWorld/types';
import { applyStateChanges } from '../livingWorld/reducer';
import { dispatchGameEvent } from '../livingWorld/events/dispatch';
import { deriveGameWeekFromSave } from '../recruitment/world/gameWeek';
import { validateOffer } from '../recruitment/negotiation/validateOffer';
import type { ClubNegotiationContext } from '../recruitment/negotiation/contextTypes';
import type { TransferOffer } from '../recruitment/negotiation/offerTypes';
import type { PlayerNegotiationContext } from '../recruitment/negotiation/contextTypes';
import { applyClubManagementChanges } from './reducer';
import { postFinanceTransaction } from './finance/financeLedger';
import {
  validateUserClubTransferSpend,
  applyTransferSaleProceeds,
  applyTransferSpend,
} from './finance/validateSpend';
import type { TransferSpendRequest } from './finance/validateSpend';
import { syncClubFromClubManagement, extendedFacilitiesFromClub } from './syncLegacyClub';
import { computeClubSystemModifiers } from './modifiers/attributeModifier';
import { runWeeklyClubManagementTick, computeMatchGateReceipt } from './tick/weeklyClubTick';
import type { ClubManagementState, ClubSystemModifiers } from './types';
import { applyMatchResultToFans } from './fans/fanLogic';
import type { DelegationIntegratorContext } from './delegation/delegationIntegratorContext';
import { REAL_INITIAL_PLAYER_CLUB } from '../../data/realFootballData';
import {
  buildFallbackClubConfig,
  generateSyntheticOpponentSquad,
} from '../../data/realLeaguesData';
import {
  deriveSyntheticOpponentTactics,
  opponentTacticsWithRoles,
} from '../tactics/deriveSyntheticOpponentTactics';
import { assignLineupToFormation } from '../squad/assignFormationLineup';
import { applyRecruitmentPatches } from '../recruitment/reducer';

export function buildUserNegotiationFinanceContext(
  cm: ClubManagementState,
  squad: readonly Player[],
  transferWindow: ClubNegotiationContext['transferWindow'],
  clubId: string,
): ClubNegotiationContext {
  return {
    clubId,
    coinsAvailable: cm.finance.coins,
    wageBudgetRemainingWeekly: cm.finance.wageBudgetWeekly,
    squadSize: squad.length,
    maxSquadSize: 30,
    transferWindow,
  };
}

export function validateUserTransferOffer(
  cm: ClubManagementState,
  buyer: ClubNegotiationContext,
  seller: ClubNegotiationContext,
  player: PlayerNegotiationContext,
  offer: TransferOffer,
  squadWages: readonly number[],
  gameWeek: number,
): ReturnType<typeof validateOffer> {
  const financeCheck = validateUserClubTransferSpend(cm.finance, {
    transferFee: offer.clauses.reduce((s, c) => (c.kind === 'fee' ? s + c.amount : s), 0),
    squadWeeklyWages: squadWages,
    addedWeeklyWage: player.weeklyWage,
    gameWeek,
  });
  const domain = validateOffer(buyer, seller, player, offer);
  if (!financeCheck.valid) {
    const merged = [...domain.reasonCodes];
    if (financeCheck.reasonCodes.includes('insufficient_coins')) merged.push('insufficient_budget');
    if (financeCheck.reasonCodes.includes('transfer_budget_exceeded')) merged.push('insufficient_budget');
    if (financeCheck.reasonCodes.includes('wage_budget_exceeded')) merged.push('wage_budget_exceeded');
    if (financeCheck.reasonCodes.includes('transfer_restricted')) merged.push('window_closed');
    return { valid: false, reasonCodes: [...new Set(merged)] };
  }
  return domain;
}

export type UserTransferSpendContext = Pick<TransferSpendRequest, 'addedWeeklyWage' | 'gameWeek'>;

function squadWeeklyWagesFromClub(club: Club): number[] {
  return club.footballSquad.map((p) => p.wage);
}

/** Legacy store negotiation / quick buy — same finance rules as validateUserTransferOffer. */
export function sharedLegacySpendCheck(
  cm: ClubManagementState | undefined,
  club: Club,
  transferFee: number,
  context: UserTransferSpendContext,
) {
  if (cm) {
    return validateUserClubTransferSpend(cm.finance, {
      transferFee,
      squadWeeklyWages: squadWeeklyWagesFromClub(club),
      addedWeeklyWage: context.addedWeeklyWage ?? 0,
      gameWeek: context.gameWeek,
    });
  }
  if (transferFee <= 0 || transferFee > club.finances.coins) {
    return { valid: false as const, reasonCodes: ['insufficient_coins'] as const };
  }
  return { valid: true as const, reasonCodes: [] as const };
}

export function recordMatchRevenueOnClubManagement(
  cm: ClubManagementState,
  params: {
    gateReceipt: number;
    sponsorIncome: number;
    gameWeek: number;
    season: number;
    timestampIso: string;
  },
): ClubManagementState {
  let finance = cm.finance;
  if (params.gateReceipt > 0) {
    finance = postFinanceTransaction(finance, {
      amount: params.gateReceipt,
      category: 'match_revenue',
      reasonCode: 'gate_receipts',
      gameWeek: params.gameWeek,
      season: params.season,
      timestampIso: params.timestampIso,
      entryId: `ledger_gate_${params.gameWeek}`,
    });
  }
  if (params.sponsorIncome > 0) {
    finance = postFinanceTransaction(finance, {
      amount: params.sponsorIncome,
      category: 'sponsor',
      reasonCode: 'sponsor_match',
      gameWeek: params.gameWeek,
      season: params.season,
      timestampIso: params.timestampIso,
      entryId: `ledger_sponsor_${params.gameWeek}`,
    });
  }
  return applyClubManagementChanges(cm, [{ kind: 'patchFinance', patch: finance }]);
}

export function recordPlayerSale(
  cm: ClubManagementState,
  proceeds: number,
  gameWeek: number,
  season: number,
  timestampIso: string,
): ClubManagementState {
  const finance = applyTransferSaleProceeds(cm.finance, proceeds);
  const withLedger = postFinanceTransaction(finance, {
    amount: proceeds,
    category: 'transfer_out',
    reasonCode: 'player_sale',
    gameWeek,
    season,
    timestampIso,
    entryId: `ledger_sale_${gameWeek}_${Date.now()}`,
  });
  return applyClubManagementChanges(cm, [{ kind: 'patchFinance', patch: withLedger }]);
}

export function recordPlayerPurchase(
  cm: ClubManagementState,
  fee: number,
  gameWeek: number,
  season: number,
  timestampIso: string,
): ClubManagementState {
  const spent = applyTransferSpend(cm.finance, fee);
  const withLedger = postFinanceTransaction(spent, {
    amount: -fee,
    category: 'transfer_in',
    reasonCode: 'player_purchase',
    gameWeek,
    season,
    timestampIso,
    entryId: `ledger_buy_${gameWeek}_${Date.now()}`,
  });
  return applyClubManagementChanges(cm, [{ kind: 'patchFinance', patch: withLedger }]);
}

function buildOpponentClubSnapshot(fixture: Fixture, divisionId: string): Club {
  const cfg = buildFallbackClubConfig(
    fixture.opponentClubId,
    fixture.opponentClubName,
    fixture.opponentBadge ?? '',
    divisionId,
  );
  const squad = generateSyntheticOpponentSquad(cfg);
  const tacticsCore = deriveSyntheticOpponentTactics(fixture.opponentClubId, cfg.starRating);
  const lineup = assignLineupToFormation(squad, tacticsCore.formation);
  const footballTactics = opponentTacticsWithRoles(tacticsCore, lineup);
  return {
    ...REAL_INITIAL_PLAYER_CLUB,
    id: fixture.opponentClubId,
    name: fixture.opponentClubName,
    nameEn: cfg.nameEn || fixture.opponentClubName,
    footballSquad: squad,
    footballLineup: lineup,
    footballTactics,
  };
}

export function buildDelegationIntegratorContext(params: {
  save: GameSaveData;
  club: Club;
  livingWorld: LivingWorldState;
  loanDestinations?: DelegationIntegratorContext['loanSearch'];
}): DelegationIntegratorContext {
  const fixtures = params.save.leagueFixtures ?? [];
  const nextFixture = fixtures.find((f) => !f.played) ?? null;
  const opponentClub =
    nextFixture !== null ? buildOpponentClubSnapshot(nextFixture, params.club.divisionId) : null;

  return {
    userClubId: params.club.id,
    recruitmentWorld: params.save.recruitmentWorld,
    livingWorld: params.livingWorld,
    userClub: params.club,
    leagueFixtures: fixtures,
    leagueStandings: params.save.leagueStandings ?? [],
    nextFixture,
    opponentClub,
    loanSearch: params.loanDestinations,
  };
}

export function getClubModifiersForSave(save: GameSaveData, club: Club): ClubSystemModifiers {
  const cm = save.clubManagement;
  const facilities = extendedFacilitiesFromClub(club);
  const staff = cm?.staff.members ?? [];
  const fanMood = cm?.fans.mood ?? club.fanMood;
  return computeClubSystemModifiers({
    staff,
    facilities,
    fanMood,
    scoutingNetworkLevel: club.facilities.scoutingNetworkLevel,
  });
}

export function applyUserWeeklyClubManagement(params: {
  save: GameSaveData;
  club: Club;
  livingWorld: LivingWorldState;
  saveId: string;
  matchday: number;
  lastMatchWon?: boolean;
  lastMatchDrawn?: boolean;
}): {
  club: Club;
  livingWorld: LivingWorldState;
  clubManagement: ClubManagementState;
  save: GameSaveData;
} {
  const gameWeek = deriveGameWeekFromSave(params.save);
  const timestampIso = new Date().toISOString();
  const saveWithCm: GameSaveData = {
    ...params.save,
    club: params.club,
    livingWorld: params.livingWorld,
    clubManagement: params.save.clubManagement!,
  };

  const tick = runWeeklyClubManagementTick({
    save: saveWithCm,
    club: params.club,
    livingWorld: params.livingWorld,
    gameWeek,
    matchday: params.matchday,
    timestampIso,
    lastMatchWon: params.lastMatchWon,
    lastMatchDrawn: params.lastMatchDrawn,
    delegationIntegrator: buildDelegationIntegratorContext({
      save: saveWithCm,
      club: params.club,
      livingWorld: params.livingWorld,
    }),
  });

  let livingWorld = tick.livingWorld;
  let players = tick.club.footballSquad;
  if (tick.playerLifeChanges.length > 0) {
    const applied = applyStateChanges({ livingWorld, players }, tick.playerLifeChanges);
    livingWorld = applied.livingWorld;
    players = applied.players;
  }

  for (const evt of tick.events) {
    const dispatched = dispatchGameEvent({ livingWorld, players }, evt);
    if (dispatched.applied) {
      livingWorld = dispatched.result.livingWorld;
      players = dispatched.result.players;
    }
  }

  let recruitmentWorld = saveWithCm.recruitmentWorld;
  if (recruitmentWorld && tick.recruitmentPatches.length > 0) {
    recruitmentWorld = applyRecruitmentPatches(recruitmentWorld, tick.recruitmentPatches);
  }

  const club = syncClubFromClubManagement({ ...tick.club, footballSquad: players }, tick.clubManagement);
  const save: GameSaveData = {
    ...saveWithCm,
    club,
    livingWorld,
    clubManagement: tick.clubManagement,
    recruitmentWorld,
  };

  return { club, livingWorld, clubManagement: tick.clubManagement, save };
}

export function applyPostMatchFanUpdate(
  cm: ClubManagementState,
  won: boolean,
  drawn: boolean,
  ticketPrice: number,
  gameWeek: number,
  season: number,
  clubId: string,
): ClubManagementState {
  const { fans, changes } = applyMatchResultToFans(
    cm.fans,
    won,
    drawn,
    ticketPrice,
    gameWeek,
    season,
    clubId,
  );
  return applyClubManagementChanges(cm, changes);
}

export { computeMatchGateReceipt };
