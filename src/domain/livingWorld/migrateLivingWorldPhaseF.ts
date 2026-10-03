/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { GameSaveData } from '../../types/save';
import { upgradeLivingWorldToV2 } from '../playerLife/migratePlayerLife';
import { LIVING_WORLD_SCHEMA_VERSION_V3 } from './types';
import { applyPhaseFBackfillToSave } from './history/backfill';
import { hydrateLivingWorldFromClub } from './migrateLivingWorld';

export function upgradeLivingWorldToV3(world: import('./types').LivingWorldState, clubId: string): import('./types').LivingWorldState {
  const v2 = upgradeLivingWorldToV2(world);
  return {
    ...v2,
    schemaVersion: LIVING_WORLD_SCHEMA_VERSION_V3,
    phaseF: v2.phaseF ?? undefined,
  };
}

export function ensureLivingWorldPhaseF(save: GameSaveData): GameSaveData {
  const hydrated = hydrateLivingWorldFromClub(save.club, save.livingWorld);
  let livingWorld = upgradeLivingWorldToV3(hydrated.livingWorld, save.club.id);
  const withClub = { ...save, club: hydrated.club, livingWorld };
  const backfilled = applyPhaseFBackfillToSave(withClub);
  return {
    ...backfilled,
    livingWorld: backfilled.livingWorld
      ? {
          ...backfilled.livingWorld,
          schemaVersion: LIVING_WORLD_SCHEMA_VERSION_V3,
        }
      : livingWorld,
  };
}
