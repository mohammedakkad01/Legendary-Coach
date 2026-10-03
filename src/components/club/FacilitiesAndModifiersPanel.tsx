/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * FacilitiesAndModifiersPanel — Infrastructure, Analytics Department & Domain Modifiers (Phase E).
 */

import React, { useMemo } from 'react';
import { 
  Building2, 
  Crown, 
  Zap, 
  Clock, 
  Sparkles, 
  Activity, 
  ShieldCheck, 
  HeartPulse, 
  Search, 
  BarChart3, 
  Target, 
  Dumbbell, 
  Award,
  TrendingUp
} from 'lucide-react';
import type { ClubFacilities } from '../../types/game';
import type { 
  ClubFacilitiesExtended, 
  ClubSystemModifiers, 
  StaffMember 
} from '../../domain/clubManagement/types';
import { computeClubSystemModifiers } from '../../domain/clubManagement/modifiers/attributeModifier';
import { VIP_LEVELS } from '../../data/vipData';

const formatRemaining = (ms: number, isAr: boolean) => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return isAr ? `${h}س ${m}د` : `${h}h ${m}m`;
  if (m > 0) return isAr ? `${m}د ${s}ث` : `${m}m ${s}s`;
  return isAr ? `${s}ث` : `${s}s`;
};

interface FacilitiesAndModifiersPanelProps {
  isAr: boolean;
  facilities: ClubFacilities;
  analyticsDepartmentLevel: number;
  coins: number;
  diamonds: number;
  vipPoints: number;
  pendingUpgrades: Array<{ facility: keyof ClubFacilities; completesAt: string; targetLevel: number }>;
  staffMembers: StaffMember[];
  fanMood: number;
  onUpgradeFacility: (key: keyof ClubFacilities) => void;
  onSkipUpgrade: (key: keyof ClubFacilities) => void;
  onUpgradeAnalytics: () => { success: boolean; message: string };
}

