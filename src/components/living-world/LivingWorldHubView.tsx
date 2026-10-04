/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * LivingWorldHubView — Master Unified View for Living World Phase F.
 * Tabs: News Feed, Press Conference, Club History, Legends, Manager Career, Story Arcs.
 */

import React, { useState } from 'react';
import { useGameStore } from '../../state/useGameStore';
import { NewsFeedView } from './NewsFeedView';
import { PressConferenceView } from './PressConferenceView';
import { ClubHistoryView } from './ClubHistoryView';
import { ClubLegendsView } from './ClubLegendsView';
import { ManagerCareerView } from './ManagerCareerView';
import { StoryArcsView } from './StoryArcsView';
import { 
  Newspaper, 
  Mic, 
  History, 
  Crown, 
  UserCheck, 
  BookOpen,
  Sparkles,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';

export type LivingWorldTab = 'news' | 'press' | 'history' | 'legends' | 'career' | 'stories';

interface LivingWorldHubViewProps {
  initialTab?: LivingWorldTab;
}

export const LivingWorldHubView: React.FC<LivingWorldHubViewProps> = ({ initialTab = 'news' }) => {
  const { language, livingWorld, aiNarrationEnabled, setAiNarrationEnabled } = useGameStore();
  const isAr = language === 'ar';
  const [activeTab, setActiveTab] = useState<LivingWorldTab>(initialTab);

  const tabs: { id: LivingWorldTab; labelAr: string; labelEn: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'news', labelAr: 'شريط الأخبار', labelEn: 'News Feed', icon: Newspaper },
    { id: 'press', labelAr: 'المؤتمر الصحفي', labelEn: 'Press Room', icon: Mic },
    { id: 'history', labelAr: 'أرشيف وتاريخ النادي', labelEn: 'Club History', icon: History },
    { id: 'legends', labelAr: 'قاعة الأساطير', labelEn: 'Club Legends', icon: Crown },
    { id: 'career', labelAr: 'المسيرة التدريبية', labelEn: 'Manager Career', icon: UserCheck },
    { id: 'stories', labelAr: 'المسارات والقصص', labelEn: 'Story Arcs', icon: BookOpen },
  ];

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-6 space-y-6" id="living_world_hub">
      {/* Sub-navigation & Settings Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/90 p-2 sm:p-3 rounded-2xl border border-slate-800 shadow-md">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs sm:text-sm font-black whitespace-nowrap transition cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{isAr ? tab.labelAr : tab.labelEn}</span>
              </button>
            );
          })}
        </div>

        {/* AI Narration Kill Switch Toggle */}
        <div className="flex items-center justify-end gap-2 px-2 py-1 text-xs text-slate-400 border-t sm:border-t-0 sm:border-l sm:border-slate-800 pt-2 sm:pt-0">
          <span className="flex items-center gap-1 text-[11px] font-bold">
            <Sparkles className="w-3.5 h-3.5 text-sky-400" />
            {isAr ? 'السرد بالذكاء الاصطناعي:' : 'AI Narration:'}
          </span>
          <button
            onClick={() => setAiNarrationEnabled(!aiNarrationEnabled)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-black transition cursor-pointer ${
              aiNarrationEnabled
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                : 'bg-slate-800 text-slate-400 border border-slate-700'
            }`}
          >
            {aiNarrationEnabled ? (
              <>
                <ToggleRight className="w-4 h-4 text-sky-400" />
                <span>{isAr ? 'مفعّل' : 'ON'}</span>
              </>
            ) : (
              <>
                <ToggleLeft className="w-4 h-4 text-slate-500" />
                <span>{isAr ? 'معطّل' : 'OFF'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Render Active View */}
      {activeTab === 'news' && <NewsFeedView isAr={isAr} />}
      {activeTab === 'press' && <PressConferenceView isAr={isAr} />}
      {activeTab === 'history' && <ClubHistoryView isAr={isAr} />}
      {activeTab === 'legends' && <ClubLegendsView isAr={isAr} />}
      {activeTab === 'career' && <ManagerCareerView isAr={isAr} />}
      {activeTab === 'stories' && <StoryArcsView isAr={isAr} />}
    </div>
  );
};
