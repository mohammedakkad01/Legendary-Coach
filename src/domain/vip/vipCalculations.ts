/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * VIP Domain Rules & Privilege Calculations
 * Pure domain logic independent of React and Zustand.
 */

import { VIP_LEVELS } from '../../data/vipData';

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
