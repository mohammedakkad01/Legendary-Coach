/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Best Tactics — entry point. Pure + deterministic: same input (in ANY squad
 * order) → identical output. Never mutates its input, never throws (errors are
 * returned as a Result).
 *
 * Pipeline: availability filter → for every formation: optimal XI
 * (Hungarian over slot values) → best tactical settings for that XI →
 * composite score → highest wins (ties: formation list order).
 */

import { BEST_TACTICS as B } from '../../../config/gameTuning';
import type { FootballFormation, FootballTactics } from '../../../types/game';
import { err, ok } from '../../shared/result';
import type { Result } from '../../shared/result';
import { FORMATION_IDS, getFormation, isFootballFormation } from '../../squad/formations';
import { resolveTacticalState } from '../tacticalState';
import type { RecommendedPlacement } from '../tacticalTypes';
import { isAvailable, partitionSquad } from './availability';
import { buildLineupProfile, evaluateTactics } from './candidateScorer';
import type { LineupProfile, TacticsEvaluation } from './candidateScorer';
import { optimizeLineup } from './lineupOptimizer';
import type { OptimizedPlacement } from './lineupOptimizer';
import { buildReasons } from './reasons';
import { pickRoles, pickSubstitutes } from './roles';
import { slotValue } from './slotValue';
import { selectTactics } from './tacticsSelector';
import type { BestTacticsError, BestTacticsInput, BestTacticsRecommendation, BestTacticsPlayer, FormationAlternative } from './types';

interface Candidate {
  readonly formation: FootballFormation;
  readonly xi: OptimizedPlacement[];
  readonly profile: LineupProfile;
  readonly tactics: ReturnType<typeof selectTactics>['tactics'];
  readonly evaluation: TacticsEvaluation;
}

/** FNV-1a — a stable, dependency-free id for "the same recommendation". */
function stableId(parts: readonly (string | number | boolean)[]): string {
  let h = 0x811c9dc5;
  for (const ch of parts.join('|')) { h ^= ch.charCodeAt(0); h = Math.imul(h, 0x01000193); }
  return `bt_${(h >>> 0).toString(16)}`;
}

function scoreCurrent(input: BestTacticsInput, byId: ReadonlyMap<string, BestTacticsPlayer>): {
  score: number | null; unavailable: number;
} {
  const formation = input.currentTactics.formation;
  if (!isFootballFormation(formation)) return { score: null, unavailable: 0 };
  const slots = getFormation(formation).slots;
  if (input.currentLineup.length !== slots.length) return { score: null, unavailable: 0 };

  const used = new Set<string>();
  const placements: OptimizedPlacement[] = [];
  let unavailable = 0;
  for (const slot of slots) {
    const id = input.currentLineup[slot.index];
    const player = id ? byId.get(id) : undefined;
    if (!player || used.has(id)) return { score: null, unavailable }; // hole / unknown / duplicate
    used.add(id);
    if (!isAvailable(player)) unavailable += 1;
    placements.push({ slotIndex: slot.index, slotLabel: slot.label, player, slot: slotValue(player, slot.label) });
  }
  const profile = buildLineupProfile(formation, placements);
  const ev = evaluateTactics(profile, resolveTacticalState(input.currentTactics), input.opponent);
  return { score: ev.score, unavailable };
}

export function recommendBestTactics(input: BestTacticsInput): Result<BestTacticsRecommendation, BestTacticsError> {
  try {
    const { available, excluded } = partitionSquad(input.squad);
    const required = getFormation(FORMATION_IDS[0]).slots.length;
    if (available.length < required) {
      return err({ code: 'NOT_ENOUGH_AVAILABLE_PLAYERS', available: available.length, required });
    }

    const allowed = input.allowedFormations ? new Set(input.allowedFormations) : null;
    const candidates: Candidate[] = [];
    for (const formation of FORMATION_IDS) {
      if (allowed && !allowed.has(formation)) continue;
      const xi = optimizeLineup(formation, available, { playerRoles: input.currentTactics.playerRoles });
      if (xi.length === 0) continue;
      const profile = buildLineupProfile(formation, xi);
      const choice = selectTactics(profile, formation, input.currentTactics, input.opponent);
      candidates.push({ formation, xi, profile, tactics: choice.tactics, evaluation: choice.evaluation });
    }
    if (candidates.length === 0) return err({ code: 'NOT_ENOUGH_AVAILABLE_PLAYERS', available: available.length, required });

    // Stable sort: higher score first; equal scores keep FORMATION_IDS order.
    const ranked = candidates
      .map((c, i) => ({ c, i }))
      .sort((a, b) => b.c.evaluation.score - a.c.evaluation.score || a.i - b.i)
      .map((x) => x.c);
    const best = ranked[0];

    const byId = new Map(input.squad.map((p) => [p.id, p] as const));
    const current = scoreCurrent(input, byId);
    const alreadyOptimal =
      current.score !== null && current.unavailable === 0 && best.evaluation.score - current.score < B.minImprovement;

    const roles = pickRoles(best.xi, input.currentTactics);
    const tactics = resolveTacticalState({ ...input.currentTactics, ...best.tactics, ...roles, tacticalStateVersion: undefined });
    const xiIds = new Set(best.xi.map((x) => x.player.id));
    const substitutes = pickSubstitutes(available, xiIds, Math.max(0, Math.floor(input.maxSubstitutes)));

    const lineup: RecommendedPlacement[] = best.xi.map((x) => ({
      slotIndex: x.slotIndex,
      playerId: x.player.id,
      assignedPosition: x.slotLabel,
      suitability: x.slot.breakdown.suitability,
    }));

    const alternatives: FormationAlternative[] = ranked
      .slice(1, 1 + B.alternativesCount)
      .map((c) => ({ formation: c.formation, score: c.evaluation.score, expectedPoints: c.evaluation.expectedPoints }));

    const reasons = buildReasons({
      formation: best.formation,
      xi: best.xi,
      available,
      excluded,
      components: best.evaluation.components,
      opponent: input.opponent,
      ownPower: (best.profile.attack + best.profile.defense) / 2,
      currentLineup: input.currentLineup,
      currentXiUnavailable: current.unavailable,
      currentScore: current.score,
      score: best.evaluation.score,
      alreadyOptimal,
    });

    return ok({
      id: stableId([best.formation, ...lineup.map((l) => l.playerId), tactics.mentality, tactics.pressing, tactics.passing, tactics.tempo, tactics.width, tactics.offsideTrap]),
      formation: best.formation,
      lineup,
      tactics,
      score: best.evaluation.score,
      reasons,
      substitutes,
      expectedPoints: best.evaluation.expectedPoints,
      currentScore: current.score,
      alreadyOptimal,
      alternatives,
      excluded,
    });
  } catch (e) {
    return err({ code: 'INTERNAL_ERROR', message: e instanceof Error ? e.message : String(e) });
  }
}
