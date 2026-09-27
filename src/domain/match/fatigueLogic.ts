/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Fatigue & Stamina Domain Logic
 */

import { VIP_LEVELS } from '../../data/vipData';
import { getVipLevel } from '../vip/vipCalculations';

export function getFatigueProtectionMultiplier(vipPoints: number): number {
  const level = getVipLevel(vipPoints);
  const tier = VIP_LEVELS.find(t => t.level === level) || VIP_LEVELS[0];
  return tier.fatigueProtectionPercent ? 1 - tier.fatigueProtectionPercent / 100 : 1;
}
