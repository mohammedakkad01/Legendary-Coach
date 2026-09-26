/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Club Facilities & Finances Hub
 * Stadium expansion, medical center, training grounds, and financial balance sheet.
 */

import React, { useEffect, useState } from 'react';
import { useGameStore } from '../state/useGameStore';
import { ClubFacilities } from '../types/game';
import { Building2, Landmark, ShieldCheck, HeartPulse, Sparkles, TrendingUp, Crown, Zap, Clock } from 'lucide-react';
import { VIP_LEVELS } from '../data/vipData';

const formatRemaining = (ms: number, isAr: boolean) => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return isAr ? `${h}س ${m}د` : `${h}h ${m}m`;
  if (m > 0) return isAr ? `${m}د ${s}ث` : `${m}m ${s}s`;
  return isAr ? `${s}ث` : `${s}s`;
};

export const ClubFacilitiesView: React.FC = () => {
  const { club, upgradeFacility, skipFacilityUpgrade, pendingFacilityUpgrades, vipPoints, language } = useGameStore();
  const isAr = language === 'ar';
  const f = club.facilities;
  const [, forceTick] = useState(0);
  const [skipFeedback, setSkipFeedback] = useState<string | null>(null);

  // Re-render every second so countdowns move; actual completion is handled
  // by the global tick in App.tsx (processFacilityUpgrades).
  useEffect(() => {
    const interval = setInterval(() => forceTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSkip = (key: keyof ClubFacilities) => {
    const res = skipFacilityUpgrade(key);
    setSkipFeedback(res.message);
    setTimeout(() => setSkipFeedback(null), 4000);
  };

  // Calculate current VIP Tier for facility benefits
  let currentVipTier = VIP_LEVELS[0];
  for (const tier of VIP_LEVELS) {
    if ((vipPoints || 0) >= tier.pointsRequired) {
      currentVipTier = tier;
    }
  }
  const hasFreeSkip = !!currentVipTier.hasFreeSkipWaitTimes;

  const facilityList: {
    key: keyof ClubFacilities;
    titleAr: string;
    titleEn: string;
    level: number;
    descAr: string;
    descEn: string;
    icon: string;
  }[] = [
    {
      key: 'stadiumLevel',
      titleAr: 'الاستاد والمدرجات الرياضية',
      titleEn: 'Stadium & Stands Expansion',
      level: f.stadiumLevel,
      descAr: 'زيادة سعة الجماهير ورفع إيرادات مبيعات التذاكر في كل مباراة رسمية على أرضك.',
      descEn: 'Expands stadium attendance capacity and drives higher gate matchday receipts.',
      icon: '🏟️',
    },
    {
      key: 'trainingGroundLevel',
      titleAr: 'مقر التدريب والمنشآت البدنية',
      titleEn: 'Training Ground Complex',
      level: f.trainingGroundLevel,
      descAr: 'تحسين كفاءة الحصص التدريبية ورفع معدل نمو طاقات اللاعبين بنسبة 15%.',
      descEn: 'Improves tactical drill efficiency and accelerates youth attribute progression.',
      icon: '🏋️',
    },
    {
      key: 'youthAcademyLevel',
      titleAr: 'أكاديمية الناشئين والمواهب',
      titleEn: 'Youth Academy & Scouting Hub',
      level: f.youthAcademyLevel,
      descAr: 'زيادة فرص اكتشاف جواهر كروية نادرة بطاقات محتملة تصل إلى 85+ OVR.',
      descEn: 'Boosts the discovery rate of elite wonderkids with 85+ potential ceilings.',
      icon: '⭐',
    },
    {
      key: 'medicalCenterLevel',
      titleAr: 'المركز الطبي والتأهيلي',
      titleEn: 'Medical & Rehab Clinic',
      level: f.medicalCenterLevel,
      descAr: 'تقليص مدة غياب اللاعبين المصابين بنسبة 30% والوقاية من الإصابات العضلية.',
      descEn: 'Reduces recovery times for injured stars by 30% and prevents muscle strain.',
      icon: '🏥',
    },
    {
      key: 'scoutingNetworkLevel',
      titleAr: 'شبكة الكشافين الدولية',
      titleEn: 'Global Scouting Network',
      level: f.scoutingNetworkLevel,
      descAr: 'دقة أعلى في تقييمات اللاعبين المستهدفين ورصد أسرع للفرص الاستثمارية في السوق.',
      descEn: 'Higher attribute scouting accuracy and earlier alerts on high-value transfer targets.',
      icon: '🔭',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-6 space-y-6">
      
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950 border border-slate-800 rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold mb-1">
            <Building2 className="w-4 h-4" />
            <span>{isAr ? 'البنية التحتية والمنشآت الرياضية' : 'Infrastructure & Facilities'}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black font-heading text-white">
            {isAr ? 'تطوير مرافق النادي والمركز المالي' : 'Club Facilities & Financial Balance'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            {isAr ? 'استثمر فائض الكوينز في تطوير مرافق النادي لضمان استدامة النمو وتوليد دخل دوري أعلى.' : 'Reinvest match winnings into club facilities to secure sustainable prestige and revenue.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 text-center min-w-[150px]">
            <span className="text-[11px] text-slate-400 block font-bold">{isAr ? 'الخزينة النقدية' : 'Treasury Balance'}</span>
            <span className="text-xl font-black text-amber-300">{club.finances.coins.toLocaleString()} 💰</span>
          </div>

          <div className="bg-gradient-to-r from-amber-950/60 to-slate-950 p-3.5 rounded-2xl border border-amber-500/30 text-center min-w-[150px] shadow-lg">
            <div className="flex items-center justify-center gap-1 text-[11px] text-amber-400 font-bold">
              <Crown className="w-3.5 h-3.5 text-amber-400" />
              <span>{isAr ? `مزايا VIP ${currentVipTier.level}` : `VIP ${currentVipTier.level} Buff`}</span>
            </div>
            <span className="text-sm font-black text-white block mt-0.5">
              +{currentVipTier.incomeBonusPercent}% {isAr ? 'أرباح المنشآت' : 'Facility Yield'}
            </span>
          </div>
        </div>
      </div>

      {skipFeedback && (
        <div className="p-3 rounded-2xl bg-purple-950/70 border border-purple-500/40 text-purple-200 text-xs font-bold text-center">
          {skipFeedback}
        </div>
      )}

      {/* Facilities Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {facilityList.map((item) => {
          const upgradeCost = item.level * 35000;
          const canAfford = club.finances.coins >= upgradeCost && item.level < 10;
          const pending = pendingFacilityUpgrades.find(p => p.facility === item.key);
          const remainingMs = pending ? Math.max(0, new Date(pending.completesAt).getTime() - Date.now()) : 0;

          return (
            <div key={item.key} className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-xl flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-3xl">{item.icon}</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-black border border-indigo-500/30">
                    {isAr ? `المستوى ${item.level} / 10` : `Lvl ${item.level} / 10`}
                  </span>
                </div>

                <div>
                  <h3 className="font-heading font-black text-sm sm:text-base text-white">
                    {isAr ? item.titleAr : item.titleEn}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    {isAr ? item.descAr : item.descEn}
                  </p>
                </div>
              </div>

              {pending ? (
                <div className="pt-3 border-t border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-amber-300 font-bold">
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {isAr ? 'قيد التطوير...' : 'Under construction...'}</span>
                    <span>{formatRemaining(remainingMs, isAr)}</span>
                  </div>
                  <button
                    onClick={() => handleSkip(item.key)}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-black shadow-lg transition-all flex items-center justify-center gap-1.5 ${
                      hasFreeSkip
                        ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-black'
                        : 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white'
                    }`}
                  >
                    {hasFreeSkip ? <Crown className="w-3.5 h-3.5" /> : <Zap className="w-3.5 h-3.5" />}
                    {hasFreeSkip
                      ? (isAr ? 'تخطي فوري مجاني (VIP 17)' : 'Free Instant Skip (VIP 17)')
                      : (isAr ? 'تخطي بالجواهر 💎' : 'Skip with Diamonds 💎')}
                  </button>
                </div>
              ) : (
                <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-500 block">{isAr ? 'تكلفة التطوير' : 'Cost'}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-black text-amber-300">
                        {item.level < 10 ? `${upgradeCost.toLocaleString()} 💰` : (isAr ? 'الحد الأقصى' : 'Max Level')}
                      </span>
                      {item.level < 10 && (
                        <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-1 rounded border border-amber-500/20">
                          +50 VIP
                        </span>
                      )}
                    </div>
                  </div>

                  {item.level < 10 && (
                    <button
                      onClick={() => upgradeFacility(item.key)}
                      disabled={!canAfford}
                      className={`px-4 py-2 rounded-xl text-xs font-black shadow-lg transition-all ${
                        canAfford
                          ? 'bg-indigo-500 hover:bg-indigo-400 text-white cursor-pointer shadow-indigo-500/20'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      {canAfford ? (isAr ? 'ترقية المنشأة' : 'Upgrade') : (isAr ? 'الرصيد لا يكفي' : 'No Funds')}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Financial Balance Sheet Summary Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold mb-1">
              <Landmark className="w-4 h-4" />
              <span>{isAr ? 'دفتر الأستاذ والمالية' : 'Financial Ledger'}</span>
            </div>
            <h3 className="font-heading font-black text-base text-white">
              {isAr ? 'إيرادات ونفقات المباراة' : 'Matchday Cashflow'}
            </h3>

            <div className="mt-3 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-300">
                <span>{isAr ? 'عائد الرعاة لكل مباراة:' : 'Sponsor Payout:'}</span>
                <span className="font-bold text-emerald-400">+{club.finances.sponsorIncomePerMatch.toLocaleString()} 💰</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span>{isAr ? 'متوسط مبيعات التذاكر:' : 'Gate Receipts:'}</span>
                <span className="font-bold text-emerald-400">+{(club.finances.ticketPrice * 5200).toLocaleString()} 💰</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span>{isAr ? 'فاتورة رواتب التشكيلة:' : 'Weekly Wages:'}</span>
                <span className="font-bold text-rose-400">-34,500 💰</span>
              </div>
            </div>
          </div>

          <div className="p-2.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-center">
            <span className="text-[11px] font-bold text-emerald-300">
              {isAr ? 'المركز المالي للنادي مستقر وذو ربحية إيجابية' : 'Positive matchday operating margin'}
            </span>
          </div>
        </div>

      </div>

    </div>
  );
};