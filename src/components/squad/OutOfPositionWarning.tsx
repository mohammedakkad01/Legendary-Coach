/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Small "wrong position" indicator. Only rendered when
 * isOutOfPosition(suitability.level) is true. Tapping/clicking it reveals the
 * natural position, the current slot, the suitability level and the REAL
 * effect (baseOverall → effective), all computed by computeEffectiveRating —
 * never a hardcoded number.
 */

import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import type { EffectiveRatingBreakdown } from '../../domain/squad/positionSuitability';
import { SUITABILITY_LEVEL_TEXT, SUITABILITY_REASON_TEXT, pick } from '../../i18n/squad';

export interface OutOfPositionWarningProps {
  readonly breakdown: EffectiveRatingBreakdown;
  readonly isAr: boolean;
}

export const OutOfPositionWarning: React.FC<OutOfPositionWarningProps> = ({ breakdown, isAr }) => {
  const [open, setOpen] = useState(false);
  const { suitability } = breakdown;

  return (
    <div className="relative">
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-label={pick(SUITABILITY_LEVEL_TEXT[suitability.level], isAr)}
        className="w-4 h-4 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow ring-1 ring-white/60"
      >
        <AlertTriangle className="w-2.5 h-2.5" />
      </button>

      {open && (
        <div
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          className="absolute z-40 top-5 start-1/2 -translate-x-1/2 w-52 rounded-xl border border-amber-500/40 bg-slate-950 p-2.5 text-start shadow-2xl"
        >
          <p className="text-[11px] font-black text-amber-300">{pick(SUITABILITY_LEVEL_TEXT[suitability.level], isAr)}</p>
          <p className="text-[10px] text-slate-300 mt-1 leading-snug">{pick(SUITABILITY_REASON_TEXT[suitability.reason], isAr)}</p>
          <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400">
            <span>{isAr ? 'الطبيعي' : 'Natural'}: <b className="text-white">{suitability.naturalPosition}</b></span>
            <span>{isAr ? 'الحالي' : 'Now'}: <b className="text-white">{suitability.assignedPosition}</b></span>
          </div>
          <div className="mt-1 text-[10px] text-slate-400">
            {isAr ? 'التأثير' : 'Effect'}: <b className="text-white">{breakdown.baseOverall}</b> → <b className="text-rose-300">{breakdown.effective}</b>
          </div>
        </div>
      )}
    </div>
  );
};
