/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Rebuild running scores from non-annulled goals and drop incidentTruth.
 * Truth is an input to the decision only — it is not stored once the
 * review has been resolved.
 */

import type { MatchEvent } from '../../types/game';

export interface ProjectedScore {
  readonly events: MatchEvent[];
  readonly homeScore: number;
  readonly awayScore: number;
}

export function projectScores(events: readonly MatchEvent[]): ProjectedScore {
  let homeScore = 0;
  let awayScore = 0;
  const next = events.map((event) => {
    if (event.type === 'goal' && !event.annulled) {
      if (event.team === 'home') homeScore += 1;
      else awayScore += 1;
    }
    const { incidentTruth: _truth, ...rest } = event;
    return { ...rest, homeScore, awayScore };
  });
  return { events: next, homeScore, awayScore };
}

export function hasIncidentTruth(events: readonly MatchEvent[]): boolean {
  return events.some((event) => event.incidentTruth !== undefined);
}
