/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * INTERNAL — derive sparse truth from canonical Player (+ optional PlayerLife development).
 */

import type { Player } from '../../../types/game';
import type { TrueWorldPlayer } from './types';

function aggregateTechnical(attrs: Player['attributes'], overall: number): number {
  const pace = attrs.pace ?? overall;
  const dribbling = attrs.dribbling ?? overall;
  const passing = attrs.passing ?? overall;
  const shooting = attrs.shooting ?? overall;
  return Math.round((pace + dribbling + passing + shooting) / 4);
}

function aggregatePhysical(attrs: Player['attributes'], overall: number): number {
  const physical = attrs.physical ?? overall;
  const pace = attrs.pace ?? overall;
  return Math.round((physical + pace) / 2);
}

function aggregateMental(player: Player): number {
  const prof = player.personalityProfile?.professionalism ?? 55;
  const det = player.personalityProfile?.determination ?? 55;
  const morale = player.morale ?? 50;
  return Math.round((prof + det + morale) / 3);
}

export function buildTrueWorldPlayerFromCanonical(player: Player): TrueWorldPlayer {
  const truePotential =
    player.playerLife?.development.truePotential ?? player.potential ?? player.overall;
  const injuryWeeks = player.injuredWeeks ?? 0;
  const load = player.playerLife?.condition.trainingLoad ?? 0;
  const injuryConcernTruth = Math.min(100, injuryWeeks * 18 + Math.round(load / 4));

  return {
    playerId: player.id,
    trueOverall: player.overall,
    truePotential,
    trueMarketValue: player.marketValue,
    attributeTruth: {
      technical: aggregateTechnical(player.attributes, player.overall),
      physical: aggregatePhysical(player.attributes, player.overall),
      mental: aggregateMental(player),
    },
    injuryConcernTruth,
  };
}
