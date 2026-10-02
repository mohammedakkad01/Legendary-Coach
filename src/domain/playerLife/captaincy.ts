/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Player } from '../../types/game';
import type { ReducerInput, StateChange, SquadRelationship } from '../livingWorld/types';
import { PLAYER_LIFE as P } from '../../config/gameTuning';
import { clamp } from '../shared/math';

export function computeCaptaincySuitability(
  player: Player,
  relationships: SquadRelationship[],
  captainId?: string,
): number {
  const prof = player.personalityProfile;
  const rel = player.managerRelationship;
  const leadership = prof?.leadership ?? 48;
  const loyalty = prof?.loyalty ?? 50;
  const experience = clamp(player.age - 18, 0, 20) * 4;
  const trust = rel?.trust ?? 50;

  let relationshipScore = 50;
  const respectRels = relationships.filter(
    (r) => (r.playerAId === player.id || r.playerBId === player.id) && r.type === 'respect',
  );
  if (respectRels.length > 0) {
    relationshipScore = respectRels.reduce((s, r) => s + r.strength, 0) / respectRels.length;
  }

  const w = P.captaincy;
  const score =
    leadership * w.leadershipWeight +
    experience * w.experienceWeight +
    loyalty * w.loyaltyWeight +
    trust * w.trustWeight +
    relationshipScore * w.relationshipWeight;

  const incumbentBonus = captainId === player.id ? 5 : 0;
  return clamp(Math.round(score + incumbentBonus), 0, 100);
}

export function captaincyChangeConsequences(
  oldCaptainId: string | undefined,
  newCaptainId: string,
  season: number,
  matchday: number,
): StateChange[] {
  const changes: StateChange[] = [
    {
      kind: 'appendCaptaincyHistory',
      entry: { captainId: newCaptainId, sinceMatchday: matchday, season },
    },
    {
      kind: 'patchDressingRoom',
      patch: { hierarchyStabilityDelta: P.captaincy.changeCohesionDelta },
    },
  ];
  if (oldCaptainId && oldCaptainId !== newCaptainId) {
    changes.push({
      kind: 'changePlayerMorale',
      playerId: oldCaptainId,
      delta: P.captaincy.changeShockMorale,
      reason: 'captaincy_lost',
    });
    changes.push({
      kind: 'changePlayerMorale',
      playerId: newCaptainId,
      delta: 4,
      reason: 'captaincy_gained',
    });
  }
  return changes;
}

export function pickBestCaptainCandidate(input: ReducerInput, captainId?: string): Player | undefined {
  let best: Player | undefined;
  let bestScore = -1;
  for (const p of input.players) {
    const s = computeCaptaincySuitability(p, input.livingWorld.relationships, captainId);
    if (s > bestScore) {
      bestScore = s;
      best = p;
    }
  }
  return best;
}
