/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Training Sessions & Workload Panel (Phase C)
 * Select category + intensity, view training load, fatigue, sharpness, and real injury risk.
 * High-risk warning with one-tap recovery / rotation execution.
 */

import React, { useState } from 'react';
import { useGameStore } from '../../state/useGameStore';
import { useFeedback } from '../../context/FeedbackContext';
import type { TrainingCategory, TrainingIntensity, TrainingSessionPlan } from '../../domain/playerLife/types';
import { computeInMatchInjuryProbability } from '../../domain/playerLife/injuryRisk';
import { ConditionMeter } from './PlayerLifeBadges';
import { Dumbbell, ShieldAlert, Sparkles, HeartPulse, Check, Flame, Activity } from 'lucide-react';

const CATEGORIES: { id: TrainingCategory; labelAr: string; labelEn: string; descAr: string; descEn: string }[] = [
  {
    id: 'tactical',
    labelAr: 'تكتيكي وخططي',
    labelEn: 'Tactical & Shape',
    descAr: 'ترسيخ التمركز الجماعي والانتقالات السريعة.',
    descEn: 'Reinforces team shape and rapid transitions.',
  },
  {
    id: 'technical',
    labelAr: 'مهاري وفني',
    labelEn: 'Technical & Touch',
    descAr: 'التحكم بالكرة ودقة التمرير والحسم في المساحات.',
    descEn: 'Ball control, short passing accuracy, and first touch.',
  },
  {
    id: 'physical',
    labelAr: 'بدني ولياقي',
    labelEn: 'Physical & Conditioning',
    descAr: 'بناء التحمل العضلي والسرعة الانفجارية.',
    descEn: 'Builds stamina, aerobic capacity, and sprint speed.',
  },
  {
    id: 'mental',
    labelAr: 'ذهني وتركيز',
    labelEn: 'Mental & Focus',
    descAr: 'رفع الهدوء تحت الضغط واليقظة الذهنية.',
    descEn: 'Composure under pressure and tactical alertness.',
  },
  {
    id: 'position_specific',
    labelAr: 'تخصصي حسب المركز',
    labelEn: 'Positional Specific',
    descAr: 'تدريبات مخصصة للمهاجمين، المدافعين، وصناع اللعب.',
    descEn: 'Specialized drills tailored to specific position groups.',
  },
  {
    id: 'team_cohesion',
    labelAr: 'تناغم وانسجام الفريق',
    labelEn: 'Team Cohesion',
    descAr: 'تعزيز التفاهم والروح المعنوية الجماعية.',
    descEn: 'Strengthens dressing room chemistry and mutual trust.',
  },
  {
    id: 'set_pieces',
    labelAr: 'كرات ثابتة وعرضيات',
    labelEn: 'Set Pieces & Crosses',
    descAr: 'إتقان الركنيات، الركلات الحرة، والتمركز في الكرات الهوائية.',
    descEn: 'Corners, set routines, and aerial box delivery.',
  },
  {
    id: 'recovery',
    labelAr: 'استشفاء وتجديد نشاط',
    labelEn: 'Active Recovery',
    descAr: 'تمارين خفيفة وتدليك لتصريف الإجهاد وتفادي الإصابات.',
    descEn: 'Light mobility and muscle flush to drop fatigue and prevent strains.',
  },
];

const INTENSITIES: { id: TrainingIntensity; labelAr: string; labelEn: string; cost: number }[] = [
  { id: 'low', labelAr: 'منخفضة (استشفائية)', labelEn: 'Low (Recovery)', cost: 20 },
  { id: 'normal', labelAr: 'متوازنة (اعتيادية)', labelEn: 'Normal (Standard)', cost: 30 },
  { id: 'high', labelAr: 'عالية (مكثفة)', labelEn: 'High (Intense)', cost: 40 },
  { id: 'very_high', labelAr: 'قصوى (ضغط عالٍ)', labelEn: 'Very High (Peak)', cost: 50 },
];

