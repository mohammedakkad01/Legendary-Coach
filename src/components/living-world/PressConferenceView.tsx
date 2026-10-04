/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PressConferenceView — Interactive Press Conference screen.
 * Resolves questions via store adapter submitPressConferenceAnswer() and reveals ONLY immediate visible consequences.
 */

import React, { useState } from 'react';
import { useGameStore } from '../../state/useGameStore';
import { canSchedulePressConference, generatePressConference } from '../../domain/livingWorld/press/generator';
import type { PressQuestion, PressAnswerOption, PressConferenceSession } from '../../domain/livingWorld/press/types';
import { 
  Mic, 
  Sparkles, 
  MessageSquare, 
  ShieldCheck, 
  Users, 
  AlertCircle, 
  CheckCircle2, 
  Clock,
  ArrowRight
} from 'lucide-react';

interface PressConferenceViewProps {
  isAr: boolean;
  onFinished?: () => void;
}

export const PressConferenceView: React.FC<PressConferenceViewProps> = ({ isAr, onFinished }) => {
  const { 
    livingWorld, 
    club, 
    matchHistory, 
    submitPressConferenceAnswer,
    clubManagement
  } = useGameStore();

  const gameWeek = Math.max(1, (matchHistory || []).length + 1);
  const boardPressure = (clubManagement?.board.trust ?? 60) < 40;
  const recentLosses = (matchHistory || []).slice(0, 3).filter((m) => {
    const isHome = m.homeClubId === club.id;
    return isHome ? m.homeScore < m.awayScore : m.awayScore < m.homeScore;
  }).length >= 2;

  const pressInput = {
    livingWorld,
    clubId: club.id,
    gameWeek,
    boardPressure,
    losingStreak: recentLosses,
    captainSaleRumor: false,
    academyStarter: false,
  };

  const isEligible = canSchedulePressConference(pressInput);
  const [session, setSession] = useState<PressConferenceSession | null>(() => {
    return isEligible ? generatePressConference(pressInput) : null;
  });

  const [selectedOption, setSelectedOption] = useState<PressAnswerOption | null>(null);
  const [outcome, setOutcome] = useState<{
    visibleMessage: string;
    cohesionDelta: number;
  } | null>(null);

  const handleStartSession = () => {
    const s = generatePressConference(pressInput);
    setSession(s);
    setSelectedOption(null);
    setOutcome(null);
  };

  const handleAnswer = (option: PressAnswerOption) => {
    if (!session) return;
    const res = submitPressConferenceAnswer(session.question, option);
    setSelectedOption(option);
    setOutcome({
      visibleMessage: isAr ? res.visibleMessageAr : res.visibleMessageEn,
      cohesionDelta: res.cohesionDelta,
    });
  };

  return (
    <div className="space-y-5" id="press_conference_view">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-sky-950/40 to-slate-900 border border-sky-500/30 rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/40">
                <Mic className="w-3.5 h-3.5 text-sky-400" />
                {isAr ? 'غرفة المؤتمرات الصحفية' : 'Media Press Room'}
              </span>
              <span className="text-xs text-slate-400 font-bold">
                {isAr ? `الأسبوع ${gameWeek}` : `GW ${gameWeek}`}
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-white font-heading">
              {isAr ? 'المؤتمر الصحفي ومواجهة الإعلام' : 'Post-Match Press Conference'}
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-xl">
              {isAr
                ? 'تصريحاتك في المؤتمر تؤثر مباشرة على تماسك غرفة الملابس وثقة الجماهير. اختر إجابتك بحكمة ومسؤولية.'
                : 'Your answers directly shape dressing room cohesion and media narrative. Choose your stance carefully.'}
            </p>
          </div>

          <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800 text-center min-w-[120px]">
            <span className="text-[10px] text-slate-400 block font-bold">{isAr ? 'الحالة الإعلامية' : 'Press Status'}</span>
            <span className={`text-xs font-black font-mono ${session ? 'text-amber-400' : 'text-slate-400'}`}>
              {session ? (isAr ? 'مؤتمر جاهز للانعقاد' : 'Conference Active') : (isAr ? 'لا يوجد مؤتمر الآن' : 'No Session')}
            </span>
          </div>
        </div>
      </div>

      {/* Main Interaction Area */}
      {outcome ? (
        /* Result Summary — SHOWS ONLY VISIBLE IMMEDIATE EFFECTS */
        <div className="bg-slate-900/95 border border-emerald-500/30 rounded-3xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-white font-heading">
                {isAr ? 'انتهى المؤتمر الصحفي' : 'Press Conference Concluded'}
              </h3>
              <p className="text-xs text-slate-400">
                {isAr ? 'تم تسجيل وتوثيق تصريحاتك الرسمية أمام وسائل الإعلام.' : 'Your statements were recorded and published in the sports press.'}
              </p>
            </div>
          </div>

          {/* Immediate Visible Effect */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
            <span className="text-xs font-bold text-slate-400 block">
              {isAr ? 'الأثر المباشر المشهود:' : 'Immediate Observable Consequence:'}
            </span>
            <p className="text-sm font-black text-slate-200">{outcome.visibleMessage}</p>

            <div className="pt-2 flex items-center gap-2">
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-indigo-400" />
                {isAr ? 'معنويات غرفة الملابس:' : 'Dressing Room Cohesion:'}
              </span>
              <span
                className={`text-xs font-black font-mono px-2 py-0.5 rounded-lg border ${
                  outcome.cohesionDelta > 0
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : outcome.cohesionDelta < 0
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                    : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}
              >
                {outcome.cohesionDelta > 0 ? `+${outcome.cohesionDelta}` : outcome.cohesionDelta}
              </span>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={() => {
                setSession(null);
                setOutcome(null);
                setSelectedOption(null);
                if (onFinished) onFinished();
              }}
              className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs transition cursor-pointer flex items-center gap-1.5"
            >
              <span>{isAr ? 'متابعة إلى النادي' : 'Proceed to Club'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : session ? (
        /* Active Conference Question */
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-5 shadow-xl">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                {session.question.contextKind}
              </span>
              <span className="text-xs text-sky-400 font-bold flex items-center gap-1">
                <MessageSquare className="w-3.5 h-3.5" />
                {isAr ? 'سؤال الصحفي الموجه للمدرب:' : 'Journalist Question:'}
              </span>
            </div>

            <h3 className="text-lg sm:text-xl font-black text-white font-heading leading-snug">
              "{isAr ? session.question.promptAr : session.question.promptEn}"
            </h3>
          </div>

          {/* Options */}
          <div className="space-y-2.5">
            <span className="text-xs font-bold text-slate-400 block">
              {isAr ? 'اختر ردك الرسمي أمام الصحفيين:' : 'Select your official response:'}
            </span>

            {session.question.options.map((option) => (
              <button
                key={option.id}
                onClick={() => handleAnswer(option)}
                className="w-full text-left sm:text-right p-4 rounded-2xl bg-slate-950/80 hover:bg-slate-950 border border-slate-800 hover:border-indigo-500/60 transition-all cursor-pointer group flex items-center justify-between gap-3 shadow-sm"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg bg-slate-900 text-indigo-300 border border-slate-800">
                      {option.tone}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">
                      {option.stance}
                    </span>
                  </div>
                  <p className="text-sm font-black text-slate-100 group-hover:text-indigo-200 transition">
                    "{isAr ? option.labelAr : option.labelEn}"
                  </p>
                </div>

                <div className="w-8 h-8 rounded-xl bg-slate-900 group-hover:bg-indigo-600 group-hover:text-white text-slate-500 flex items-center justify-center transition shrink-0">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        /* Empty / Cooldown State */
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-12 text-center space-y-3">
          <Clock className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-base font-black text-slate-300">
            {isAr ? 'لا يوجد مؤتمر صحفي مجدول حالياً' : 'No Press Conference Scheduled'}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            {isAr
              ? 'تنعقد المؤتمرات الصحفية عند وجود مستجدات هامة (ضغط الإدارة، نتائج حاسمة، أو فترات فاصلة في الدوري).'
              : 'Press conferences trigger during critical phases, board pressure situations, or major match results.'}
          </p>
          {isEligible && (
            <button
              onClick={handleStartSession}
              className="mt-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition cursor-pointer"
            >
              {isAr ? 'عقد مؤتمر صحفي استثنائي' : 'Call Media Session'}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
