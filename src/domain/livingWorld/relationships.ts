/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Deterministic squad relationship generation (no RNG).
 */

import type { Player } from '../../types/game';
import { positionGroupOf } from '../squad/positionTaxonomy';
import type { LivingWorldClubSnapshot, RelationshipType, SquadRelationship } from './types';
import { MAX_RELATIONSHIPS_PER_PLAYER } from './types';

interface ScoredPair {
  playerAId: string;
  playerBId: string;
  score: number;
  type: RelationshipType;
}

function canonicalPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

function competitionScore(lineup: Set<string>, a: string, b: string): number {
  const aLine = lineup.has(a);
  const bLine = lineup.has(b);
  if (aLine && bLine) return 15;
  if (aLine !== bLine) return 28;
  return 8;
}

function inferRelationshipType(
  playerA: Player,
  playerB: Player,
  lineup: Set<string>,
  captainId?: string
): RelationshipType {
  const ageGap = Math.abs(playerA.age - playerB.age);
  const sameNation = playerA.nationality === playerB.nationality;
  const groupA = positionGroupOf(playerA.position);
  const groupB = positionGroupOf(playerB.position);
  const sameGroup = groupA && groupB && groupA === groupB;

  if (captainId && (playerA.id === captainId || playerB.id === captainId) && ageGap >= 4) {
    return 'mentorship';
  }
  if (sameGroup && lineup.has(playerA.id) && lineup.has(playerB.id)) {
    return 'competition';
  }
  if (!sameNation && (playerA.personality === 'temperamental' || playerB.personality === 'temperamental')) {
    return 'conflict';
  }
  if (sameNation && ageGap <= 3) {
    return 'friendship';
  }
  if (playerA.personality === 'leader' || playerB.personality === 'leader') {
    return 'respect';
  }
  if (playerA.overall >= 82 && playerB.overall >= 82 && sameGroup) {
    return 'rivalry';
  }
  return 'respect';
}

function scorePair(playerA: Player, playerB: Player, snapshot: LivingWorldClubSnapshot): number {
  const lineup = new Set(snapshot.lineupIds);
  let score = 0;

  const groupA = positionGroupOf(playerA.position);
  const groupB = positionGroupOf(playerB.position);
  if (groupA && groupB && groupA === groupB) score += 22;

  const ageGap = Math.abs(playerA.age - playerB.age);
  if (ageGap <= 2) score += 12;
  else if (ageGap >= 10) score += 8;

  if (playerA.nationality === playerB.nationality) score += 14;

  score += competitionScore(lineup, playerA.id, playerB.id);

  const profA = playerA.personalityProfile?.professionalism ?? 50;
  const profB = playerB.personalityProfile?.professionalism ?? 50;
  score += Math.floor((profA + profB) / 20);

  const seniorA = playerA.age >= 30 ? 10 : playerA.age >= 27 ? 5 : 0;
  const seniorB = playerB.age >= 30 ? 10 : playerB.age >= 27 ? 5 : 0;
  score += Math.max(seniorA, seniorB);

  if (snapshot.captainId === playerA.id || snapshot.captainId === playerB.id) score += 6;

  return score;
}

function strengthFromScore(score: number): number {
  return Math.min(100, Math.max(20, score + 15));
}

export function generateSquadRelationships(snapshot: LivingWorldClubSnapshot): SquadRelationship[] {
  const players = snapshot.players.filter((p) => p.sport === 'football');
  const candidates: ScoredPair[] = [];

  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      const playerA = players[i];
      const playerB = players[j];
      const score = scorePair(playerA, playerB, snapshot);
      if (score < 18) continue;
      const [aId, bId] = canonicalPair(playerA.id, playerB.id);
      const type = inferRelationshipType(playerA, playerB, new Set(snapshot.lineupIds), snapshot.captainId);
      candidates.push({ playerAId: aId, playerBId: bId, score, type });
    }
  }

  candidates.sort((x, y) => {
    if (y.score !== x.score) return y.score - x.score;
    if (x.playerAId !== y.playerAId) return x.playerAId.localeCompare(y.playerAId);
    return x.playerBId.localeCompare(y.playerBId);
  });

  const perPlayer = new Map<string, number>();
  const selected: SquadRelationship[] = [];
  const seen = new Set<string>();

  for (const c of candidates) {
    const key = `${c.playerAId}|${c.playerBId}`;
    if (seen.has(key)) continue;
    const countA = perPlayer.get(c.playerAId) ?? 0;
    const countB = perPlayer.get(c.playerBId) ?? 0;
    if (countA >= MAX_RELATIONSHIPS_PER_PLAYER || countB >= MAX_RELATIONSHIPS_PER_PLAYER) continue;

    seen.add(key);
    perPlayer.set(c.playerAId, countA + 1);
    perPlayer.set(c.playerBId, countB + 1);
    selected.push({
      playerAId: c.playerAId,
      playerBId: c.playerBId,
      type: c.type,
      strength: strengthFromScore(c.score),
    });
  }

  return selected;
}

export function findRelationship(
  relationships: SquadRelationship[],
  playerAId: string,
  playerBId: string
): SquadRelationship | undefined {
  const [a, b] = canonicalPair(playerAId, playerBId);
  return relationships.find((r) => r.playerAId === a && r.playerBId === b);
}
