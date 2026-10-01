/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Best Tactics preview (bottom sheet on mobile, centered card on desktop).
 * Read-only view of a recommendation; the ONLY way it changes the club is the
 * Apply button, which calls the store's applyBestTactics via onApply.
 * Escape, the browser/hardware back button, the backdrop and Cancel close it.
 */

import React, { useEffect, useMemo, useRef } from 'react';
import { X, RefreshCw, ArrowLeftRight } from 'lucide-react';
import type { Club, Player } from '../../types/game';
import type { ApplyBestTacticsError, BestTacticsError, BestTacticsRecommendation } from '../../domain/tactics/bestTactics';
import { getFormation } from '../../domain/squad/formations';
import { computeEffectiveRating, isOutOfPosition } from '../../domain/squad/positionSuitability';
import { PositionBadge } from '../squad/PositionBadge';
import { BEST_TACTICS_TEXT, PASSING_TEXT, bestTacticsErrorText, bestTacticsLabel, reasonText } from '../../i18n/bestTactics';
import { MENTALITY_TEXT, PRESSING_TEXT, TEMPO_TEXT, WIDTH_TEXT, pick } from '../../i18n/liveTactics';

export interface BestTacticsPreviewSheetProps {
  readonly isAr: boolean;
  readonly club: Pick<Club, 'footballSquad' | 'footballLineup' | 'footballTactics'>;
  readonly recommendation: BestTacticsRecommendation;
  readonly error: BestTacticsError | ApplyBestTacticsError | null;
  readonly isStale: boolean;
  readonly busy: boolean;
  readonly onApply: () => void;
  readonly onClose: () => void;
  readonly onRecompute: () => void;
}

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
const HISTORY_MARKER = 'bestTacticsSheet';
let pendingHistoryBack: number | null = null;

const Metric: React.FC<{ label: string; value: React.ReactNode; accent?: string }> = ({ label, value, accent = 'text-white' }) => (
  <div className="bg-slate-950/60 border border-slate-800 rounded-xl px-2 py-2 text-center min-w-0">
    <span className="text-[10px] text-slate-400 block truncate">{label}</span>
    <span className={`text-base font-black ${accent}`}>{value}</span>
  </div>
);

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h4 className="text-xs font-black text-slate-300 border-b border-slate-800 pb-1">{children}</h4>
);