export const TrainingSessionsPanel: React.FC = () => {
  const { club, language, runCustomTrainingPlan, runSquadRecoverySession } = useGameStore();
  const { toast } = useFeedback();
  const isAr = language === 'ar';

  const [category, setCategory] = useState<TrainingCategory>('tactical');
  const [intensity, setIntensity] = useState<TrainingIntensity>('normal');

  const squad = club.footballSquad;
  const tp = club.finances.trainingPoints;

  // Compute Squad Averages (pure projection)
  const avgLoad =
    squad.length > 0
      ? Math.round(squad.reduce((s, p) => s + (p.playerLife?.condition.trainingLoad ?? 25), 0) / squad.length)
      : 0;

  const avgFatigue =
    squad.length > 0 ? Math.round(squad.reduce((s, p) => s + (p.fatigue ?? 20), 0) / squad.length) : 0;

  const avgSharpness =
    squad.length > 0
      ? Math.round(squad.reduce((s, p) => s + (p.playerLife?.condition.sharpness ?? 50), 0) / squad.length)
      : 50;

  // Real Injury Risk using domain computeInMatchInjuryProbability
  const avgInjuryRiskProb =
    squad.length > 0
      ? squad.reduce(
          (s, p) =>
            s +
            computeInMatchInjuryProbability(p, {
              medicalCenterLevel: club.facilities.medicalCenterLevel,
              recentMatchesIn7Days: 1,
              minutesThisMatch: 90,
            }),
          0,
        ) / squad.length
      : 0.05;

  const injuryRiskPercent = Math.round(avgInjuryRiskProb * 100);
  const isHighRisk = injuryRiskPercent >= 12 || avgFatigue >= 60 || avgLoad >= 70;

  const selectedIntensityMeta = INTENSITIES.find((i) => i.id === intensity) || INTENSITIES[1];

  const handleExecuteSession = () => {
    const plan: TrainingSessionPlan = { category, intensity };
    const success = runCustomTrainingPlan(plan);
    if (success) {
      toast.success(
        isAr ? 'تم تطبيق الحصة التدريبية وتحديث جاهزية الفريق!' : 'Training session executed successfully!',
        isAr ? 'الحصص التدريبية' : 'Training Plan',
      );
    } else {
      toast.error(
        isAr ? 'نقاط التدريب المتاحة غير كافية لهذه الحصة.' : 'Not enough training points (TP) for this session.',
        isAr ? 'رصيد غير كافٍ' : 'Insufficient TP',
      );
    }
  };

  const handleOneTapRecovery = () => {
    const res = runSquadRecoverySession();
    if (res.success) {
      toast.success(res.message, isAr ? 'جلسة استشفاء فورية' : 'Quick Recovery Applied');
    } else {
      toast.error(res.message, isAr ? 'تعذر الاستشفاء' : 'Recovery Failed');
    }
  };

  return (
    <div className="space-y-5">
      {/* High Injury Risk Warning Banner */}
      {isHighRisk && (
        <div className="bg-rose-950/80 border border-rose-500/60 rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-900/60 border border-rose-500 flex items-center justify-center text-rose-300 shrink-0">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-black text-white">
                {isAr ? 'تحذير طبي: مؤشر خطر الإصابات مرتفع!' : 'Medical Alert: High Squad Injury Risk!'}
              </h4>
              <p className="text-xs text-rose-200 mt-0.5">
                {isAr
                  ? `بلغ متوسط إجهاد التشكيلة %${avgFatigue} ومخاطر الشد العضلي %${injuryRiskPercent}. يُوصى فوراً بتطبيق جلسة استشفاء أو المداورة.`
                  : `Squad fatigue is at ${avgFatigue}% and muscle strain risk is elevated to ${injuryRiskPercent}%. Immediate rotation or recovery recommended.`}
              </p>
            </div>
          </div>

          <button
            onClick={handleOneTapRecovery}
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs shadow-lg transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer shrink-0"
          >
            <HeartPulse className="w-4 h-4" />
            <span>{isAr ? 'تطبيق استشفاء فوري (500 💰)' : 'Apply Quick Recovery (500 💰)'}</span>
          </button>
        </div>
      )}

      {/* Squad Indicators Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-sky-400 text-xs font-bold">
            <Activity className="w-4 h-4" />
            <span>{isAr ? 'مؤشرات الحمل والجاهزية البدنية للتشكيلة' : 'Squad Load & Readiness Indicators'}</span>
          </div>
          <span className="text-xs font-bold text-slate-400">
            {isAr ? 'رصيد نقاط التدريب' : 'Available TP'}: <strong className="text-emerald-400">{tp} TP</strong>
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <ConditionMeter
            label={isAr ? 'حمل التدريب' : 'Training Load'}
            value={avgLoad}
            color={avgLoad > 70 ? 'amber' : 'sky'}
          />
          <ConditionMeter
            label={isAr ? 'متوسط الإجهاد' : 'Fatigue Level'}
            value={avgFatigue}
            color={avgFatigue > 50 ? 'rose' : 'emerald'}
          />
          <ConditionMeter
            label={isAr ? 'الحِدّة التنافسية' : 'Match Sharpness'}
            value={avgSharpness}
            color="emerald"
          />
          <ConditionMeter
            label={isAr ? 'مخاطر الإصابة' : 'Injury Probability'}
            value={injuryRiskPercent}
            color={injuryRiskPercent >= 12 ? 'rose' : 'emerald'}
          />
        </div>
      </div>

      {/* Plan Configuration Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Category Selector (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-3.5 shadow-xl">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            {isAr ? '1. اختر نوع الحصة التدريبية' : '1. Select Training Category'}
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {CATEGORIES.map((cat) => {
              const isSelected = category === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={`p-3.5 rounded-2xl border text-start transition-all cursor-pointer min-h-[52px] ${
                    isSelected
                      ? 'bg-sky-950/70 border-sky-500 shadow-md shadow-sky-500/10'
                      : 'bg-slate-950/50 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <p className="text-xs font-black text-white flex items-center justify-between">
                    <span>{isAr ? cat.labelAr : cat.labelEn}</span>
                    {isSelected && <Check className="w-4 h-4 text-sky-400" />}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1 leading-snug">
                    {isAr ? cat.descAr : cat.descEn}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Intensity Selector & Execution (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-xl flex flex-col justify-between">
          <div className="space-y-3.5">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {isAr ? '2. اختر شدة الحصة' : '2. Select Intensity Level'}
            </h4>

            <div className="space-y-2">
              {INTENSITIES.map((lvl) => {
                const isSelected = intensity === lvl.id;
                return (
                  <button
                    key={lvl.id}
                    onClick={() => setIntensity(lvl.id)}
                    className={`w-full p-3 rounded-2xl border flex items-center justify-between transition-all cursor-pointer min-h-[44px] ${
                      isSelected
                        ? 'bg-emerald-950/60 border-emerald-500 text-white'
                        : 'bg-slate-950/40 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <span className="text-xs font-bold">{isAr ? lvl.labelAr : lvl.labelEn}</span>
                    <span className="text-xs font-black text-emerald-400">{lvl.cost} TP</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-bold">{isAr ? 'تكلفة الحصة' : 'Session Cost'}:</span>
              <span className="text-base font-black text-emerald-400">{selectedIntensityMeta.cost} TP</span>
            </div>

            <button
              onClick={handleExecuteSession}
              disabled={tp < selectedIntensityMeta.cost}
              className={`w-full py-3.5 rounded-2xl font-black text-xs flex items-center justify-center gap-2 shadow-lg transition active:scale-95 cursor-pointer ${
                tp >= selectedIntensityMeta.cost
                  ? 'bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white shadow-sky-600/30'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50'
              }`}
            >
              <Dumbbell className="w-4 h-4" />
              <span>{isAr ? 'بدء الحصة التدريبية' : 'Execute Training Session'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
