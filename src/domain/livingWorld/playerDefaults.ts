/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Deterministic defaults for living-world player overlays (seeded per player id).
 */

import type { Player } from '../../types/game';
import { SeededRandom } from '../../engine/prng';
import { clamp } from '../shared/math';
import { hashStringToSeed } from '../shared/seed';
import type {
  ManagerRelationship,
  PlayerCareerState,
  PlayerMentalState,
  PlayerPersonalityProfile,
} from './types';

const ARCHETYPE_BIAS: Record<
  Player['personality'],
  Partial<PlayerPersonalityProfile>
> = {
  leader: { leadership: 78, determination: 72, professionalism: 70 },
  temperamental: { temperament: 35, loyalty: 45, professionalism: 50 },
  professional: { professionalism: 82, loyalty: 68, adaptability: 62 },
  ambitious: { ambition: 85, determination: 75, loyalty: 45 },
  loyal: { loyalty: 88, professionalism: 72, ambition: 48 },
  nervous: { temperament: 42, adaptability: 48, determination: 50 },
};

function rngForPlayer(playerId: string): SeededRandom {
  return new SeededRandom(hashStringToSeed(`lw_player_${playerId}`));
}

function jitter(rng: SeededRandom, base: number, spread: number): number {
  return clamp(base + rng.nextRange(-spread, spread), 0, 100);
}

export function createDefaultPersonalityProfile(player: Player): PlayerPersonalityProfile {
  const rng = rngForPlayer(player.id);
  const bias = ARCHETYPE_BIAS[player.personality] ?? {};
  const ageFactor = player.age < 23 ? 8 : player.age > 32 ? -6 : 0;
  const repFactor = Math.min(12, Math.floor(player.overall / 8));

  return {
    ambition: jitter(rng, (bias.ambition ?? 55) + ageFactor, 12),
    professionalism: jitter(rng, (bias.professionalism ?? 58) + repFactor, 10),
    loyalty: jitter(rng, bias.loyalty ?? 55, 14),
    temperament: jitter(rng, bias.temperament ?? 60, 12),
    adaptability: jitter(rng, (bias.adaptability ?? 52) + Math.min(8, player.secondaryPositions.length * 3), 10),
    leadership: jitter(rng, (bias.leadership ?? 48) + (player.age >= 28 ? 10 : 0), 12),
    determination: jitter(rng, (bias.determination ?? 56) + repFactor, 10),
  };
}

export function createDefaultMentalState(player: Player): PlayerMentalState {
  const rng = rngForPlayer(`${player.id}_mental`);
  const morale = clamp(player.morale, 0, 100);
  const moodLift = morale >= 70 ? 8 : morale <= 40 ? -10 : 0;

  return {
    confidence: jitter(rng, 50 + moodLift + Math.floor(player.form), 12),
    happiness: jitter(rng, 48 + moodLift, 14),
    frustration: jitter(rng, morale <= 45 ? 58 : 35, 12),
    pressure: jitter(rng, player.overall >= 82 ? 55 : 42, 12),
  };
}

export function createDefaultManagerRelationship(player: Player): ManagerRelationship {
  const rng = rngForPlayer(`${player.id}_mgr`);
  const base = 52 + Math.floor((player.morale - 50) / 5);

  return {
    trust: jitter(rng, base, 10),
    respect: jitter(rng, base + Math.floor(player.overall / 20), 10),
    satisfaction: jitter(rng, base, 12),
  };
}

export function createDefaultCareerState(player: Player): PlayerCareerState {
  const rng = rngForPlayer(`${player.id}_career`);
  const young = player.age <= 23;

  return {
    playingTimeExpectation: jitter(rng, young ? 62 : 55, 12),
    developmentSatisfaction: jitter(rng, young ? 58 : 50, 12),
    contractSatisfaction: jitter(rng, player.contractYears >= 2 ? 60 : 48, 12),
    nationalTeamAmbition: jitter(rng, player.overall >= 78 ? 70 : 45, 14),
    transferDesire: jitter(rng, player.personality === 'ambitious' ? 62 : 40, 14),
  };
}

export function ensurePlayerLivingWorldFields(player: Player): Player {
  return {
    ...player,
    personalityProfile: player.personalityProfile ?? createDefaultPersonalityProfile(player),
    mentalState: player.mentalState ?? createDefaultMentalState(player),
    managerRelationship: player.managerRelationship ?? createDefaultManagerRelationship(player),
    careerState: player.careerState ?? createDefaultCareerState(player),
  };
}
