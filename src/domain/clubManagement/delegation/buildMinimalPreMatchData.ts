/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Build minimum PreMatchData for delegated opposition analysis using the same
 * power helpers as pre-match / Best Tactics (no store async hydration).
 */

import type { Club, Fixture, PreMatchData } from '../../../types/game';
import { buildSlotAssignments, calcAttackPower, calcDefensePower, predictMatch } from '../../../engine/matchPrediction';

export interface BuildMinimalPreMatchInput {
  fixture: Fixture;
  competition: string;
  userClub: Club;
  opponentClub: Club;
  isScouted?: boolean;
  scoutAccuracy?: number;
}

export function buildMinimalPreMatchData(input: BuildMinimalPreMatchInput): PreMatchData {
  const userEffective = buildSlotAssignments(input.userClub);
  const oppEffective = buildSlotAssignments(input.opponentClub);

  const userAtk = calcAttackPower(userEffective);
  const userDef = calcDefensePower(userEffective);
  const oppAtk = calcAttackPower(oppEffective);
  const oppDef = calcDefensePower(oppEffective);

  const odds = predictMatch(userAtk, userDef, oppAtk, oppDef, input.fixture.isHome);
  const userOverall = Math.round((userAtk + userDef) / 2);
  const opponentOverall = Math.round((oppAtk + oppDef) / 2);

  return {
    fixture: input.fixture,
    competition: input.competition,
    opponentClub: input.opponentClub,
    userAttackPower: userAtk,
    userDefensePower: userDef,
    userVipAttackBoost: 0,
    userVipDefenseBoost: 0,
    opponentAttackPower: oppAtk,
    opponentDefensePower: oppDef,
    winProbability: odds.win,
    drawProbability: odds.draw,
    lossProbability: odds.loss,
    userOverall,
    opponentOverall,
    technicalGap: userOverall - opponentOverall,
    expectedUserGoals: odds.expectedUserGoals,
    expectedOpponentGoals: odds.expectedOpponentGoals,
    mostLikelyScore: odds.mostLikelyScore,
    opponentStarters: oppEffective.length,
    isScouted: input.isScouted,
    scoutAccuracy: input.scoutAccuracy,
  };
}
