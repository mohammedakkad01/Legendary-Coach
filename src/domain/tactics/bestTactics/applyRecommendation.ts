/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Turns a recommendation into the club's persisted squad fields — atomically
 * and only if the result passes the squad rules. The UI calls this ONLY from
 * the explicit "Apply" button; nothing in this module runs silently.
 */

import type { FootballTactics } from '../../../types/game';
import { err, ok } from '../../shared/result';
import type { Result } from '../../shared/result';
import { createSquadState } from '../../squad/squadStateAdapter';
import type { ClubSquadSlice } from '../../squad/squadStateAdapter';
import { validateForKickoff } from '../../squad/squadRules';
import type { SquadViolation } from '../../squad/squadTypes';
import { toFootballTactics } from '../tacticalState';
import type { BestTacticsRecommendation } from './types';

export type ApplyError =
  | { readonly code: 'INVALID_RESULT'; readonly violations: readonly SquadViolation[] }
  | { readonly code: 'UNAVAILABLE_PLAYER'; readonly playerId: string };

export type ApplyBestTacticsError = ApplyError;

type ClubLike = Omit<ClubSquadSlice, 'footballTactics'> & { footballTactics: FootballTactics };

export function applyRecommendation<T extends ClubLike>(
  club: T,
  rec: BestTacticsRecommendation,
  options: { maxSubstitutes: number },
): Result<T, ApplyError> {
  // Defence in depth: the recommendation may be stale (an injury happened after it was made).
  const byId = new Map(club.footballSquad.map((p) => [p.id, p] as const));
  for (const id of [...rec.lineup.map((l) => l.playerId), ...rec.substitutes]) {
    const p = byId.get(id);
    if (p && ((p.injuredWeeks ?? 0) > 0 || (p.suspendedMatches ?? 0) > 0)) return err({ code: 'UNAVAILABLE_PLAYER', playerId: id });
  }

  const slots: string[] = [];
  for (const l of rec.lineup) slots[l.slotIndex] = l.playerId;

  const next: T = {
    ...club,
    footballLineup: slots.map((s) => s ?? ''),
    footballBench: [...rec.substitutes],
    footballTactics: toFootballTactics(rec.tactics),
  };

  const { state } = createSquadState(next, { maxSubstitutes: options.maxSubstitutes });
  const violations = validateForKickoff(state);
  if (violations.length > 0) return err({ code: 'INVALID_RESULT', violations });
  return ok(next);
}
