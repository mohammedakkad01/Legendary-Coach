/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { assistantLabel } from '../../i18n/assistant';
import { AssistantRecommendationCard } from './AssistantRecommendationCard';
import { useLiveAssistant } from '../../hooks/useLiveAssistant';
import { useGameStore } from '../../state/useGameStore';

export const LiveAssistantStrip: React.FC<{ isAr: boolean }> = ({ isAr }) => {
  const { liveRecommendations, dismissLive } = useLiveAssistant();
  const { club, applyAssistantRecommendation } = useGameStore();
  const [err, setErr] = useState<string | null>(null);

  if (liveRecommendations.length === 0) return null;

  return (
    <div className="px-3 pb-3 space-y-2">
      <h3 className="text-xs font-black text-cyan-300">{assistantLabel('liveTitle', isAr)}</h3>
      {liveRecommendations.slice(-2).map((rec) => (
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
          onIgnore={() => dismissLive(rec)}
        />
      ))}
    </div>
  );
};
