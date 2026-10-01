/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * A slim, always-present drop target for a whole section (substitutes /
 * bench), used for: appending a picked/dragged player when the section isn't
 * full, and as the tap-tap fallback's target when the section has no rows to
 * tap directly (an empty bench). Deliberately its OWN list item — never a
 * wrapper around the section's player rows — so its tap/keyboard handlers
 * never sit on the same element as (and double-fire with) a row's own grab
 * handle.
 */

import React from 'react';
import type { DropZoneProps } from '../../hooks/squadDnd/useSquadDnd';

export interface SectionDropStripProps {
  readonly dropZoneProps: DropZoneProps;
  readonly isHoverTarget: boolean;
  readonly label: string;
}

export const SectionDropStrip: React.FC<SectionDropStripProps> = ({ dropZoneProps, isHoverTarget, label }) => (
  <button
    type="button"
    {...dropZoneProps}
    className={`w-full py-2 rounded-xl border border-dashed text-[10px] font-bold transition-all ${
      isHoverTarget
        ? 'border-amber-400 bg-amber-500/10 text-amber-300'
        : 'border-slate-700 text-slate-500 hover:border-slate-600'
    }`}
  >
    {label}
  </button>
);
