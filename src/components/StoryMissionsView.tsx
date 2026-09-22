/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Narrative & Campaign Story View
 * Chapter 1 "بداية الرحلة الشاقة" with all 10 missions, branching dialogue, and real consequences.
 */

import React, { useState } from 'react';
import { useGameStore } from '../state/useGameStore';
import { StoryMission, DialogueChoice } from '../types/game';
import { 
  BookOpen, 
  CheckCircle2, 
  ChevronRight, 
  Coins, 
  Trophy, 
  Crown, 
  MessageSquare,
  Sparkles,
  ArrowRight
} from 'lucide-react';

export const StoryMissionsView: React.FC = () => {
  const { storyMissions, chooseMissionOption, language, setActiveTab, startNewMatch } = useGameStore();
  const isAr = language === 'ar';

  const [activeMission, setActiveMission] = useState<StoryMission | null>(
    storyMissions.find(m => !m.isCompleted) || storyMissions[0]
  );
  const [selectedChoice, setSelectedChoice] = useState<DialogueChoice | null>(null);
  const [outcomeReply, setOutcomeReply] = useState<{ replyAr: string; replyEn: string } | null>(null);

  const completedCount = storyMissions.filter(m => m.isCompleted).length;

  const handleSelectChoice = (choice: DialogueChoice) => {
    setSelectedChoice(choice);
  };

  const handleConfirmDecision = () => {
    if (!activeMission || !selectedChoice) return;
    setOutcomeReply({
      replyAr: selectedChoice.replyAr,
      replyEn: selectedChoice.replyEn,
    });
    chooseMissionOption(activeMission.id, selectedChoice.id);
  };

  const handleCloseOutcome = () => {
    setOutcomeReply(null);
    setSelectedChoice(null);
    // Move to next uncompleted mission
    const next = storyMissions.find(m => !m.isCompleted && m.id !== activeMission?.id);
    if (next) {
      setActiveMission(next);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-6 space-y-6">
      
      {/* Chapter Overview Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-sky-950 border border-slate-800 rounded-3xl p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-sky-400 text-xs font-bold mb-1">
            <BookOpen className="w-4 h-4" />
            <span>{isAr ? 'طور القصة والمسيرة المهنية — الفصل 1' : 'Career Story Campaign — Chapter 1'}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black font-heading text-white">
            {isAr ? 'الفصل الأول: بداية الرحلة الشاقة في الدرجة الثانية' : 'Chapter 1: The Arduous Beginning'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
            {isAr 
              ? 'رحلتك تبدأ هنا! كل قرار تتخذه في المؤتمرات، غرف الملابس، ومكتب الرئيس يؤثر فوراً على ثقة الإدارة، معنويات اللاعبين، وهيبة النادي.'
              : 'Your legendary journey starts here! Every decision directly affects board trust, squad morale, finances, and fan mood.'}
          </p>
        </div>

        {/* Progress Tracker */}
        <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 text-center min-w-[150px]">
          <span className="text-[11px] text-slate-400 block font-bold">{isAr ? 'إنجاز الفصل' : 'Progress'}</span>
          <span className="text-xl font-black text-amber-400">{completedCount} / 10</span>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1.5">
            <div 
              className="h-full bg-amber-500 rounded-full transition-all duration-500" 
              style={{ width: `${(completedCount / 10) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Mission List Sidebar (4 Cols) */}
        <div className="lg:col-span-4 space-y-2.5 max-h-[620px] overflow-y-auto pr-1">
          {storyMissions.map((m) => {
            const isCurrent = activeMission?.id === m.id;
            return (
              <div
                key={m.id}
                onClick={() => {
                  setActiveMission(m);
                  setSelectedChoice(null);
                  setOutcomeReply(null);
                }}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                  isCurrent
                    ? 'bg-sky-950/60 border-sky-500/80 shadow-lg shadow-sky-500/10'
                    : m.isCompleted
                    ? 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-xl shrink-0">
                    {m.speakerAvatar}
                  </div>
                  <div>
                    <h4 className={`text-xs font-black line-clamp-1 ${isCurrent ? 'text-white' : 'text-slate-300'}`}>
                      {isAr ? m.titleAr : m.titleEn}
                    </h4>
                    <span className="text-[11px] text-slate-400 font-semibold block">
                      {isAr ? m.speakerRoleAr : m.speakerRoleEn}
                    </span>
                  </div>
                </div>

                <div>
                  {m.isCompleted ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 block animate-ping" />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Active Mission Dialogue Stage (8 Cols) */}
        <div className="lg:col-span-8">
          {activeMission ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 space-y-6 shadow-2xl">
              
              {/* Speaker Profile Header */}
              <div className="flex items-center gap-4 border-b border-slate-800 pb-5">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-950 border-2 border-sky-500/40 flex items-center justify-center text-3xl shadow-lg">
                  {activeMission.speakerAvatar}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg sm:text-xl font-black font-heading text-white">
                      {isAr ? activeMission.speakerNameAr : activeMission.speakerNameEn}
                    </h3>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 font-bold">
                      {isAr ? activeMission.speakerRoleAr : activeMission.speakerRoleEn}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {isAr ? activeMission.titleAr : activeMission.titleEn}
                  </p>
                </div>
              </div>

              {/* Dialogue Bubble */}
              <div className="relative bg-slate-950/80 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-inner">
                <div className="text-xs sm:text-sm font-semibold text-slate-200 leading-relaxed">
                  "{isAr ? activeMission.introAr : activeMission.introEn}"
                </div>
              </div>

              {/* Mission Objective & Rewards */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-sky-950/30 border border-sky-500/30 p-3.5 rounded-2xl text-xs">
                <div className="space-y-0.5">
                  <span className="font-bold text-sky-400 block">{isAr ? 'الهدف المطلوب:' : 'Objective:'}</span>
                  <p className="text-slate-300 font-medium">{isAr ? activeMission.objectiveAr : activeMission.objectiveEn}</p>
                </div>
                <div className="flex items-center gap-2.5 shrink-0 font-black">
                  <span className="text-amber-400">+{activeMission.reward.coins.toLocaleString()} 💰</span>
                  <span className="text-emerald-400">+{activeMission.reward.trainingPoints} TP</span>
                  <span className="text-yellow-400">+{activeMission.reward.vipPoints} VIP</span>
                </div>
              </div>

              {/* Consequence Reply Modal */}
              {outcomeReply ? (
                <div className="bg-emerald-950/60 border border-emerald-500/60 rounded-2xl p-5 space-y-3 animate-in fade-in">
                  <div className="flex items-center gap-2 text-emerald-300 font-bold text-sm">
                    <Sparkles className="w-5 h-5 text-emerald-400" />
                    <span>{isAr ? 'رد الفعل والنتائج المترتبة:' : 'Consequences & Reactions:'}</span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-100 font-medium leading-relaxed">
                    "{isAr ? outcomeReply.replyAr : outcomeReply.replyEn}"
                  </p>
                  <button
                    onClick={handleCloseOutcome}
                    className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-lg cursor-pointer"
                  >
                    {isAr ? 'المتابعة إلى المهمة التالية ✓' : 'Continue to Next Mission ✓'}
                  </button>
                </div>
              ) : activeMission.isCompleted ? (
                <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-center space-y-1">
                  <div className="flex items-center justify-center gap-2 text-emerald-400 font-black text-sm">
                    <CheckCircle2 className="w-5 h-5" />
                    <span>{isAr ? 'اكتملت هذه المهمة بنجاح' : 'Mission Completed'}</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    {isAr ? 'تم تطبيق المكافآت والتأثيرات على مسيرتك التدريبية.' : 'Rewards and consequences applied to your career.'}
                  </p>
                </div>
              ) : (
                /* Choice Options */
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-400">
                    {isAr ? 'اختر ردك وقرارك الفني (الخيارات تؤثر على المعنويات والثقة):' : 'Select your decision (choices affect morale & trust):'}
                  </h4>

                  <div className="space-y-2.5">
                    {activeMission.choices.map((choice) => {
                      const isPicked = selectedChoice?.id === choice.id;
                      return (
                        <div
                          key={choice.id}
                          onClick={() => handleSelectChoice(choice)}
                          className={`p-3.5 rounded-2xl border transition-all cursor-pointer space-y-1.5 ${
                            isPicked
                              ? 'bg-amber-950/50 border-amber-500 ring-2 ring-amber-400/40'
                              : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-white leading-snug">
                              {isAr ? choice.textAr : choice.textEn}
                            </span>
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded capitalize ${
                              choice.tone === 'inspirational' ? 'bg-amber-500/20 text-amber-300' :
                              choice.tone === 'professional' ? 'bg-sky-500/20 text-sky-300' :
                              choice.tone === 'aggressive' ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'
                            }`}>
                              {choice.tone}
                            </span>
                          </div>

                          {/* Quick consequence preview */}
                          <div className="flex items-center gap-3 text-[10px] text-slate-400 font-semibold pt-1">
                            {choice.consequence.boardTrustChange && (
                              <span className={choice.consequence.boardTrustChange > 0 ? 'text-emerald-400' : 'text-rose-400'}>
                                {isAr ? 'ثقة الإدارة:' : 'Board:'} {choice.consequence.boardTrustChange > 0 ? `+${choice.consequence.boardTrustChange}` : choice.consequence.boardTrustChange}%
                              </span>
                            )}
                            {choice.consequence.fanMoodChange && (
                              <span className={choice.consequence.fanMoodChange > 0 ? 'text-emerald-400' : 'text-rose-400'}>
                                {isAr ? 'الجماهير:' : 'Fans:'} {choice.consequence.fanMoodChange > 0 ? `+${choice.consequence.fanMoodChange}` : choice.consequence.fanMoodChange}%
                              </span>
                            )}
                            {choice.consequence.squadMoraleChange && (
                              <span className="text-sky-400">
                                {isAr ? 'المعنويات:' : 'Morale:'} +{choice.consequence.squadMoraleChange}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Decision confirmation button */}
                  <div className="pt-2 flex items-center justify-between gap-3">
                    {activeMission.requiredActionType === 'play_match' ? (
                      <button
                        onClick={() => startNewMatch()}
                        className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-lg cursor-pointer"
                      >
                        {isAr ? 'انتقال إلى شاشة المباراة الحية' : 'Go to Live Match Screen'}
                      </button>
                    ) : null}

                    <button
                      disabled={!selectedChoice}
                      onClick={handleConfirmDecision}
                      className={`w-full py-3 rounded-xl font-black text-xs shadow-lg transition-all ${
                        selectedChoice
                          ? 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 cursor-pointer shadow-amber-500/20'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      {isAr ? 'تأكيد القرار والرد على الشخصية' : 'Confirm Coaching Decision'}
                    </button>
                  </div>
                </div>
              )}

            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center text-slate-400">
              {isAr ? 'اختر مهمة من القائمة لبدء الحوار' : 'Select a mission from the list to start dialogue'}
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
