/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Keeps root Player condition fields aligned with playerLife.condition.
 */

import type { Player } from '../../types/game';
import type { PlayerLifeState } from './types';
import { clamp100 } from './math';

export function syncLegacyFromPlayerLife(player: Player): Player {
  const life = player.playerLife;
  if (!life) return player;

  let injuredWeeks = player.injuredWeeks;
  const inj = life.condition.injury;
  if (inj) {
    injuredWeeks = Math.max(1, Math.ceil(inj.estimatedWeeksRemaining));
  } else if (player.injuredWeeks > 0 && !inj) {
    injuredWeeks = 0;
  }

  return {
    ...player,
    injuredWeeks,
    fatigue: clamp100(player.fatigue),
    stamina: clamp100(player.stamina),
    morale: clamp100(player.morale),
  };
}

export function mergePlayerLife(
  current: PlayerLifeState | undefined,
  patch: import('./types').PlayerLifePatch,
): PlayerLifeState {
  const base: PlayerLifeState = current ?? {
    condition: { trainingLoad: 0, sharpness: 50, matchFitness: 70, recoveryQuality: 60 },
    development: {
      truePotential: 75,
      potentialEstimate: 75,
      estimateUncertainty: 6,
      momentum: 0,
      ceiling: 80,
      archetype: 'steady',
      trajectory: 'stable',
    },
    playingTime: { expectedMinutesPerMatch: 55, minutesLastMatches: [], squadRole: 'rotation' },
    mentoring: { menteeIds: [] },
  };

  const injuryPatch = patch.condition?.injury;
  let injury = base.condition.injury;
  if (injuryPatch === null) injury = undefined;
  else if (injuryPatch) injury = injuryPatch;

  return {
    condition: {
      ...base.condition,
      ...patch.condition,
      injury,
    },
    development: { ...base.development, ...patch.development },
    playingTime: { ...base.playingTime, ...patch.playingTime },
    mentoring: { ...base.mentoring, ...patch.mentoring, menteeIds: patch.mentoring?.menteeIds ?? base.mentoring?.menteeIds ?? [] },
  };
}
