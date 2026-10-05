/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Dashboard Story Mission Spotlight (quick tiles removed — see unified hub).
 */

import React from 'react';
import { BookOpen, ArrowRight } from 'lucide-react';
import { StoryMission } from '../../types/game';
import type { GameTab } from '../../state/useGameStore';

interface DashboardStoryAndTilesProps {
  isAr: boolean;
  nextMission?: StoryMission;
  completedMissionsCount: number;
  onNavigateTab: (tab: GameTab) => void;
}

export const DashboardStoryAndTiles: React.FC<DashboardStoryAndTilesProps> = ({
  isAr,
  nextMission,
  completedMissionsCount,
  onNavigateTab,
}) => {
  if (!nextMission) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-sky-950/50 via-slate-900 to-sky-950/50 border border-sky-500/40 rounded-3xl p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-sky-400" />
          <h3 className="font-heading font-black text-base text-white">
            {isAr ? 'مهمة القصة النشطة — الفصل الأول' : 'Active Story Mission — Chapter 1'}
          </h3>
        </div>
        <span className="text-xs text-sky-300 font-bold">
          {completedMissionsCount}/10 {isAr ? 'مهام مكتملة' : 'Completed'}
        </span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{nextMission.speakerAvatar}</span>
          <div>
            <h4 className="text-sm font-black text-white">
              {isAr ? nextMission.titleAr : nextMission.titleEn}
            </h4>
            <p className="text-xs text-slate-400 line-clamp-1">
              {isAr ? nextMission.objectiveAr : nextMission.objectiveEn}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onNavigateTab('story')}
          className="touch-target-row px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-black text-xs shadow-md flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
        >
          <span>{isAr ? 'دخول المشهد والقرار' : 'Enter Scene'}</span>
          <ArrowRight className={`w-3.5 h-3.5 ${isAr ? 'rotate-180' : ''}`} />
        </button>
      </div>
    </div>
  );
};
