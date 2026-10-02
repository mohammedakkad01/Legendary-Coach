/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Store-facing orchestration (pure): builds StateChange[] and applies reducer.
 */

import type { SeededRandom } from '../../engine/prng';
import type { ReducerInput, ReducerResult } from '../livingWorld/types';
import { applyStateChanges } from '../livingWorld/reducer';
import { deriveNotificationsFromEvent } from '../livingWorld/notifications/derive';
import { filterNotificationsByThrottle } from '../livingWorld/notifications/throttle';
import type { GameEvent } from '../livingWorld/types';
import { buildPostMatchPlayerLifeChanges, injuryStateChangeFromMatch } from './tick/postMatchTick';
import { buildWeeklyPlayerLifeChanges } from './tick/weeklyTick';
import type { PostMatchTickInput, WeeklyTickInput } from './types';
import { computeInMatchInjuryProbability } from './injuryRisk';
import { resolveInteractionResponse } from './interactions/resolver';
import type { PendingPlayerInteraction } from './types';

export function applyPlayerLifeChanges(input: ReducerInput, changes: import('../livingWorld/types').StateChange[]): ReducerResult {
  return applyStateChanges(input, changes);
}

export function runPostMatchPlayerLife(
  input: ReducerInput,
  tick: PostMatchTickInput,
  lineupIds: string[],
  benchIds: string[],
  rng: SeededRandom,
): ReducerResult {
  let changes = buildPostMatchPlayerLifeChanges(input, tick, lineupIds, benchIds, rng);

  for (const s of tick.playerSummaries) {
    const player = input.players.find((p) => p.id === s.playerId);
    if (!player || s.minutes < 1) continue;
    const prob = computeInMatchInjuryProbability(player, {
      medicalCenterLevel: tick.medicalCenterLevel,
      recentMatchesIn7Days: tick.recentMatchesIn7Days,
      minutesThisMatch: s.minutes,
    });
    if (rng.nextChance(prob)) {
      const injChange = injuryStateChangeFromMatch(
        player,
        s.minutes,
        { medicalCenterLevel: tick.medicalCenterLevel, recentMatchesIn7Days: tick.recentMatchesIn7Days },
        rng,
      );
      if (injChange) {
        changes = [
          ...changes,
          injChange,
          {
            kind: 'appendGameEvent',
            event: {
              id: `pl_inj_${s.playerId}_${tick.matchday}`,
              type: 'playerLife.injury_occurred',
              timestamp: new Date().toISOString(),
              season: tick.season,
              playerId: s.playerId,
              severity: 'high',
              context: { minutes: s.minutes },
            },
          },
        ];
      }
    }
  }

  return applyPlayerLifeChanges(input, changes);
}

export function runWeeklyPlayerLife(
  input: ReducerInput,
  tick: WeeklyTickInput,
  rng: SeededRandom,
): ReducerResult {
  const changes = buildWeeklyPlayerLifeChanges(input, tick, rng);
  return applyPlayerLifeChanges(input, changes);
}

export function resolveInteraction(
  input: ReducerInput,
  interaction: PendingPlayerInteraction,
  responseId: string,
): ReducerResult {
  const changes = resolveInteractionResponse(interaction, responseId, input);
  return applyPlayerLifeChanges(input, changes);
}

export function listPendingInteractions(
  livingWorld: ReducerInput['livingWorld'],
  playerId?: string,
): PendingPlayerInteraction[] {
  const list = livingWorld.pendingInteractions ?? [];
  return playerId ? list.filter((i) => i.playerId === playerId) : list;
}

export function dispatchPlayerLifeEvents(
  input: ReducerInput,
  events: GameEvent[],
): ReducerResult {
  let acc = input;
  for (const event of events) {
    const notifs = deriveNotificationsFromEvent(event);
    const { accepted, throttle } = filterNotificationsByThrottle(acc.livingWorld.notificationThrottle, notifs);
    acc = applyPlayerLifeChanges(acc, [
      { kind: 'appendGameEvent', event },
      ...accepted.map((n) => ({ kind: 'addNotification' as const, notification: n })),
    ]);
    acc = { ...acc, livingWorld: { ...acc.livingWorld, notificationThrottle: throttle } };
  }
  return acc;
}
