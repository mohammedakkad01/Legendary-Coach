/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Player Conversations & Direct Manager Dialogue View (Phase C)
 * Displays pending complaints, promises, and requests with domain response catalog options.
 * Shows only immediate, visible consequences (mood tone), strictly preserving decision concealment.
 */

import React, { useState } from 'react';
import { useGameStore } from '../../state/useGameStore';
import { catalogForKind } from '../../domain/playerLife/interactions/catalog';
import type { PendingPlayerInteraction, PlayerInteractionKind } from '../../domain/playerLife/types';
import { MessageSquare, AlertCircle, CheckCircle2, ChevronRight, User, ShieldAlert, Sparkles } from 'lucide-react';
import { MoodBadge } from './PlayerLifeBadges';

const KIND_META: Record<
  PlayerInteractionKind,
  { titleAr: string; titleEn: string; descAr: string; descEn: string }
> = {
  playing_time: {
    titleAr: 'طلب زيادة دقائق المشاركة',
    titleEn: 'Playing Time Request',
    descAr: 'يطالب اللاعب بالمزيد من الدقائق في المباريات الرسمية لإثبات جدارته.',
    descEn: 'The player is requesting more on-pitch minutes to prove his worth.',
  },
  training: {
    titleAr: 'استفسار حول شدة التدريب',
    titleEn: 'Training Load Concern',
    descAr: 'يعبّر اللاعب عن مخاوفه بشأن الإجهاد البدني أو الرغبة في زيادة الحمل.',
    descEn: 'The player expresses concerns regarding physical workload or pushing limits.',
  },
  contract: {
    titleAr: 'مراجعة بنود العقد والراتب',
    titleEn: 'Contract Review Request',
    descAr: 'يطلب وكيل اللاعب جلسة لمراجعة الاستحقاقات المالية وتمديد العقد.',
    descEn: 'The player and agent request a dialogue regarding terms and contract extension.',
  },
  transfer_request: {
    titleAr: 'رغبة في دراسة عروض الانتقال',
    titleEn: 'Transfer Interest & Offers',
    descAr: 'يبدي اللاعب رغبته في مناقشة مستقبله المهني في سوق الانتقالات.',
    descEn: 'The player wishes to discuss potential interest from other clubs.',
  },
  role_disagreement: {
    titleAr: 'تباين وجهات النظر حول دور اللاعب',
    titleEn: 'Role Disagreement',
    descAr: 'يشعر اللاعب بأن دوره في التشكيلة لا يتطابق مع طموحاته ومكانته.',
    descEn: 'The player feels their assigned tactical role does not fit their profile.',
  },
  tactical_disagreement: {
    titleAr: 'ملاحظة تكتيكية حول أسلوب اللعب',
    titleEn: 'Tactical System Disagreement',
    descAr: 'يرى اللاعب أن النهج الخططي الحالي يحد من قدرته على صناعة الفارق.',
    descEn: 'The player believes the current tactical scheme limits their effectiveness.',
  },
  development_concern: {
    titleAr: 'مستوى التطور الفردي',
    titleEn: 'Development & Progression Concern',
    descAr: 'يتساءل اللاعب عن خطة الجهاز الفني لتطوير نقاط ضعفه الفنية.',
    descEn: 'The player inquires about personalized coaching to address technical gaps.',
  },
  praise_request: {
    titleAr: 'انتظار تقدير الأداء الأخير',
    titleEn: 'Recognition of Recent Form',
    descAr: 'قدم اللاعب مردوداً لافتاً في الجولات الأخيرة وينتظر دعماً معنوياً.',
    descEn: 'The player performed well recently and seeks manager encouragement.',
  },
  captaincy_concern: {
    titleAr: 'شأن قيادة الفريق وشارة الكابتن',
    titleEn: 'Captaincy Discussion',
    descAr: 'استفسار حول ترتيب قادة الفريق وتسلسل المسؤولية في غرفة الملابس.',
    descEn: 'Discussion on team leadership and dressing room responsibilities.',
  },
  mentoring_request: {
    titleAr: 'طلب الإرشاد والتوجيه',
    titleEn: 'Mentorship Pairing Request',
    descAr: 'يرغب اللاعب في الاستفادة من خبرات اللاعبين القدامى لتسريع نضوجه.',
    descEn: 'The young player desires closer guidance from experienced teammates.',
  },
  national_team_concern: {
    titleAr: 'طموح الانضمام للمنتخب الوطني',
    titleEn: 'National Team Ambition',
    descAr: 'يأمل اللاعب في التواجد المستمر للحفاظ على فرصه مع المنتخب الوطني.',
    descEn: 'The player is eager to showcase form ahead of international selection.',
  },
};

