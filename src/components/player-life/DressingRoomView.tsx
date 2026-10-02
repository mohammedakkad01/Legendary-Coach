/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Dressing Room, Hierarchy & Captaincy Panel (Phase C)
 * Cohesion, hierarchy stability, social groups, active conflicts, and captain change flow.
 * Captaincy confirmation strictly reveals only visible consequences (e.g. hierarchy impact, morale reaction).
 */

import React, { useState } from 'react';
import { useGameStore } from '../../state/useGameStore';
import { useFeedback } from '../../context/FeedbackContext';
import { computeCaptaincySuitability } from '../../domain/playerLife/captaincy';
import { PLAYER_LIFE as P } from '../../config/gameTuning';
import { ConditionMeter, MoodBadge } from './PlayerLifeBadges';
import { Shield, Crown, Users, AlertCircle, CheckCircle2, ChevronRight, X, HeartCrack, Flame } from 'lucide-react';
import type { Player } from '../../types/game';

export const DressingRoomView: React.FC = () => {
  const { club, livingWorld, language, changeCaptainWithConsequences } = useGameStore();
  const { toast } = useFeedback();
  const isAr = language === 'ar';

  const squad = club.footballSquad;
  const relationships = livingWorld.relationships ?? [];
  const dr = livingWorld.dressingRoom ?? {
    cohesion: 58,
    hierarchyStability: 62,
    activeConflictPlayerIds: [],
  };

  const currentCaptainId = club.footballTactics.captainId;
  const currentCaptain = squad.find((p) => p.id === currentCaptainId) || squad[0];

  // Captaincy suitability scores for all squad players
  const captainCandidates = squad
    .map((player) => ({
      player,
      score: computeCaptaincySuitability(player, relationships, currentCaptainId),
    }))
    .sort((a, b) => b.score - a.score);

  // Active conflicts players
  const conflictPlayers = squad.filter((p) => dr.activeConflictPlayerIds.includes(p.id));

  // Cliques / Social groups (relationships with friendship/respect)
  const friendshipRels = relationships.filter((r) => r.type === 'friendship' && r.strength >= 60);

  // Captain change state
  const [candidateToConfirm, setCandidateToConfirm] = useState<Player | null>(null);

  const handleConfirmCaptainChange = () => {
    if (!candidateToConfirm) return;
    changeCaptainWithConsequences(candidateToConfirm.id);
    toast.success(
      isAr
        ? `تم تعيين ${candidateToConfirm.name} قائداً رسمياً للفريق!`
        : `${candidateToConfirm.nameEn} is now official club captain!`,
      isAr ? 'شارة القيادة' : 'Captaincy Updated',
    );
    setCandidateToConfirm(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-indigo-950/70 via-slate-900 to-indigo-950/70 border border-indigo-500/30 rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold mb-1">
            <Users className="w-4 h-4" />
            <span>{isAr ? 'غرفة الملابس والتسلسل القيادي' : 'Dressing Room & Squad Hierarchy'}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black font-heading text-white">
            {isAr ? 'التماسك المعنوي وشارة القيادة' : 'Team Cohesion & Captaincy'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            {isAr
              ? 'متابعة روح الفريق وتماسك المجموعات وإدارة شارة القيادة.'
              : 'Monitor locker room harmony, group bonds, and manage the team armband.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 text-center min-w-[130px]">
            <span className="text-[11px] text-slate-400 block font-bold">
              {isAr ? 'التماسك العام' : 'Cohesion'}
            </span>
            <span
              className={`text-xl font-black ${
                dr.cohesion >= 70 ? 'text-emerald-400' : dr.cohesion >= 45 ? 'text-amber-400' : 'text-rose-400'
              }`}
            >
              %{dr.cohesion}
            </span>
          </div>

          <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 text-center min-w-[130px]">
            <span className="text-[11px] text-slate-400 block font-bold">
              {isAr ? 'استقرار التسلسل' : 'Hierarchy'}
            </span>
            <span
              className={`text-xl font-black ${
                dr.hierarchyStability >= 70 ? 'text-sky-400' : dr.hierarchyStability >= 45 ? 'text-amber-400' : 'text-rose-400'
              }`}
            >
              %{dr.hierarchyStability}
            </span>
          </div>
        </div>
      </div>

      {/* Active Conflict Warning if any */}
      {conflictPlayers.length > 0 && (
        <div className="bg-rose-950/80 border border-rose-500/60 rounded-3xl p-4 sm:p-5 flex items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-900/60 border border-rose-500 flex items-center justify-center text-rose-300 shrink-0">
              <Flame className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-black text-white">
                {isAr ? 'توتر نشط في غرفة الملابس!' : 'Active Conflict in the Dressing Room!'}
              </h4>
              <p className="text-xs text-rose-200 mt-0.5">
                {isAr
                  ? `هناك خلاف معلن يؤثر على: ${conflictPlayers.map((p) => p.name).join('، ')}. قد يؤثر على تماسك التشكيلة.`
                  : `Active tension involving: ${conflictPlayers.map((p) => p.nameEn).join(', ')}. Resolving player requests will restore peace.`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Grid: Captain Status & Candidates */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Current Captain Influence (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-bold">
              <Crown className="w-4 h-4" />
              <span>{isAr ? 'قائد الفريق الحالي' : 'Current Team Captain'}</span>
            </div>
            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-lg bg-amber-950/80 text-amber-300 border border-amber-700/60">
              Armband
            </span>
          </div>

          {currentCaptain && (
            <div className="space-y-4">
              <div className="flex items-center gap-3.5 bg-slate-950/60 border border-slate-800 rounded-2xl p-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center text-slate-950 font-black text-xl shadow-lg shrink-0">
                  {currentCaptain.overall}
                </div>
                <div className="min-w-0">
                  <h4 className="text-base font-black text-white truncate">
                    {isAr ? currentCaptain.name : currentCaptain.nameEn}
                  </h4>
                  <p className="text-xs text-slate-400">
                    {currentCaptain.position} · {currentCaptain.nationalityFlag} · {currentCaptain.age}{' '}
                    {isAr ? 'سنة' : 'yrs'}
                  </p>
                  <div className="mt-1">
                    <MoodBadge mental={currentCaptain.mentalState} isAr={isAr} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-center">
                  <span className="text-[10px] text-slate-400 block font-bold">
                    {isAr ? 'كفاءة القيادة' : 'Captaincy Rating'}
                  </span>
                  <span className="text-lg font-black text-amber-400">
                    {computeCaptaincySuitability(currentCaptain, relationships, currentCaptainId)}/100
                  </span>
                </div>
                <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-center">
                  <span className="text-[10px] text-slate-400 block font-bold">
                    {isAr ? 'القيادة الفطرية' : 'Natural Leadership'}
                  </span>
                  <span className="text-lg font-black text-sky-400">
                    {currentCaptain.personalityProfile?.leadership ?? 50}/100
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Social Groups / Cliques Summary */}
          <div className="pt-2 border-t border-slate-800 space-y-2">
            <h5 className="text-[11px] font-bold text-slate-400">
              {isAr ? 'الروابط الاجتماعية القوية' : 'Strong Inter-player Bonds'} ({friendshipRels.length})
            </h5>
            <p className="text-[11px] text-slate-400 leading-snug">
              {isAr
                ? 'وجود علاقات صداقة قوية بين اللاعبين يحمي الفريق من الهبوط الحاد في التماسك بعد الهزائم.'
                : 'Mutual friendships and respect between squad members stabilize morale across long seasons.'}
            </p>
          </div>
        </div>

        {/* Captain Candidates Ranking (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-3.5 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-sky-400 text-xs font-bold">
              <Shield className="w-4 h-4" />
              <span>{isAr ? 'ترتيب المرشحين لشارة القيادة' : 'Captaincy Candidates & Suitability'}</span>
            </div>
            <span className="text-[11px] text-slate-400">
              {isAr ? 'انقر على لاعب لتسليمه الشارة' : 'Click to reassign armband'}
            </span>
          </div>

          <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
            {captainCandidates.map(({ player, score }) => {
              const isCurrent = player.id === currentCaptainId;
              return (
                <div
                  key={player.id}
                  className={`p-3 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
                    isCurrent
                      ? 'bg-amber-950/40 border-amber-600/60 shadow-md'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center font-black text-sm text-white shrink-0">
                      {player.overall}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs sm:text-sm font-black text-white truncate">
                          {isAr ? player.name : player.nameEn}
                        </p>
                        {isCurrent && <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                      </div>
                      <p className="text-[10px] text-slate-400">
                        {player.position} · {player.age} {isAr ? 'سنة' : 'yrs'} · {isAr ? 'قيادة' : 'Ldr'}:{' '}
                        {player.personalityProfile?.leadership ?? 50}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-end">
                      <span className="text-[10px] text-slate-400 block">{isAr ? 'الملاءمة' : 'Score'}</span>
                      <span className={`text-xs font-black ${score >= 70 ? 'text-emerald-400' : 'text-slate-300'}`}>
                        {score}/100
                      </span>
                    </div>

                    {!isCurrent && (
                      <button
                        onClick={() => setCandidateToConfirm(player)}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-amber-300 font-black text-[11px] transition cursor-pointer min-h-[36px]"
                      >
                        {isAr ? 'منح الشارة' : 'Assign'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Captaincy Change Confirmation Modal (Visible Consequences Only) */}
      {candidateToConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
          onClick={() => setCandidateToConfirm(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-amber-400 text-sm font-black">
                <Crown className="w-5 h-5" />
                <span>{isAr ? 'تأكيد تغيير قائد الفريق' : 'Confirm Captaincy Change'}</span>
              </div>
              <button
                onClick={() => setCandidateToConfirm(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
              {isAr
                ? `هل أنت متأكد من سحب شارة القيادة من (${currentCaptain?.name}) وتسليمها إلى (${candidateToConfirm.name})؟`
                : `Are you sure you want to transfer the captain's armband from ${currentCaptain?.nameEn} to ${candidateToConfirm.nameEn}?`}
            </p>

            {/* Strictly Visible Decision Consequences */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5 space-y-2 text-xs">
              <h5 className="font-bold text-slate-300">
                {isAr ? 'الآثار المباشرة المتوقعة في غرفة الملابس:' : 'Expected Immediate Locker Room Effects:'}
              </h5>
              <ul className="space-y-1.5 text-slate-400">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                  <span>
                    {isAr
                      ? `هزة مؤقتة في استقرار التسلسل الهرمي (${P.captaincy.changeCohesionDelta}%).`
                      : `Temporary hierarchy adjustment (${P.captaincy.changeCohesionDelta}%).`}
                  </span>
                </li>
                {currentCaptain && currentCaptain.id !== candidateToConfirm.id && (
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
                    <span>
                      {isAr
                        ? `انخفاض فوري في معنويات القائد السابق (${currentCaptain.name}).`
                        : `Morale shock for former captain (${currentCaptain.nameEn}).`}
                    </span>
                  </li>
                )}
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                  <span>
                    {isAr
                      ? `دفعة معنوية وحافز إضافي للقائد الجديد (${candidateToConfirm.name}).`
                      : `Boost in motivation for the new captain (${candidateToConfirm.nameEn}).`}
                  </span>
                </li>
              </ul>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setCandidateToConfirm(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs cursor-pointer min-h-[44px]"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={handleConfirmCaptainChange}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs cursor-pointer min-h-[44px] shadow-lg shadow-amber-500/20"
              >
                {isAr ? 'تأكيد التغيير' : 'Confirm Change'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
