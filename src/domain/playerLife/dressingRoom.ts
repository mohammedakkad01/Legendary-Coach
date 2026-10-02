/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { SeededRandom } from '../../engine/prng';
import { PLAYER_LIFE as P } from '../../config/gameTuning';
import type { LivingWorldState, StateChange } from '../livingWorld/types';

export function cohesionDeltaFromResult(won: boolean, drawn: boolean): number {
  if (won) return P.dressingRoom.cohesionFromWin;
  if (drawn) return 0;
  return P.dressingRoom.cohesionFromLoss;
}

export function weeklyDressingRoomChanges(
  world: LivingWorldState,
  matchday: number,
  season: number,
  won: boolean,
  drawn: boolean,
  rng: SeededRandom,
): StateChange[] {
  const dr = world.dressingRoom ?? { cohesion: 58, hierarchyStability: 62, activeConflictPlayerIds: [] };
  let cohesion = dr.cohesion + cohesionDeltaFromResult(won, drawn);

  const changes: StateChange[] = [
    {
      kind: 'patchDressingRoom',
      patch: { cohesion: Math.min(100, Math.max(0, cohesion)) },
    },
  ];

  const lastCrisis = dr.lastCrisisMatchday ?? -999;
  const cooled = matchday - lastCrisis >= P.dressingRoom.crisisCooldownWeeks;
  if (cooled && cohesion < P.dressingRoom.lowCohesionThreshold && rng.nextChance(P.dressingRoom.crisisBaseProbability)) {
    changes.push({
      kind: 'patchDressingRoom',
      patch: {
        cohesion: Math.max(0, cohesion - 8),
        hierarchyStability: Math.max(0, dr.hierarchyStability - 5),
        lastCrisisMatchday: matchday,
      },
    });
    changes.push({
      kind: 'appendGameEvent',
      event: {
        id: `dr_crisis_${matchday}`,
        type: 'playerLife.dressing_room_crisis',
        timestamp: new Date().toISOString(),
        season,
        severity: 'high',
        context: { title: 'Dressing room tension', message: 'Squad cohesion has cracked.' },
      },
    });
  }

  return changes;
}
