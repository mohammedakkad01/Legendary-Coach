/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Club, Player } from '../../types/game';
import type { GameSaveData } from '../../types/save';
import { createDefaultManagerCareer } from './managerCareer';
import { ensurePlayerLivingWorldFields } from './playerDefaults';
import { generateSquadRelationships } from './relationships';
import type { LivingWorldState } from './types';
import { LIVING_WORLD_SCHEMA_VERSION } from './types';

export function createEmptyLivingWorld(clubReputation: number): LivingWorldState {
  return {
    schemaVersion: LIVING_WORLD_SCHEMA_VERSION,
    currentSeason: 1,
    managerCareer: createDefaultManagerCareer(clubReputation),
    clubMemory: [],
    playerMemories: {},
    relationships: [],
    eventLog: [],
    notifications: [],
    notificationThrottle: { dayBuckets: {} },
  };
}

function clubSnapshotFromClub(club: Club): {
  clubId: string;
  players: Player[];
  lineupIds: string[];
  benchIds: string[];
  captainId?: string;
} {
  return {
    clubId: club.id,
    players: club.footballSquad,
    lineupIds: club.footballLineup.filter(Boolean),
    benchIds: club.footballBench.filter(Boolean),
    captainId: club.footballTactics?.captainId,
  };
}

export function ensureLivingWorldV3(save: GameSaveData): GameSaveData {
  const club = save.club;
  const squad = club.footballSquad.map(ensurePlayerLivingWorldFields);
  const updatedClub = { ...club, footballSquad: squad };

  let livingWorld = save.livingWorld;
  if (!livingWorld || livingWorld.schemaVersion !== LIVING_WORLD_SCHEMA_VERSION) {
    livingWorld = createEmptyLivingWorld(club.finances.reputation);
  }

  if (livingWorld.relationships.length === 0 && squad.length >= 2) {
    livingWorld = {
      ...livingWorld,
      relationships: generateSquadRelationships(clubSnapshotFromClub(updatedClub)),
    };
  }

  return {
    ...save,
    club: updatedClub,
    livingWorld,
  };
}
