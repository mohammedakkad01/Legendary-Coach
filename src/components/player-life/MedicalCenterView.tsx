/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Medical Center & Injury Management View (Phase C)
 * Displays injured and at-risk players with uncertain estimated return ranges (never exact).
 * Medical facility diagnostic confidence and preventive recovery actions.
 */

import React from 'react';
import { useGameStore } from '../../state/useGameStore';
import { useFeedback } from '../../context/FeedbackContext';
import { computeInMatchInjuryProbability } from '../../domain/playerLife/injuryRisk';
import { InjurySeverityBadge, InjuryReturnRangeBadge, ConditionMeter } from './PlayerLifeBadges';
import { HeartPulse, ShieldAlert, Sparkles, Building2, UserX, AlertTriangle, CheckCircle2 } from 'lucide-react';

export const MedicalCenterView: React.FC = () => {
  const { club, language, setActiveTab, runSquadRecoverySession } = useGameStore();
  const { toast } = useFeedback();
  const isAr = language === 'ar';

  const squad = club.footballSquad;
  const medLevel = club.facilities.medicalCenterLevel;

  // Injured Players
  const injuredPlayers = squad.filter(
    (p) => (p.injuredWeeks ?? 0) > 0 || p.playerLife?.condition.injury !== undefined,
  );

  // At-risk players (not yet injured, but high risk)
  const atRiskPlayers = squad
    .filter((p) => (p.injuredWeeks ?? 0) <= 0 && !p.playerLife?.condition.injury)
    .map((p) => {
      const riskProb = computeInMatchInjuryProbability(p, {
        medicalCenterLevel: medLevel,
        recentMatchesIn7Days: 1,
        minutesThisMatch: 90,
      });
      return { player: p, riskProb, riskPercent: Math.round(riskProb * 100) };
    })
    .filter((item) => item.riskPercent >= 10 || (item.player.fatigue ?? 0) >= 55)
    .sort((a, b) => b.riskProb - a.riskProb);

  const handleRunRecovery = () => {
    const res = runSquadRecoverySession();
    if (res.success) {
      toast.success(res.message, isAr ? 'استشفاء عام' : 'Recovery Session');
    } else {
      toast.error(res.message, isAr ? 'تعذر الاستشفاء' : 'Recovery Failed');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-rose-950/70 via-slate-900 to-rose-950/70 border border-rose-500/30 rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-rose-400 text-xs font-bold mb-1">
            <HeartPulse className="w-4 h-4" />
            <span>{isAr ? 'المركز الطبي الرياضي والعيادة' : 'Sports Medical Complex & Clinic'}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black font-heading text-white">
            {isAr ? 'متابعة الإصابات والوقاية العضلية' : 'Injury Tracking & Medical Care'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            {isAr
              ? 'متابعة فترة تعافي المصابين ورصد مؤشرات الإجهاد لتفادي الغيابات الطويلة.'
              : 'Monitor rehabilitation windows, manage return timelines, and mitigate muscle injury risk.'}
          </p>
        </div>

        {/* Medical Center Facility Status */}
        <div className="flex items-center gap-3">
          <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 text-center min-w-[140px]">
            <span className="text-[11px] text-slate-400 block font-bold">
              {isAr ? 'مستوى المركز الطبي' : 'Medical Center'}
            </span>
            <span className="text-lg font-black text-rose-400">
              {isAr ? `مستوى ${medLevel}` : `Level ${medLevel}`}
            </span>
          </div>

          <button
            onClick={() => setActiveTab('club')}
            className="px-3.5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
            title={isAr ? 'ترقية المركز الطبي' : 'Upgrade Medical Center'}
          >
            <Building2 className="w-4 h-4 text-sky-400" />
            <span className="hidden sm:inline">{isAr ? 'المنشآت' : 'Facilities'}</span>
          </button>
        </div>
      </div>

      {/* Injured Players Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-rose-400 text-xs font-bold">
            <UserX className="w-4 h-4" />
            <span className="uppercase tracking-wider">
              {isAr ? 'قائمة المصابين الحالية' : 'Currently Injured Players'} ({injuredPlayers.length})
            </span>
          </div>
          {injuredPlayers.length > 0 && (
            <span className="text-xs text-rose-400 font-bold bg-rose-950/60 border border-rose-800/80 px-2.5 py-1 rounded-xl">
              {isAr ? 'غير متاحين للمباريات' : 'Unavailable for Matches'}
            </span>
          )}
        </div>

        {injuredPlayers.length === 0 ? (
          <div className="p-8 text-center bg-slate-950/40 border border-slate-800/60 rounded-2xl space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
            <h4 className="text-sm font-black text-white">
              {isAr ? 'العيادة الطبية فارغة — التشكيلة بالكامل سليمة' : 'Clean Bill of Health — No Injuries!'}
            </h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              {isAr
                ? 'لا يوجد أي لاعب مصاب حالياً. حافظ على وتيرة المداورة والاستشفاء لتفادي الإصابات.'
                : 'All squad players are fit and available. Keep up active recovery drills to prevent strains.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {injuredPlayers.map((player) => {
              const injury = player.playerLife?.condition.injury;
              const weeksRemaining = injury?.estimatedWeeksRemaining ?? player.injuredWeeks ?? 2;
              const confidence = injury?.diagnosisConfidence ?? 70;
              const severity = injury?.severity ?? 'moderate';

              return (
                <div
                  key={player.id}
                  className="bg-slate-950/80 border border-rose-900/50 rounded-2xl p-4 space-y-3 shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-rose-950/80 border border-rose-700/60 flex items-center justify-center font-black text-white text-sm">
                        {player.overall}
                      </div>
                      <div>
                        <p className="text-sm font-black text-white">
                          {isAr ? player.name : player.nameEn}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {player.position} · {player.age} {isAr ? 'سنة' : 'yrs'}
                        </p>
                      </div>
                    </div>

                    <InjurySeverityBadge severity={severity} isAr={isAr} />
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <InjuryReturnRangeBadge
                      estimatedWeeks={weeksRemaining}
                      confidence={confidence}
                      isAr={isAr}
                    />

                    {injury?.fatigueInjury && (
                      <span className="text-[10px] font-bold text-amber-400 bg-amber-950/40 border border-amber-800/60 px-2 py-0.5 rounded-lg w-fit">
                        {isAr ? 'ناتجة عن الإجهاد' : 'Fatigue Induced'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Players at Elevated Risk Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-amber-400 text-xs font-bold">
            <AlertTriangle className="w-4 h-4" />
            <span className="uppercase tracking-wider">
              {isAr ? 'رادار الوقاية: لاعبون تحت دائرة خطر الإصابة' : 'Preventive Radar: High Injury Risk Players'} ({atRiskPlayers.length})
            </span>
          </div>

          <button
            onClick={handleRunRecovery}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer w-fit"
          >
            <HeartPulse className="w-3.5 h-3.5" />
            <span>{isAr ? 'تطبيق استشفاء جماعي (500 💰)' : 'Full Squad Recovery (500 💰)'}</span>
          </button>
        </div>

        {atRiskPlayers.length === 0 ? (
          <p className="text-xs text-slate-400 py-3 text-center">
            {isAr
              ? 'مستويات إجهاد التشكيلة في النطاق الآمن. لا يوجد لاعبون معرضون لخطر وشيك.'
              : 'Squad fatigue and training load are in a safe zone. No players at imminent risk.'}
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {atRiskPlayers.map(({ player, riskPercent }) => (
              <div
                key={player.id}
                className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3.5 space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center font-bold text-xs text-white">
                      {player.overall}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white truncate max-w-[120px]">
                        {isAr ? player.name : player.nameEn}
                      </p>
                      <p className="text-[10px] text-slate-400">{player.position}</p>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-black px-2 py-0.5 rounded-lg border ${
                      riskPercent >= 15
                        ? 'bg-rose-950/70 border-rose-700 text-rose-300'
                        : 'bg-amber-950/70 border-amber-700 text-amber-300'
                    }`}
                  >
                    {isAr ? `خطر %${riskPercent}` : `${riskPercent}% Risk`}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/80 text-[10px]">
                  <div>
                    <span className="text-slate-400 block">{isAr ? 'الإجهاد' : 'Fatigue'}</span>
                    <span className="font-bold text-rose-400">{player.fatigue ?? 0}%</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">{isAr ? 'حمل التدريب' : 'Tr. Load'}</span>
                    <span className="font-bold text-amber-400">
                      {player.playerLife?.condition.trainingLoad ?? 30}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