export const PlayerConversationsView: React.FC = () => {
  const { livingWorld, club, language, resolvePlayerLifeInteraction } = useGameStore();
  const isAr = language === 'ar';
  const pending = livingWorld.pendingInteractions ?? [];

  const [selectedInteractionId, setSelectedInteractionId] = useState<string | null>(
    pending.length > 0 ? pending[0].id : null,
  );
  const [resolutionSummary, setResolutionSummary] = useState<{
    interactionId: string;
    messageAr: string;
    messageEn: string;
  } | null>(null);

  const activeInteraction = pending.find((i) => i.id === selectedInteractionId) || pending[0];
  const targetPlayer = activeInteraction
    ? club.footballSquad.find((p) => p.id === activeInteraction.playerId)
    : undefined;

  const handleChooseResponse = (responseId: string) => {
    if (!activeInteraction) return;

    const catalog = catalogForKind(activeInteraction.kind);
    const chosen = catalog.find((c) => c.id === responseId);

    const success = resolvePlayerLifeInteraction(activeInteraction.id, responseId);
    if (success) {
      let immediateEffectAr = 'تقبّل اللاعب القرار باحترافية وهدوء.';
      let immediateEffectEn = 'The player accepted your decision with professional focus.';

      if (
        chosen?.effectKey === 'promise_minutes' ||
        chosen?.effectKey === 'praise_public' ||
        chosen?.effectKey === 'support' ||
        chosen?.effectKey === 'review_soon'
      ) {
        immediateEffectAr = 'بدا اللاعب مرتاحاً ومتحمساً بعد هذا الوعد الواضح.';
        immediateEffectEn = 'The player appeared visibly relieved and motivated by your word.';
      } else if (
        chosen?.effectKey === 'reject_demand' ||
        chosen?.effectKey === 'override' ||
        chosen?.effectKey === 'refuse'
      ) {
        immediateEffectAr = 'أبدى اللاعب تفهماً متحفظاً مع التزامه بالقرارات الانضباطية.';
        immediateEffectEn = 'The player showed disciplined acceptance despite some inner reservation.';
      }

      setResolutionSummary({
        interactionId: activeInteraction.id,
        messageAr: immediateEffectAr,
        messageEn: immediateEffectEn,
      });

      // Clear or move to next
      setTimeout(() => {
        setResolutionSummary(null);
        setSelectedInteractionId(null);
      }, 3500);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-sky-400 text-xs font-bold mb-1">
            <MessageSquare className="w-4 h-4" />
            <span>{isAr ? 'محادثات وحوارات اللاعبين' : 'Player Dialogue & Personal Requests'}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black font-heading text-white">
            {isAr ? 'حوارات الإدارة الفنية المباشرة' : 'Direct Managerial Conversations'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            {isAr
              ? 'ناقش مطالب اللاعبين وحافظ على استقرار غرفة الملابس وقوة الحافز.'
              : 'Address squad requests, handle grievances, and protect team morale.'}
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-950/80 px-4 py-2.5 rounded-2xl border border-slate-800">
          <span className="text-xs text-slate-400 font-bold">{isAr ? 'المحادثات المعلقة' : 'Pending Requests'}:</span>
          <span className="text-base font-black text-amber-400">{pending.length}</span>
        </div>
      </div>

      {/* Resolution Summary Notification */}
      {resolutionSummary && (
        <div className="bg-emerald-950/80 border border-emerald-500/50 rounded-2xl p-4 flex items-center gap-3 text-white shadow-lg animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <p className="text-xs sm:text-sm font-bold">
            {isAr ? resolutionSummary.messageAr : resolutionSummary.messageEn}
          </p>
        </div>
      )}

      {/* Main Content Layout */}
      {pending.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-10 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-slate-800/80 text-emerald-400 mx-auto flex items-center justify-center">
            <Sparkles className="w-7 h-7" />
          </div>
          <h3 className="text-base font-black text-white">
            {isAr ? 'غرفة الملابس مستقرة تماماً' : 'Dressing Room is Calm & Steady'}
          </h3>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
            {isAr
              ? 'لا توجد طلبات أو شكاوى معلّقة حالياً من قِبل اللاعبين. تركيز الفريق بالكامل منصب على المباريات والتدريبات.'
              : 'No pending player requests or grievances. The squad is completely aligned with current managerial instructions.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Requests List (4 cols) */}
          <div className="lg:col-span-5 space-y-2.5">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
              {isAr ? 'قائمة الطلبات' : 'Pending Requests'} ({pending.length})
            </h3>

            {pending.map((interaction) => {
              const p = club.footballSquad.find((item) => item.id === interaction.playerId);
              const meta = KIND_META[interaction.kind] || {
                titleAr: interaction.kind,
                titleEn: interaction.kind,
              };
              const isSelected = activeInteraction?.id === interaction.id;

              return (
                <button
                  key={interaction.id}
                  onClick={() => setSelectedInteractionId(interaction.id)}
                  className={`w-full text-start p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 cursor-pointer min-h-[52px] ${
                    isSelected
                      ? 'bg-sky-950/60 border-sky-500/80 shadow-lg shadow-sky-500/10'
                      : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-black text-sm text-white shrink-0">
                      {p?.overall ?? '—'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-black text-white truncate">
                        {p ? (isAr ? p.name : p.nameEn) : interaction.playerId}
                      </p>
                      <p className="text-[11px] text-sky-400 font-bold truncate">
                        {isAr ? meta.titleAr : meta.titleEn}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase border ${
                        interaction.severity === 'high'
                          ? 'bg-rose-950/70 border-rose-700 text-rose-300'
                          : interaction.severity === 'medium'
                          ? 'bg-amber-950/70 border-amber-700 text-amber-300'
                          : 'bg-slate-800 border-slate-700 text-slate-300'
                      }`}
                    >
                      {interaction.severity}
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Active Conversation Detail & Options (7 cols) */}
          {activeInteraction && targetPlayer && (
            <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-5 shadow-xl">
              {/* Player Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-700 flex items-center justify-center font-black text-white text-base shadow-md">
                    {targetPlayer.overall}
                  </div>
                  <div>
                    <h4 className="text-base font-black text-white">
                      {isAr ? targetPlayer.name : targetPlayer.nameEn}
                    </h4>
                    <p className="text-xs text-slate-400">
                      {targetPlayer.position} · {targetPlayer.nationalityFlag} · {targetPlayer.age}{' '}
                      {isAr ? 'سنة' : 'yrs'}
                    </p>
                  </div>
                </div>

                <MoodBadge mental={targetPlayer.mentalState} isAr={isAr} />
              </div>

              {/* Complaint / Dialogue Prompt */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-amber-400 text-xs font-bold">
                  <AlertCircle className="w-4 h-4" />
                  <span>
                    {isAr
                      ? KIND_META[activeInteraction.kind]?.titleAr
                      : KIND_META[activeInteraction.kind]?.titleEn}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                  {isAr
                    ? KIND_META[activeInteraction.kind]?.descAr
                    : KIND_META[activeInteraction.kind]?.descEn}
                </p>
              </div>

              {/* Response Options */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  {isAr ? 'اختر ردك كمدرب فني' : 'Select Managerial Response'}
                </h4>

                <div className="space-y-2">
                  {catalogForKind(activeInteraction.kind).map((option) => (
                    <button
                      key={option.id}
                      onClick={() => handleChooseResponse(option.id)}
                      className="w-full min-h-[44px] p-3.5 rounded-2xl bg-slate-950/60 hover:bg-sky-950/40 border border-slate-800 hover:border-sky-500/60 text-white font-bold text-xs sm:text-sm transition-all flex items-center justify-between gap-3 text-start active:scale-[0.99] cursor-pointer"
                    >
                      <span>{isAr ? option.labelAr : option.labelEn}</span>
                      <ChevronRight className="w-4 h-4 text-sky-400 shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
