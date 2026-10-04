/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Maps assistant suggested diffs onto store-level football tactics updates.
 * Lineup / full-XI changes must use Best Tactics apply (validated separately).
 */

import type { Club, FootballTactics } from '../../types/game';
import type { TacticalChangesDiff } from './types';

export function tacticsPatchFromAssistantChanges(
  changes: TacticalChangesDiff | undefined,
): Partial<FootballTactics> {
  if (!changes) return {};
  const patch: Partial<FootballTactics> = {};
  if (changes.formation) patch.formation = changes.formation as FootballTactics['formation'];
  if (changes.mentality) patch.mentality = changes.mentality;
  if (changes.pressing) patch.pressing = changes.pressing;
  if (changes.tempo) patch.tempo = changes.tempo;
  if (changes.passing) patch.passing = changes.passing;
  if (changes.width) patch.width = changes.width;
  return patch;
}

export function hasAssistantLineupOrFormationChange(changes: TacticalChangesDiff | undefined): boolean {
  if (!changes) return false;
  if (changes.bestTacticsRec) return true;
  if (changes.formation) return true;
  return (changes.lineupSwaps?.length ?? 0) > 0;
}

/** Best-tactics path only when a full validated recommendation is attached. */
export function requiresBestTacticsApply(changes: TacticalChangesDiff | undefined): boolean {
  return Boolean(changes?.bestTacticsRec);
}

export function clubAfterTacticsPatch(club: Club, patch: Partial<FootballTactics>): Club {
  if (Object.keys(patch).length === 0) return club;
  return {
    ...club,
    footballTactics: { ...club.footballTactics, ...patch },
  };
}
