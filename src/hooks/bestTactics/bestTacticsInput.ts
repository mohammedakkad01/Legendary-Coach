/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pure half of useBestTactics: builds the recommender input from the club and
 * a stable memo key for it. No React, no store — unit-tested in
 * scripts/testBestTacticsIntegration.ts.
 */

import type { Club, Fixture, FootballFormation, Player, PreMatchData } from '../../types/game';
import type { BestTacticsInput, BestTacticsPlayer, OpponentProfile } from '../../domain/tactics/bestTactics';

export const toBestTacticsPlayer = (p: Player): BestTacticsPlayer => ({
  id: p.id,
  position: p.position,
  overall: p.overall,
  secondaryPositions: [...(p.secondaryPositions ?? [])],
  fatigue: p.fatigue,
  morale: p.morale,
  form: p.form,
  stamina: p.stamina,
  attributes: { ...(p.attributes ?? {}) },
  injuredWeeks: p.injuredWeeks,
  suspendedMatches: p.suspendedMatches,
});

export function buildBestTacticsInput(
  club: Pick<Club, 'footballSquad' | 'footballLineup' | 'footballTactics'>,
  opponent: OpponentProfile | undefined,
  maxSubstitutes: number,
  allowedFormations?: readonly FootballFormation[],
): BestTacticsInput {
  return {
    squad: club.footballSquad.map(toBestTacticsPlayer),
    currentLineup: [...club.footballLineup],
    currentTactics: { ...club.footballTactics },
    opponent,
    maxSubstitutes,
    allowedFormations: allowedFormations ? [...allowedFormations] : undefined,
  };
}

/** JSON with object keys sorted, so the key never depends on property order. */
const stable = (value: unknown): string =>
  JSON.stringify(value, (_k, v) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
      : v);

/**
 * Same key ⇔ the recommender would return the same result. Squad order is
 * irrelevant to the recommender, so the squad is keyed by id; lineup order
 * matters (slot i ↔ formation slot i), so it is kept as-is.
 */
export function bestTacticsInputKey(input: BestTacticsInput): string {
  const squad = [...input.squad].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return stable({
    squad,
    lineup: input.currentLineup,
    tactics: input.currentTactics,
    opponent: input.opponent ?? null,
    maxSubstitutes: input.maxSubstitutes,
    allowedFormations: input.allowedFormations ? [...input.allowedFormations].sort() : null,
  });
}

/** The cached next-match insight is reusable only while its fixture is still unplayed. */
export function isInsightCurrent(insight: Pick<PreMatchData, 'fixture'> | null | undefined, fixtures: readonly Fixture[]): boolean {
  if (!insight) return false;
  const nextUnplayed = fixtures.find((f) => !f.played);
  return !!nextUnplayed && nextUnplayed.matchday === insight.fixture.matchday;
}
