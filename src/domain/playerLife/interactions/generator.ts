/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { SeededRandom } from '../../../engine/prng';
import type { Player } from '../../../types/game';
import type { LivingWorldState, StateChange } from '../../livingWorld/types';
import { PLAYER_LIFE as P } from '../../../config/gameTuning';
import type { PendingPlayerInteraction, PlayerInteractionKind } from '../types';
import { toPendingResponses } from './catalog';
import { frustrationFromMinutesShortfall } from '../playingTimeExpectation';

const KIND_BY_TRIGGER: { kind: PlayerInteractionKind; weight: number }[] = [
  { kind: 'playing_time', weight: 5 },
  { kind: 'development_concern', weight: 2 },
  { kind: 'training', weight: 2 },
  { kind: 'contract', weight: 1 },
  { kind: 'praise_request', weight: 1 },
  { kind: 'role_disagreement', weight: 1 },
];

function cooldownKey(playerId: string, kind: string): string {
  return `${playerId}|${kind}`;
}

function canComplain(world: LivingWorldState, playerId: string, matchday: number): boolean {
  const globalKey = 'global_complaint';
  const lastGlobal = world.interactionCooldowns?.[globalKey] ?? -999;
  if (matchday - lastGlobal < P.complaint.globalCooldownWeeks) return false;

  const perPlayer = world.interactionCooldowns?.[`player|${playerId}`] ?? -999;
  if (matchday - perPlayer < P.complaint.perPlayerCooldownWeeks) return false;

  const pending = world.pendingInteractions?.filter((i) => i.playerId === playerId).length ?? 0;
  return pending < 1;
}

export function maybeGenerateInteraction(
  player: Player,
  world: LivingWorldState,
  matchday: number,
  season: number,
  rng: SeededRandom,
): StateChange[] {
  const frustration = player.mentalState?.frustration ?? 40;
  if (frustration < P.complaint.frustrationThreshold) return [];
  if (!canComplain(world, player.id, matchday)) return [];

  const expected = player.playerLife?.playingTime.expectedMinutesPerMatch ?? 55;
  const lastMin = player.playerLife?.playingTime.minutesLastMatches.slice(-1)[0] ?? 0;
  const amb = player.personalityProfile?.ambition ?? 55;
  const extraFr = frustrationFromMinutesShortfall(expected, lastMin, amb);
  const prob = Math.min(P.complaint.maxProbability, (frustration - 50) / 100 + extraFr / 30);
  if (!rng.nextChance(prob)) return [];

  let roll = rng.nextFloat() * KIND_BY_TRIGGER.reduce((s, k) => s + k.weight, 0);
  let kind: PlayerInteractionKind = 'playing_time';
  for (const entry of KIND_BY_TRIGGER) {
    roll -= entry.weight;
    if (roll <= 0) {
      kind = entry.kind;
      break;
    }
  }

  const id = `pi_${player.id}_${matchday}_${kind}`;
  const interaction: PendingPlayerInteraction = {
    id,
    playerId: player.id,
    kind,
    season,
    matchday,
    severity: frustration >= 75 ? 'high' : 'medium',
    responses: toPendingResponses(kind),
    context: { frustration, expected, lastMin },
  };

  return [
    { kind: 'addPendingInteraction', interaction },
    {
      kind: 'setInteractionCooldown',
      key: 'global_complaint',
      matchday,
    },
    { kind: 'setInteractionCooldown', key: `player|${player.id}`, matchday },
    {
      kind: 'appendGameEvent',
      event: {
        id: `ev_${id}`,
        type: `playerLife.${kind}_complaint`,
        timestamp: new Date().toISOString(),
        season,
        playerId: player.id,
        severity: interaction.severity === 'high' ? 'high' : 'medium',
        context: { title: `Player concern: ${kind}`, message: `${player.nameEn} wants to talk.` },
      },
    },
  ];
}
