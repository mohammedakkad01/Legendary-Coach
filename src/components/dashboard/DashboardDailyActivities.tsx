/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Dashboard Daily Activities: 7-Day Coach Check-in and Daily VIP Reward Chest.
 */

import React from 'react';
import { Calendar, Gift } from 'lucide-react';
import { VIPPrivilege } from '../../types/game';

interface DashboardDailyActivitiesProps {
  isAr: boolean;
  checkInStreak: number;
  checkInClaimedToday: boolean;
  onClaimCheckIn: () => void;
  vipClaimedToday: boolean;
  currentTier: VIPPrivilege;
  onClaimVipReward: () => void;
}

export const DashboardDailyActivities: React.FC<DashboardDailyActivitiesProps> = ({
  isAr,
  checkInStreak,
  checkInClaimedToday,
  onClaimCheckIn,
  vipClaimedToday,
  currentTier,
  onClaimVipReward,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* 7-Day Check-in Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-400" />
            <h3 className="font-heading font-black text-sm sm:text-base text-white">
              {isAr ? 'حضور المدرب اليومي (سلسلة 7 أيام)' : '7-Day Daily Coach Check-In'}
            </h3>
          </div>
          <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
            {isAr ? `اليوم ${checkInStreak} من 7` : `Day ${checkInStreak} of 7`}
          </span>
        </div>

        <div className="grid grid-cols-7 gap-1.5 text-center">
          {[1, 2, 3, 4, 5, 6, 7].map((day) => {
            const isPast = day < checkInStreak;
            const isToday = day === checkInStreak;
            return (
              <div 
                key={day}
                className={`p-2 rounded-xl border text-xs font-bold transition-all ${
                  isPast ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300' :
                  isToday ? 'bg-amber-950/50 border-amber-500 text-amber-300 ring-2 ring-amber-400/40' :
                  'bg-slate-950/60 border-slate-800 text-slate-500'
                }`}
              >
                <span className="text-[10px] block">{isAr ? `يوم ${day}` : `D${day}`}</span>
                <span className="text-sm block my-0.5">{day === 7 ? '👑' : '💰'}</span>
                <span className="text-[9px] font-black">{day * 8}K</span>
              </div>
            );
          })}
        </div>

        <button
          id="btn_claim_checkin"
          disabled={checkInClaimedToday}
          onClick={onClaimCheckIn}
          className={`w-full py-2.5 rounded-xl font-black text-xs shadow-lg transition-all ${
            checkInClaimedToday
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-emerald-600/30'
          }`}
        >
          {checkInClaimedToday 
            ? (isAr ? 'تم استلام مكافأة الحضور اليومية بنجاح ✓' : 'Daily Check-in Claimed ✓')
            : (isAr ? 'استلام مكافأة اليوم' : 'Claim Today’s Reward')}
        </button>
      </div>

      {/* Daily VIP Chest Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-amber-400" />
            <h3 className="font-heading font-black text-sm sm:text-base text-white">
              {isAr ? 'صندوق الـ VIP اليومي' : 'Daily VIP Reward Chest'}
            </h3>
          </div>
          <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
            VIP {currentTier.level}
          </span>
        </div>

        <p className="text-xs text-slate-400">
          {isAr 
            ? `صندوق حصري يتضمن كوينز ونقاط تدريب بناءً على مستواك في الـ VIP (${currentTier.level}). يُعاد تجديده يومياً.`
            : `Exclusive chest containing coins & training points scaled to your VIP tier (${currentTier.level}).`}
        </p>

        <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 flex items-center justify-between text-xs font-bold">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎁</span>
            <span className="text-slate-300">{isAr ? 'مكافأة اليوم:' : 'Today: '}</span>
          </div>
          <div className="text-right text-amber-300 font-black">
            +{(10000 + currentTier.level * 4000).toLocaleString()} {isAr ? 'كوينز' : 'Coins'}
          </div>
        </div>

        <button
          id="btn_claim_vip_chest"
          disabled={vipClaimedToday}
          onClick={onClaimVipReward}
          className={`w-full py-2.5 rounded-xl font-black text-xs shadow-lg transition-all ${
            vipClaimedToday
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
              : 'bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer shadow-amber-500/30'
          }`}
        >
          {vipClaimedToday 
            ? (isAr ? 'تم فتح صندوق الـ VIP لليوم ✓' : 'VIP Chest Opened Today ✓')
            : (isAr ? 'فتح الصندوق واستلام الجائزة' : 'Open VIP Chest')}
        </button>
      </div>
    </div>
  );
};
