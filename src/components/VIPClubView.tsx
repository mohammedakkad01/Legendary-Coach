/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * VIP Club Hub (20 Levels — 100% Free / Gameplay Progression)
 * Features:
 * 1. 20 Full Levels with cumulative boosts (Attack +1% to +10%, Defense +1% to +10%, Loss Mitigation 2% to 30%)
 * 2. Upgrade directly with Diamonds/Gems (earned from daily & weekly missions, achievements) or XP
 * 3. Dedicated Upgrade Chest (صندوق الترقية) for reaching each level + Daily VIP Chest
 * 4. Zero Pay-to-Win guarantee: transparent badge showing gameplay progression only.
 */

import React, { useState } from 'react';
import { useGameStore } from '../state/useGameStore';
import { VIP_LEVELS } from '../data/vipData';
import { 
  Crown, 
  Check, 
  Lock, 
  Gift, 
  Sparkles, 
  Swords, 
  ShieldCheck, 
  Zap, 
  Gem, 
  ChevronRight, 
  AlertCircle 
} from 'lucide-react';

export const VIPClubView: React.FC = () => {
  const { 
    vipPoints, 
    vipClaimedToday, 
    claimedVipUpgradeChests = [],
    club, 
    upgradeVipWithDiamonds,
    claimVipUpgradeChest,
    claimDailyVIPReward, 
    language 
  } = useGameStore();

  const isAr = language === 'ar';
  const playerDiamonds = club.finances.diamonds || 0;
  const [activeFilter, setActiveFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Compute current VIP Level
  let currentLevel = 1;
  let currentTier = VIP_LEVELS[0];
  let nextTier = VIP_LEVELS[1] || VIP_LEVELS[0];

  for (let i = 0; i < VIP_LEVELS.length; i++) {
    if (vipPoints >= VIP_LEVELS[i].pointsRequired) {
      currentLevel = VIP_LEVELS[i].level;
      currentTier = VIP_LEVELS[i];
      nextTier = VIP_LEVELS[i + 1] || VIP_LEVELS[i];
    }
  }

  const isMaxLevel = currentLevel >= 20;
  const pointsToNext = Math.max(0, nextTier.pointsRequired - vipPoints);
  const diamondsCostToUpgrade = nextTier.diamondsCostToUpgrade;
  const canAffordUpgrade = playerDiamonds >= diamondsCostToUpgrade;

  const handleDiamondUpgrade = () => {
    const res = upgradeVipWithDiamonds();
    setFeedbackMessage({ text: res.message, type: res.success ? 'success' : 'error' });
    setTimeout(() => setFeedbackMessage(null), 5000);
  };

  const handleClaimUpgradeChest = (level: number) => {
    const res = claimVipUpgradeChest(level);
    setFeedbackMessage({ text: res.message, type: res.success ? 'success' : 'error' });
    setTimeout(() => setFeedbackMessage(null), 5000);
  };

  const handleClaimDailyChest = () => {
    const res = claimDailyVIPReward();
    setFeedbackMessage({ text: res.message, type: res.success ? 'success' : 'error' });
    setTimeout(() => setFeedbackMessage(null), 5000);
  };

  const filteredTiers = VIP_LEVELS.filter(t => {
    if (activeFilter === 'unlocked') return currentLevel >= t.level;
    if (activeFilter === 'locked') return currentLevel < t.level;
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-6 space-y-6">
      
      {/* Toast Feedback Notification */}
      {feedbackMessage && (
        <div 
          className={`p-4 rounded-2xl border text-sm font-bold flex items-center justify-between shadow-xl transition-all animate-bounce ${
            feedbackMessage.type === 'success' 
              ? 'bg-emerald-950/90 border-emerald-500 text-emerald-200' 
              : 'bg-rose-950/90 border-rose-500 text-rose-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">{feedbackMessage.type === 'success' ? '✨' : '⚠️'}</span>
            <span>{feedbackMessage.text}</span>
          </div>
          <button 
            onClick={() => setFeedbackMessage(null)}
            className="text-xs px-2 py-1 rounded-lg bg-black/30 hover:bg-black/50"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main VIP Dashboard Header */}
      <div className="relative bg-gradient-to-r from-amber-950/90 via-slate-900 to-yellow-950/90 border border-amber-500/50 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-10 w-64 h-64 bg-yellow-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-black">
                <Crown className="w-3.5 h-3.5" />
                {isAr ? 'نظام الـ VIP الرياضي — 20 مستوى مجاني بالكامل' : 'Sports VIP Club — 20 Free Tiers'}
              </span>
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-xs font-bold">
                <Gem className="w-3.5 h-3.5" />
                {isAr ? `رصيد الجواهر: ${playerDiamonds.toLocaleString()}` : `Diamonds: ${playerDiamonds.toLocaleString()}`}
              </span>
            </div>

            <h2 className="text-2xl sm:text-4xl font-black font-heading text-white">
              {isAr ? `${currentTier.nameAr}` : `${currentTier.nameEn}`}
            </h2>

            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              {isAr 
                ? '⭐ لا نبيع القوة أبداً! يمكنك ترقية مستواك عبر كسب الجواهر من المهام اليومية والأسبوعية، أو تجميع نقاط الـ XP من الفوز في المباريات وتطوير النادي.'
                : '⭐ Zero Pay-to-Win! Upgrade your VIP levels by earning diamonds from daily & weekly missions, or accumulate XP from victories and facilities.'}
            </p>

            {/* Current Active Bonuses Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
              <div className="bg-slate-950/70 border border-amber-500/30 rounded-xl p-2.5">
                <div className="flex items-center gap-1.5 text-amber-400 text-xs font-bold">
                  <Swords className="w-3.5 h-3.5" />
                  <span>{isAr ? 'تعزيز الهجوم' : 'Attack Boost'}</span>
                </div>
                <div className="text-lg font-black text-white mt-0.5">+{currentTier.attackBoostPercent || 1}%</div>
              </div>

              <div className="bg-slate-950/70 border border-blue-500/30 rounded-xl p-2.5">
                <div className="flex items-center gap-1.5 text-blue-400 text-xs font-bold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{isAr ? 'تعزيز الدفاع' : 'Defense Boost'}</span>
                </div>
                <div className="text-lg font-black text-white mt-0.5">+{currentTier.defenseBoostPercent || 1}%</div>
              </div>

              <div className="bg-slate-950/70 border border-emerald-500/30 rounded-xl p-2.5">
                <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold">
                  <Zap className="w-3.5 h-3.5" />
                  <span>{isAr ? 'تقليل عقوبة الخسارة' : 'Loss Mitigation'}</span>
                </div>
                <div className="text-lg font-black text-white mt-0.5">-{currentTier.lossMitigationPercent || 2}%</div>
              </div>

              <div className="bg-slate-950/70 border border-purple-500/30 rounded-xl p-2.5">
                <div className="flex items-center gap-1.5 text-purple-400 text-xs font-bold">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isAr ? 'دخل إضافي' : 'Match Income'}</span>
                </div>
                <div className="text-lg font-black text-white mt-0.5">+{currentTier.incomeBonusPercent}%</div>
              </div>
            </div>
          </div>

          {/* Action Boxes: Daily Chest & Direct Diamond Upgrade */}
          <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
            {/* Daily Chest */}
            <div className="bg-slate-950/90 p-4 rounded-2xl border border-amber-500/40 text-center space-y-2 min-w-[220px]">
              <div className="flex items-center justify-between text-xs font-bold text-amber-400">
                <span>{isAr ? 'صندوق VIP اليومي' : 'Daily VIP Chest'}</span>
                <Gift className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-[11px] text-slate-400">
                {currentTier.dailyChestReward.coins.toLocaleString()} {isAr ? 'كوينز' : 'Coins'} + {currentTier.dailyChestReward.trainingPoints} TP
              </div>
              <button
                onClick={handleClaimDailyChest}
                disabled={vipClaimedToday}
                className={`w-full py-2.5 px-4 rounded-xl text-xs font-black shadow-lg transition-all ${
                  vipClaimedToday
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 cursor-pointer shadow-amber-500/20'
                }`}
              >
                {vipClaimedToday ? (isAr ? 'تم الاستلام لليوم ✓' : 'Claimed Today ✓') : (isAr ? 'فتح الصندوق اليومي 🎁' : 'Open Daily Chest 🎁')}
              </button>
            </div>

            {/* Upgrade with Diamonds Button */}
            {!isMaxLevel && (
              <div className="bg-slate-950/90 p-4 rounded-2xl border border-cyan-500/40 text-center space-y-2 min-w-[220px]">
                <div className="flex items-center justify-between text-xs font-bold text-cyan-400">
                  <span>{isAr ? `ترقية فورية إلى VIP ${nextTier.level}` : `Upgrade to VIP ${nextTier.level}`}</span>
                  <Gem className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="text-[11px] text-slate-300 font-semibold">
                  {isAr ? 'التكلفة:' : 'Cost:'} <span className="text-cyan-400 font-black">{diamondsCostToUpgrade.toLocaleString()}</span> {isAr ? 'جوهرة' : 'Diamonds'}
                </div>
                <button
                  onClick={handleDiamondUpgrade}
                  disabled={!canAffordUpgrade}
                  className={`w-full py-2.5 px-4 rounded-xl text-xs font-black shadow-lg transition-all flex items-center justify-center gap-1.5 ${
                    canAffordUpgrade
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white cursor-pointer shadow-cyan-500/25'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <Gem className="w-3.5 h-3.5" />
                  <span>{canAffordUpgrade ? (isAr ? 'ترقية بالجواهر الآن' : 'Upgrade with Gems') : (isAr ? 'الجواهر غير كافية' : 'Not Enough Gems')}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* XP Progress Bar to Next Level */}
        {!isMaxLevel && (
          <div className="mt-6 pt-5 border-t border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-slate-300">
                {isAr ? `التقدم بالخبرة التلقائية نحو VIP ${nextTier.level}` : `XP Progress to VIP ${nextTier.level}`}
              </span>
              <span className="text-amber-400 font-black">
                {vipPoints.toLocaleString()} / {nextTier.pointsRequired.toLocaleString()} XP 
                {pointsToNext > 0 && ` (${pointsToNext.toLocaleString()} XP ${isAr ? 'متبقية' : 'remaining'})`}
              </span>
            </div>
            <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-300 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (vipPoints / (nextTier.pointsRequired || 1)) * 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Milestones & Special Perks Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* VIP 8 Milestone */}
        <div className="bg-gradient-to-r from-amber-950/50 to-slate-900 border border-amber-500/40 rounded-3xl p-5 shadow-lg flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500 text-slate-950 font-black text-lg flex items-center justify-center shadow-lg shadow-amber-500/30">
              VIP 8
            </div>
            <div>
              <span className="text-[11px] font-bold text-amber-400 block">{isAr ? 'معلم استراتيجي' : 'Key Milestone'}</span>
              <h4 className="text-sm sm:text-base font-black text-white">
                {isAr ? 'طابور التدريب المزدوج (Queue 2)' : 'Dual Training Queue'}
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                {isAr ? 'تدريب مجموعتين من اللاعبين في وقت واحد!' : 'Train two squads concurrently without waiting.'}
              </p>
            </div>
          </div>
          <span className={`px-3 py-1.5 rounded-xl text-xs font-black shrink-0 ${
            currentLevel >= 8 
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' 
              : 'bg-slate-800 text-slate-400'
          }`}>
            {currentLevel >= 8 ? (isAr ? 'مفعل ✓' : 'Active ✓') : (isAr ? 'قيد القفل' : 'Locked')}
          </span>
        </div>

        {/* VIP 20 Milestone */}
        <div className="bg-gradient-to-r from-yellow-950/50 to-purple-950/50 border border-yellow-500/40 rounded-3xl p-5 shadow-lg flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-yellow-400 to-amber-600 text-slate-950 font-black text-lg flex items-center justify-center shadow-lg shadow-yellow-500/30">
              VIP 20
            </div>
            <div>
              <span className="text-[11px] font-bold text-yellow-400 block">{isAr ? 'عرش الأساطير الأقصى' : 'Ultimate Milestone'}</span>
              <h4 className="text-sm sm:text-base font-black text-white">
                {isAr ? 'هجوم +10% ودفاع +10% وخسارة -30%' : 'Attack +10%, Def +10%, Loss -30%'}
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                {isAr ? 'أعلى وسام رياضي تاريخي في صانع المعارك!' : 'The highest coaching honor in the game.'}
              </p>
            </div>
          </div>
          <span className={`px-3 py-1.5 rounded-xl text-xs font-black shrink-0 ${
            currentLevel >= 20 
              ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40' 
              : 'bg-slate-800 text-slate-400'
          }`}>
            {currentLevel >= 20 ? (isAr ? 'أسطورة ✓' : 'Legendary ✓') : (isAr ? 'المستوى 20' : 'Level 20')}
          </span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-black font-heading text-white flex items-center gap-2">
          <Crown className="w-5 h-5 text-amber-400" />
          <span>{isAr ? 'خارطة مستويات الـ VIP العشرين (20 المستويات)' : 'All 20 VIP Tiers Breakdown'}</span>
        </h3>
        <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 p-1 rounded-2xl">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
              activeFilter === 'all' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
            }`}
          >
            {isAr ? 'الكل (20)' : 'All (20)'}
          </button>
          <button
            onClick={() => setActiveFilter('unlocked')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
              activeFilter === 'unlocked' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'
            }`}
          >
            {isAr ? 'المكتسبة' : 'Unlocked'}
          </button>
          <button
            onClick={() => setActiveFilter('locked')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
              activeFilter === 'locked' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            {isAr ? 'القادمة' : 'Upcoming'}
          </button>
        </div>
      </div>

      {/* 20 Tiers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTiers.map((tier) => {
          const isUnlocked = currentLevel >= tier.level;
          const isCurrent = currentLevel === tier.level;
          const isChestClaimed = claimedVipUpgradeChests.includes(tier.level);

          return (
            <div
              key={tier.level}
              className={`rounded-3xl p-5 border transition-all flex flex-col justify-between space-y-4 ${
                isCurrent
                  ? 'bg-amber-950/40 border-amber-500 shadow-xl shadow-amber-500/15 ring-2 ring-amber-400/50'
                  : isUnlocked
                  ? 'bg-slate-900/90 border-emerald-500/40 shadow-md'
                  : 'bg-slate-950/60 border-slate-800 opacity-80 hover:opacity-100'
              }`}
            >
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">
                      {tier.level >= 18 ? '🏆' : tier.level >= 13 ? '⭐' : tier.level >= 8 ? '🎖️' : '👑'}
                    </span>
                    <div>
                      <h4 className="font-heading font-black text-base text-white">
                        VIP {tier.level} — {isAr ? tier.nameAr : tier.nameEn}
                      </h4>
                      <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-400">
                        <span>{tier.pointsRequired.toLocaleString()} XP</span>
                        {tier.diamondsCostToUpgrade > 0 && (
                          <span className="flex items-center gap-0.5 text-cyan-400">
                            • <Gem className="w-3 h-3" /> {tier.diamondsCostToUpgrade.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {isUnlocked ? (
                    <span className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs">
                      <Check className="w-4 h-4" />
                    </span>
                  ) : (
                    <span className="w-7 h-7 rounded-full bg-slate-800 text-slate-500 flex items-center justify-center text-xs">
                      <Lock className="w-4 h-4" />
                    </span>
                  )}
                </div>

                {/* Boost Badges */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="px-2 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-bold">
                    ⚔️ هجوم +{tier.attackBoostPercent}%
                  </span>
                  <span className="px-2 py-0.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-300 text-[11px] font-bold">
                    🛡️ دفاع +{tier.defenseBoostPercent}%
                  </span>
                  <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold">
                    🛡️ خسارة -{tier.lossMitigationPercent}%
                  </span>
                </div>

                {/* Detailed Bonuses List */}
                <div className="space-y-1.5 pt-1">
                  {(isAr ? tier.bonusesAr : tier.bonusesEn).map((bonusText, pIdx) => (
                    <div key={pIdx} className="flex items-start gap-2 text-xs text-slate-300 leading-snug">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 mt-1.5" />
                      <span>{bonusText}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom: Upgrade Chest Claim Button */}
              <div className="pt-3 border-t border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-400 flex items-center gap-1">
                    <Gift className="w-3.5 h-3.5 text-amber-400" />
                    <span>{isAr ? 'صندوق الترقية المخصص' : 'Upgrade Chest'}</span>
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {tier.upgradeChestReward.coins.toLocaleString()} {isAr ? 'كوينز' : 'Coins'}
                  </span>
                </div>

                {isUnlocked ? (
                  <button
                    onClick={() => handleClaimUpgradeChest(tier.level)}
                    disabled={isChestClaimed}
                    className={`w-full py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                      isChestClaimed
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black cursor-pointer shadow-lg shadow-emerald-500/20'
                    }`}
                  >
                    <Gift className="w-3.5 h-3.5" />
                    <span>
                      {isChestClaimed
                        ? (isAr ? 'تم استلام صندوق الترقية ✓' : 'Upgrade Chest Claimed ✓')
                        : (isAr ? `فتح صندوق ترقية VIP ${tier.level} 🎁` : `Claim VIP ${tier.level} Chest 🎁`)}
                    </span>
                  </button>
                ) : (
                  <div className="w-full py-2 px-3 rounded-xl text-[11px] font-bold text-center bg-slate-950 text-slate-500 border border-slate-800/80">
                    {isAr ? `يفتح تلقائياً عند بلوغ VIP ${tier.level}` : `Unlocks at VIP ${tier.level}`}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};
