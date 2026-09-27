/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Individual Real Club Card for League & Club Selection.
 */

import React from 'react';
import { Shield, Star, MapPin, Check, Gem, Coins, AlertCircle, Sparkles, ArrowRight } from 'lucide-react';
import { RealClubConfig } from '../../data/realLeaguesData';

interface ClubSelectionCardProps {
  clubConfig: RealClubConfig;
  isAr: boolean;
  isCurrentClub: boolean;
  isSwitchingMode: boolean;
  canAfford: boolean;
  joiningClubId: string | null;
  switchFeeCoins: number;
  switchFeeDiamonds: number;
  onSelect: (club: RealClubConfig) => void;
}

export const ClubSelectionCard: React.FC<ClubSelectionCardProps> = ({
  clubConfig,
  isAr,
  isCurrentClub,
  isSwitchingMode,
  canAfford,
  joiningClubId,
  switchFeeCoins,
  switchFeeDiamonds,
  onSelect,
}) => {
  return (
    <div
      className={`rounded-3xl border p-4 sm:p-5 flex flex-col justify-between gap-4 transition-all relative overflow-hidden ${
        isCurrentClub
          ? 'bg-sky-950/40 border-sky-500/60 shadow-sky-500/10 shadow-xl'
          : clubConfig.isTopTier
          ? 'bg-gradient-to-br from-amber-950/30 via-slate-900 to-slate-950 border-amber-500/40 shadow-xl'
          : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div 
            className="w-14 h-14 rounded-2xl border p-2 flex items-center justify-center shadow-md shrink-0 relative overflow-hidden"
            style={{ 
              backgroundColor: clubConfig.colors?.primary ? `${clubConfig.colors.primary}20` : '#0f172a',
              borderColor: clubConfig.colors?.primary || '#334155'
            }}
          >
            {clubConfig.badge ? (
              <img
                src={clubConfig.badge}
                alt={clubConfig.nameEn}
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                  const fallbackEl = (e.currentTarget as HTMLElement).parentElement?.querySelector('.crest-fallback');
                  if (fallbackEl) (fallbackEl as HTMLElement).style.display = 'flex';
                }}
              />
            ) : null}
            <div 
              className={`crest-fallback ${clubConfig.badge ? 'hidden' : 'flex'} flex-col items-center justify-center w-full h-full`}
            >
              <Shield className="w-7 h-7" style={{ color: clubConfig.colors?.primary || '#38bdf8' }} />
              <span className="text-[9px] font-black uppercase tracking-tighter" style={{ color: clubConfig.colors?.secondary || '#ffffff' }}>
                {clubConfig.nameEn.substring(0, 3)}
              </span>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-heading font-black text-base sm:text-lg text-white">
                {isAr ? clubConfig.name : clubConfig.nameEn}
              </h4>
              {isCurrentClub && (
                <span className="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/40 text-[10px] font-black">
                  {isAr ? 'ناديك الحالي' : 'Current Club'}
                </span>
              )}
              <div className="flex items-center text-amber-400 text-xs">
                {Array.from({ length: Math.floor(clubConfig.starRating) }).map((_, i) => (
                  <Star key={i} className="w-3 h-3 fill-amber-400" />
                ))}
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-slate-400 text-xs mt-0.5">
              <MapPin className="w-3 h-3 text-sky-400" />
              <span>{clubConfig.stadiumName} • {clubConfig.city}</span>
            </div>
          </div>
        </div>

        {/* Price Tag Badge */}
        <div>
          {isCurrentClub ? (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/40 text-xs font-black">
              <Check className="w-3.5 h-3.5" />
              <span>{isAr ? 'فريقك الحالي' : 'Active'}</span>
            </div>
          ) : clubConfig.isTopTier ? (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-black shadow-inner">
              <Gem className="w-3.5 h-3.5 text-amber-400" />
              <span>{clubConfig.gemCost} 💎</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-black">
              <Check className="w-3.5 h-3.5" />
              <span>{isAr ? 'مجاناً 0 💎' : 'Free 0 💎'}</span>
            </div>
          )}
        </div>
      </div>

      {/* Description & Key Stars */}
      <div className="space-y-2">
        <p className="text-xs text-slate-300 leading-relaxed">
          {isAr ? clubConfig.descriptionAr : clubConfig.descriptionEn}
        </p>
        <div className="flex items-center flex-wrap gap-1.5 pt-1">
          <span className="text-[10px] font-bold text-slate-400">{isAr ? 'أبرز النجوم:' : 'Stars:'}</span>
          {clubConfig.keyStars.map((star, idx) => (
            <span
              key={idx}
              className="px-2 py-0.5 rounded-md bg-slate-900 text-slate-300 border border-slate-800 text-[11px] font-medium"
            >
              {star}
            </span>
          ))}
        </div>
      </div>

      {/* Action CTA */}
      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-3 flex-wrap">
        <div className="text-[11px] text-slate-400">
          {isCurrentClub ? (
            <span className="text-sky-400 font-bold flex items-center gap-1">
              <Check className="w-3.5 h-3.5" /> {isAr ? 'أنت المدير الفني لهذا الفريق' : 'You are currently managing this team'}
            </span>
          ) : isSwitchingMode ? (
            canAfford ? (
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <Coins className="w-3.5 h-3.5 text-amber-400" />
                <span>{isAr ? `رسوم الانتقال: ${switchFeeCoins.toLocaleString()} 🪙 أو ${switchFeeDiamonds} 💎` : `Transfer fee: ${switchFeeCoins.toLocaleString()} 🪙 or ${switchFeeDiamonds} 💎`}</span>
              </span>
            ) : (
              <span className="text-rose-400 font-bold flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{isAr ? `يلزم ${switchFeeCoins.toLocaleString()} 🪙 أو ${switchFeeDiamonds} 💎 لكسر العقد` : `Need ${switchFeeCoins.toLocaleString()} 🪙 or ${switchFeeDiamonds} 💎 release fee`}</span>
              </span>
            )
          ) : clubConfig.isTopTier ? (
            canAfford ? (
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> {isAr ? 'يمكنك تولي التدريب فوراً' : 'Available for appointment'}
              </span>
            ) : (
              <span className="text-amber-400 font-bold flex items-center gap-1">
                <Gem className="w-3.5 h-3.5" /> {isAr ? 'تحتاج 100 💎 للتعاقد' : 'Requires 100 💎'}
              </span>
            )
          ) : (
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> {isAr ? 'متاح مجاناً لجميع المدربين' : 'Free to manage'}
            </span>
          )}
        </div>

        <button
          onClick={() => onSelect(clubConfig)}
          disabled={joiningClubId === clubConfig.id || isCurrentClub}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 shadow-lg disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer ${
            isCurrentClub
              ? 'bg-slate-800 text-slate-400 border border-slate-700'
              : clubConfig.isTopTier
              ? canAfford
                ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 hover:brightness-110'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              : canAfford
              ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
              : 'bg-slate-800 text-slate-400'
          }`}
        >
          <span>
            {joiningClubId === clubConfig.id ? (isAr ? 'جاري تجهيز الفريق...' : 'Preparing club...') : null}
            {joiningClubId === clubConfig.id ? null : isCurrentClub
              ? (isAr ? 'فريقك الحالي' : 'Active Club')
              : isSwitchingMode
              ? (isAr ? `انتقال رسمي (${switchFeeCoins.toLocaleString()} 🪙 / ${switchFeeDiamonds} 💎)` : `Transfer (${switchFeeCoins.toLocaleString()} 🪙 / ${switchFeeDiamonds} 💎)`)
              : clubConfig.isTopTier
              ? canAfford
                ? (isAr ? 'تولَّ تدريب النادي (100 💎)' : 'Manage Club (100 💎)')
                : (isAr ? 'اختر وتعرّف على المتطلبات' : 'Requires 100 💎')
              : (isAr ? 'تولَّ تدريب النادي (مجاناً)' : 'Manage Club (Free)')}
          </span>
          {!isCurrentClub && <ArrowRight className="w-4 h-4 rtl:rotate-180" />}
        </button>
      </div>
    </div>
  );
};
