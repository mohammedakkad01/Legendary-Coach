/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Top Application Header
 * Displays Club Badge, Liquid Cash, Energy, VIP Tier, Sport Switcher, and Controls.
 */

import React, { useState } from 'react';
import { useGameStore } from '../state/useGameStore';
import { useFirebase } from '../firebase/FirebaseContext';
import { CloudSyncModal } from './CloudSyncModal';
import { VIP_LEVELS } from '../data/vipData';
import { 
  Trophy, 
  Coins, 
  Zap, 
  Volume2, 
  VolumeX, 
  Globe, 
  Crown,
  Dumbbell,
  Cloud,
  UserCheck,
  Gem,
  Sparkles,
  Swords,
  Database
} from 'lucide-react';

export const Header: React.FC = () => {
  const { 
    club, 
    energy, 
    vipPoints, 
    currentSport, 
    setSport, 
    language, 
    setLanguage, 
    soundEnabled, 
    toggleSound,
    setActiveTab,
    setClubSelectionModalOpen,
    dailyMissions,
    setDailyMissionsModalOpen,
    startTacticalDuel
  } = useGameStore();

  const { user, isOnline, setAuthModalOpen } = useFirebase();
  const [showCloudModal, setShowCloudModal] = useState(false);

  const claimableMissionsCount = (dailyMissions || []).filter(m => m.current >= m.target && !m.isClaimed).length;

  // Find VIP Tier
  let currentTier = VIP_LEVELS[0];
  for (const tier of VIP_LEVELS) {
    if (vipPoints >= tier.pointsRequired) {
      currentTier = tier;
    }
  }

  const isAr = language === 'ar';

  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 px-3 sm:px-6 py-2.5">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2 sm:gap-4">
        
        {/* Club Brand */}
        <div className="flex items-center gap-2">
          <div 
            onClick={() => setActiveTab('dashboard')}
            className="flex items-center gap-2.5 cursor-pointer group"
            id="header_club_brand"
          >
            <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center p-1.5 shadow-lg shadow-sky-500/10 group-hover:scale-105 transition-transform overflow-hidden">
              {club.logoUrl ? (
                <img 
                  src={club.logoUrl} 
                  alt={club.name} 
                  className="w-full h-full object-contain" 
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <span className="text-xl">{club.logoBadge || '🛡️'}</span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-heading font-black text-base sm:text-lg text-white leading-tight">
                  {isAr ? club.name : club.nameEn}
                </h1>
                <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                  {club.divisionName}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {isAr ? 'المدرب الأسطورة' : 'The Legendary Coach'}
              </p>
            </div>
          </div>

          {/* Quick Select / Change League & Club */}
          <button
            onClick={() => setClubSelectionModalOpen(true)}
            id="header_change_club_btn"
            title={isAr ? 'اختيار الدوري والنادي' : 'Choose League & Club'}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-[11px] font-bold text-amber-300 border border-slate-700 hover:border-amber-400/50 transition-all shadow-sm"
          >
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline">{isAr ? 'الدوري والنادي' : 'League & Club'}</span>
          </button>
        </div>

        {/* Multi-sport Toggle */}
        <div className="flex items-center bg-slate-950/80 p-1 rounded-xl border border-slate-800 text-xs font-bold shadow-inner">
          <button
            id="btn_sport_football"
            onClick={() => setSport('football')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              currentSport === 'football' 
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>⚽</span>
            <span className="hidden sm:inline">{isAr ? 'كرة القدم' : 'Football'}</span>
          </button>
          <button
            id="btn_sport_basketball"
            onClick={() => setSport('basketball')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              currentSport === 'basketball' 
                ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-md' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>🏀</span>
            <span className="hidden sm:inline">{isAr ? 'كرة السلة' : 'Basketball'}</span>
          </button>
        </div>

        {/* Vital Currencies & VIP Bar */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          
          {/* Diamonds 💎 */}
          <div 
            onClick={() => setAuthModalOpen(true)}
            className="flex items-center gap-1.5 bg-fuchsia-950/50 border border-fuchsia-500/40 hover:border-fuchsia-400 px-2.5 py-1 rounded-lg text-xs font-bold text-fuchsia-300 cursor-pointer shadow-sm transition-all"
            id="header_diamonds_counter"
            title={isAr ? 'رصيد الجواهر' : 'Diamonds Balance'}
          >
            <Gem className="w-3.5 h-3.5 text-fuchsia-400 animate-pulse" />
            <span>{club.finances.diamonds || 0}</span>
          </div>

          {/* Coins */}
          <div className="flex items-center gap-1.5 bg-amber-950/40 border border-amber-500/30 px-2.5 py-1 rounded-lg text-xs font-bold text-amber-300">
            <Coins className="w-3.5 h-3.5 text-amber-400" />
            <span>{club.finances.coins.toLocaleString()}</span>
          </div>

          {/* 300 GEMS FREE LOGIN REWARD BUTTON (If not logged in) */}
          {!user && (
            <button
              id="header_claim_bonus_btn"
              onClick={() => setAuthModalOpen(true)}
              className="flex items-center gap-1 bg-gradient-to-r from-fuchsia-600 via-pink-600 to-amber-500 hover:from-fuchsia-500 hover:to-amber-400 text-white px-2.5 py-1 rounded-lg text-xs font-black shadow-lg shadow-fuchsia-600/30 animate-pulse transition-all"
            >
              <Sparkles className="w-3.5 h-3.5 text-yellow-200" />
              <span className="hidden sm:inline">{isAr ? '🎁 300 جوهرة مجاناً' : '🎁 Free 300 Gems'}</span>
              <span className="sm:hidden">300 💎</span>
            </button>
          )}

          {/* Training Points */}
          <div className="hidden sm:flex items-center gap-1.5 bg-emerald-950/40 border border-emerald-500/30 px-2.5 py-1 rounded-lg text-xs font-bold text-emerald-300">
            <Dumbbell className="w-3.5 h-3.5 text-emerald-400" />
            <span>{club.finances.trainingPoints} TP</span>
          </div>

          {/* Energy */}
          <div className="flex items-center gap-1.5 bg-cyan-950/40 border border-cyan-500/30 px-2.5 py-1 rounded-lg text-xs font-bold text-cyan-300">
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            <span>{energy}/100</span>
          </div>

          {/* Daily Missions Button with Notification Badge */}
          <button
            id="header_daily_missions_btn"
            onClick={() => setDailyMissionsModalOpen(true)}
            className="relative flex items-center gap-1.5 bg-neutral-800/90 hover:bg-neutral-700 border border-amber-500/30 hover:border-amber-400 px-2.5 py-1 rounded-lg text-xs font-bold text-amber-300 transition-all active:scale-95"
            title={isAr ? 'المهام اليومية وجاهزية الفريق' : 'Daily Missions & Squad Readiness'}
          >
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">{isAr ? 'المهام اليومية' : 'Daily Tasks'}</span>
            {claimableMissionsCount > 0 && (
              <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full bg-red-500 text-white text-[10px] font-black animate-bounce shadow-md">
                {claimableMissionsCount}
              </span>
            )}
          </button>

          {/* Tactical Duel (صانع المعارك) Button */}
          <button
            id="header_tactical_duel_btn"
            onClick={() => startTacticalDuel('tactical')}
            className="flex items-center gap-1.5 bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-600 hover:to-indigo-600 text-white px-2.5 py-1 rounded-lg text-xs font-black shadow-md shadow-purple-900/40 transition-all active:scale-95"
            title={isAr ? 'صانع المعارك: مواجهة تكتيكية متزامنة 1 ضد 1' : 'Battle Maker: 1v1 Simultaneous Tactical Clash'}
          >
            <Swords className="w-3.5 h-3.5 text-purple-200" />
            <span className="hidden md:inline">{isAr ? 'صانع المعارك (1v1)' : 'Battle Maker (1v1)'}</span>
            <span className="md:hidden">1v1 ⚔️</span>
          </button>

          {/* VIP Badge */}
          <button 
            id="header_vip_btn"
            onClick={() => setActiveTab('vip')}
            className="flex items-center gap-1 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-400/40 hover:border-amber-400 px-2.5 py-1 rounded-lg text-xs font-bold text-amber-300 transition-colors"
          >
            <Crown className="w-3.5 h-3.5 text-amber-400" />
            <span>VIP {currentTier.level}</span>
          </button>

          {/* API-Football Sync Quick Access */}
          <button
            id="header_api_sync_btn"
            onClick={() => setActiveTab('football_api')}
            className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-950/60 border border-indigo-500/40 text-indigo-300 hover:border-indigo-400 hover:text-white transition-colors"
            title={isAr ? 'لوحة تحكم كوتا ومزامنة API-Sports' : 'API-Sports Quota & Sync Dashboard'}
          >
            <Database className="w-3.5 h-3.5 text-indigo-400" />
            <span>{isAr ? 'كوتا API' : 'API Quota'}</span>
          </button>

          {/* Firebase Cloud Sync / Profile Button */}
          <button
            id="btn_cloud_sync"
            onClick={() => setShowCloudModal(true)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all border ${
              user 
                ? 'bg-sky-950/60 border-sky-500/40 text-sky-300 hover:border-sky-400' 
                : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white hover:border-slate-600'
            }`}
          >
            {user ? (
              <>
                <UserCheck className="w-3.5 h-3.5 text-sky-400" />
                <span className="hidden sm:inline max-w-[90px] truncate">{user.displayName?.split(' ')[0] || 'كابتن'}</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </>
            ) : (
              <>
                <Cloud className="w-3.5 h-3.5 text-sky-400" />
                <span>{isAr ? 'تسجيل الدخول' : 'Sign In'}</span>
              </>
            )}
          </button>

          {/* Sound Toggle */}
          <button
            id="btn_sound_toggle"
            onClick={toggleSound}
            aria-label="Toggle Sound Effects"
            className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>

          {/* Language Toggle */}
          <button
            id="btn_lang_toggle"
            onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{language === 'ar' ? 'EN' : 'عربي'}</span>
          </button>
        </div>

      </div>

      {/* Cloud Sync & Firebase Modal */}
      <CloudSyncModal 
        isOpen={showCloudModal} 
        onClose={() => setShowCloudModal(false)} 
      />
    </header>
  );
};
