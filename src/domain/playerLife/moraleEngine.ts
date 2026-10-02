/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { StateChange } from '../livingWorld/types';
import { PLAYER_LIFE as P } from '../../config/gameTuning';
import type { PostMatchPlayerSummary } from './types';

export function moraleChangesFromPostMatch(
  summaries: PostMatchPlayerSummary[],
  won: boolean,
  drawn: boolean,
): StateChange[] {
  const changes: StateChange[] = [];
  const resultDelta = won ? P.morale.win : drawn ? P.morale.draw : P.morale.loss;

  for (const s of summaries) {
    let delta = resultDelta;
    if (s.wasStarter) delta += P.morale.starterHappiness;
    else if (s.minutes === 0) delta += P.morale.benchUnhappiness;
    delta += s.goals * P.morale.goalBonus + s.assists * P.morale.assistBonus;
    if (s.matchRating >= 7.5) delta += 2;

    changes.push({ kind: 'changePlayerMorale', playerId: s.playerId, delta, reason: 'post_match' });
    changes.push({
      kind: 'changePlayerMentalStateDelta',
      playerId: s.playerId,
      delta: {
        happiness: won ? 3 : drawn ? 0 : -2,
        pressure: won ? -1 : -2,
        confidence: s.matchRating >= 7 ? 2 : s.matchRating <= 5 ? -2 : 0,
      },
    });
  }
  return changes;
}
