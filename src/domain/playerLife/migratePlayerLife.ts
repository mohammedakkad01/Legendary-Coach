/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Player } from '../../types/game';
import type { GameSaveData } from '../../types/save';
import { SeededRandom } from '../../engine/prng';
import { hashStringToSeed } from '../shared/seed';
import { clamp } from '../shared/math';
import { ensurePlayerLivingWorldFields } from '../livingWorld/playerDefaults';
import type { LivingWorldState } from '../livingWorld/types';
import { LIVING_WORLD_SCHEMA_VERSION_V2 } from '../livingWorld/types';
import type { DevelopmentArchetype, PlayerLifeState } from './types';
import { syncLegacyFromPlayerLife } from './syncLegacy';
import { PLAYER_LIFE as P } from '../../config/gameTuning';

function rngFor(id: string): SeededRandom {
  return new SeededRandom(hashStringToSeed(`pl_${id}`));
}

function inferArchetype(potential: number, overall: number, age: number, rng: SeededRandom): DevelopmentArchetype {
  const gap = potential - overall;
  if (age <= 21 && potential >= 88 && gap > 12 && rng.nextChance(0.15)) return 'wonderkid_failure';
  if (age <= 20 && gap > 15) return 'early_breakthrough';
  if (age >= 24 && gap > 8 && rng.nextChance(0.35)) return 'late_bloomer';
  if (gap < 3 && age >= 28) return 'decline';
  if (gap > 10 && rng.nextChance(0.2)) return 'unexpected_breakthrough';
  if (gap < 4 && age >= 23 && age <= 27) return 'stalled';
  return 'steady';
}

export function createDefaultPlayerLife(player: Player): PlayerLifeState {
  const rng = rngFor(player.id);
  const truePotential = clamp(
    player.potential + rng.nextRange(-4, 4),
    player.overall,
    99,
  );
  const uncertainty = P.development.potentialEstimateBand;
  const estimate = clamp(truePotential + rng.nextRange(-uncertainty, uncertainty), 1, 99);

  return {
    condition: {
      trainingLoad: clamp(player.fatigue * 0.3, 0, 100),
      sharpness: clamp(48 + Math.floor(player.form * 4), 0, 100),
      matchFitness: clamp(65 + (player.stamina - 50) * 0.3, 0, 100),
      recoveryQuality: 60,
      injury:
        player.injuredWeeks > 0
          ? {
              severity: player.injuredWeeks >= 8 ? 'major' : player.injuredWeeks >= 3 ? 'moderate' : 'minor',
              fatigueInjury: false,
              muscleRisk: 40,
              trueWeeksRemaining: player.injuredWeeks,
              estimatedWeeksRemaining: player.injuredWeeks,
              diagnosisConfidence: 70,
            }
          : undefined,
    },
    development: {
      truePotential,
      potentialEstimate: estimate,
      estimateUncertainty: uncertainty,
      momentum: 0,
      ceiling: clamp(truePotential + rng.nextRange(-2, 5), player.overall, 99),
      archetype: inferArchetype(truePotential, player.overall, player.age, rng),
      trajectory: 'stable',
    },
    playingTime: {
      expectedMinutesPerMatch: player.age <= 21 ? P.playingTime.youthExpectedMin : P.playingTime.rotationExpectedMin,
      minutesLastMatches: [],
      squadRole: player.age <= 21 ? 'youth' : 'rotation',
    },
    mentoring: { menteeIds: [] },
  };
}

export function ensurePlayerLifeFields(player: Player): Player {
  const withLw = ensurePlayerLivingWorldFields(player);
  const playerLife = withLw.playerLife ?? createDefaultPlayerLife(withLw);
  return syncLegacyFromPlayerLife({ ...withLw, playerLife });
}

export function upgradeLivingWorldToV2(world: LivingWorldState): LivingWorldState {
  return {
    ...world,
    schemaVersion: LIVING_WORLD_SCHEMA_VERSION_V2,
    dressingRoom: world.dressingRoom ?? {
      cohesion: 58,
      hierarchyStability: 62,
      activeConflictPlayerIds: [],
    },
    interactionCooldowns: world.interactionCooldowns ?? {},
    pendingInteractions: world.pendingInteractions ?? [],
    captaincyHistory: world.captaincyHistory ?? [],
    opponentTacticalScouting: world.opponentTacticalScouting ?? {},
  };
}

export function ensurePlayerLifeV4(save: GameSaveData): GameSaveData {
  const squad = save.club.footballSquad.map(ensurePlayerLifeFields);
  const club = { ...save.club, footballSquad: squad };
  const livingWorld = upgradeLivingWorldToV2(
    save.livingWorld ?? {
      schemaVersion: LIVING_WORLD_SCHEMA_VERSION_V2,
      currentSeason: 1,
      managerCareer: { reputation: 50, reputationLedger: [] },
      clubMemory: [],
      playerMemories: {},
      relationships: [],
      eventLog: [],
      notifications: [],
      notificationThrottle: { dayBuckets: {} },
      dressingRoom: { cohesion: 58, hierarchyStability: 62, activeConflictPlayerIds: [] },
      interactionCooldowns: {},
      pendingInteractions: [],
      captaincyHistory: [],
    },
  );
  return { ...save, saveVersion: 4, club, livingWorld };
}
