/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Squad Management & Player Inspection View
 * Squad roster, ratings, contracts, personality traits, and starting status.
 */

import React, { useState } from 'react';
import { useGameStore } from '../state/useGameStore';
import { useFeedback } from '../context/FeedbackContext';
import { Player } from '../types/game';
import { Users, Star, Award, Shield, Zap, Sparkles, HeartPulse, Activity, MessageSquare } from 'lucide-react';
import { PlayerConversationsView } from './player-life/PlayerConversationsView';
import { MedicalCenterView } from './player-life/MedicalCenterView';
import { DressingRoomView } from './player-life/DressingRoomView';
import { MentoringView } from './player-life/MentoringView';

export const SquadView: React.FC = () => {
  const { club, livingWorld, currentSport, language, runSquadRecoverySession } = useGameStore();
  const { toast } = useFeedback();
  const isAr = language === 'ar';

  const squad = currentSport === 'football' ? club.footballSquad : club.basketballSquad;
  const lineupIds = currentSport === 'football' ? club.footballLineup : club.basketballLineup;

  const [activeSquadTab, setActiveSquadTab] = useState<'roster' | 'conversations' | 'dressing_room' | 'mentoring' | 'medical'>('roster');
  const [selectedPlayer, setSelectedPlayer] = useState<Player>(squad[0]);

  const pendingInteractionsCount = (livingWorld?.pendingInteractions ?? []).length;
  const injuredCount = squad.filter(
    (p) => (p.injuredWeeks ?? 0) > 0 || p.playerLife?.condition?.injury !== undefined,
  ).length;

  const avgFatigue = squad.length > 0 
    ? Math.round(squad.reduce((acc, p) => acc + (p.fatigue || 0), 0) / squad.length)
    : 0;

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-6 space-y-6">
      
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-sky-950 border border-slate-800 rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-sky-400 text-xs font-bold mb-1">
            <Users className="w-4 h-4" />
            <span>{isAr ? 'إدارة الفريق والحياة اليومية' : 'Senior Squad & Player Life'}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black font-heading text-white">
            {isAr ? 'شؤون التشكيلة والعلاقات وغرفة الملابس' : 'First Team, Dressing Room & Player Life'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            {isAr ? `إجمالي اللاعبين: ${squad.length} لاعباً مسجلاً في الكشوفات الرسمية.` : `Total squad size: ${squad.length} registered players.`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 text-center min-w-[130px]">
            <span className="text-[11px] text-slate-400 block font-bold">{isAr ? 'متوسط الإجهاد' : 'Avg Fatigue'}</span>
            <span className={`text-xl font-black ${avgFatigue > 45 ? 'text-red-400' : 'text-emerald-400'}`}>
              %{avgFatigue}
            </span>
          </div>

          <button
            id="squad_view_recovery_action_btn"
            onClick={() => {
              const res = runSquadRecoverySession();
              if (res.success) {
                toast.success(res.message, isAr ? 'جلسة الاستشفاء' : 'Squad Recovery');
              } else {
                toast.error(res.message, isAr ? 'تعذر الاستشفاء' : 'Recovery Failed');
              }
            }}
            className="px-4 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs shadow-lg transition active:scale-95 flex items-center gap-2 cursor-pointer"
          >
            <HeartPulse className="w-4 h-4" />
            <span>{isAr ? 'جلسة استشفاء عامة (500 💰)' : 'Full Recovery (500 💰)'}</span>
          </button>
        </div>
      </div>

      {/* Sub-Tab Navigation Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800">
        <button
          onClick={() => setActiveSquadTab('roster')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
            activeSquadTab === 'roster'
              ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>{isAr ? 'قائمة اللاعبين' : 'Squad Roster'}</span>
        </button>

        <button
          onClick={() => setActiveSquadTab('conversations')}
          className={`relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
            activeSquadTab === 'conversations'
              ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>{isAr ? 'محادثات اللاعبين' : 'Conversations'}</span>
          {pendingInteractionsCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black animate-pulse">
              {pendingInteractionsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSquadTab('dressing_room')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
            activeSquadTab === 'dressing_room'
              ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>{isAr ? 'غرفة الملابس' : 'Dressing Room'}</span>
        </button>

        <button
          onClick={() => setActiveSquadTab('mentoring')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
            activeSquadTab === 'mentoring'
              ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>{isAr ? 'الإرشاد والتوجيه' : 'Mentoring'}</span>
        </button>

        <button
          onClick={() => setActiveSquadTab('medical')}
          className={`relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
            activeSquadTab === 'medical'
              ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <HeartPulse className="w-4 h-4" />
          <span>{isAr ? 'العيادة والإصابات' : 'Medical & Injuries'}</span>
          {injuredCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-black">
              {injuredCount}
            </span>
          )}
        </button>
      </div>

      {/* Sub-view Rendering */}
      {activeSquadTab === 'conversations' && <PlayerConversationsView />}
      {activeSquadTab === 'dressing_room' && <DressingRoomView />}
      {activeSquadTab === 'mentoring' && <MentoringView />}
      {activeSquadTab === 'medical' && <MedicalCenterView />}

      {activeSquadTab === 'roster' && (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Squad Roster Grid (7 Cols) */}
        <div className="lg:col-span-7 space-y-2.5 max-h-[620px] overflow-y-auto pr-1">
          {squad.map((player) => {
            const isStarter = lineupIds.includes(player.id);
            const isSelected = selectedPlayer?.id === player.id;
            const pFatigue = player.fatigue || 0;

            return (
              <div
                key={player.id}
                onClick={() => setSelectedPlayer(player)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                  isSelected
                    ? 'bg-sky-950/60 border-sky-500/80 shadow-lg shadow-sky-500/10'
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-950 border border-slate-700 flex items-center justify-center font-heading font-black text-sm text-white">
                    {player.overall}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-bold text-sm text-white">
                        {isAr ? player.name : player.nameEn}
                      </h4>
                      <span className="text-xs">{player.nationalityFlag}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                      <span className="text-sky-400 font-bold">{player.position}</span>
                      <span>•</span>
                      <span>{player.age} {isAr ? 'سنة' : 'yrs'}</span>
                      <span>•</span>
                      <span className="text-emerald-400 font-semibold">{isAr ? `إمكانية ${player.potential}` : `Pot ${player.potential}`}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                    isStarter ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {isStarter ? (isAr ? 'أساسي' : 'Starter') : (isAr ? 'بديل' : 'Bench')}
                  </span>

                  {/* Fatigue Pill */}
                  <div className="text-right text-xs">
                    <span className={`font-black block ${pFatigue > 50 ? 'text-red-400' : pFatigue > 25 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      %{pFatigue}
                    </span>
                    <span className="text-[10px] text-slate-500">{isAr ? 'إجهاد' : 'Fatigue'}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Player Dossier Card (5 Cols) */}
        <div className="lg:col-span-5">
          {selectedPlayer ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5 shadow-2xl sticky top-24">
              
              {/* Profile Card Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-black font-heading text-white">
                      {isAr ? selectedPlayer.name : selectedPlayer.nameEn}
                    </h3>
                    <span className="text-lg">{selectedPlayer.nationalityFlag}</span>
                  </div>
                  <span className="text-xs text-sky-400 font-bold">
                    {selectedPlayer.position} • {selectedPlayer.rarity.toUpperCase()}
                  </span>
                </div>

                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-700 flex items-center justify-center font-heading font-black text-xl text-white shadow-xl shadow-sky-500/20">
                  {selectedPlayer.overall}
                </div>
              </div>

              {/* Core Attributes Breakdown */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-400">{isAr ? 'السمات الفنية والبدنية:' : 'Attributes:'}</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {currentSport === 'football' ? (
                    <>
                      <div className="bg-slate-950 p-2 rounded-xl border border-slate-800 flex justify-between">
                        <span className="text-slate-400">{isAr ? 'السرعة والانطلاق' : 'Pace'}</span>
                        <span className="font-black text-white">{selectedPlayer.attributes.pace}</span>
                      </div>
                      <div className="bg-slate-950 p-2 rounded-xl border border-slate-800 flex justify-between">
                        <span className="text-slate-400">{isAr ? 'قوة ودقة التسديد' : 'Shooting'}</span>
                        <span className="font-black text-white">{selectedPlayer.attributes.shooting}</span>
                      </div>
                      <div className="bg-slate-950 p-2 rounded-xl border border-slate-800 flex justify-between">
                        <span className="text-slate-400">{isAr ? 'رؤية التمرير' : 'Passing'}</span>
                        <span className="font-black text-white">{selectedPlayer.attributes.passing}</span>
                      </div>
                      <div className="bg-slate-950 p-2 rounded-xl border border-slate-800 flex justify-between">
                        <span className="text-slate-400">{isAr ? 'المراوغة والتحكم' : 'Dribbling'}</span>
                        <span className="font-black text-white">{selectedPlayer.attributes.dribbling}</span>
                      </div>
                      <div className="bg-slate-950 p-2 rounded-xl border border-slate-800 flex justify-between">
                        <span className="text-slate-400">{isAr ? 'الصلابة الدفاعية' : 'Defending'}</span>
                        <span className="font-black text-white">{selectedPlayer.attributes.defending}</span>
                      </div>
                      <div className="bg-slate-950 p-2 rounded-xl border border-slate-800 flex justify-between">
                        <span className="text-slate-400">{isAr ? 'القوة البدنية' : 'Physical'}</span>
                        <span className="font-black text-white">{selectedPlayer.attributes.physical}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="bg-slate-950 p-2 rounded-xl border border-slate-800 flex justify-between">
                        <span className="text-slate-400">{isAr ? 'صناعة اللعب' : 'Playmaking'}</span>
                        <span className="font-black text-white">{selectedPlayer.attributes.playmaking || 75}</span>
                      </div>
                      <div className="bg-slate-950 p-2 rounded-xl border border-slate-800 flex justify-between">
                        <span className="text-slate-400">{isAr ? 'الرميات الثلاثية' : 'Three Points'}</span>
                        <span className="font-black text-white">{selectedPlayer.attributes.shootingThree || 72}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Personality & Traits */}
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold text-slate-400">{isAr ? 'الخصائص والشخصية:' : 'Traits & Personality:'}</h4>
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-xs bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2.5 py-0.5 rounded-lg font-bold">
                    {selectedPlayer.personality}
                  </span>
                  {selectedPlayer.traits.map(t => (
                    <span key={t} className="text-xs bg-slate-800 text-slate-300 px-2.5 py-0.5 rounded-lg font-semibold">
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              {/* Financial & Contract Details */}
              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>{isAr ? 'القيمة التسويقية:' : 'Market Value:'}</span>
                  <span className="font-bold text-amber-400">{selectedPlayer.marketValue.toLocaleString()} 💰</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>{isAr ? 'الراتب الأسبوعي:' : 'Weekly Wage:'}</span>
                  <span className="font-bold text-white">{selectedPlayer.wage.toLocaleString()} 💰</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>{isAr ? 'مدة العقد المتبقية:' : 'Contract Duration:'}</span>
                  <span className="font-bold text-emerald-400">{selectedPlayer.contractYears} {isAr ? 'سنوات' : 'years'}</span>
                </div>
              </div>

            </div>
          ) : null}
        </div>

      </div>
      )}

    </div>
  );
};
