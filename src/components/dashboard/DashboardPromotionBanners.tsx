/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Dashboard promotional banners: League/Club Switch and Gems Login Bonus.
 */

import React from 'react';
import { Trophy, ArrowRight, Sparkles, Gem } from 'lucide-react';
import { Club } from '../../types/game';

interface DashboardPromotionBannersProps {
  club: Club;
  isAr: boolean;
  hasSelectedInitialClub: boolean;
  user: any;
  onOpenClubSelect: () => void;
  onOpenAuth: () => void;
}

export const DashboardPromotionBanners: React.FC<DashboardPromotionBannersProps> = ({
  club,
  isAr,
  hasSelectedInitialClub,
  user,
  onOpenClubSelect,
  onOpenAuth,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Banner 1: Real Leagues & Clubs Selection */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950/80 via-slate-900 to-sky-950/80 border border-sky-500/30 p-5 shadow-xl flex flex-col justify-between">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs">
              <Trophy className="w-4 h-4" />
              <span>{hasSelectedInitialClub ? (isAr ? 'النادي والدوري المختار' : 'Active Club & League') : (isAr ? 'الدوريات والأندية الرسمية' : 'Official Leagues & Clubs')}</span>
            </div>
            <h3 className="text-lg font-black font-heading text-white mt-1">
              {hasSelectedInitialClub 
                ? (isAr ? `${club.name} • ${club.divisionName}` : `${club.nameEn} • ${club.divisionName}`)
                : (isAr ? 'اختر دوريك وناديك لبدء المسيرة' : 'Select Your League & Team')}
            </h3>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              {hasSelectedInitialClub
                ? (isAr 
                    ? 'أنت تدرب هذا النادي حالياً. الانتقال إلى نادٍ آخر يتطلب رسوم انتقال رسمية لفسخ العقد (25,000 🪙 أو 50 💎).' 
                    : 'You currently manage this club. Mid-career transfers require an official release fee (25,000 🪙 or 50 💎).')
                : (isAr 
                    ? 'اختر ناديك المفضل في الدوريات العالمية. أندية المركز الأول والنخبة تتطلب 100 💎، وأندية التحدي مجانية بالكامل (0 💎).' 
                    : 'Pick your club in world leagues. Top-tier clubs require 100 💎, challenger clubs are free (0 💎).')}
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-2xl shrink-0">
            🏆
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            {hasSelectedInitialClub 
              ? (isAr ? `الملعب: ${club.stadiumName}` : `Stadium: ${club.stadiumName}`)
              : (isAr ? 'شعار حقيقي وملعب رسمي ومسيرة واقعية' : 'Real badges, official stadiums & stats')}
          </span>
          <button
            onClick={onOpenClubSelect}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-black text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer hover:brightness-110"
          >
            <Trophy className="w-3.5 h-3.5 text-slate-950" />
            <span>{hasSelectedInitialClub ? (isAr ? 'سوق الانتقال لدوري آخر' : 'Transfer League/Club') : (isAr ? 'اختيار الدوري والنادي' : 'Choose League & Club')}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Banner 2: 300 Diamonds Login Bonus / Status */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-950/80 via-slate-900 to-fuchsia-950/80 border border-fuchsia-500/40 p-5 shadow-xl flex flex-col justify-between">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5 text-fuchsia-300 font-bold text-xs">
              <Sparkles className="w-4 h-4 text-yellow-300" />
              <span>{isAr ? 'مكافأة تسجيل الدخول' : 'Sign In Reward'}</span>
            </div>
            <h3 className="text-lg font-black font-heading text-white mt-1">
              {user 
                ? (isAr ? `رصيدك: ${club.finances.diamonds || 0} جوهرة 💎` : `Balance: ${club.finances.diamonds || 0} Diamonds 💎`)
                : (isAr ? 'احصل على 300 جوهرة 💎 مجاناً!' : 'Claim 300 Free Diamonds 💎!')}
            </h3>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              {user 
                ? (isAr ? 'تم توثيق حسابك وحفظ بياناتك سحابياً! يمكنك استخدام الجواهر للتعاقد مع كبار النجوم.' : 'Account verified with cloud sync! Use diamonds to sign top world stars.')
                : (isAr ? 'سجل دخولك بحساب Google لتحصل فوراً على 300 جوهرة في حسابك وتحفظ تقدمك سحابياً، أو تابع كـ ضيف من الصفر.' : 'Sign in with Google to get 300 diamonds instantly and enable cloud sync, or play as guest.')}
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-fuchsia-500/20 border border-fuchsia-400/30 flex items-center justify-center text-2xl shrink-0">
            <Gem className="w-6 h-6 text-fuchsia-300 animate-pulse" />
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
          <span className="text-[11px] text-fuchsia-300 font-medium">
            {user ? (isAr ? '✓ تم تفعيل الحفظ السحابي' : '✓ Cloud Sync Active') : (isAr ? '300 جوهرة في انتظارك' : '300 gems waiting for you')}
          </span>
          <button
            onClick={onOpenAuth}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-500 hover:to-pink-500 text-white font-bold text-xs shadow-md shadow-fuchsia-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            {user ? (
              <>
                <span>{isAr ? 'الملف والحفظ السحابي' : 'Profile & Saves'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-yellow-200" />
                <span>{isAr ? 'تسجيل الدخول (300 💎)' : 'Sign In (300 💎)'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
