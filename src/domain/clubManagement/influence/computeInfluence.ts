/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { clamp } from '../../shared/math';
import { INFLUENCE_TUNING } from '../config/clubManagementTuning';
import type { InfluenceSnapshot } from '../types';

export interface InfluenceInputs {
  recentWinRate: number;
  trophies: number;
  developmentMomentumAvg: number;
  boardTrust: number;
  clubReputation: number;
  seasonsAtClub: number;
  fanTrust: number;
  gameWeek: number;
}

export function computeManagerInfluence(input: InfluenceInputs): InfluenceSnapshot {
  const w = INFLUENCE_TUNING.weights;
  const normRep = clamp(input.clubReputation / 10000, 0, 1) * 100;
  const raw =
    input.recentWinRate * w.results +
    clamp(input.trophies * 8, 0, 100) * w.trophies +
    clamp(input.developmentMomentumAvg + 50, 0, 100) * w.development +
    input.boardTrust * w.boardTrust +
    normRep * w.clubReputation +
    clamp(input.seasonsAtClub * 6, 0, 100) * w.seasonsAtClub +
    input.fanTrust * w.fanTrust;

  const score = clamp(Math.round(raw / (w.results + w.trophies + w.development + w.boardTrust + w.clubReputation + w.seasonsAtClub + w.fanTrust)), 0, 100);
  const th = INFLUENCE_TUNING.thresholds;

  return {
    score,
    unlocked: {
      transferBudgetSay: score >= th.transferBudgetSay,
      staffDecisions: score >= th.staffDecisions,
      academyDecisions: score >= th.academyDecisions,
      infrastructureRequests: score >= th.infrastructureRequests,
      playerAuthority: score >= th.playerAuthority,
      tacticalAutonomy: score >= th.tacticalAutonomy,
    },
    computedAtGameWeek: input.gameWeek,
  };
}

export type BoardRequestKind =
  | 'raise_transfer_budget'
  | 'hire_staff'
  | 'upgrade_facility'
  | 'academy_focus_change'
  | 'release_player';

export interface BoardRequestEvaluation {
  approved: boolean;
  reasonCodes: string[];
}

export function evaluateBoardRequest(
  influence: InfluenceSnapshot,
  boardTrust: number,
  boardPatience: number,
  request: BoardRequestKind,
): BoardRequestEvaluation {
  const reasonCodes: string[] = [];
  let approved = false;

  switch (request) {
    case 'raise_transfer_budget':
      if (influence.unlocked.transferBudgetSay && boardTrust >= 45) {
        approved = true;
        reasonCodes.push('influence_transfer_budget');
      } else {
        if (!influence.unlocked.transferBudgetSay) reasonCodes.push('influence_too_low');
        if (boardTrust < 45) reasonCodes.push('board_trust_low');
      }
      break;
    case 'hire_staff':
      approved = influence.unlocked.staffDecisions && boardPatience >= 30;
      if (!influence.unlocked.staffDecisions) reasonCodes.push('influence_staff_locked');
      if (boardPatience < 30) reasonCodes.push('board_impatient');
      break;
    case 'upgrade_facility':
      approved = influence.unlocked.infrastructureRequests && boardTrust >= 40;
      if (!influence.unlocked.infrastructureRequests) reasonCodes.push('influence_infra_locked');
      if (boardTrust < 40) reasonCodes.push('board_trust_low');
      break;
    case 'academy_focus_change':
      approved = influence.unlocked.academyDecisions;
      if (!approved) reasonCodes.push('influence_academy_locked');
      break;
    case 'release_player':
      approved = influence.unlocked.playerAuthority && boardTrust >= 35;
      if (!influence.unlocked.playerAuthority) reasonCodes.push('influence_player_authority_locked');
      break;
    default:
      reasonCodes.push('unknown_request');
  }

  return { approved, reasonCodes };
}
