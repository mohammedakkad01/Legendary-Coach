/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Transfers Market Header: title, budget counters, and refresh scouts button.
 */

import React from 'react';
import { ArrowLeftRight, Coins, Gem, RefreshCw } from 'lucide-react';

interface TransferMarketHeaderProps {
  isAr: boolean;
  coins: number;
  diamonds: number;
  onRefreshScouts: () => void;
}

export const TransferMarketHeader: React.FC<TransferMarketHeaderProps> = ({
  isAr,
  coins,
  diamonds,
  onRefreshScouts,
}) => {
  return (
    <div className="bg-gradient-to-r from-amber-950/80 via-slate-900 to-indigo-950/80 border border-amber-500/30 rounded-3xl p-5 sm:p-7 shadow-2xl relative overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 85% 0%, rgba(245,158,11,0.12), transparent 45%)',
        }}
      />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
            <ArrowLeftRight className="w-4 h-4" />
            <span>{isAr ? 'سوق الانتقالات وشبكة الكشافة' : 'Transfer Market & Scouting Network'}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black font-heading text-white">
            {isAr ? 'إدارة التعاقدات وتدعيم الصفوف' : 'Transfers Hub & Squad Reinforcements'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            {isAr
              ? 'ابحث وفلتر بين أفضل المواهب الصاعدة والنجوم العالميين. استخدم الفلاتر الشاملة لاكتشاف اللاعب المناسب لتكتيك ناديك!'
              : 'Scout, filter, and sign prospect wonderkids and global stars. Utilize comprehensive filtering to find the perfect fit for your tactics!'}
          </p>
        </div>

        {/* Finances & Refresh Action */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-slate-950/90 p-3.5 rounded-2xl border border-slate-800 text-center min-w-[140px] shadow-lg">
            <span className="text-[10px] text-slate-400 block font-bold uppercase">
              {isAr ? 'ميزانية النادي' : 'Transfer Budget'}
            </span>
            <span className="text-lg sm:text-xl font-black text-amber-400 flex items-center justify-center gap-1">
              <Coins className="w-4 h-4 text-amber-400" />
              <span>{coins.toLocaleString()} $</span>
            </span>
          </div>

          <div className="bg-slate-950/90 p-3.5 rounded-2xl border border-slate-800 text-center min-w-[110px] shadow-lg">
            <span className="text-[10px] text-slate-400 block font-bold uppercase">
              {isAr ? 'الجواهر 💎' : 'Diamonds 💎'}
            </span>
            <span className="text-lg sm:text-xl font-black text-fuchsia-400 flex items-center justify-center gap-1">
              <Gem className="w-4 h-4 text-fuchsia-400" />
              <span>{diamonds}</span>
            </span>
          </div>

          <button
            onClick={onRefreshScouts}
            className="p-3.5 rounded-2xl bg-slate-800/90 hover:bg-slate-700 text-amber-300 border border-slate-700 font-bold text-xs flex items-center gap-2 shadow-lg transition-all cursor-pointer hover:border-amber-400/40"
            title={isAr ? 'إرسال كشافين لتجديد السوق' : 'Refresh scout targets'}
          >
            <RefreshCw className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">{isAr ? 'تجديد تقارير الكشافة' : 'Refresh Scouts'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
