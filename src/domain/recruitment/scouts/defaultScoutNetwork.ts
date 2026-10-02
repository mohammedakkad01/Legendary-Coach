/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Placeholder scout network until Phase E staff hiring.
 */

import type { SeededRandom } from '../../../engine/prng';
import { hashStringToSeed } from '../../shared/seed';
import { SeededRandom as SR } from '../../../engine/prng';
import { clamp } from '../../shared/math';
import type { ScoutStaff, ScoutSpecialty } from './scoutTypes';

const PLACEHOLDER_SCOUTS: readonly {
  name: string;
  specialties: readonly ScoutSpecialty[];
  judging: number;
  potential: number;
  league: number;
  adaptability: number;
  reliability: number;
}[] = [
  { name: 'Alex Mercer', specialties: ['technical', 'european'], judging: 72, potential: 68, league: 70, adaptability: 65, reliability: 74 },
  { name: 'Sofia Rios', specialties: ['south_american', 'youth'], judging: 66, potential: 78, league: 58, adaptability: 70, reliability: 62 },
  { name: 'Jonas Krüger', specialties: ['physical', 'data'], judging: 69, potential: 64, league: 75, adaptability: 60, reliability: 80 },
  { name: 'Maya Chen', specialties: ['data', 'european'], judging: 74, potential: 70, league: 72, adaptability: 68, reliability: 76 },
  { name: 'Carlos Mendes', specialties: ['youth', 'technical'], judging: 58, potential: 82, league: 55, adaptability: 72, reliability: 48 },
];

function jitter(rng: SeededRandom, base: number, spread: number): number {
  return clamp(base + rng.nextRange(-spread, spread), 1, 99);
}

export function createDefaultScoutNetwork(observerClubId: string, worldSeed: number): ScoutStaff[] {
  const rng = new SR(hashStringToSeed(`scouts_${observerClubId}_${worldSeed}`));
  return PLACEHOLDER_SCOUTS.map((s, i) => ({
    id: `scout_${observerClubId}_${i}`,
    name: s.name,
    specialties: s.specialties,
    judgingAbility: jitter(rng, s.judging, 4),
    potentialEvaluation: jitter(rng, s.potential, 4),
    leagueKnowledge: jitter(rng, s.league, 4),
    adaptability: jitter(rng, s.adaptability, 4),
    reliability: jitter(rng, s.reliability, 4),
  }));
}

export function findScout(network: readonly ScoutStaff[], scoutId: string): ScoutStaff | undefined {
  return network.find((s) => s.id === scoutId);
}

/** Composite scout quality for confidence / error weighting. */
export function scoutQualityScore(scout: ScoutStaff): number {
  return Math.round(
    scout.judgingAbility * 0.32 +
      scout.potentialEvaluation * 0.22 +
      scout.leagueKnowledge * 0.18 +
      scout.adaptability * 0.1 +
      scout.reliability * 0.18,
  );
}

export function isPoorScout(scout: ScoutStaff): boolean {
  return scout.reliability < 55 || scout.judgingAbility < 52;
}
