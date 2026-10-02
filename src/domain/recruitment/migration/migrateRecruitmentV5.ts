/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { GameSaveData } from '../../../types/save';
import { CURRENT_SAVE_VERSION } from '../../../types/save';
import { hashStringToSeed } from '../../shared/seed';
import { createInitialKnowledge } from '../knowledge/knowledgeState';
import { mergeWorldPlayers } from '../world/worldPlayerRegistry';
import { calendarWeekFromGameWeek, deriveGameWeekFromSave } from '../world/gameWeek';
import { buildTransferWindowState } from '../world/transferWindow';
import {
  RECRUITMENT_WORLD_SCHEMA_VERSION,
  type RecruitmentWorldState,
} from '../types';

function isRecruitmentWorldV1(
  world: RecruitmentWorldState | undefined,
): world is RecruitmentWorldState {
  return !!world && world.schemaVersion === RECRUITMENT_WORLD_SCHEMA_VERSION;
}

function seedWorldSeed(save: GameSaveData): number {
  return hashStringToSeed(`recruitment_world_${save.saveId}`);
}

function buildFreshRecruitmentWorld(save: GameSaveData): RecruitmentWorldState {
  const worldSeed = seedWorldSeed(save);
  const gameWeek = deriveGameWeekFromSave(save);
  const calendarWeek = calendarWeekFromGameWeek(gameWeek);
  const userClubId = save.club.id;

  const squad = save.club.footballSquad ?? [];
  const market = save.scoutMarket ?? [];
  const allPlayers = [...squad, ...market];

  const worldPlayers = mergeWorldPlayers({}, allPlayers);

  const knowledgeByObserverClubId: RecruitmentWorldState['knowledgeByObserverClubId'] = {
    [userClubId]: {},
  };

  const squadIds = new Set(squad.map((p) => p.id));

  for (const player of allPlayers) {
    const truth = worldPlayers[player.id];
    if (!truth) continue;
    const isOwnSquad = squadIds.has(player.id);
    const knowledge = createInitialKnowledge({
      worldSeed,
      gameWeek,
      observerClubId: userClubId,
      playerId: player.id,
      isOwnSquad,
      truth,
    });
    knowledgeByObserverClubId[userClubId][player.id] = knowledge;
  }

  return {
    schemaVersion: RECRUITMENT_WORLD_SCHEMA_VERSION,
    worldSeed,
    gameWeek,
    transferWindow: buildTransferWindowState(calendarWeek),
    worldPlayers,
    knowledgeByObserverClubId,
  };
}

function repairRecruitmentWorld(save: GameSaveData, existing: RecruitmentWorldState): RecruitmentWorldState {
  const userClubId = save.club.id;
  const squad = save.club.footballSquad ?? [];
  const market = save.scoutMarket ?? [];
  const allPlayers = [...squad, ...market];

  let world: RecruitmentWorldState = {
    ...existing,
    worldSeed: existing.worldSeed || seedWorldSeed(save),
    worldPlayers: mergeWorldPlayers(existing.worldPlayers ?? {}, allPlayers),
    knowledgeByObserverClubId: { ...existing.knowledgeByObserverClubId },
  };

  if (!world.knowledgeByObserverClubId[userClubId]) {
    world.knowledgeByObserverClubId[userClubId] = {};
  }

  const squadIds = new Set(squad.map((p) => p.id));
  const gameWeek = world.gameWeek || deriveGameWeekFromSave(save);

  for (const player of allPlayers) {
    const truth = world.worldPlayers[player.id];
    if (!truth) continue;
    if (world.knowledgeByObserverClubId[userClubId][player.id]) continue;
    world.knowledgeByObserverClubId[userClubId][player.id] = createInitialKnowledge({
      worldSeed: world.worldSeed,
      gameWeek,
      observerClubId: userClubId,
      playerId: player.id,
      isOwnSquad: squadIds.has(player.id),
      truth,
    });
  }

  const calendarWeek = calendarWeekFromGameWeek(world.gameWeek);
  world = {
    ...world,
    transferWindow: buildTransferWindowState(calendarWeek),
  };

  return world;
}

/**
 * Idempotent save v5 migration: adds recruitmentWorld without altering PlayerLife migration.
 */
export function ensureRecruitmentV5(save: GameSaveData): GameSaveData {
  let recruitmentWorld: RecruitmentWorldState;
  if (isRecruitmentWorldV1(save.recruitmentWorld)) {
    recruitmentWorld = repairRecruitmentWorld(save, save.recruitmentWorld);
  } else {
    recruitmentWorld = buildFreshRecruitmentWorld(save);
  }

  return {
    ...save,
    saveVersion: CURRENT_SAVE_VERSION,
    recruitmentWorld,
  };
}
