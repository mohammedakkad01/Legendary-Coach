/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Broadcast VAR graphic. It only displays a review that is already on the
 * match record. It does not pause the clock, and instant/skip matches never
 * wait on it — those paths apply the review inside the engine.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Video } from 'lucide-react';
import type { VARReview } from '../../domain/var/varTypes';
import { pickVar, VAR_TEXT } from '../../i18n/var';

interface VarOverlayProps {
  reviews: readonly VARReview[] | undefined;
  isAr: boolean;
  isMatchLive: boolean;
  matchSpeed: number;
}

export const VarOverlay: React.FC<VarOverlayProps> = ({ reviews, isAr, isMatchLive, matchSpeed }) => {
  const latest = reviews && reviews.length > 0 ? reviews[reviews.length - 1] : undefined;
  const reviewId = latest?.reviewId;
  const [phase, setPhase] = useState<'hidden' | 'checking' | 'decision'>('hidden');
  const speedRef = useRef(matchSpeed);
  speedRef.current = matchSpeed;

  useEffect(() => {
    if (!isMatchLive || !reviewId) {
      setPhase('hidden');
      return;
    }
    setPhase('checking');
    const speed = Math.max(speedRef.current, 1);
    const checkMs = Math.max(280, 900 / speed);
    const holdMs = Math.max(420, 1500 / speed);
    const toDecision = window.setTimeout(() => setPhase('decision'), checkMs);
    const toHide = window.setTimeout(() => setPhase('hidden'), checkMs + holdMs);
    return () => {
      window.clearTimeout(toDecision);
      window.clearTimeout(toHide);
    };
  }, [reviewId, isMatchLive]);

  if (!isMatchLive || !latest || phase === 'hidden') return null;

  const checking = latest.reviewType === 'penalty'
    ? VAR_TEXT.checkingPenalty
    : latest.reviewType === 'red_card'
      ? VAR_TEXT.checkingRed
      : VAR_TEXT.checkingOffside;
  const decision = isAr ? latest.explanationAr : latest.explanationEn;

  return (
    <div
      className="pointer-events-none fixed inset-x-3 bottom-4 z-40 mx-auto w-auto max-w-sm sm:inset-x-auto sm:end-4 sm:w-80"
      data-testid="var-overlay"
      role="status"
      aria-live="polite"
    >
      <div className="rounded-2xl border border-sky-400/50 bg-slate-950/95 px-3 py-2.5 text-start shadow-lg shadow-sky-950/40">
        <div className="mb-1 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wide text-sky-300">
          <Video className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>{pickVar(VAR_TEXT.badge, isAr)}</span>
        </div>
        <p className="text-xs font-bold leading-snug text-white sm:text-sm">
          {phase === 'checking' ? pickVar(checking, isAr) : decision}
        </p>
      </div>
    </div>
  );
};
