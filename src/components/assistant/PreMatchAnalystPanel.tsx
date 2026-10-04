/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import type { PreMatchAnalysis } from '../../domain/assistant';
import { assistantLabel } from '../../i18n/assistant';
import { reasonSentence } from '../../domain/assistant/copy/deterministicCopy';
import { AssistantRecommendationCard } from './AssistantRecommendationCard';
import { useAssistantRecommendations } from '../../hooks/useAssistantRecommendations';
import { useGameStore } from '../../state/useGameStore';

export const PreMatchAnalystPanel: React.FC<{ isAr: boolean }> = ({ isAr }) => {
  const { preMatchAnalysis, preMatchRecommendations } = useAssistantRecommendations();
  const { club, applyAssistantRecommendation, dismissAssistantRecommendation } = useGameStore();
  const [err, setErr] = useState<string | null>(null);

  if (!preMatchAnalysis) return null;

  return (
    <div className="mt-6 space-y-3 border-t border-slate-800 pt-4">
      <h3 className="text-sm font-black text-cyan-300">{assistantLabel('preMatchTitle', isAr)}</h3>
      <p className="text-[11px] text-slate-400">
        {assistantLabel('confidence', isAr)}: {preMatchAnalysis.overallConfidence}%
        {preMatchAnalysis.uncertaintyNoteCode && (
          <span className="block text-amber-400/90">{assistantLabel('limitedIntel', isAr)}</span>
        )}
      </p>
      <p className="text-xs text-slate-300">
        {isAr ? 'تشكيلة الخصم:' : 'Opponent formation:'}{' '}
        <span className="text-white font-bold">{preMatchAnalysis.opponentFormation}</span>
      </p>
      {preMatchAnalysis.refereeMode === 'generic' ? (
        <p className="text-[11px] text-slate-400">{assistantLabel('refGeneric', isAr)}</p>
      ) : preMatchAnalysis.refereeProfile ? (
        <p className="text-[11px] text-slate-300">
          {reasonSentence(
            'ref_assigned_strict',
            {
              strictness: preMatchAnalysis.refereeProfile.strictness,
              cards: preMatchAnalysis.refereeProfile.cardTendency,
            },
            isAr,
          )}
        </p>
      ) : null}
      {preMatchAnalysis.strengths.slice(0, 2).map((s) => (
        <p key={s.code} className="text-[11px] text-rose-300/90">
          {reasonSentence(s.code, s.params, isAr)}
        </p>
      ))}
      {preMatchAnalysis.weaknesses.slice(0, 2).map((w) => (
        <p key={w.code} className="text-[11px] text-emerald-300/90">
          {reasonSentence(w.code, w.params, isAr)}
        </p>
      ))}
      {preMatchRecommendations.map((rec) => (
        <AssistantRecommendationCard
          key={rec.id}
          isAr={isAr}
          recommendation={rec}
          clubTactics={club.footballTactics}
          applyError={err}
          onApply={() => {
            setErr(null);
            const res = applyAssistantRecommendation(rec);
            if (!res.ok) setErr(res.error ?? null);
          }}
          onIgnore={() => dismissAssistantRecommendation(rec)}
        />
      ))}
    </div>
  );
};
