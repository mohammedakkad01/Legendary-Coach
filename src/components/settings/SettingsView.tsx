/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Settings hub (header gear entry only — not in primary navigation).
 */

import React, { useState } from 'react';
import { useGameStore } from '../../state/useGameStore';
import { NotificationSettingsPanel } from './NotificationSettingsPanel';
import { AutomationSettingsPanel } from './AutomationSettingsPanel';
import { AiSettingsPanel } from './AiSettingsPanel';
import { Settings, Bell, SlidersHorizontal, Sparkles, ArrowLeft } from 'lucide-react';

type SettingsTab = 'notifications' | 'automation' | 'ai';

export const SettingsView: React.FC = () => {
  const { language, setActiveTab } = useGameStore();
  const isAr = language === 'ar';
  const [tab, setTab] = useState<SettingsTab>('notifications');

  const tabs: {
    id: SettingsTab;
    labelEn: string;
    labelAr: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { id: 'notifications', labelEn: 'Notifications', labelAr: 'الإشعارات', icon: Bell },
    { id: 'automation', labelEn: 'Automation', labelAr: 'الأتمتة', icon: SlidersHorizontal },
    { id: 'ai', labelEn: 'AI', labelAr: 'الذكاء الاصطناعي', icon: Sparkles },
  ];

  return (
    <div className="max-w-3xl mx-auto p-3 sm:p-6 space-y-6" id="settings_view">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setActiveTab('dashboard')}
          className="touch-target flex items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
          aria-label={isAr ? 'العودة للرئيسية' : 'Back to home'}
        >
          <ArrowLeft className={`w-5 h-5 ${isAr ? 'rotate-180' : ''}`} />
        </button>
        <div className="flex items-center gap-2">
          <Settings className="w-6 h-6 text-sky-400" aria-hidden />
          <h1 className="text-lg font-black text-white">{isAr ? 'الإعدادات' : 'Settings'}</h1>
        </div>
      </div>

      <div
        className="flex gap-2 overflow-x-auto pb-1 max-w-full"
        role="tablist"
        aria-label={isAr ? 'أقسام الإعدادات' : 'Settings sections'}
      >
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls={`settings-panel-${t.id}`}
              onClick={() => setTab(t.id)}
              className={`touch-target-row shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap cursor-pointer border ${
                active
                  ? 'bg-sky-600 text-white border-sky-500'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" aria-hidden />
              {isAr ? t.labelAr : t.labelEn}
            </button>
          );
        })}
      </div>

      <div
        id={`settings-panel-${tab}`}
        role="tabpanel"
        className="rounded-3xl border border-slate-800 bg-slate-900/90 p-4 sm:p-6"
      >
        {tab === 'notifications' && <NotificationSettingsPanel isAr={isAr} />}
        {tab === 'automation' && <AutomationSettingsPanel isAr={isAr} />}
        {tab === 'ai' && <AiSettingsPanel isAr={isAr} />}
      </div>
    </div>
  );
};
