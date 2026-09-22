/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Game Navigation Bar
 * Responsive bottom bar on mobile & top scrolling tabs on desktop.
 */

import React from 'react';
import { useGameStore, GameTab } from '../state/useGameStore';
import { 
  Home, 
  Users, 
  ShieldAlert, 
  PlayCircle, 
  BookOpen, 
  Dumbbell, 
  ArrowLeftRight, 
  Building2, 
  Trophy, 
  Crown,
  Database,
  Globe
} from 'lucide-react';

interface NavItem {
  id: GameTab;
  labelAr: string;
  labelEn: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number | string;
}

export const Navigation: React.FC = () => {
  const { activeTab, setActiveTab, language, storyMissions, isMatchLive } = useGameStore();
  const isAr = language === 'ar';

  const pendingMissionsCount = storyMissions.filter(m => !m.isCompleted).length;

  const navItems: NavItem[] = [
    { id: 'dashboard', labelAr: 'الرئيسية', labelEn: 'Hub', icon: Home },
    { id: 'scout', labelAr: 'كشاف النجوم', labelEn: 'World Scout', icon: Globe, badge: '🌍' },
    { id: 'tactics', labelAr: 'التكتيك', labelEn: 'Tactics', icon: ShieldAlert },
    { id: 'match', labelAr: 'المباراة', labelEn: 'Match', icon: PlayCircle, badge: isMatchLive ? 'حـي' : undefined },
    { id: 'story', labelAr: 'القصة', labelEn: 'Story', icon: BookOpen, badge: pendingMissionsCount > 0 ? pendingMissionsCount : undefined },
    { id: 'transfers', labelAr: 'الانتقالات', labelEn: 'Transfers', icon: ArrowLeftRight },
    { id: 'training', labelAr: 'التدريب', labelEn: 'Training', icon: Dumbbell },
    { id: 'club', labelAr: 'المرافق', labelEn: 'Facilities', icon: Building2 },
    { id: 'league', labelAr: 'الدوري', labelEn: 'League', icon: Trophy },
    { id: 'football_api', labelAr: 'مزامنة API', labelEn: 'API Sync', icon: Database, badge: '⚡' },
    { id: 'vip', labelAr: 'الـ VIP', labelEn: 'VIP', icon: Crown },
    { id: 'editor', labelAr: 'الحزم', labelEn: 'Packs', icon: Building2 },
  ];

  return (
    <nav className="bg-slate-900 border-b border-slate-800/80 px-2 sm:px-6 py-1.5 shadow-md">
      <div className="max-w-7xl mx-auto flex items-center justify-start sm:justify-center gap-1.5 overflow-x-auto no-scrollbar py-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          return (
            <button
              key={item.id}
              id={`nav_btn_${item.id}`}
              onClick={() => setActiveTab(item.id)}
              className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span>{isAr ? item.labelAr : item.labelEn}</span>

              {item.badge !== undefined && (
                <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-black bg-amber-500 text-slate-950 animate-pulse">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
