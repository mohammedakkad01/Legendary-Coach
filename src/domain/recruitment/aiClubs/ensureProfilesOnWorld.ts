/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { GameSaveData } from '../../../types/save';
import type { RecruitmentWorldState } from '../types';
import { ensureAiClubProfiles } from './defaultClubProfiles';

export function collectRecruitmentClubIds(save: GameSaveData): string[] {
  const ids = new Set<string>([save.club.id]);
  for (const row of save.leagueStandings ?? []) {
    if (row.clubId) ids.add(row.clubId);
  }
  return [...ids];
}

export function attachAiClubProfiles(
  world: RecruitmentWorldState,
  save: GameSaveData,
): RecruitmentWorldState {
  return {
    ...world,
    aiClubProfiles: ensureAiClubProfiles(
      world.aiClubProfiles,
      collectRecruitmentClubIds(save),
      world.worldSeed,
    ),
  };
}
