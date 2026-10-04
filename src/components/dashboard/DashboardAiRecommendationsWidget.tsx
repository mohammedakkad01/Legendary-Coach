/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Sparkles } from 'lucide-react';
import { assistantLabel } from '../../i18n/assistant';
import { useAssistantRecommendations } from '../../hooks/useAssistantRecommendations';

interface DashboardAiRecommendationsWidgetProps {
  isAr: boolean;
  onOpenTactics: () => void;
}

export const DashboardAiRecommendationsWidget: React.FC<DashboardAiRecommendationsWidgetProps> = ({
  isAr,
  onOpenTactics,
}) => {
  const { dashboardTop } = useAssistantRecommendations();

  if (dashboardTop.length === 0) return null;

  return (
    <div className="bg-slate-900/80 border border-cyan-500/25 rounded-3xl p-4 shadow-lg">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-cyan-400" />
        <h3 className="text-sm font-black text-white">{assistantLabel('assistantTitle', isAr)}</h3>
      </div>
      <ul className="space-y-2">
        {dashboardTop.map((rec) => (
          <li key={rec.id} className="text-xs text-slate-300 flex justify-between gap-2">
            <span className="truncate">{isAr ? rec.titleAr : rec.titleEn}</span>
            <span className="text-amber-300 font-bold shrink-0">{rec.confidence}%</span>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={onOpenTactics}
        className="mt-3 w-full min-h-[44px] rounded-xl bg-cyan-600/90 text-white text-xs font-black"
      >
        {isAr ? 'فتح التكتيك' : 'Open tactics'}
      </button>
    </div>
  );
};