export const BestTacticsPreviewSheet: React.FC<BestTacticsPreviewSheetProps> = ({
  isAr, club, recommendation: rec, error, isStale, busy, onApply, onClose, onRecompute,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const byId = useMemo(() => new Map(club.footballSquad.map((p) => [p.id, p] as const)), [club.footballSquad]);
  const names = useMemo(
    () => new Map(club.footballSquad.map((p) => [p.id, isAr ? p.name : p.nameEn] as const)),
    [club.footballSquad, isAr],
  );
  const nameOf = (id: string | undefined): string => (id ? names.get(id) ?? id : bestTacticsLabel('emptySlot', isAr));

  // Focus trap + Escape; focus returns to the trigger on close.
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const node = dialogRef.current;
    node?.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab' || !node) return;
      const items = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previouslyFocused?.focus?.();
    };
  }, []);

  // Back button closes the sheet: one history entry while open, popped again if closed another way.
  // The pop is deferred so a StrictMode unmount/remount keeps the same entry instead of closing itself.
  useEffect(() => {
    if (pendingHistoryBack !== null) {
      window.clearTimeout(pendingHistoryBack);
      pendingHistoryBack = null;
    } else {
      window.history.pushState({ [HISTORY_MARKER]: true }, '');
    }
    const onPop = () => onCloseRef.current();
    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
      pendingHistoryBack = window.setTimeout(() => {
        pendingHistoryBack = null;
        const state = window.history.state as Record<string, unknown> | null;
        if (state && state[HISTORY_MARKER]) window.history.back();
      }, 0);
    };
  }, []);

  const formation = getFormation(rec.formation);
  const current = club.footballTactics;
  const changes = rec.lineup
    .filter((l) => club.footballLineup[l.slotIndex] !== l.playerId)
    .map((l) => ({ slot: l.assignedPosition, inId: l.playerId, outId: club.footballLineup[l.slotIndex] || undefined }));
  const formationChanged = current.formation !== rec.formation;

  const settings: { label: string; value: string; changed: boolean; ltr?: boolean }[] = [
    { label: bestTacticsLabel('formation', isAr), value: rec.formation, changed: formationChanged, ltr: true },
    { label: bestTacticsLabel('mentality', isAr), value: pick(MENTALITY_TEXT[rec.tactics.mentality], isAr), changed: rec.tactics.mentality !== current.mentality },
    { label: bestTacticsLabel('pressing', isAr), value: pick(PRESSING_TEXT[rec.tactics.pressing], isAr), changed: rec.tactics.pressing !== current.pressing },
    { label: bestTacticsLabel('passing', isAr), value: pick(PASSING_TEXT[rec.tactics.passing], isAr), changed: rec.tactics.passing !== current.passing },
    { label: bestTacticsLabel('tempo', isAr), value: pick(TEMPO_TEXT[rec.tactics.tempo], isAr), changed: rec.tactics.tempo !== current.tempo },
    { label: bestTacticsLabel('width', isAr), value: pick(WIDTH_TEXT[rec.tactics.width], isAr), changed: rec.tactics.width !== current.width },
    {
      label: bestTacticsLabel('offsideTrap', isAr),
      value: bestTacticsLabel(rec.tactics.offsideTrap ? 'on' : 'off', isAr),
      changed: rec.tactics.offsideTrap !== current.offsideTrap,
    },
  ];

  const showStale = isStale || error?.code === 'UNAVAILABLE_PLAYER';
  const applyClass = rec.alreadyOptimal
    ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
    : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 shadow-lg shadow-emerald-500/20';
  const cancelClass = rec.alreadyOptimal
    ? 'bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white'
    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="best-tactics-title"
        dir={isAr ? 'rtl' : 'ltr'}
        className="w-full sm:max-w-lg max-h-[90vh] flex flex-col bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl"
      >
        <div className="flex items-center justify-between gap-2 p-4 pb-2">
          <h3 id="best-tactics-title" className="text-base font-black font-heading text-white truncate">
            {bestTacticsLabel('title', isAr)} · <bdi dir="ltr" className="text-amber-400">{rec.formation}</bdi>
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label={bestTacticsLabel('close', isAr)}
            className="w-8 h-8 shrink-0 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <div className="overflow-y-auto px-4 pb-3 space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <Metric label={bestTacticsLabel('score', isAr)} value={rec.score} accent="text-amber-400" />
            <Metric label={bestTacticsLabel('currentScore', isAr)} value={rec.currentScore ?? '—'} />
            <Metric label={bestTacticsLabel('expectedPoints', isAr)} value={rec.expectedPoints.toFixed(2)} accent="text-emerald-400" />
          </div>

          {rec.alreadyOptimal && (
            <p className="text-xs text-sky-200 bg-sky-950/50 border border-sky-500/30 rounded-xl p-2.5">{bestTacticsLabel('noChanges', isAr)}</p>
          )}

          {showStale && (
            <div role="alert" className="flex items-center justify-between gap-2 text-xs text-amber-200 bg-amber-950/60 border border-amber-500/40 rounded-xl p-2.5">
              <span>{bestTacticsLabel('staleWarning', isAr)}</span>
              <button
                type="button"
                onClick={onRecompute}
                disabled={busy}
                className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black disabled:opacity-60"
              >
                <RefreshCw className={`w-3 h-3 ${busy ? 'animate-spin' : ''}`} aria-hidden="true" />
                {bestTacticsLabel('recompute', isAr)}
              </button>
            </div>
          )}

          {error && error.code !== 'UNAVAILABLE_PLAYER' && (
            <p role="alert" className="text-xs text-rose-200 bg-rose-950/60 border border-rose-500/40 rounded-xl p-2.5">
              {bestTacticsErrorText(error, isAr)}
            </p>
          )}

          <section aria-label={bestTacticsLabel('proposedXi', isAr)}>
            <div
              className="relative w-full aspect-[4/5] max-h-[340px] mx-auto bg-emerald-950 rounded-2xl overflow-hidden border-2 border-emerald-900/60"
              style={{ backgroundImage: 'radial-gradient(ellipse at center, rgba(6, 78, 59, 0.95), rgba(2, 44, 34, 1))' }}
            >
              <div className="absolute inset-3 border border-white/20 rounded-lg pointer-events-none">
                <div className="absolute top-1/2 left-0 right-0 h-px bg-white/20" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 border border-white/20 rounded-full" />
              </div>
              {rec.lineup.map((l) => {
                const slot = formation.slots[l.slotIndex];
                const player: Player | undefined = byId.get(l.playerId);
                if (!slot || !player) return null;
                const breakdown = computeEffectiveRating(player, slot.label);
                const changed = club.footballLineup[l.slotIndex] !== l.playerId;
                return (
                  <div
                    key={l.slotIndex}
                    className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
                    style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
                  >
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center font-heading font-black text-xs shadow-xl border-2 ${
                        changed ? 'bg-amber-400 text-slate-950 border-amber-200' : 'bg-gradient-to-br from-sky-500 to-indigo-700 text-white border-white/80'
                      }`}
                    >
                      {breakdown.effective}
                    </div>
                    <div className="mt-0.5 px-1 py-0.5 rounded text-[9px] font-bold leading-tight whitespace-nowrap max-w-[72px] truncate bg-slate-950/85 text-white border border-slate-700/60">
                      {names.get(player.id)}
                    </div>
                    {isOutOfPosition(breakdown.suitability.level) && (
                      <PositionBadge level={breakdown.suitability.level} isAr={isAr} compact />
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {changes.length > 0 && (
            <section className="space-y-1.5">
              <SectionTitle>{bestTacticsLabel('changes', isAr)}</SectionTitle>
              <ul className="space-y-1">
                {changes.map((c) => (
                  <li key={`${c.slot}-${c.inId}`} className="flex items-center gap-2 text-xs bg-slate-950/50 border border-slate-800 rounded-lg px-2 py-1.5">
                    <span className="shrink-0 w-10 text-center text-[10px] font-black text-sky-300 bg-sky-500/10 rounded px-1 py-0.5">{c.slot}</span>
                    <span className="font-bold text-emerald-300 truncate">{nameOf(c.inId)}</span>
                    <ArrowLeftRight className="w-3 h-3 shrink-0 text-slate-500" aria-hidden="true" />
                    <span className="text-slate-400 truncate">
                      {bestTacticsLabel('replaces', isAr)} {nameOf(c.outId)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="space-y-1.5">
            <SectionTitle>{bestTacticsLabel('tacticalSettings', isAr)}</SectionTitle>
            <dl className="grid grid-cols-2 gap-1.5 text-xs">
              {settings.map((s) => (
                <div key={s.label} className={`flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 border ${s.changed ? 'border-amber-500/40 bg-amber-950/30' : 'border-slate-800 bg-slate-950/50'}`}>
                  <dt className="text-slate-400 truncate">{s.label}</dt>
                  <dd dir={s.ltr ? 'ltr' : undefined} className={`font-black truncate ${s.changed ? 'text-amber-300' : 'text-white'}`}>{s.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          {rec.substitutes.length > 0 && (
            <section className="space-y-1.5">
              <SectionTitle>{bestTacticsLabel('substitutes', isAr)} ({rec.substitutes.length})</SectionTitle>
              <div className="flex flex-wrap gap-1.5">
                {rec.substitutes.map((id) => (
                  <span key={id} className="text-[11px] font-bold text-slate-200 bg-slate-800 rounded-lg px-2 py-1">
                    {nameOf(id)} <span className="text-slate-500">{byId.get(id)?.position}</span>
                  </span>
                ))}
              </div>
            </section>
          )}

          {rec.alternatives.length > 0 && (
            <section className="space-y-1.5">
              <SectionTitle>{bestTacticsLabel('alternatives', isAr)}</SectionTitle>
              <div className="flex flex-wrap gap-1.5">
                {rec.alternatives.map((a) => (
                  <span key={a.formation} className="text-[11px] font-bold text-slate-300 bg-slate-950/60 border border-slate-800 rounded-lg px-2 py-1">
                    <bdi dir="ltr">{a.formation}</bdi> · <span className="text-amber-300">{a.score}</span>
                  </span>
                ))}
              </div>
            </section>
          )}

          <section className="space-y-1.5">
            <SectionTitle>{bestTacticsLabel('whyTitle', isAr)}</SectionTitle>
            <ul className="space-y-1 list-disc ps-4 text-xs text-slate-300">
              {rec.reasons.map((r, i) => (
                <li key={`${r.code}-${i}`}>{reasonText(r, names, isAr)}</li>
              ))}
            </ul>
          </section>
        </div>

        <div className="grid grid-cols-2 gap-2 p-4 pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            data-autofocus={rec.alreadyOptimal ? true : undefined}
            className={`py-2.5 rounded-xl font-black text-sm ${cancelClass}`}
          >
            {pick(BEST_TACTICS_TEXT.cancel, isAr)}
          </button>
          <button
            type="button"
            onClick={onApply}
            disabled={busy}
            data-autofocus={rec.alreadyOptimal ? undefined : true}
            className={`py-2.5 rounded-xl font-black text-sm disabled:opacity-60 ${applyClass}`}
          >
            {pick(BEST_TACTICS_TEXT.apply, isAr)}
          </button>
        </div>
      </div>
    </div>
  );
};
