/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Dashboard Story Mission Spotlight and Quick Access Tiles.
 */

import React from 'react';
import { BookOpen, ArrowRight } from 'lucide-react';
import { StoryMission, Club } from '../../types/game';

interface DashboardStoryAndTilesProps {
  isAr: boolean;
  nextMission?: StoryMission;
  completedMissionsCount: number;
  club: Club;
  onNavigateTab: (tab: any) => void;
}

export const DashboardStoryAndTiles: React.FC<DashboardStoryAndTilesProps> = ({
  isAr,
  nextMission,
  completedMissionsCount,
  club,
  onNavigateTab,
}) => {
  return (
    <>
      {/* Story Mission Spotlight */}
      {nextMission && (
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
              onClick={() => onNavigateTab('story')}
              className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-black text-xs shadow-md flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <span>{isAr ? 'دخول المشهد والقرار' : 'Enter Scene'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Quick Access Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => onNavigateTab('tactics')}
          className="bg-slate-900 p-4 rounded-2xl border border-slate-800 hover:border-sky-500/50 text-left sm:text-right space-y-1 transition-all group cursor-pointer"
        >
          <div className="w-9 h-9 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center text-lg mb-2 group-hover:scale-110 transition-transform">
            📋
          </div>
          <h4 className="font-heading font-black text-sm text-white">
            {isAr ? 'لوحة التكتيك' : 'Tactics Board'}
          </h4>
          <p className="text-xs text-slate-400">
            {club.footballTactics.formation} • {club.footballTactics.mentality}
          </p>
        </button>

        <button
          onClick={() => onNavigateTab('training')}
          className="bg-slate-900 p-4 rounded-2xl border border-slate-800 hover:border-emerald-500/50 text-left sm:text-right space-y-1 transition-all group cursor-pointer"
        >
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-lg mb-2 group-hover:scale-110 transition-transform">
            ⚡
          </div>
          <h4 className="font-heading font-black text-sm text-white">
            {isAr ? 'التدريب والأكاديمية' : 'Training & Academy'}
          </h4>
          <p className="text-xs text-slate-400">
            {club.finances.trainingPoints} {isAr ? 'نقطة تدريب متاحة' : 'TP available'}
          </p>
        </button>

        <button
          onClick={() => onNavigateTab('transfers')}
          className="bg-slate-900 p-4 rounded-2xl border border-slate-800 hover:border-amber-500/50 text-left sm:text-right space-y-1 transition-all group cursor-pointer"
        >
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-lg mb-2 group-hover:scale-110 transition-transform">
            🔍
          </div>
          <h4 className="font-heading font-black text-sm text-white">
            {isAr ? 'سوق الانتقالات' : 'Transfer Market'}
          </h4>
          <p className="text-xs text-slate-400">
            {isAr ? 'اكتشف صفقات مميزة' : 'Scouted talents'}
          </p>
        </button>

        <button
          onClick={() => onNavigateTab('league')}
          className="bg-slate-900 p-4 rounded-2xl border border-slate-800 hover:border-purple-500/50 text-left sm:text-right space-y-1 transition-all group cursor-pointer"
        >
          <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center text-lg mb-2 group-hover:scale-110 transition-transform">
            🏆
          </div>
          <h4 className="font-heading font-black text-sm text-white">
            {isAr ? 'جدول ترتيب الدوري' : 'League Standings'}
          </h4>
          <p className="text-xs text-slate-400">
            {isAr ? 'المركز الثاني (10 نقاط)' : '2nd place (10 pts)'}
          </p>
        </button>
      </div>
    </>
  );
};
