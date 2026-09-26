/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Training & Youth Academy View
 * Tactical drills, stamina conditioning, and youth wonderkid promotions.
 */

import React from 'react';
import { useGameStore } from '../state/useGameStore';
import { Dumbbell, Sparkles, UserPlus, Flame, HeartPulse, Crosshair, Search, Check, X, Crown, Star } from 'lucide-react';
import { VIP_LEVELS } from '../data/vipData';

export const TrainingAcademyView: React.FC = () => {
  const {
    club,
    runTrainingDrill,
    promoteAcademyTalent,
    scoutAcademyTalent,
    promoteAcademyDiscovery,
    releaseAcademyDiscovery,
    academyDiscoveries,
    vipPoints,
    currentSport,
    language
  } = useGameStore();
  const isAr = language === 'ar';
  const squad = currentSport === 'football' ? club.footballSquad : club.basketballSquad;
  const [academyFeedback, setAcademyFeedback] = React.useState<string | null>(null);

  let currentVipTier = VIP_LEVELS[0];
  for (const tier of VIP_LEVELS) {
    if (vipPoints >= tier.pointsRequired) currentVipTier = tier;
  }
  const maxAcademySlots = currentVipTier.maxAcademySlots || 1;
  const SCOUT_COST_TP = 60;

  const handleScout = () => {
    const res = scoutAcademyTalent();
    setAcademyFeedback(res.message);
    setTimeout(() => setAcademyFeedback(null), 5000);
  };

  const handlePromoteDiscovery = (id: string) => {
    const res = promoteAcademyDiscovery(id);
    setAcademyFeedback(res.message);
    setTimeout(() => setAcademyFeedback(null), 4000);
  };

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-6 space-y-6">
      
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-emerald-950/70 via-slate-900 to-emerald-950/70 border border-emerald-500/30 rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold mb-1">
            <Dumbbell className="w-4 h-4" />
            <span>{isAr ? 'مجمع التدريب الرياضي وتطوير المواهب' : 'Sports Training Complex & Academy'}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black font-heading text-white">
            {isAr ? 'التدريب اليومي وأكاديمية الناشئين' : 'Daily Conditioning & Youth Academy'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            {isAr ? 'خصص الحصص التدريبية لرفع لياقة اللاعبين وتطوير مواهب الأكاديمية الصاعدة.' : 'Allocate drills to restore stamina, refine match form, and graduate future wonderkids.'}
          </p>
        </div>

        {/* Training Points Balance */}
        <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 text-center min-w-[160px]">
          <span className="text-[11px] text-slate-400 block font-bold">{isAr ? 'نقاط التدريب المتاحة' : 'Training Points'}</span>
          <span className="text-2xl font-black text-emerald-400">{club.finances.trainingPoints} TP</span>
        </div>
      </div>

      {/* Drill Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Drill 1: Stamina & Conditioning */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-xl flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-2xl">
              <HeartPulse className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-heading font-black text-base text-white">
                {isAr ? 'حصة التحمل واللياقة البدنية' : 'Endurance & Stamina Drill'}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {isAr ? 'تمارين هوائية شاقة لرفع لياقة التشكيلة (+8% لياقة) وتقليل الإجهاد التراكمي.' : 'Intense cardio circuit restoring +8% squad stamina and reducing match fatigue.'}
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">{isAr ? 'التكلفة: 30 نقطة' : 'Cost: 30 TP'}</span>
            <button
              onClick={() => runTrainingDrill('stamina')}
              disabled={club.finances.trainingPoints < 30}
              className={`px-4 py-2 rounded-xl text-xs font-black shadow-lg transition-all ${
                club.finances.trainingPoints >= 30
                  ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 cursor-pointer shadow-cyan-500/20'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              {isAr ? 'بدء الحصة' : 'Run Drill'}
            </button>
          </div>
        </div>

        {/* Drill 2: Technical & Morale */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-xl flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-2xl">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-heading font-black text-base text-white">
                {isAr ? 'التمركز والتناغم التكتيكي' : 'Tactical Shape & Positioning'}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {isAr ? 'تمارين مصغرة بالكرة لرفع فورمة اللاعبين (+1 فورمة) والمعنويات في المباريات.' : 'Small-sided ball work boosting player match form (+1 Form) and team morale.'}
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">{isAr ? 'التكلفة: 40 نقطة' : 'Cost: 40 TP'}</span>
            <button
              onClick={() => runTrainingDrill('technical')}
              disabled={club.finances.trainingPoints < 40}
              className={`px-4 py-2 rounded-xl text-xs font-black shadow-lg transition-all ${
                club.finances.trainingPoints >= 40
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer shadow-amber-500/20'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              {isAr ? 'بدء الحصة' : 'Run Drill'}
            </button>
          </div>
        </div>

        {/* Drill 3: Finishing & Youth Academy Star */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-xl flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-2xl">
              <Crosshair className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-heading font-black text-base text-white">
                {isAr ? 'إنهاء الهجمات والتسديد' : 'Shooting & Finishing Clinical'}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {isAr ? 'تدريبات على الكرات العرضية والانفرادات لرفع طاقة الهجوم وتطوير التقييم العام.' : 'Sharpshooting drills honing composure and accelerating attribute growth.'}
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">{isAr ? 'التكلفة: 40 نقطة' : 'Cost: 40 TP'}</span>
            <button
              onClick={() => runTrainingDrill('finishing')}
              disabled={club.finances.trainingPoints < 40}
              className={`px-4 py-2 rounded-xl text-xs font-black shadow-lg transition-all ${
                club.finances.trainingPoints >= 40
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 cursor-pointer shadow-emerald-500/20'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              {isAr ? 'بدء الحصة' : 'Run Drill'}
            </button>
          </div>
        </div>

      </div>

      {/* Youth Academy — Scouting (Football: real discovery slots / Basketball: legacy instant promote) */}
      {currentSport === 'football' ? (
        <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 border border-indigo-500/30 rounded-3xl p-6 shadow-2xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-indigo-400" />
                <h3 className="text-lg font-black font-heading text-white">
                  {isAr ? 'أكاديمية الشباب — اكتشاف المواهب' : 'Youth Academy Scouting'}
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 max-w-xl leading-relaxed">
                {isAr
                  ? `أرسل الكشافين لاكتشاف موهبة جديدة (تكلفة ${SCOUT_COST_TP} نقطة تدريب). مستوى منشأة أكاديمية الشباب يرفع فرصتك بموهبة 5 نجوم.`
                  : `Send scouts to discover a new prospect (${SCOUT_COST_TP} training points). A higher Youth Academy facility level improves your odds of a 5-star find.`}
              </p>
            </div>

            <div className="flex flex-col items-center gap-2 flex-shrink-0">
              <span className="text-[11px] text-slate-400 font-bold">
                {isAr ? 'خانات الاكتشاف' : 'Discovery Slots'}: {academyDiscoveries.length}/{maxAcademySlots}
              </span>
              <button
                onClick={handleScout}
                disabled={academyDiscoveries.length >= maxAcademySlots || club.finances.trainingPoints < SCOUT_COST_TP}
                className={`px-6 py-3.5 rounded-2xl font-black text-xs sm:text-sm shadow-xl whitespace-nowrap flex items-center gap-2 ${
                  academyDiscoveries.length >= maxAcademySlots || club.finances.trainingPoints < SCOUT_COST_TP
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-indigo-500 to-sky-600 hover:from-indigo-400 hover:to-sky-500 text-white cursor-pointer shadow-indigo-500/30'
                }`}
              >
                <Search className="w-4 h-4" />
                {isAr ? `استكشاف موهبة (${SCOUT_COST_TP} TP)` : `Scout Talent (${SCOUT_COST_TP} TP)`}
              </button>
              {maxAcademySlots < 2 && (
                <span className="text-[10px] text-purple-400 flex items-center gap-1">
                  <Crown className="w-3 h-3" /> {isAr ? 'VIP 13 لخانة إضافية' : 'VIP 13 for extra slot'}
                </span>
              )}
            </div>
          </div>

          {academyFeedback && (
            <div className="p-3 rounded-2xl bg-indigo-950/60 border border-indigo-500/40 text-indigo-200 text-xs font-bold text-center">
              {academyFeedback}
            </div>
          )}

          {academyDiscoveries.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {academyDiscoveries.map((d) => (
                <div key={d.id} className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1 mb-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`w-3 h-3 ${i < d.starRating ? 'text-amber-400 fill-amber-400' : 'text-slate-700'}`} />
                      ))}
                    </div>
                    <p className="text-sm font-bold text-white truncate">{isAr ? d.talent.name : d.talent.nameEn}</p>
                    <p className="text-[10px] text-slate-400">
                      {d.talent.position} · {isAr ? `إمكانية ${d.talent.potential}` : `Pot ${d.talent.potential}`} · {isAr ? `عمر ${d.talent.age}` : `Age ${d.talent.age}`}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => handlePromoteDiscovery(d.id)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black flex items-center gap-1"
                    >
                      <Check className="w-3 h-3" /> {isAr ? 'ترقية' : 'Promote'}
                    </button>
                    <button
                      onClick={() => releaseAcademyDiscovery(d.id)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/60 text-slate-400 hover:text-rose-300 text-[10px] font-bold flex items-center gap-1"
                    >
                      <X className="w-3 h-3" /> {isAr ? 'استبعاد' : 'Release'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 border border-indigo-500/30 rounded-3xl p-6 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-indigo-400" />
              <h3 className="text-lg font-black font-heading text-white">
                {isAr ? 'أكاديمية الشباب — تخريج موهبة صاعدة' : 'Youth Academy Prodigy Intake'}
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 max-w-xl leading-relaxed">
              {isAr
                ? 'الكشافة رصدوا موهبة استثنائية بعمر 17 عاماً في فئة الشباب ذات طاقة محتملة تصل إلى 85+ OVR! هل ترغب في ترقية اللاعب وضمه للفريق الأول فوراً؟'
                : 'Academy scouts spotted an exceptional 17-year-old talent with potential exceeding 85+ OVR! Promote him to the senior squad.'}
            </p>
          </div>

          <button
            onClick={promoteAcademyTalent}
            className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-500 to-sky-600 hover:from-indigo-400 hover:to-sky-500 text-white font-black text-xs sm:text-sm shadow-xl shadow-indigo-500/30 cursor-pointer whitespace-nowrap"
          >
            {isAr ? 'ترقية الموهبة الصاعدة للفريق الأول' : 'Promote Academy Wonderkid'}
          </button>
        </div>
      )}

      {/* Squad Training Status List */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4">
        <h3 className="font-heading font-black text-sm text-white">
          {isAr ? 'مستويات اللياقة والفورمة الحالية للتشكيلة' : 'Current Squad Fitness & Form Status'}
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {squad.slice(0, 9).map((p) => (
            <div key={p.id} className="p-3 bg-slate-950/70 border border-slate-800 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center font-black text-xs text-white">
                  {p.overall}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-white">{isAr ? p.name : p.nameEn}</span>
                    <span className="text-[10px] text-slate-400">{p.nationalityFlag}</span>
                  </div>
                  <span className="text-[10px] text-sky-400 font-semibold">{p.position} • {isAr ? `إمكانية ${p.potential}` : `Pot ${p.potential}`}</span>
                </div>
              </div>

              <div className="text-right">
                <div className="text-[11px] font-bold text-emerald-400">{p.stamina}% {isAr ? 'لياقة' : 'Stm'}</div>
                <div className="text-[10px] text-amber-400">{p.form}/10 {isAr ? 'فورمة' : 'Form'}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};