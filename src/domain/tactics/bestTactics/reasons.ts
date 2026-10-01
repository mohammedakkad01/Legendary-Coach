/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Machine-readable, human-explainable reasons (localized in i18n/bestTactics.ts).
 * Every reason is derived from numbers the scorer actually used — nothing is
 * narrated that the model did not compute.
 */

import { BEST_TACTICS as B } from '../../../config/gameTuning';
import type { FootballFormation } from '../../../types/game';
import { isOutOfPosition } from '../../squad/positionSuitability';
import type { RecommendationReason } from '../tacticalTypes';
import type { ScoreComponent } from './candidateScorer';
import type { OptimizedPlacement } from './lineupOptimizer';
import type { BestTacticsPlayer, ExcludedPlayer, OpponentProfile } from './types';

export interface ReasonContext {
  readonly formation: FootballFormation;
  readonly xi: readonly OptimizedPlacement[];
  readonly available: readonly BestTacticsPlayer[];
  readonly excluded: readonly ExcludedPlayer[];
  readonly components: readonly ScoreComponent[];
  readonly opponent?: OpponentProfile;
  readonly ownPower: number;
  readonly currentLineup: readonly string[];
  readonly currentXiUnavailable: number;
  readonly currentScore: number | null;
  readonly score: number;
  readonly alreadyOptimal: boolean;
}

export function buildReasons(c: ReasonContext): RecommendationReason[] {
  const r: RecommendationReason[] = [];

  r.push({ code: 'formation_chosen', params: { formation: c.formation } });

  if (c.excluded.length > 0) {
    r.push({
      code: 'excluded_unavailable',
      params: {
        count: c.excluded.length,
        injured: c.excluded.filter((e) => e.reason === 'injured').length,
        suspended: c.excluded.filter((e) => e.reason === 'suspended').length,
      },
    });
  }
  if (c.currentXiUnavailable > 0) r.push({ code: 'current_xi_has_unavailable', params: { count: c.currentXiUnavailable } });

  if (c.opponent?.attack === undefined && c.opponent?.defense === undefined) r.push({ code: 'opponent_unknown' });
  else {
    const oppPower = ((c.opponent.attack ?? B.defaultOpponent.attack) + (c.opponent.defense ?? B.defaultOpponent.defense)) / 2;
    const gap = Math.round(c.ownPower - oppPower);
    r.push({ code: gap >= 3 ? 'opponent_weaker' : gap <= -3 ? 'opponent_stronger' : 'opponent_even', params: { gap: Math.abs(gap) } });
  }

  const natural = c.xi.filter((p) => p.slot.breakdown.suitability.level === 'natural').length;
  r.push({ code: 'natural_positions', params: { natural, total: c.xi.length } });
  for (const p of c.xi.filter((x) => isOutOfPosition(x.slot.breakdown.suitability.level)).slice(0, 2)) {
    r.push({ code: 'out_of_position_unavoidable', params: { playerId: p.player.id, slot: p.slotLabel, level: p.slot.breakdown.suitability.level } });
  }

  // Who changed, ranked by how much the slot improved over the current occupant.
  const currentById = new Map(c.available.map((p) => [p.id, p]));
  const upgrades = c.xi
    .map((x) => {
      const prevId = c.currentLineup[x.slotIndex];
      return { x, prevId, changed: prevId !== x.player.id };
    })
    .filter((u) => u.changed && u.prevId && currentById.has(u.prevId))
    .slice(0, 3);
  for (const u of upgrades) r.push({ code: 'slot_changed', params: { playerId: u.x.player.id, replacedId: u.prevId as string, slot: u.x.slotLabel } });

  const xiIds = new Set(c.xi.map((x) => x.player.id));
  const rested = c.available
    .filter((p) => !xiIds.has(p.id) && (p.fatigue ?? 0) >= B.tiredFatigue)
    .sort((a, b) => b.overall - a.overall || (a.id < b.id ? -1 : 1))[0];
  if (rested) r.push({ code: 'rested_tired_player', params: { playerId: rested.id, fatigue: Math.round(rested.fatigue ?? 0) } });

  for (const p of c.xi.filter((x) => (x.player.form ?? 0) >= B.inFormThreshold).slice(0, 2)) {
    r.push({ code: 'in_form_player', params: { playerId: p.player.id, form: p.player.form } });
  }

  // Tactical components, biggest effect first; skip noise.
  [...c.components]
    .filter((k) => Math.abs(k.value) >= 0.3)
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value) || (a.code < b.code ? -1 : 1))
    .slice(0, 4)
    .forEach((k) => r.push({ code: `tactic_${k.code}`, params: { ...(k.params ?? {}), effect: Math.round(k.value * 10) / 10 } }));

  if (c.alreadyOptimal) r.push({ code: 'already_optimal' });
  else if (c.currentScore !== null) r.push({ code: 'improves_current', params: { from: c.currentScore, to: c.score } });

  return r;
}
