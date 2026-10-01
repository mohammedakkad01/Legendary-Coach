/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Fast, mobile-friendly in-match tactics panel — Formation, Mentality,
 * Tempo, Pressing, Width, and an explicit Apply button. Applies to the
 * engine's own tactics copy for this match only (never club.footballTactics)
 * and takes effect from the next simulated minute; never pauses the match.
 */

import React, { useEffect, useState } from 'react';
import { Sliders, X, Check } from 'lucide-react';
import type { FootballFormation, FootballTactics, MatchMentality, PressingStyle, TeamTempo } from '../../types/game';
import { FORMATION_LIST, MENTALITY_TEXT, PRESSING_TEXT, TEMPO_TEXT, WIDTH_TEXT, LIVE_TACTICS_TEXT, pick } from '../../i18n/liveTactics';

export interface LiveTacticsPanelProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly tactics: FootballTactics;
  readonly isAr: boolean;
  readonly onApply: (changes: Partial<FootballTactics>) => void;
}

const MENTALITIES: MatchMentality[] = ['ultra_defensive', 'defensive', 'balanced', 'attacking', 'all_out_attack'];
const PRESSINGS: PressingStyle[] = ['low_block', 'mid_press', 'high_press', 'gegenpress'];
const TEMPOS: TeamTempo[] = ['slow_patient', 'normal', 'fast_electric'];
const WIDTHS: FootballTactics['width'][] = ['narrow', 'standard', 'wide'];

function Segmented<T extends string>({
  options, value, onChange, labels, isAr,
}: {
  options: readonly T[]; value: T; onChange: (v: T) => void; labels: Record<T, { ar: string; en: string }>; isAr: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${
            opt === value
              ? 'bg-sky-500 border-sky-400 text-white shadow'
              : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-600'
          }`}
        >
          {pick(labels[opt], isAr)}
        </button>
      ))}
    </div>
  );
}

export const LiveTacticsPanel: React.FC<LiveTacticsPanelProps> = ({ isOpen, onClose, tactics, isAr, onApply }) => {
  const [draft, setDraft] = useState(tactics);
  const [justApplied, setJustApplied] = useState(false);

  // Re-sync the draft whenever the panel (re)opens or the live tactics actually change elsewhere.
  useEffect(() => {
    if (isOpen) setDraft(tactics);
  }, [isOpen, tactics]);

  if (!isOpen) return null;
  const T = LIVE_TACTICS_TEXT;

  const changes: Partial<FootballTactics> = {};
  if (draft.formation !== tactics.formation) changes.formation = draft.formation;
  if (draft.mentality !== tactics.mentality) changes.mentality = draft.mentality;
  if (draft.tempo !== tactics.tempo) changes.tempo = draft.tempo;
  if (draft.pressing !== tactics.pressing) changes.pressing = draft.pressing;
  if (draft.width !== tactics.width) changes.width = draft.width;
  const hasChanges = Object.keys(changes).length > 0;

  const handleApply = () => {
    if (!hasChanges) return;
    onApply(changes);
    setJustApplied(true);
    setTimeout(() => setJustApplied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/80 backdrop-blur-sm" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={pick(T.panelTitle, isAr)}
        className="w-full sm:w-[26rem] max-h-[85vh] overflow-y-auto bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl p-4 space-y-4 shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black font-heading text-white flex items-center gap-1.5">
            <Sliders className="w-4 h-4 text-sky-400" /> {pick(T.panelTitle, isAr)}
          </h3>
          <button onClick={onClose} aria-label={pick(T.close, isAr)} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-1.5">
          <span className="text-[11px] font-bold text-slate-400">{pick(T.formation, isAr)}</span>
          <div className="flex flex-wrap gap-1.5">
            {FORMATION_LIST.map((f: FootballFormation) => (
              <button
                key={f}
                type="button"
                onClick={() => setDraft((d) => ({ ...d, formation: f }))}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-black border transition-all ${
                  f === draft.formation ? 'bg-amber-500 border-amber-400 text-slate-950' : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-600'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <span className="text-[11px] font-bold text-slate-400">{pick(T.mentality, isAr)}</span>
          <Segmented options={MENTALITIES} value={draft.mentality} onChange={(v) => setDraft((d) => ({ ...d, mentality: v }))} labels={MENTALITY_TEXT} isAr={isAr} />
        </div>

        <div className="space-y-1.5">
          <span className="text-[11px] font-bold text-slate-400">{pick(T.pressing, isAr)}</span>
          <Segmented options={PRESSINGS} value={draft.pressing} onChange={(v) => setDraft((d) => ({ ...d, pressing: v }))} labels={PRESSING_TEXT} isAr={isAr} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-slate-400">{pick(T.tempo, isAr)}</span>
            <Segmented options={TEMPOS} value={draft.tempo} onChange={(v) => setDraft((d) => ({ ...d, tempo: v }))} labels={TEMPO_TEXT} isAr={isAr} />
          </div>
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-slate-400">{pick(T.width, isAr)}</span>
            <Segmented options={WIDTHS} value={draft.width} onChange={(v) => setDraft((d) => ({ ...d, width: v }))} labels={WIDTH_TEXT} isAr={isAr} />
          </div>
        </div>

        <button
          type="button"
          onClick={handleApply}
          disabled={!hasChanges}
          className={`w-full py-2.5 rounded-xl font-black text-sm flex items-center justify-center gap-1.5 transition-all ${
            !hasChanges
              ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
              : justApplied
                ? 'bg-emerald-500 text-slate-950'
                : 'bg-sky-500 hover:bg-sky-400 text-white shadow-lg'
          }`}
        >
          {justApplied ? <Check className="w-4 h-4" /> : null}
          {justApplied ? pick(T.applied, isAr) : pick(T.apply, isAr)}
        </button>
      </div>
    </div>
  );
};
