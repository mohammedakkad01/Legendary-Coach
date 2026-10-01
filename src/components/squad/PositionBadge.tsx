/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Small badge showing a player's position-suitability level. Used under the
 * rating circle on the pitch and next to roster rows. Reads only from the
 * domain's SuitabilityLevel — no logic of its own.
 */

import React from 'react';
import type { SuitabilityLevel } from '../../domain/squad/positionSuitability';
import { SUITABILITY_BADGE_TEXT, pick } from '../../i18n/squad';

const LEVEL_STYLE: Record<SuitabilityLevel, string> = {
  natural: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  very_suitable: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
  suitable: 'bg-lime-500/20 text-lime-300 border-lime-500/40',
  acceptable: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  poor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
};

export interface PositionBadgeProps {
  readonly level: SuitabilityLevel;
  readonly isAr: boolean;
  readonly compact?: boolean;
}

export const PositionBadge: React.FC<PositionBadgeProps> = ({ level, isAr, compact }) => (
  <span
    className={`inline-flex items-center justify-center rounded-full border font-black leading-none whitespace-nowrap ${LEVEL_STYLE[level]} ${
      compact ? 'px-1 py-0.5 text-[8px]' : 'px-1.5 py-0.5 text-[9px]'
    }`}
  >
    {pick(SUITABILITY_BADGE_TEXT[level], isAr)}
  </span>
);
