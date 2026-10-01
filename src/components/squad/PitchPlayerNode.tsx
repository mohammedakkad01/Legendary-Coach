/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * One formation slot on the pitch: an occupied disc (draggable + tappable +
 * a drop target for anyone else) or an empty slot (drop target only).
 *
 * Memoized: re-renders only when ITS OWN primitive props change, so a drag
 * elsewhere on the board (which changes only the hovered slot's props) does
 * not force all 11 discs to re-render.
 */

import React from 'react';
import type { Player } from '../../types/game';
import type { EffectiveRatingBreakdown } from '../../domain/squad/positionSuitability';
import { isOutOfPosition } from '../../domain/squad/positionSuitability';
import { encodeDropTarget } from '../../hooks/squadDnd/dropTargetCodec';
import type { CardHandleProps, DropZoneProps } from '../../hooks/squadDnd/useSquadDnd';
import type { MoveTarget } from '../../domain/squad/squadTypes';
import { PositionBadge } from './PositionBadge';
import { OutOfPositionWarning } from './OutOfPositionWarning';

export interface PitchPlayerNodeProps {
  readonly x: number;
  readonly y: number;
  readonly slotLabel: string;
  readonly target: MoveTarget;
  readonly player: Player | null;
  readonly breakdown: EffectiveRatingBreakdown | null;
  readonly isCaptain: boolean;
  readonly isPicked: boolean;
  readonly isHoverTarget: boolean;
  readonly isAr: boolean;
  readonly handleProps: CardHandleProps | null;
  readonly dropZoneProps: DropZoneProps | null;
  readonly onOpenInfo: () => void;
}

const PitchPlayerNodeImpl: React.FC<PitchPlayerNodeProps> = ({
  x, y, slotLabel, target, player, breakdown, isCaptain, isPicked, isHoverTarget, isAr, handleProps, dropZoneProps, onOpenInfo,
}) => {
  const highlighted = isPicked || isHoverTarget;

  return (
    <div
      className={`absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center transition-transform duration-200 ${
        highlighted ? 'scale-115 z-30' : 'z-20'
      }`}
      style={{ left: `${x}%`, top: `${y}%` }}
      data-drop-target={player ? encodeDropTarget(target) : undefined}
    >
      <div className="relative">
        {player ? (
          <div
            onClick={onOpenInfo}
            className={`relative w-11 h-11 sm:w-13 sm:h-13 rounded-full flex items-center justify-center font-black text-sm shadow-xl transition-all cursor-pointer ${
              highlighted
                ? 'bg-amber-400 text-slate-950 ring-4 ring-amber-300 shadow-amber-500/50'
                : 'bg-gradient-to-br from-sky-500 to-indigo-700 text-white border-2 border-white/80'
            }`}
          >
            {breakdown && <span className="font-heading font-black">{breakdown.effective}</span>}
            {isCaptain && (
              <span className="absolute -top-1.5 -end-1.5 w-4 h-4 rounded-full bg-amber-500 text-slate-950 font-black text-[9px] flex items-center justify-center border border-white">
                C
              </span>
            )}
          </div>
        ) : (
          dropZoneProps && (
            <button
              type="button"
              {...dropZoneProps}
              className={`relative w-11 h-11 sm:w-13 sm:h-13 rounded-full flex items-center justify-center font-black text-sm shadow-xl transition-all ${
                highlighted
                  ? 'bg-amber-400/90 text-slate-950 ring-4 ring-amber-300'
                  : 'bg-gradient-to-br from-sky-500 to-indigo-700 text-white border-2 border-white/80 border-dashed'
              }`}
            >
              <span className="text-xs text-slate-100">{slotLabel}</span>
            </button>
          )
        )}

        {/* Grab handle: separate small hit target so tapping the disc opens info while this moves the player. */}
        {player && handleProps && (
          <button
            type="button"
            {...handleProps}
            className={`touch-none absolute -bottom-1 -start-1 w-5 h-5 rounded-full flex items-center justify-center border border-white/70 shadow ${
              isPicked ? 'bg-amber-300 text-slate-950' : 'bg-slate-950/90 text-slate-300'
            }`}
          >
            <svg viewBox="0 0 20 20" className="w-3 h-3" fill="currentColor" aria-hidden="true">
              <circle cx="6" cy="6" r="1.5" /><circle cx="14" cy="6" r="1.5" />
              <circle cx="6" cy="10" r="1.5" /><circle cx="14" cy="10" r="1.5" />
              <circle cx="6" cy="14" r="1.5" /><circle cx="14" cy="14" r="1.5" />
            </svg>
          </button>
        )}

        {player && breakdown && isOutOfPosition(breakdown.suitability.level) && (
          <div className="absolute -top-1.5 -start-1.5">
            <OutOfPositionWarning breakdown={breakdown} isAr={isAr} />
          </div>
        )}
      </div>

      <div
        className={`mt-1 px-1.5 py-0.5 rounded text-[10px] font-bold text-center leading-tight whitespace-nowrap shadow-md max-w-[85px] truncate ${
          highlighted ? 'bg-amber-400 text-slate-950' : 'bg-slate-950/85 text-white border border-slate-700/60'
        }`}
      >
        {player ? (isAr ? player.name : player.nameEn) : slotLabel}
      </div>
      {breakdown && (
        <div className="mt-0.5">
          <PositionBadge level={breakdown.suitability.level} isAr={isAr} compact />
        </div>
      )}

    </div>
  );
};

export const PitchPlayerNode = React.memo(PitchPlayerNodeImpl);
