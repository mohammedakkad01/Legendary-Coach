/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Game Navigation Bar
 * Player-Centric Navigation:
 * Home → Squad → Tactics → Matches → Transfers → Training → Club → League → VIP
 * 
 * Admin/Developer console access is strictly segmented and protected.
 */

import React from 'react';
import { useGameStore, GameTab } from '../state/useGameStore';
import { useFirebase } from '../firebase/FirebaseContext';
import { 
  Home, 
  Users, 
  ShieldAlert, 
  PlayCircle, 
  ArrowLeftRight, 
  Dumbbell, 
  Building2, 
  Trophy, 
  Crown,
  Server,
  Lock
} from 'lucide-react';

interface NavItem {
  id: GameTab;
  labelAr: string;
  labelEn: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number | string;
}

export const Navigation: React.FC = () => {
  const { activeTab, setActiveTab, language, isMatchLive } = useGameStore();
  const { isAdmin } = useFirebase();
  const isAr = language === 'ar';

  // Strict 9 Player Navigation tabs
  const playerNavItems: NavItem[] = [
    { id: 'dashboard', labelAr: 'الرئيسية', labelEn: 'Home', icon: Home },
    { id: 'squad', labelAr: 'التشكيلة', labelEn: 'Squad', icon: Users },
    { id: 'tactics', labelAr: 'التكتيك', labelEn: 'Tactics', icon: ShieldAlert },
    { id: 'match', labelAr: 'المباراة', labelEn: 'Matches', icon: PlayCircle, badge: isMatchLive ? 'حـي' : undefined },
    { id: 'transfers', labelAr: 'الانتقالات', labelEn: 'Transfers', icon: ArrowLeftRight },
    { id: 'training', labelAr: 'التدريب', labelEn: 'Training', icon: Dumbbell },
    { id: 'club', labelAr: 'النادي', labelEn: 'Club', icon: Building2 },
    { id: 'league', labelAr: 'الدوري', labelEn: 'League', icon: Trophy },
    { id: 'vip', labelAr: 'VIP', labelEn: 'VIP', icon: Crown },
  ];

  return (
    <nav 
      role="navigation" 
      aria-label={isAr ? 'قائمة التنقل الرئيسية' : 'Main Navigation'}
      className="bg-slate-900 border-b border-slate-800/80 px-2 sm:px-6 py-1.5 shadow-md"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-start sm:justify-center gap-1.5 overflow-x-auto no-scrollbar py-1">
        
        {/* Core Player Navigation */}
        {playerNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          return (
            <button
              key={item.id}
              id={`nav_btn_${item.id}`}
              onClick={() => setActiveTab(item.id)}
              className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
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

        {/* Admin/Developer Tools Segment (Only rendered for authorized Admins/Devs) */}
        {isAdmin && (
          <>
            <div className="h-5 w-px bg-slate-800 mx-1 shrink-0" aria-hidden="true" />
            
            <button
              id="nav_btn_admin"
              onClick={() => setActiveTab('admin')}
              className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'admin' || activeTab === 'football_api' || activeTab === 'editor'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'text-indigo-400 hover:text-indigo-200 hover:bg-indigo-950/40 border border-indigo-500/30'
              }`}
            >
              <Server className="w-3.5 h-3.5 text-indigo-400" />
              <span>{isAr ? 'أدوات الإدارة' : 'Admin Hub'}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            </button>
          </>
        )}

      </div>
    </nav>
  );
};
