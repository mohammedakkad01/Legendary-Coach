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
import { createDefaultScoutNetwork } from '../scouts/defaultScoutNetwork';
import { mergeLegacyNegotiations } from '../negotiation/migrateLegacyNegotiations';
import {
  RECRUITMENT_WORLD_SCHEMA_VERSION,
  type RecruitmentWorldState,
} from '../types';

type LegacyRecruitmentWorld = Omit<
  RecruitmentWorldState,
  'schemaVersion' | 'negotiations'
> & {
  schemaVersion: 1 | 2 | 3 | 4;
  negotiations?: RecruitmentWorldState['negotiations'];
};

type AnyRecruitmentWorld = LegacyRecruitmentWorld;

function isRecruitmentWorldPresent(world: LegacyRecruitmentWorld | undefined): world is LegacyRecruitmentWorld {
  return !!world && world.schemaVersion >= 1 && world.schemaVersion <= RECRUITMENT_WORLD_SCHEMA_VERSION;
}

function upgradeToCurrentSchema(save: GameSaveData, world: LegacyRecruitmentWorld): RecruitmentWorldState {
  const userClubId = save.club.id;
  const gameWeek = world.gameWeek || deriveGameWeekFromSave(save);
  const scouts =
    world.scoutNetwork && world.scoutNetwork.length > 0
      ? world.scoutNetwork
      : createDefaultScoutNetwork(userClubId, world.worldSeed || seedWorldSeed(save));

  let negotiations = world.negotiations ?? [];
  if (negotiations.length === 0 && save.activeNegotiations?.length) {
    negotiations = mergeLegacyNegotiations([], save.activeNegotiations, userClubId, gameWeek);
  }

  return {
    ...world,
    schemaVersion: RECRUITMENT_WORLD_SCHEMA_VERSION,
    scoutNetwork: scouts,
    scoutingAssignments: world.scoutingAssignments ?? [],
    scoutingReports: world.scoutingReports ?? [],
    negotiations,
  };
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
    scoutNetwork: createDefaultScoutNetwork(userClubId, worldSeed),
    scoutingAssignments: [],
    scoutingReports: [],
    negotiations: mergeLegacyNegotiations(
      [],
      save.activeNegotiations ?? [],
      userClubId,
      gameWeek,
    ),
  };
}

function repairRecruitmentWorld(save: GameSaveData, existing: AnyRecruitmentWorld): RecruitmentWorldState {
  const userClubId = save.club.id;
  const squad = save.club.footballSquad ?? [];
  const market = save.scoutMarket ?? [];
  const allPlayers = [...squad, ...market];

  let world: AnyRecruitmentWorld = {
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

  return upgradeToCurrentSchema(save, world);
}

/**
 * Idempotent save v5 migration: adds recruitmentWorld without altering PlayerLife migration.
 */
export function ensureRecruitmentV5(save: GameSaveData): GameSaveData {
  let recruitmentWorld: RecruitmentWorldState;
  if (isRecruitmentWorldPresent(save.recruitmentWorld as AnyRecruitmentWorld | undefined)) {
    recruitmentWorld = repairRecruitmentWorld(save, save.recruitmentWorld as AnyRecruitmentWorld);
  } else {
    recruitmentWorld = buildFreshRecruitmentWorld(save);
  }

  return {
    ...save,
    saveVersion: CURRENT_SAVE_VERSION,
    recruitmentWorld,
  };
}
