/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Daily, Weekly & Achievement Missions Modal
 * Real Diamond/Gem rewards (لترقية VIP بدون دفع), live progress tracking, and squad recovery wellness.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  CheckCircle2, 
  Trophy, 
  Target, 
  Shield, 
  Activity, 
  Swords, 
  Zap, 
  Coins, 
  Gem, 
  HeartPulse, 
  Sparkles, 
  Flame, 
  Crown, 
  ArrowLeftRight, 
  UserCheck, 
  Award,
  Calendar,
  Layers
} from 'lucide-react';
import { useGameStore } from '../state/useGameStore';
import { DailyMission } from '../types/game';

export const DailyMissionsModal: React.FC = () => {
  const { 
    isDailyMissionsModalOpen, 
    setDailyMissionsModalOpen, 
    dailyMissions, 
    claimDailyMission, 
    runSquadRecoverySession,
    club,
    language 
  } = useGameStore();

  const isAr = language === 'ar';
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly' | 'achievement'>('daily');

  if (!isDailyMissionsModalOpen) return null;

  // Filter missions by periodicity
  const displayedMissions = dailyMissions.filter(m => (m.periodicity || 'daily') === activeTab);
  const totalInTab = displayedMissions.length;
  const claimedInTab = displayedMissions.filter(m => m.isClaimed).length;
  const tabProgressPercent = totalInTab > 0 ? Math.round((claimedInTab / totalInTab) * 100) : 0;

  // Average squad fatigue
  const squad = club.footballSquad || [];
  const avgFatigue = squad.length > 0 
    ? Math.round(squad.reduce((acc, p) => acc + (p.fatigue || 0), 0) / squad.length)
    : 0;

  const getMissionIcon = (iconName: string) => {
    switch (iconName) {
      case 'Trophy': return <Trophy className="w-5 h-5 text-amber-400" />;
      case 'Target': return <Target className="w-5 h-5 text-red-400" />;
      case 'Shield': return <Shield className="w-5 h-5 text-blue-400" />;
      case 'Activity': return <Activity className="w-5 h-5 text-emerald-400" />;
      case 'Swords': return <Swords className="w-5 h-5 text-purple-400" />;
      case 'Zap': return <Zap className="w-5 h-5 text-yellow-400" />;
      case 'Flame': return <Flame className="w-5 h-5 text-orange-400" />;
      case 'Crown': return <Crown className="w-5 h-5 text-amber-400" />;
      case 'ArrowLeftRight': return <ArrowLeftRight className="w-5 h-5 text-cyan-400" />;
      case 'UserCheck': return <UserCheck className="w-5 h-5 text-emerald-400" />;
      case 'Award': return <Award className="w-5 h-5 text-purple-400" />;
      default: return <Sparkles className="w-5 h-5 text-amber-400" />;
    }
  };

  const handleClaim = (missionId: string) => {
    claimDailyMission(missionId);
  };

  const handleRecovery = () => {
    runSquadRecoverySession();
  };

  return (
    <AnimatePresence>
      <div 
        id="daily-missions-overlay"
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto"
        dir={isAr ? 'rtl' : 'ltr'}
      >
        <motion.div
          id="daily-missions-card"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden my-auto"
        >
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-amber-950/80 via-neutral-900 to-yellow-950/60 p-5 border-b border-amber-500/25 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/10">
                <Trophy className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-black font-heading text-white tracking-wide">
                  {isAr ? 'المهام الرياضية وحصاد الجواهر' : 'Missions & Diamond Rewards'}
                </h2>
                <p className="text-xs text-neutral-300 mt-0.5">
                  {isAr 
                    ? 'اكسب الجواهر المجانية من المهام لترقية حسابك حتى VIP 20 دون إنفاق أي أموال!' 
                    : 'Earn free diamonds to upgrade your VIP rank up to level 20 without spending real money!'}
                </p>
              </div>
            </div>

            <button
              id="close-daily-missions-btn"
              onClick={() => setDailyMissionsModalOpen(false)}
              className="p-2 rounded-xl bg-neutral-800/80 hover:bg-neutral-700 text-neutral-400 hover:text-white transition"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Sub Navigation Tabs: Daily / Weekly / Achievements */}
          <div className="flex border-b border-neutral-800 bg-neutral-950/60 p-2 gap-2">
            <button
              onClick={() => setActiveTab('daily')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'daily'
                  ? 'bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/20'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>{isAr ? 'مهام يومية' : 'Daily Missions'}</span>
            </button>

            <button
              onClick={() => setActiveTab('weekly')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'weekly'
                  ? 'bg-cyan-500 text-neutral-950 shadow-md shadow-cyan-500/20'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{isAr ? 'مهام أسبوعية' : 'Weekly Missions'}</span>
            </button>

            <button
              onClick={() => setActiveTab('achievement')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'achievement'
                  ? 'bg-purple-500 text-white shadow-md shadow-purple-500/20'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>{isAr ? 'إنجازات النادي' : 'Achievements'}</span>
            </button>
          </div>

          <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
            {/* Squad Wellness & Fatigue Bar */}
            <div className="p-4 rounded-2xl bg-neutral-950/80 border border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className={`p-2.5 rounded-xl border ${
                  avgFatigue > 60 
                    ? 'bg-red-500/10 border-red-500/30 text-red-400' 
                    : avgFatigue > 30 
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' 
                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                }`}>
                  <HeartPulse className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-neutral-200">
                      {isAr ? 'معدل إجهاد التشكيلة العام:' : 'Average Squad Fatigue:'}
                    </span>
                    <span className={`text-xs font-black ${
                      avgFatigue > 60 ? 'text-red-400' : avgFatigue > 30 ? 'text-amber-400' : 'text-emerald-400'
                    }`}>
                      {avgFatigue}%
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    {avgFatigue > 50 
                      ? (isAr ? '⚠️ التشكيلة تشكو من الإجهاد الشديد، يحتاج الفريق لجلسة استشفاء فورية لتفادي الإصابات.' : '⚠️ High squad fatigue! Run recovery to avoid injuries.')
                      : (isAr ? 'جاهزية الفريق ممتازة ومستعدة للتحديات القادمة.' : 'Squad is in prime condition for upcoming games.')}
                  </p>
                </div>
              </div>

              <button
                id="squad-recovery-btn"
                onClick={handleRecovery}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-lg shadow-emerald-600/20 transition active:scale-95 flex items-center justify-center gap-1.5 shrink-0"
              >
                <HeartPulse className="w-3.5 h-3.5" />
                <span>{isAr ? 'جلسة استشفاء بدني' : 'Squad Recovery'}</span>
              </button>
            </div>

            {/* Overall Missions Progress */}
            <div className="p-3.5 rounded-2xl bg-neutral-950/60 border border-neutral-800">
              <div className="flex justify-between items-center text-xs text-neutral-300 font-bold mb-1.5">
                <span>{isAr ? 'نسبة إنجاز المهام:' : 'Progress:'}</span>
                <span className="text-amber-400 font-black">{claimedInTab} / {totalInTab} ({tabProgressPercent}%)</span>
              </div>
              <div className="w-full h-2.5 bg-neutral-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-all duration-500"
                  style={{ width: `${tabProgressPercent}%` }}
                />
              </div>
            </div>

            {/* Missions List */}
            <div className="space-y-3">
              {displayedMissions.map((mission: DailyMission) => {
                const isDone = mission.current >= mission.target;
                const canClaim = isDone && !mission.isClaimed;
                const percent = Math.min(100, Math.round((mission.current / mission.target) * 100));

                return (
                  <div
                    key={mission.id}
                    id={`mission-card-${mission.id}`}
                    className={`p-4 rounded-2xl border transition-all ${
                      mission.isClaimed
                        ? 'bg-neutral-900/40 border-neutral-800/50 opacity-70'
                        : canClaim
                        ? 'bg-amber-950/20 border-amber-500/40 shadow-md ring-1 ring-amber-500/30'
                        : 'bg-neutral-850/80 border-neutral-800 hover:border-neutral-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 p-2 rounded-xl bg-neutral-800 border border-neutral-700">
                          {getMissionIcon(mission.iconName)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-white">
                              {isAr ? mission.titleAr : mission.titleEn}
                            </h3>
                            {mission.isClaimed && (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-semibold flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                {isAr ? 'تم الاستلام' : 'Claimed'}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-neutral-400 mt-1 max-w-md">
                            {isAr ? mission.descriptionAr : mission.descriptionEn}
                          </p>

                          {/* Reward Badges */}
                          <div className="flex flex-wrap items-center gap-2 mt-2.5">
                            {mission.rewardCoins > 0 && (
                              <span className="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] font-medium flex items-center gap-1">
                                <Coins className="w-3 h-3 text-amber-400" />
                                +{mission.rewardCoins.toLocaleString()}
                              </span>
                            )}
                            {mission.rewardDiamonds > 0 && (
                              <span className="px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-[11px] font-bold flex items-center gap-1">
                                <Gem className="w-3 h-3 text-cyan-400" />
                                +{mission.rewardDiamonds} {isAr ? 'جوهرة' : 'Diamonds'}
                              </span>
                            )}
                            {mission.rewardTrainingPoints > 0 && (
                              <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11px] font-medium flex items-center gap-1">
                                <Zap className="w-3 h-3 text-emerald-400" />
                                +{mission.rewardTrainingPoints} {isAr ? 'نقاط تدريب' : 'TP'}
                              </span>
                            )}
                            {mission.rewardVipPoints > 0 && (
                              <span className="px-2 py-0.5 rounded-md bg-purple-500/10 border border-purple-500/20 text-purple-300 text-[11px] font-medium flex items-center gap-1">
                                <Trophy className="w-3 h-3 text-purple-400" />
                                +{mission.rewardVipPoints} VIP XP
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Claim Button or Progress Counter */}
                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        {canClaim ? (
                          <button
                            id={`claim-mission-${mission.id}-btn`}
                            onClick={() => handleClaim(mission.id)}
                            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-black text-xs shadow-lg transition active:scale-95 flex items-center gap-1.5 animate-pulse"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>{isAr ? 'استلام المكافأة' : 'Claim Reward'}</span>
                          </button>
                        ) : mission.isClaimed ? (
                          <span className="text-xs font-semibold text-neutral-500">
                            {mission.target} / {mission.target}
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-amber-400/90">
                            {mission.current} / {mission.target}
                          </span>
                        )}

                        <div className="w-20 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-300 ${
                              isDone ? 'bg-emerald-500' : 'bg-amber-500'
                            }`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