export const FacilitiesAndModifiersPanel: React.FC<FacilitiesAndModifiersPanelProps> = ({
  isAr,
  facilities,
  analyticsDepartmentLevel,
  coins,
  diamonds,
  vipPoints,
  pendingUpgrades,
  staffMembers,
  fanMood,
  onUpgradeFacility,
  onSkipUpgrade,
  onUpgradeAnalytics,
}) => {
  // Determine VIP benefits
  let currentVipTier = VIP_LEVELS[0];
  for (const tier of VIP_LEVELS) {
    if ((vipPoints || 0) >= tier.pointsRequired) {
      currentVipTier = tier;
    }
  }
  const hasFreeSkip = !!currentVipTier.hasFreeSkipWaitTimes;

  // Extended facilities including analytics department
  const extendedFacilities: ClubFacilitiesExtended = useMemo(() => ({
    ...facilities,
    analyticsDepartmentLevel: analyticsDepartmentLevel || 1,
  }), [facilities, analyticsDepartmentLevel]);

  // Authoritative system modifiers computed via domain
  const modifiers: ClubSystemModifiers = useMemo(() => {
    return computeClubSystemModifiers({
      staff: staffMembers,
      facilities: extendedFacilities,
      fanMood,
      scoutingNetworkLevel: facilities.scoutingNetworkLevel,
    });
  }, [staffMembers, extendedFacilities, fanMood, facilities.scoutingNetworkLevel]);

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
      level: facilities.stadiumLevel,
      descAr: 'زيادة سعة الجماهير ورفع إيرادات مبيعات التذاكر في كل مباراة رسمية على أرضك.',
      descEn: 'Expands stadium capacity and increases gate matchday revenue.',
      icon: '🏟️',
    },
    {
      key: 'trainingGroundLevel',
      titleAr: 'مقر التدريب والمنشآت البدنية',
      titleEn: 'Training Ground Complex',
      level: facilities.trainingGroundLevel,
      descAr: 'تحسين كفاءة الحصص التدريبية ورفع معدل نمو طاقات اللاعبين بنسبة 15%.',
      descEn: 'Improves tactical drill efficiency and accelerates youth attribute progression.',
      icon: '🏋️',
    },
    {
      key: 'youthAcademyLevel',
      titleAr: 'أكاديمية الناشئين والمواهب',
      titleEn: 'Youth Academy & Scouting Hub',
      level: facilities.youthAcademyLevel,
      descAr: 'زيادة فرص اكتشاف جواهر كروية نادرة بطاقات محتملة تصل إلى 85+ OVR.',
      descEn: 'Boosts the discovery rate of elite wonderkids with 85+ potential ceilings.',
      icon: '⭐',
    },
    {
      key: 'medicalCenterLevel',
      titleAr: 'المركز الطبي والتأهيلي',
      titleEn: 'Medical & Rehab Clinic',
      level: facilities.medicalCenterLevel,
      descAr: 'تقليص مدة غياب اللاعبين المصابين بنسبة 30% والوقاية من الإصابات العضلية.',
      descEn: 'Reduces recovery times for injured stars by 30% and prevents muscle strain.',
      icon: '🏥',
    },
    {
      key: 'scoutingNetworkLevel',
      titleAr: 'شبكة الكشافين الدولية',
      titleEn: 'Global Scouting Network',
      level: facilities.scoutingNetworkLevel,
      descAr: 'دقة أعلى في تقييمات اللاعبين المستهدفين ورصد أسرع للفرص الاستثمارية في السوق.',
      descEn: 'Higher attribute scouting accuracy and earlier alerts on high-value transfer targets.',
      icon: '🔭',
    },
  ];

  return (
    <div className="space-y-6">
      
      {/* Live System Modifiers Dashboard */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/30 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading font-black text-base text-white">
                {isAr ? 'المؤشرات الحسابية لمنظومة النادي (Club System Modifiers)' : 'Club System Modifiers & Operational Efficiency'}
              </h3>
              <p className="text-xs text-slate-400">
                {isAr ? 'محسوبة بدقة بناءً على جودة المنشآت وكفاءة الطواقم ومزاج الجماهير' : 'Domain modifiers reflecting staff, infrastructure & fan morale'}
              </p>
            </div>
          </div>

          <span className="px-3 py-1 rounded-xl bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-xs font-bold">
            {isAr ? 'تأثير مباشر على المباريات والتدريب' : 'Active System Buffs'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
          
          <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
            <span className="text-slate-400 block text-[10px]">{isAr ? 'كفاءة التدريب' : 'Training Efficiency'}</span>
            <span className="text-base font-black text-emerald-400">
              {Math.round(modifiers.trainingEffectiveness * 100)}%
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
            <span className="text-slate-400 block text-[10px]">{isAr ? 'معدل تطور المواهب' : 'Development Rate'}</span>
            <span className="text-base font-black text-sky-400">
              {Math.round(modifiers.developmentRate * 100)}%
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
            <span className="text-slate-400 block text-[10px]">{isAr ? 'سرعة الاستشفاء الطبي' : 'Medical Recovery'}</span>
            <span className="text-base font-black text-teal-400">
              {Math.round(modifiers.medicalRecoveryMult * 100)}%
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
            <span className="text-slate-400 block text-[10px]">{isAr ? 'دقة تقارير الكشافة' : 'Scouting Accuracy'}</span>
            <span className="text-base font-black text-amber-400">
              {Math.round(modifiers.scoutReportQualityMult * 100)}%
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
            <span className="text-slate-400 block text-[10px]">{isAr ? 'تحليل المنافسين' : 'Opposition Analysis'}</span>
            <span className="text-base font-black text-purple-400">
              {Math.round(modifiers.oppositionAnalysisMult * 100)}%
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
            <span className="text-slate-400 block text-[10px]">{isAr ? 'تدريب الكرات الثابتة' : 'Set Piece Quality'}</span>
            <span className="text-base font-black text-indigo-400">
              {Math.round(modifiers.setPieceQualityMult * 100)}%
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
            <span className="text-slate-400 block text-[10px]">{isAr ? 'سعة مدرجات الاستاد' : 'Gate Capacity'}</span>
            <span className="text-base font-black text-white">
              {modifiers.gateCapacity.toLocaleString()} {isAr ? 'مقعد' : 'seats'}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
            <span className="text-slate-400 block text-[10px]">{isAr ? 'معدل الحضور الجماهيري' : 'Attendance Mult'}</span>
            <span className="text-base font-black text-emerald-400">
              {Math.round(modifiers.stadiumAttendanceMult * 100)}%
            </span>
          </div>

        </div>
      </div>

      {/* Facilities Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        
        {/* Core 5 Facilities */}
        {facilityList.map((item) => {
          const upgradeCost = item.level * 35000;
          const canAfford = coins >= upgradeCost && item.level < 10;
          const pending = pendingUpgrades.find((p) => p.facility === item.key);
          const remainingMs = pending ? Math.max(0, new Date(pending.completesAt).getTime() - Date.now()) : 0;

          return (
            <div
              key={String(item.key)}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-xl flex flex-col justify-between"
            >
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
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {isAr ? 'قيد التطوير...' : 'Under construction...'}
                    </span>
                    <span>{formatRemaining(remainingMs, isAr)}</span>
                  </div>
                  <button
                    onClick={() => onSkipUpgrade(item.key)}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-black shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
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
                    </div>
                  </div>

                  {item.level < 10 && (
                    <button
                      onClick={() => onUpgradeFacility(item.key)}
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

        {/* Phase E Extended Facility: Analytics Department */}
        <div className="bg-slate-900 border border-indigo-500/40 rounded-3xl p-5 space-y-4 shadow-xl flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-3xl">💻</span>
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-black border border-indigo-500/30">
                {isAr ? `المستوى ${analyticsDepartmentLevel} / 10` : `Lvl ${analyticsDepartmentLevel} / 10`}
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-heading font-black text-sm sm:text-base text-white">
                  {isAr ? 'قسم التحليل الرياضي والبيانات' : 'Analytics & Data Department'}
                </h3>
                <span className="px-1.5 py-0.2 text-[9px] font-black rounded bg-indigo-600 text-white uppercase">
                  {isAr ? 'جديد' : 'New'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                {isAr
                  ? 'رفع دقة تحليل المنافسين ومخططات اللعب التكتيكية، واكتشاف ثغرات خطوط الخصم قبل صافرة البداية.'
                  : 'Empowers tactical opposition scouting, expected performance telemetry, and weaknesses identification.'}
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-500 block">{isAr ? 'تكلفة التحديث' : 'Upgrade Cost'}</span>
              <span className="text-xs font-black text-amber-300">
                {analyticsDepartmentLevel < 10
                  ? `${(analyticsDepartmentLevel * 30000).toLocaleString()} 💰`
                  : (isAr ? 'الحد الأقصى' : 'Max Level')}
              </span>
            </div>

            {analyticsDepartmentLevel < 10 && (
              <button
                onClick={onUpgradeAnalytics}
                disabled={coins < analyticsDepartmentLevel * 30000}
                className={`px-4 py-2 rounded-xl text-xs font-black shadow-lg transition-all ${
                  coins >= analyticsDepartmentLevel * 30000
                    ? 'bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white cursor-pointer shadow-indigo-600/30'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                {coins >= analyticsDepartmentLevel * 30000
                  ? (isAr ? 'تطوير القسم' : 'Upgrade')
                  : (isAr ? 'الرصيد لا يكفي' : 'No Funds')}
              </button>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
