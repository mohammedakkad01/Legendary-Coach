/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Mentoring & Guidance Panel (Phase C)
 * Suggested Senior (26+) ↔ Young (<=22) pairs evaluated with domain mentoringEffectiveness.
 * Assign and cancel active mentorship bonds.
 */

import React, { useState } from 'react';
import { useGameStore } from '../../state/useGameStore';
import { useFeedback } from '../../context/FeedbackContext';
import { mentoringEffectiveness } from '../../domain/playerLife/mentoring';
import { Sparkles, Users, Award, Check, X, ChevronRight, UserCheck } from 'lucide-react';
import type { Player } from '../../types/game';

export const MentoringView: React.FC = () => {
  const { club, livingWorld, language, assignMentoringPairAction, removeMentoringPairAction } = useGameStore();
  const { toast } = useFeedback();
  const isAr = language === 'ar';

  const squad = club.footballSquad;
  const relationships = livingWorld.relationships ?? [];

  // Seniors (potential mentors)
  const seniorMentors = squad.filter((p) => p.age >= 26);
  // Youngsters (potential mentees)
  const youngMentees = squad.filter((p) => p.age <= 22);

  // Active mentoring pairs
  const activePairs = squad
    .filter((p) => p.playerLife?.mentoring?.mentorId)
    .map((mentee) => {
      const mentorId = mentee.playerLife!.mentoring!.mentorId!;
      const mentor = squad.find((p) => p.id === mentorId);
      const eff = mentor ? mentoringEffectiveness(mentor, mentee, relationships) : 0;
      return { mentee, mentor, eff };
    })
    .filter((pair): pair is { mentee: Player; mentor: Player; eff: number } => pair.mentor !== undefined);

  // Generate suggested pairs from unmentored young players
  const unmentoredYoungsters = youngMentees.filter((y) => !y.playerLife?.mentoring?.mentorId);

  const suggestedPairs: { mentor: Player; mentee: Player; eff: number }[] = [];
  for (const mentee of unmentoredYoungsters) {
    let bestMentor: Player | null = null;
    let bestEff = 0;

    for (const mentor of seniorMentors) {
      const eff = mentoringEffectiveness(mentor, mentee, relationships);
      if (eff > bestEff && eff >= 0.15) {
        bestEff = eff;
        bestMentor = mentor;
      }
    }

    if (bestMentor) {
      suggestedPairs.push({ mentor: bestMentor, mentee, eff: bestEff });
    }
  }

  const handleAssign = (mentorId: string, menteeId: string) => {
    assignMentoringPairAction(mentorId, menteeId);
    toast.success(
      isAr ? 'تم اعتماد علاقة الإرشاد والتوجيه بنجاح!' : 'Mentorship pair successfully assigned!',
      isAr ? 'الإرشاد والتوجيه' : 'Mentoring Active',
    );
  };

  const handleRemove = (menteeId: string) => {
    removeMentoringPairAction(menteeId);
    toast.info(
      isAr ? 'تم إلغاء علاقة الإرشاد والتوجيه.' : 'Mentorship link canceled.',
      isAr ? 'إلغاء الإرشاد' : 'Mentoring Canceled',
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-teal-950/70 via-slate-900 to-teal-950/70 border border-teal-500/30 rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-teal-400 text-xs font-bold mb-1">
            <Sparkles className="w-4 h-4" />
            <span>{isAr ? 'تطوير المواهب والإرشاد الميداني' : 'Player Guidance & Mentoring'}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black font-heading text-white">
            {isAr ? 'شراكات الإرشاد بين الخبرة والشباب' : 'Senior ↔ Youth Mentoring Pairs'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            {isAr
              ? 'اربط المواهب الشابة بقادة الخبرة لتسريع اكتساب الثقة والاحترافية أسبوعياً.'
              : 'Pair promising youth players with veteran mentors to accelerate weekly confidence and professionalism.'}
          </p>
        </div>

        <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 text-center min-w-[140px]">
          <span className="text-[11px] text-slate-400 block font-bold">
            {isAr ? 'الشراكات النشطة' : 'Active Pairs'}
          </span>
          <span className="text-xl font-black text-teal-400">{activePairs.length}</span>
        </div>
      </div>

      {/* Active Mentorships Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-teal-400 text-xs font-bold">
            <UserCheck className="w-4 h-4" />
            <span className="uppercase tracking-wider">
              {isAr ? 'الشراكات الإرشادية القائمة' : 'Active Mentorship Bonds'} ({activePairs.length})
            </span>
          </div>
        </div>

        {activePairs.length === 0 ? (
          <p className="text-xs text-slate-400 py-4 text-center">
            {isAr
              ? 'لا توجد شراكات نشطة حالياً. اختر من الشراكات المقترحة أدناه لنقل الخبرات لمواهب الفريق.'
              : 'No active pairs yet. Confirm suggested pairs below to foster youth growth.'}
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activePairs.map(({ mentor, mentee, eff }) => (
              <div
                key={mentee.id}
                className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-md"
              >
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-bold text-amber-400">{isAr ? 'المرشد:' : 'Mentor:'}</span>
                    <span className="font-black text-white truncate">{isAr ? mentor.name : mentor.nameEn}</span>
                    <span className="text-[10px] text-slate-400">({mentor.age}y)</span>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-bold text-teal-400">{isAr ? 'الموهبة:' : 'Mentee:'}</span>
                    <span className="font-black text-white truncate">{isAr ? mentee.name : mentee.nameEn}</span>
                    <span className="text-[10px] text-slate-400">({mentee.age}y)</span>
                  </div>

                  <span className="text-[10px] text-slate-400 block">
                    {isAr ? 'فعالية التوجيه:' : 'Effectiveness:'}{' '}
                    <strong className="text-emerald-400">%{Math.round(eff * 100)}</strong>
                  </span>
                </div>

                <button
                  onClick={() => handleRemove(mentee.id)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-900/60 text-slate-400 hover:text-rose-300 text-xs font-bold transition flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>{isAr ? 'إنهاء' : 'End'}</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Suggested Pairs Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-sky-400 text-xs font-bold">
            <Sparkles className="w-4 h-4" />
            <span className="uppercase tracking-wider">
              {isAr ? 'الشراكات المقترحة من الجهاز الفني' : 'Recommended Senior ↔ Youth Pairs'} (
              {suggestedPairs.length})
            </span>
          </div>
          <span className="text-[11px] text-slate-400">
            {isAr ? 'بناءً على التوافق النفسي وفارق العمر' : 'Evaluated by psychological fit & age gap'}
          </span>
        </div>

        {suggestedPairs.length === 0 ? (
          <p className="text-xs text-slate-400 py-4 text-center">
            {isAr
              ? 'تم ربط جميع المواهب المؤهلة، أو لا يتوفر فارق أعمار كافٍ في التشكيلة حالياً.'
              : 'All eligible youngsters are mentored, or no suitable senior mentor is currently available.'}
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {suggestedPairs.map(({ mentor, mentee, eff }) => (
              <div
                key={`${mentor.id}_${mentee.id}`}
                className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between gap-3 shadow-md"
              >
                <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                  <div className="min-w-0">
                    <span className="text-[10px] text-amber-400 block font-bold">
                      {isAr ? 'المرشد (خبرة)' : 'Senior Mentor'}
                    </span>
                    <p className="text-sm font-black text-white truncate">
                      {isAr ? mentor.name : mentor.nameEn}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {mentor.position} · {mentor.age} {isAr ? 'سنة' : 'yrs'} · {isAr ? 'قيادة' : 'Ldr'}:{' '}
                      {mentor.personalityProfile?.leadership ?? 50}
                    </p>
                  </div>

                  <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                    <ChevronRight className="w-4 h-4" />
                  </div>

                  <div className="min-w-0 text-end">
                    <span className="text-[10px] text-teal-400 block font-bold">
                      {isAr ? 'الموهبة (ناشئ)' : 'Young Talent'}
                    </span>
                    <p className="text-sm font-black text-white truncate">
                      {isAr ? mentee.name : mentee.nameEn}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {mentee.position} · {mentee.age} {isAr ? 'سنة' : 'yrs'} · {isAr ? 'طاقة' : 'Pot'}:{' '}
                      {mentee.potential}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-slate-400">
                    {isAr ? 'التوافق المتوقع:' : 'Predicted Match:'}{' '}
                    <strong className="text-emerald-400">%{Math.round(eff * 100)}</strong>
                  </span>

                  <button
                    onClick={() => handleAssign(mentor.id, mentee.id)}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-black text-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-md shadow-teal-900/30"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{isAr ? 'اعتماد الشراكة' : 'Confirm Pairing'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
