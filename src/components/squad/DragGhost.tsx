/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Floating clone of the card being dragged. Mounted only while
 * dndState.phase === 'dragging'; its position is written directly to the DOM
 * by useSquadDnd (ghostRef) on every pointermove — this component itself
 * never re-renders during the drag, so it costs nothing on a slow phone.
 */

import React, { forwardRef } from 'react';

export interface DragGhostProps {
  readonly rating: number;
  readonly label: string;
  readonly startX: number;
  readonly startY: number;
}

export const DragGhost = forwardRef<HTMLDivElement, DragGhostProps>(({ rating, label, startX, startY }, ref) => (
  <div
    ref={ref}
    aria-hidden="true"
    className="fixed z-50 pointer-events-none -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
    style={{ left: 0, top: 0, transform: `translate3d(${startX}px, ${startY}px, 0)`, willChange: 'transform' }}
  >
    <div className="w-12 h-12 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center font-heading font-black text-sm shadow-2xl ring-4 ring-amber-300/70 scale-110">
      {rating}
    </div>
    <div className="mt-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-950/90 text-white border border-amber-400/60 max-w-[90px] truncate">
      {label}
    </div>
  </div>
));
DragGhost.displayName = 'DragGhost';
