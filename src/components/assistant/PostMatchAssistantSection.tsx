/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { assistantLabel } from '../../i18n/assistant';
import { AssistantRecommendationCard } from './AssistantRecommendationCard';
import { useAssistantRecommendations } from '../../hooks/useAssistantRecommendations';
import { useGameStore } from '../../state/useGameStore';

export const PostMatchAssistantSection: React.FC<{ isAr: boolean }> = ({ isAr }) => {
  const { postMatchRecommendations } = useAssistantRecommendations();
  const { club, applyAssistantRecommendation, dismissAssistantRecommendation, activeMatchRecord } = useGameStore();
  const [err, setErr] = useState<string | null>(null);

  const record = activeMatchRecord;
  const conclusions = record?.analyticsConclusions ?? [];

  if (conclusions.length === 0 && postMatchRecommendations.length === 0) return null;

  return (
    <div className="mt-4 pt-4 border-t border-slate-700 space-y-3">
      <h3 className="text-sm font-black text-cyan-300">{assistantLabel('postMatchTitle', isAr)}</h3>
      {conclusions.map((c) => (
        <p key={c.code} className="text-xs text-slate-300">
          {isAr ? c.sentenceAr : c.sentenceEn}
        </p>
      ))}
      {postMatchRecommendations.map((rec) => (
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
