/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * One row in the substitutes or bench list. Same interaction model as
 * PitchPlayerNode (grab handle to pick/drop, tap the row body for info,
 * always a drop target for whatever is currently picked/dragged) in a
 * horizontal list layout instead of a pitch disc.
 */

import React from 'react';
import type { Player } from '../../types/game';
import { encodeDropTarget } from '../../hooks/squadDnd/dropTargetCodec';
import type { CardHandleProps } from '../../hooks/squadDnd/useSquadDnd';
import type { MoveTarget } from '../../domain/squad/squadTypes';

export interface RosterPlayerRowProps {
  readonly player: Player;
  readonly target: MoveTarget;
  readonly isPicked: boolean;
  readonly isHoverTarget: boolean;
  readonly isAr: boolean;
  readonly handleProps: CardHandleProps;
  readonly onOpenInfo: () => void;
}

const RosterPlayerRowImpl: React.FC<RosterPlayerRowProps> = ({ player, target, isPicked, isHoverTarget, isAr, handleProps, onOpenInfo }) => {
  const highlighted = isPicked || isHoverTarget;

  return (
    <div
      data-drop-target={encodeDropTarget(target)}
      className={`p-2 rounded-xl border flex items-center justify-between transition-all ${
        highlighted ? 'bg-amber-950/40 border-amber-500/60 ring-1 ring-amber-400/60' : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
      }`}
    >
      <button type="button" onClick={onOpenInfo} className="flex items-center gap-2.5 min-w-0 text-start">
        <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center font-black text-xs text-white shrink-0">
          {player.overall}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-white truncate">{isAr ? player.name : player.nameEn}</span>
            <span className="text-[10px] text-slate-400 shrink-0">{player.nationalityFlag}</span>
          </div>
          <span className="text-[10px] text-sky-400 font-semibold">{player.position}</span>
        </div>
      </button>

      <div className="flex items-center gap-2 shrink-0">
        <div className="text-end">
          <span className="text-[10px] text-slate-400 block">{isAr ? 'اللياقة' : 'Stamina'}</span>
          <span className="text-xs font-bold text-emerald-400">{player.stamina}%</span>
        </div>
        <button
          type="button"
          {...handleProps}
          className={`touch-none w-7 h-7 rounded-full flex items-center justify-center border shadow ${
            isPicked ? 'bg-amber-300 text-slate-950 border-amber-200' : 'bg-slate-800 text-slate-300 border-slate-700'
          }`}
        >
          <svg viewBox="0 0 20 20" className="w-3.5 h-3.5" fill="currentColor" aria-hidden="true">
            <circle cx="6" cy="6" r="1.5" /><circle cx="14" cy="6" r="1.5" />
            <circle cx="6" cy="10" r="1.5" /><circle cx="14" cy="10" r="1.5" />
            <circle cx="6" cy="14" r="1.5" /><circle cx="14" cy="14" r="1.5" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export const RosterPlayerRow = React.memo(RosterPlayerRowImpl);
