/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Who may be picked. Injuries (injuredWeeks) and suspensions (suspendedMatches)
 * are real Player fields in this project, so both are honoured.
 */

import type { BestTacticsPlayer, ExcludedPlayer, UnavailableReason } from './types';

export function unavailableReason(p: Pick<BestTacticsPlayer, 'injuredWeeks' | 'suspendedMatches'>): UnavailableReason | null {
  if ((p.injuredWeeks ?? 0) > 0) return 'injured';
  if ((p.suspendedMatches ?? 0) > 0) return 'suspended';
  return null;
}

export const isAvailable = (p: Pick<BestTacticsPlayer, 'injuredWeeks' | 'suspendedMatches'>): boolean =>
  unavailableReason(p) === null;

/** Locale-independent id order — makes every later step independent of input order. */
const byId = (a: { id: string }, b: { id: string }): number => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

export function partitionSquad(squad: readonly BestTacticsPlayer[]): {
  available: BestTacticsPlayer[];
  excluded: ExcludedPlayer[];
} {
  const available: BestTacticsPlayer[] = [];
  const excluded: ExcludedPlayer[] = [];
  const seen = new Set<string>();
  for (const p of squad) {
    if (seen.has(p.id)) continue; // duplicate ids in the input are ignored, never double-picked
    seen.add(p.id);
    const reason = unavailableReason(p);
    if (reason) excluded.push({ playerId: p.id, reason });
    else available.push(p);
  }
  available.sort(byId);
  excluded.sort((a, b) => (a.playerId < b.playerId ? -1 : 1));
  return { available, excluded };
}
