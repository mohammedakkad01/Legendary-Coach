/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { clamp } from '../../shared/math';
import type {
  RecruitmentFocusAxis,
  RecruitmentFocusConfig,
  RecruitmentPositionGroup,
} from './academyTypes';
import type { PlayerPosition } from '../../../types/game';

const POSITION_BY_GROUP: Record<RecruitmentPositionGroup, readonly PlayerPosition[]> = {
  goalkeepers: ['GK'],
  defense: ['CB', 'LB', 'RB'],
  midfield: ['CDM', 'CM', 'CAM'],
  attack: ['LW', 'RW', 'ST'],
};

const ALL_OUTFIELD: readonly PlayerPosition[] = [
  'GK',
  'CB',
  'LB',
  'RB',
  'CDM',
  'CM',
  'CAM',
  'LW',
  'RW',
  'ST',
];

export function defaultRecruitmentFocus(homeRegionCode = 'SA'): RecruitmentFocusConfig {
  return {
    primaryAxis: 'balanced',
    homeRegionCode,
    intensity: 50,
  };
}

export function normalizeRecruitmentFocus(
  focus: Partial<RecruitmentFocusConfig> | undefined,
  homeRegionCode = 'SA',
): RecruitmentFocusConfig {
  const base = defaultRecruitmentFocus(homeRegionCode);
  if (!focus) return base;
  const primaryAxis = (focus.primaryAxis ?? base.primaryAxis) as RecruitmentFocusAxis;
  let positionGroup = focus.positionGroup;
  if (primaryAxis === 'position_group' && !positionGroup) {
    positionGroup = 'midfield';
  }
  return {
    primaryAxis,
    positionGroup,
    homeRegionCode: focus.homeRegionCode ?? base.homeRegionCode,
    intensity: clamp(Math.round(focus.intensity ?? base.intensity), 0, 100),
  };
}

export function positionPoolForFocus(focus: RecruitmentFocusConfig): readonly PlayerPosition[] {
  if (focus.primaryAxis === 'position_group' && focus.positionGroup) {
    return POSITION_BY_GROUP[focus.positionGroup];
  }
  return ALL_OUTFIELD;
}

/** Weight multiplier for attribute / potential draws (1 = neutral). */
export function focusGenerationModifiers(focus: RecruitmentFocusConfig): {
  potentialBonus: number;
  technicalBias: number;
  physicalBias: number;
  creativeBias: number;
  localNationalityWeight: number;
} {
  const t = focus.intensity / 100;
  const axis = focus.primaryAxis;
  let potentialBonus = 0;
  let technicalBias = 0;
  let physicalBias = 0;
  let creativeBias = 0;
  let localNationalityWeight = 0.35;

  switch (axis) {
    case 'high_potential':
      potentialBonus = 4 + 8 * t;
      break;
    case 'technical':
      technicalBias = 6 + 10 * t;
      break;
    case 'physical':
      physicalBias = 6 + 10 * t;
      break;
    case 'creative':
      creativeBias = 5 + 9 * t;
      technicalBias = 2 + 4 * t;
      break;
    case 'local_talent':
      localNationalityWeight = 0.35 + 0.55 * t;
      break;
    case 'international':
      localNationalityWeight = Math.max(0.05, 0.35 - 0.28 * t);
      break;
    case 'position_group':
    case 'balanced':
    default:
      break;
  }

  return {
    potentialBonus,
    technicalBias,
    physicalBias,
    creativeBias,
    localNationalityWeight,
  };
}
