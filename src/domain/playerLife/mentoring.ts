/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Player } from '../../types/game';
import type { SquadRelationship, StateChange } from '../livingWorld/types';
import { PLAYER_LIFE as P } from '../../config/gameTuning';
import { findRelationship } from '../livingWorld/relationships';

export function mentoringEffectiveness(
  mentor: Player,
  mentee: Player,
  relationships: SquadRelationship[],
): number {
  const rel = findRelationship(relationships, mentor.id, mentee.id);
  const relStrength = rel?.type === 'mentorship' || rel?.type === 'respect' ? rel.strength : 40;
  const ageGap = mentor.age - mentee.age;
  if (ageGap < P.mentoring.minAgeGap) return 0;
  const prof = mentor.personalityProfile?.leadership ?? 50;
  return (relStrength / 100) * P.mentoring.relationshipStrengthScale * (0.5 + prof / 100);
}

export function assignMentoringPair(mentorId: string, menteeId: string): StateChange[] {
  return [
    {
      kind: 'patchPlayerLife',
      playerId: menteeId,
      patch: { mentoring: { mentorId, menteeIds: [] } },
      legacyDelta: {},
    },
    {
      kind: 'addRelationship',
      relationship: {
        playerAId: mentorId < menteeId ? mentorId : menteeId,
        playerBId: mentorId < menteeId ? menteeId : mentorId,
        type: 'mentorship',
        strength: 55,
      },
    },
  ];
}

export function weeklyMentoringChanges(
  players: Player[],
  relationships: SquadRelationship[],
): StateChange[] {
  const changes: StateChange[] = [];
  for (const mentee of players) {
    const mentorId = mentee.playerLife?.mentoring?.mentorId;
    if (!mentorId) continue;
    const mentor = players.find((p) => p.id === mentorId);
    if (!mentor) continue;
    const eff = mentoringEffectiveness(mentor, mentee, relationships);
    if (eff <= 0.05) continue;

    changes.push({
      kind: 'changePlayerMentalStateDelta',
      playerId: mentee.id,
      delta: { confidence: Math.round(P.mentoring.confidenceGain * eff) },
    });
    changes.push({
      kind: 'patchPlayerLife',
      playerId: mentee.id,
      patch: {},
      legacyDelta: { morale: Math.round(P.mentoring.professionalismGain * eff * 0.5) },
    });
  }
  return changes;
}
