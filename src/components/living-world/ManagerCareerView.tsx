/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ManagerCareerView — Manager career reputation, tactical identity, reputation modifiers,
 * and read-only job offers (with clear "domain action pending" status).
 */

import React, { useState } from 'react';
import { useGameStore } from '../../state/useGameStore';
import { computeManagerReputationModifiers } from '../../domain/livingWorld/manager/modifiers';
import { 
  User, 
  Briefcase, 
  ShieldCheck, 
  Sparkles, 
  TrendingUp, 
  Layers, 
  History, 
  Award, 
  AlertCircle,
  HelpCircle,
  Eye
} from 'lucide-react';

interface ManagerCareerViewProps {
  isAr: boolean;
}

export const ManagerCareerView: React.FC<ManagerCareerViewProps> = ({ isAr }) => {
  const { livingWorld, club } = useGameStore();
  const career = livingWorld.managerCareer;

  const [activeTab, setActiveTab] = useState<'profile' | 'modifiers' | 'offers' | 'ledger'>('profile');

  const repModifiers = computeManagerReputationModifiers(career);
  const ledger = career.reputationLedger || [];
  const tacticalIdentity = career.tacticalIdentity;
  const pendingOffers = career.pendingJobOffers || [];

  return (
    <div className="space-y-5" id="manager_career_view">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/30 rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                <Briefcase className="w-3.5 h-3.5" />
                {career.employmentStatus === 'dismissed'
                  ? (isAr ? 'مدير فني حر (غير مرتبط)' : 'Free Agent Manager')
                  : (isAr ? 'مدرب رسمي على رأس العمل' : 'Employed Head Coach')}
              </span>
              <span className="text-xs text-slate-400 font-bold">
                {isAr ? club.name : club.nameEn}
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-white font-heading">
              {isAr ? 'المسيرة التدريبية والهوية التكتيكية' : 'Managerial Career & Tactical Identity'}
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-xl">
              {isAr
                ? 'متابعة السمعة الرياضية، تأثير المكانة على المفاوضات وجذب النجوم، البصمة التكتيكية، وسجل القرارات التاريخية.'
                : 'Track your reputation progression, market influence multipliers, tactical profile, and managerial history.'}
            </p>
          </div>

          {/* Numerical Rep Display */}
          <div className="flex items-center gap-3">
            <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800 text-center min-w-[100px]">
              <span className="text-[10px] text-slate-400 block font-bold">{isAr ? 'السمعة التدريبية' : 'Reputation'}</span>
              <span className="text-xl sm:text-2xl font-black text-amber-400 font-mono">{career.reputation}/100</span>
            </div>
            <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800 text-center min-w-[100px]">
              <span className="text-[10px] text-slate-400 block font-bold">{isAr ? 'السمعة الإعلامية' : 'Media Rep'}</span>
              <span className="text-xl sm:text-2xl font-black text-sky-400 font-mono">
                {career.mediaReputation ?? career.reputation}/100
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
            activeTab === 'profile'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span>{isAr ? 'الملف التكتيكي' : 'Tactical Profile'}</span>
        </button>

        <button
          onClick={() => setActiveTab('modifiers')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
            activeTab === 'modifiers'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>{isAr ? 'معاملات التأثير' : 'Influence Modifiers'}</span>
        </button>

        <button
          onClick={() => setActiveTab('offers')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
            activeTab === 'offers'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Briefcase className="w-3.5 h-3.5" />
          <span>{isAr ? 'عروض التدريب' : 'Job Offers'}</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-900 text-amber-300 font-mono">
            {pendingOffers.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('ledger')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
            activeTab === 'ledger'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>{isAr ? 'سجل السمعة' : 'Reputation Ledger'}</span>
        </button>
      </div>

      {/* Tab: Profile & Tactical Identity */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Tactical Identity Card */}
          <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-400 flex items-center gap-1.5">
                <Layers className="w-4 h-4" />
                {isAr ? 'البصمة الفلسفية المكتسبة' : 'Derived Tactical Identity'}
              </span>
              {tacticalIdentity && (
                <span className="text-[10px] text-slate-500 font-mono">
                  {isAr ? `عينات: ${tacticalIdentity.sampleSize} مباريات` : `Samples: ${tacticalIdentity.sampleSize} matches`}
                </span>
              )}
            </div>

            {tacticalIdentity && tacticalIdentity.tags.length > 0 ? (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-1.5">
                  {tacticalIdentity.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-black"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-slate-400">
                  {isAr
                    ? 'تعكس هذه الوسوم أسلوبك المفضل عبر المباريات الرسمية (ضغط عالي، استحواذ، دفاع منظم).'
                    : 'These tags represent your prevailing tactical approach across official matchdays.'}
                </p>
              </div>
            ) : (
              <div className="p-6 text-center text-slate-500 text-xs bg-slate-950/60 rounded-2xl">
                {isAr
                  ? 'لم تتبلور هوية تكتيكية واضحة بعد. واصل خوض المباريات لترسيخ فلسفتك التدريبية.'
                  : 'No distinct tactical identity established yet. Play more competitive matches to define your style.'}
              </div>
            )}
          </div>

          {/* Current Employment Status */}
          <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-3">
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              {isAr ? 'الوضع الإداري والتعاقدي' : 'Contractual Status'}
            </span>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">{isAr ? 'النادي الحالي:' : 'Current Club:'}</span>
                <strong className="text-white">{isAr ? club.name : club.nameEn}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">{isAr ? 'الدرجة:' : 'Division:'}</span>
                <strong className="text-indigo-400">{club.divisionName}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">{isAr ? 'الموسم الحالي:' : 'Season:'}</span>
                <strong className="text-white">{livingWorld.currentSeason}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">{isAr ? 'حالة المنصب:' : 'Status:'}</span>
                <strong className="text-emerald-400">
                  {career.employmentStatus === 'dismissed' ? (isAr ? 'مقال' : 'Dismissed') : (isAr ? 'مستقر' : 'Secure')}
                </strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Reputation Modifiers */}
      {activeTab === 'modifiers' && (
        <div className="space-y-3">
          <p className="text-xs text-slate-400">
            {isAr
              ? 'تؤثر سمعتك التدريبية بشكل مباشر على قدرتك على استقطاب النجوم، سهولة المفاوضات، واهتمام وسائل الإعلام.'
              : 'Manager reputation directly scales your club influence, transfer appeal, and media attention.'}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              {
                titleAr: 'جذب عروض التدريب',
                titleEn: 'Job Offer Appeal',
                val: repModifiers.jobOfferInterest,
                descAr: 'رغبة الأندية الأخرى في تقديم عروض رسمية لك',
                descEn: 'Interest level from competing clubs',
              },
              {
                titleAr: 'إقناع اللاعبين بالانضمام',
                titleEn: 'Player Recruitment Appeal',
                val: repModifiers.playerInterest,
                descAr: 'تسهيل إقناع النجوم الجدد بالتوقيع',
                descEn: 'Willingness of top targets to sign',
              },
              {
                titleAr: 'استقطاب الطواقم الفنية',
                titleEn: 'Staff Recruitment Appeal',
                val: repModifiers.staffInterest,
                descAr: 'جاذبية النادي للمدربين والمساعدين المميزين',
                descEn: 'Attractiveness for elite technical staff',
              },
              {
                titleAr: 'تفاوض ثقة مجلس الإدارة',
                titleEn: 'Board Trust Weight',
                val: repModifiers.boardTrustNegotiation,
                descAr: 'وزن كلمتك في تلبية المطالب المالية',
                descEn: 'Leverage when submitting board requests',
              },
              {
                titleAr: 'تسهيل صفقات الانتقال',
                titleEn: 'Transfer Negotiation Power',
                val: repModifiers.transferNegotiation,
                descAr: 'مرونة الأندية الأخرى أثناء مفاوضات الشراء',
                descEn: 'Bargaining power in transfer market talks',
              },
              {
                titleAr: 'الاهتمام الإعلامي والصحفي',
                titleEn: 'Media Attention Factor',
                val: repModifiers.mediaAttention,
                descAr: 'حجم التغطية الصحفية وأسئلة المؤتمرات',
                descEn: 'Press coverage intensity & pressure',
              },
            ].map((m, i) => (
              <div
                key={i}
                className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-black text-white">{isAr ? m.titleAr : m.titleEn}</h5>
                  <span className="text-xs font-mono font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                    {(m.val * 100).toFixed(0)}%
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">{isAr ? m.descAr : m.descEn}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Job Offers (READ-ONLY in accordance with domain boundary) */}
      {activeTab === 'offers' && (
        <div className="space-y-3">
          <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl text-xs text-amber-300 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">
                {isAr ? 'عروض التدريب — استعراض استطلاعي' : 'Managerial Job Offers — Read-Only Preview'}
              </p>
              <p className="text-[11px] text-amber-200/80 mt-0.5">
                {isAr
                  ? 'تعرض هذه القائمة رغبة الأندية المنافسة في التعاقد معك بناءً على رصيد سمعتك. قرارات الانتقال وتغيير النادي قيد التطوير في المرحلة القادمة.'
                  : 'Displays candidate clubs expressing interest in your appointment. Club-switching career execution is staged for future expansion.'}
              </p>
            </div>
          </div>

          {pendingOffers.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs bg-slate-900/60 rounded-2xl">
              {isAr ? 'لا توجد عروض تدريب معلقة في الوقت الراهن.' : 'No active job offers pending at this time.'}
            </div>
          ) : (
            pendingOffers.map((offer) => (
              <div
                key={offer.id}
                className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between"
              >
                <div>
                  <h4 className="text-sm font-black text-white">{offer.clubName}</h4>
                  <p className="text-xs text-slate-400">
                    {isAr
                      ? `السمعة المطلوبة: ${offer.reputationRequired}/100 • نقاط الاهتمام: ${offer.interestScore}`
                      : `Reputation Required: ${offer.reputationRequired}/100 • Interest: ${offer.interestScore}`}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-xl text-xs font-bold bg-slate-800 text-slate-400 border border-slate-700">
                    {isAr ? 'الإجراء غير متاح حالياً' : 'Action Unavailable'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab: Reputation Ledger */}
      {activeTab === 'ledger' && (
        <div className="space-y-2">
          {ledger.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs bg-slate-900/60 rounded-2xl">
              {isAr ? 'لا توجد تحولات مسجلة في سجل السمعة بعد.' : 'No reputation shift events logged yet.'}
            </div>
          ) : (
            [...ledger].reverse().map((entry, idx) => {
              const isPositive = entry.delta >= 0;
              return (
                <div
                  key={idx}
                  className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between text-xs"
                >
                  <div className="space-y-0.5">
                    <span className="font-black text-white block">{entry.eventType}</span>
                    <span className="text-[11px] text-slate-500 font-mono">
                      {isAr ? `الموسم ${entry.season}` : `Season ${entry.season}`} • {entry.gameEventId}
                    </span>
                  </div>

                  <span
                    className={`text-sm font-black font-mono px-2.5 py-1 rounded-xl border ${
                      isPositive
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                    }`}
                  >
                    {isPositive ? `+${entry.delta}` : entry.delta}
                  </span>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
