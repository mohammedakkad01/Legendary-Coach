/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Urgent Tactical Decision & Match Speed Upgrade Modal components.
 */

import React from 'react';
import { AlertCircle, Zap, X, Lock, Coins, Gem, Crown } from 'lucide-react';
import { MatchEvent, InteractiveDecisionOption, Club, VIPPrivilege } from '../../types/game';

interface InteractiveDecisionBannerProps {
  pendingEvent: MatchEvent;
  isAr: boolean;
  onSubmitDecision: (optionId: string) => void;
}

export const InteractiveDecisionBanner: React.FC<InteractiveDecisionBannerProps> = ({
  pendingEvent,
  isAr,
  onSubmitDecision,
}) => {
  return (
    <div className="bg-gradient-to-r from-amber-950/80 via-slate-900 to-amber-950/80 border-2 border-amber-500/60 rounded-3xl p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-300">
      <div className="flex items-center gap-2.5 text-amber-400">
        <AlertCircle className="w-6 h-6 animate-bounce" />
        <h4 className="font-heading font-black text-base sm:text-lg">
          {isAr ? 'تدخل تكتيكي عاجل من المدرب!' : 'Urgent Tactical Decision!'}
        </h4>
      </div>
      <p className="text-sm font-semibold text-slate-200">
        {isAr ? pendingEvent.textAr : pendingEvent.textEn}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
        {pendingEvent.interactiveOptions?.map((opt: InteractiveDecisionOption) => (
          <button
            key={opt.id}
            onClick={() => onSubmitDecision(opt.id)}
            className="p-3.5 rounded-2xl bg-slate-950/80 hover:bg-slate-800 border border-amber-500/40 hover:border-amber-400 text-left sm:text-right space-y-1 transition-all group cursor-pointer shadow-lg"
          >
            <div className="flex items-center justify-between">
              <span className="font-heading font-black text-xs sm:text-sm text-white group-hover:text-amber-300">
                {isAr ? opt.titleAr : opt.titleEn}
              </span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-black ${
                opt.tacticEffect.riskLevel === 'high' ? 'bg-rose-500/20 text-rose-400' :
                opt.tacticEffect.riskLevel === 'medium' ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'
              }`}>
                {opt.tacticEffect.riskLevel === 'high' ? (isAr ? 'مخاطرة عالية' : 'High Risk') :
                 opt.tacticEffect.riskLevel === 'medium' ? (isAr ? 'متوسط' : 'Medium') : (isAr ? 'آمن' : 'Safe')}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-snug">
              {isAr ? opt.descriptionAr : opt.descriptionEn}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
};

interface SpeedUpgradeModalProps {
  isOpen: boolean;
  isAr: boolean;
  onClose: () => void;
  club: Club;
  unlockedSpeed2x: boolean;
  currentVipTier: VIPPrivilege;
  speedPurchaseNotice: string | null;
  onUnlock2x: (currency: 'coins' | 'diamonds') => void;
  onSetSpeed: (speed: number) => void;
  onNavigateVip: () => void;
}

export const SpeedUpgradeModal: React.FC<SpeedUpgradeModalProps> = ({
  isOpen,
  isAr,
  onClose,
  club,
  unlockedSpeed2x,
  currentVipTier,
  speedPurchaseNotice,
  onUnlock2x,
  onSetSpeed,
  onNavigateVip,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2 text-amber-400">
            <Zap className="w-5 h-5 text-amber-400" />
            <h3 className="font-heading font-black text-lg text-white">
              {isAr ? 'ترقية سرعة محاكاة المباريات' : 'Match Speed Boost Upgrade'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Notification */}
        {speedPurchaseNotice && (
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold leading-relaxed">
            {speedPurchaseNotice}
          </div>
        )}

        {/* Option 1: 2x Speed */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 font-black text-sm flex items-center justify-center border border-sky-500/30">
                2x
              </span>
              <div>
                <h4 className="font-heading font-black text-sm text-white">
                  {isAr ? 'السرعة المضاعفة (2x Speed)' : 'Double Speed (2x)'}
                </h4>
                <p className="text-[11px] text-slate-400">
                  {isAr ? 'تسريع وقت المباراة بمقدار الضعف لتجربة لعب أكثر حيوية' : 'Doubles simulation tempo permanently for your career'}
                </p>
              </div>
            </div>
            {unlockedSpeed2x && (
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-black">
                {isAr ? 'مفتوحة لديك ✓' : 'Unlocked ✓'}
              </span>
            )}
          </div>

          {!unlockedSpeed2x ? (
            <div className="pt-2 flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => onUnlock2x('coins')}
                className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-300 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Coins className="w-4 h-4 text-amber-400" />
                <span>{isAr ? 'فتح بـ 30,000 كوينز' : '30,000 Coins'}</span>
              </button>

              <button
                onClick={() => onUnlock2x('diamonds')}
                className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-sky-500/20 transition cursor-pointer"
              >
                <Gem className="w-4 h-4 text-slate-950" />
                <span>{isAr ? 'فتح بـ 50 جوهرة 💎' : '50 Diamonds 💎'}</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                onSetSpeed(2);
                onClose();
              }}
              className="w-full py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs transition cursor-pointer"
            >
              {isAr ? 'تفعيل سرعة 2x الآن' : 'Activate 2x Speed Now'}
            </button>
          )}
        </div>

        {/* Option 2: 4x Speed - VIP 10+ */}
        <div className="bg-slate-950/80 border border-purple-500/30 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 font-black text-sm flex items-center justify-center border border-purple-500/30">
                4x
              </span>
              <div>
                <h4 className="font-heading font-black text-sm text-white flex items-center gap-1.5">
                  <span>{isAr ? 'السرعة الفائقة (4x Ultra Speed)' : 'Ultra Speed (4x)'}</span>
                  <Crown className="w-3.5 h-3.5 text-amber-400" />
                </h4>
                <p className="text-[11px] text-slate-400">
                  {isAr ? 'ميزة حصرية لأعضاء نادي الأساطير رتبة VIP 10 فما فوق' : 'Exclusive VIP privilege for Glory Makers (VIP 10+)'}
                </p>
              </div>
            </div>

            {currentVipTier.unlockedSpeed4x ? (
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-black">
                {isAr ? 'مفتوحة لمستواك ✓' : 'VIP Unlocked ✓'}
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[10px] font-black">
                {isAr ? `مستواك الحالي: VIP ${currentVipTier.level}` : `Current: VIP ${currentVipTier.level}`}
              </span>
            )}
          </div>

          {currentVipTier.unlockedSpeed4x ? (
            <button
              onClick={() => {
                onSetSpeed(4);
                onClose();
              }}
              className="w-full py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-black text-xs shadow-md transition cursor-pointer"
            >
              {isAr ? 'تفعيل سرعة 4x الفائقة' : 'Activate 4x Ultra Speed'}
            </button>
          ) : (
            <div className="space-y-2 pt-1">
              <p className="text-[11px] text-purple-300 leading-relaxed">
                {isAr 
                  ? 'لفتح سرعة 4x، قم بترقية حسابك في نادي الـ VIP حتى تصل للمستوى 10 (صانع المجد).' 
                  : 'To unlock 4x Ultra Speed, advance your VIP tier to Level 10 (Glory Maker).'}
              </p>
              <button
                onClick={() => {
                  onClose();
                  onNavigateVip();
                }}
                className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-purple-600/30 transition cursor-pointer"
              >
                <Crown className="w-4 h-4 text-amber-300" />
                <span>{isAr ? 'الانتقال إلى نادي VIP للترقية' : 'Go to VIP Club & Upgrade'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Balances Status */}
        <div className="flex items-center justify-between text-xs text-slate-400 bg-slate-950 p-3 rounded-xl border border-slate-800">
          <span className="font-bold">{isAr ? 'رصيدك الحالي:' : 'Your Balances:'}</span>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-amber-400 font-mono font-bold">
              <Coins className="w-3.5 h-3.5" />
              <span>{(club.finances.coins || 0).toLocaleString()}</span>
            </span>
            <span className="flex items-center gap-1 text-sky-400 font-mono font-bold">
              <Gem className="w-3.5 h-3.5" />
              <span>{(club.finances.diamonds || 0).toLocaleString()}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
