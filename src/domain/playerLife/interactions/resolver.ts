/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Player } from '../../../types/game';
import type { ReducerInput, StateChange } from '../../livingWorld/types';
import type { PendingPlayerInteraction } from '../types';
import { catalogForKind } from './catalog';

function findPlayer(players: Player[], id: string): Player | undefined {
  return players.find((p) => p.id === id);
}

function personalityScale(player: Player, key: 'loyalty' | 'temperament' | 'ambition' | 'professionalism'): number {
  const v = player.personalityProfile?.[key] ?? 50;
  return (v - 50) / 50;
}

export function resolveInteractionResponse(
  interaction: PendingPlayerInteraction,
  responseId: string,
  input: ReducerInput,
): StateChange[] {
  const player = findPlayer(input.players, interaction.playerId);
  if (!player) return [];

  const catalog = catalogForKind(interaction.kind);
  const chosen = catalog.find((c) => c.id === responseId);
  if (!chosen) return [];

  const loyalty = personalityScale(player, 'loyalty');
  const temper = personalityScale(player, 'temperament');
  const amb = personalityScale(player, 'ambition');
  const trust = player.managerRelationship?.trust ?? 50;

  const changes: StateChange[] = [
    { kind: 'removePendingInteraction', interactionId: interaction.id },
    {
      kind: 'appendGameEvent',
      event: {
        id: `pl_res_${interaction.id}_${responseId}`,
        type: `playerLife.interaction_resolved`,
        timestamp: new Date().toISOString(),
        season: interaction.season,
        playerId: player.id,
        severity: 'low',
        context: { kind: interaction.kind, responseId, effectKey: chosen.effectKey },
      },
    },
  ];

  const baseMorale: Record<string, number> = {
    promise_minutes: 4 + loyalty * 3,
    explain_role: 1 + loyalty,
    reject_demand: -3 - amb * 4 - (1 - temper) * 2,
    adjust_load: 3,
    push_harder: amb > 0 ? 2 : -2,
    review_soon: 5,
    not_now: -2 - amb * 2,
    listen: 2,
    refuse: -1 - amb * 3,
    compromise: 3,
    insist: -2 - temper * 3,
    tweak: 2,
    override: -3 - temper * 2,
    individual_plan: 4,
    patience: player.age <= 22 ? -1 : 1,
    praise_public: 5 + amb * 2,
    praise_private: 3 + loyalty * 2,
    explain_captain: 0,
    consider_later: 2 + amb,
    assign_mentor: 3,
    decline: -2,
    support: 4,
    focus_club: 1,
  };

  const moraleDelta = baseMorale[chosen.effectKey] ?? 0;
  changes.push({ kind: 'changePlayerMorale', playerId: player.id, delta: Math.round(moraleDelta) });

  const frustrationDelta =
    chosen.effectKey === 'reject_demand' || chosen.effectKey === 'override' ? 6 : chosen.effectKey === 'promise_minutes' ? -5 : -1;
  changes.push({
    kind: 'changePlayerMentalStateDelta',
    playerId: player.id,
    delta: { frustration: frustrationDelta },
  });
  if (chosen.effectKey === 'promise_minutes') {
    changes.push({
      kind: 'changeManagerRelationship',
      playerId: player.id,
      patch: { trust: Math.min(100, trust + 2) },
    });
  }

  const transferPatch =
    chosen.effectKey === 'listen' ? 5 : chosen.effectKey === 'refuse' ? -2 : chosen.effectKey === 'reject_demand' ? 4 : 0;
  if (transferPatch !== 0) {
    changes.push({
      kind: 'changePlayerCareerState',
      playerId: player.id,
      patch: { transferDesire: Math.min(100, Math.max(0, (player.careerState?.transferDesire ?? 40) + transferPatch)) },
    });
  }

  if (chosen.effectKey === 'promise_minutes') {
    changes.push({
      kind: 'changePlayerCareerState',
      playerId: player.id,
      patch: { playingTimeExpectation: Math.min(100, (player.careerState?.playingTimeExpectation ?? 55) + 5) },
    });
  }

  if (chosen.effectKey === 'praise_public' || chosen.effectKey === 'praise_private') {
    changes.push({
      kind: 'addPlayerMemory',
      playerId: player.id,
      entry: {
        id: `mem_praise_${interaction.id}`,
        type: 'praise',
        season: interaction.season,
        matchday: interaction.matchday,
        subjectIds: [],
        intensity: chosen.effectKey === 'praise_public' ? 65 : 45,
        decayRate: 2,
      },
    });
  }

  if (trust < 40 && (chosen.effectKey === 'reject_demand' || chosen.effectKey === 'override')) {
    changes.push({
      kind: 'changeManagerRelationship',
      playerId: player.id,
      patch: { trust: Math.max(0, trust - 5), respect: Math.max(0, (player.managerRelationship?.respect ?? 50) - 3) },
    });
  }

  return changes;
}
