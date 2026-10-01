/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * VIP Domain Rules & Privilege Calculations
 * Pure domain logic independent of React and Zustand.
 */

import { VIP_LEVELS } from '../../data/vipData';
import type { FootballFormation } from '../../types/game';
import { FORMATION_IDS } from '../squad/formations';

export function getVipLevel(vipPoints: number): number {
  let level = 1;
  for (const tier of VIP_LEVELS) {
    if (vipPoints >= tier.pointsRequired) level = tier.level;
  }
  return level;
}

export function getMaxBenchSlots(vipPoints: number): number {
  const level = getVipLevel(vipPoints);
  const tier = VIP_LEVELS.find(t => t.level === level) || VIP_LEVELS[0];
  return tier.maxBenchSlots || 5;
}

export function getMaxActiveNegotiations(vipPoints: number): number {
  const level = getVipLevel(vipPoints);
  const tier = VIP_LEVELS.find(t => t.level === level) || VIP_LEVELS[0];
  return tier.maxActiveNegotiations || 1;
}

export function getMaxAcademySlots(vipPoints: number): number {
  const level = getVipLevel(vipPoints);
  const tier = VIP_LEVELS.find(t => t.level === level) || VIP_LEVELS[0];
  return tier.maxAcademySlots || 1;
}

/** Minimum VIP level that unlocks each formation (matches the VIP perks in data/vipData.ts). */
export const FORMATION_MIN_VIP_LEVEL: Readonly<Record<FootballFormation, number>> = {
  '4-3-3': 1,
  '4-4-2': 1,
  '4-2-3-1': 1,
  '3-5-2': 1,
  '5-3-2': 1,
  '4-1-4-1': 2,
  '3-4-3': 3,
};

export const isFormationUnlocked = (formation: FootballFormation, vipLevel: number): boolean =>
  vipLevel >= (FORMATION_MIN_VIP_LEVEL[formation] ?? 1);

export const getUnlockedFormations = (vipLevel: number): FootballFormation[] =>
  FORMATION_IDS.filter((f) => isFormationUnlocked(f, vipLevel));
