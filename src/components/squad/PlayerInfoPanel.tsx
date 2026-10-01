/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Compact player info panel — opens in place (no page navigation) when a
 * player's card body is tapped. Shows only real model values: name, natural
 * vs current position, suitability, overall, age, key attributes, fitness
 * (stamina/fatigue), morale, form, and section. No chemistry/familiarity
 * field — the project has no such per-player stat (team-level synergy only).
 */

import React from 'react';
import { X } from 'lucide-react';
import type { Player } from '../../types/game';
import type { PlayerAssignment } from '../../domain/squad/squadTypes';
import { computeEffectiveRating } from '../../domain/squad/positionSuitability';
import { PositionBadge } from './PositionBadge';
import { PLAYER_PANEL_TEXT, SQUAD_SECTION_TEXT, SUITABILITY_LEVEL_TEXT, SUITABILITY_REASON_TEXT, pick } from '../../i18n/squad';

export interface PlayerInfoPanelProps {
  readonly player: Player;
  readonly assignment: PlayerAssignment;
  readonly isAr: boolean;
  readonly onClose: () => void;
}

const stat = (label: string, value: React.ReactNode, accent = 'text-white') => (
  <div className="bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2 text-center">
    <span className="text-[10px] text-slate-400 block">{label}</span>
    <span className={`text-sm font-black ${accent}`}>{value}</span>
  </div>
);

export const PlayerInfoPanel: React.FC<PlayerInfoPanelProps> = ({ player, assignment, isAr, onClose }) => {
  const T = PLAYER_PANEL_TEXT;
  const assignedSlot = assignment.assignedPosition ?? player.position;
  const breakdown = computeEffectiveRating(player, assignedSlot);
  const key = ['pace', 'shooting', 'passing', 'dribbling', 'defending', 'physical'] as const;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:w-96 max-h-[85vh] overflow-y-auto bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl p-4 space-y-3 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label={pick(T.title, isAr)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-700 flex items-center justify-center font-black text-white shrink-0">
              {player.overall}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-black text-white truncate">{isAr ? player.name : player.nameEn}</p>
              <p className="text-[10px] text-slate-400">{player.nationalityFlag} · {pick(SQUAD_SECTION_TEXT[assignment.section], isAr)}</p>
            </div>
          </div>
          <button onClick={onClose} aria-label={pick(T.close, isAr)} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center justify-between bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2">
          <div>
            <span className="text-[10px] text-slate-400 block">{pick(T.naturalPosition, isAr)}</span>
            <span className="text-sm font-black text-white">{player.position}</span>
          </div>
          {assignment.section === 'starting' && (
            <div className="text-end">
              <span className="text-[10px] text-slate-400 block">{pick(T.currentSlot, isAr)}</span>
              <span className="text-sm font-black text-white">{assignedSlot}</span>
            </div>
          )}
          {assignment.suitability && <PositionBadge level={assignment.suitability.level} isAr={isAr} />}
        </div>

        {assignment.suitability && (
          <div className="bg-slate-950/40 border border-slate-800 rounded-xl px-3 py-2">
            <p className="text-[11px] font-bold text-slate-200">{pick(SUITABILITY_LEVEL_TEXT[assignment.suitability.level], isAr)}</p>
            <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">{pick(SUITABILITY_REASON_TEXT[assignment.suitability.reason], isAr)}</p>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2">
          {stat(pick(T.overall, isAr), player.overall, 'text-amber-400')}
          {stat(pick(T.effectiveRating, isAr), breakdown.effective, 'text-sky-400')}
          {stat(pick(T.age, isAr), player.age)}
          {stat(pick(T.fitness, isAr), `${player.stamina}%`, 'text-emerald-400')}
          {stat(pick(T.fatigue, isAr), `${player.fatigue}%`, player.fatigue > 60 ? 'text-rose-400' : 'text-white')}
          {stat(pick(T.morale, isAr), `${player.morale}%`, player.morale < 40 ? 'text-rose-400' : 'text-white')}
          {stat(pick(T.form, isAr), `${player.form}/10`, 'text-lime-400')}
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          {key.filter((k) => typeof player.attributes[k] === 'number').map((k) => (
            <div key={k} className="bg-slate-950/40 border border-slate-800 rounded-lg px-2 py-1.5 text-center">
              <span className="text-[9px] text-slate-500 block capitalize">{k}</span>
              <span className="text-xs font-black text-white">{player.attributes[k]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
