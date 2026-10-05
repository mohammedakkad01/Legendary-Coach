/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * BoardOverviewPanel — Board of Directors, Manager Influence & Fan Sentiment (Phase E).
 */

import React, { useState } from 'react';
import { 
  Building2, 
  ShieldAlert, 
  CheckCircle2, 
  Clock, 
  Award, 
  Send, 
  Flame, 
  TrendingUp, 
  ThumbsUp, 
  HeartHandshake, 
  Sparkles, 
  ChevronRight,
  HelpCircle,
  X,
  AlertOctagon
} from 'lucide-react';
import type { 
  BoardObjective, 
  ClubManagementState 
} from '../../domain/clubManagement/types';
import { 
  evaluateBoardRequest,
  type BoardRequestKind 
} from '../../domain/clubManagement/influence/computeInfluence';

interface BoardOverviewPanelProps {
  isAr: boolean;
  cm: ClubManagementState;
  onSubmitBoardRequest: (request: BoardRequestKind) => { approved: boolean; message: string; reasonCodes: string[] };
}

export const BoardOverviewPanel: React.FC<BoardOverviewPanelProps> = ({
  isAr,
  cm,
  onSubmitBoardRequest,
}) => {
  const [selectedRequest, setSelectedRequest] = useState<BoardRequestKind>('raise_transfer_budget');
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const { board, influence, fans } = cm;

  // Real-time evaluation preview using domain pure evaluator
  const previewEval = evaluateBoardRequest(influence, board.trust, board.patience, selectedRequest);

  const consequenceBadge = {
    none: { textAr: 'وضع إداري مستقر وآمن', textEn: 'Secure Board Confidence', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
    warning: { textAr: 'تحذير رسمي من الإدارة', textEn: 'Official Board Warning', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
    transfer_restricted: { textAr: 'تجميد ميزانية الصفقات', textEn: 'Transfer Freeze Imposed', color: 'bg-rose-500/20 text-rose-300 border-rose-500/30' },
    ultimatum: { textAr: 'إنذار أخير قبل الإقالة!', textEn: 'Final Board Ultimatum!', color: 'bg-rose-600/30 text-rose-200 border-rose-600/50' },
    dismissed: { textAr: 'تمت إقالة المدرب', textEn: 'Manager Dismissed', color: 'bg-red-950 text-red-300 border-red-500' },
  }[board.consequenceLevel];

  const visionDescriptions: Record<string, { ar: string; en: string }> = {
    stability: { ar: 'الاستقرار المالي والتوازن الإداري', en: 'Financial Stability & Consistency' },
    growth: { ar: 'تطوير النادي وبناء مشروع مستدام', en: 'Sustainable Growth & Progress' },
    youth: { ar: 'التركيز على أكاديمية الشباب والمواهب الصاعدة', en: 'Youth Academy & Wonderkid Pipeline' },
    titles: { ar: 'المنافسة الفورية على الألقاب والبطولات الكبرى', en: 'Immediate Trophies & Silverware' },
  };

  const availableRequests: {
    kind: BoardRequestKind;
    titleAr: string;
    titleEn: string;
    descAr: string;
    descEn: string;
    requiredAuthority: keyof typeof influence.unlocked;
  }[] = [
    {
      kind: 'raise_transfer_budget',
      titleAr: 'طلب زيادة ميزانية الانتقالات',
      titleEn: 'Request Transfer Budget Raise',
      descAr: 'المطالبة بضخ 25% إضافية من السيولة النقدية في ميزانية التعاقدات لتدعيم التشكيلة.',
      descEn: 'Request the board to inject 25% of treasury funds into the active transfer budget.',
      requiredAuthority: 'transferBudgetSay',
    },
    {
      kind: 'hire_staff',
      titleAr: 'طلب استقدام طاقم فني متخصص',
      titleEn: 'Request Additional Staff Hire',
      descAr: 'المطالبة برفع مرونة مجلس الإدارة وتوفير تمويل للتعاقد مع كفاءات فنية إضافية.',
      descEn: 'Request board approval to recruit additional specialized coaching and medical staff.',
      requiredAuthority: 'staffDecisions',
    },
    {
      kind: 'upgrade_facility',
      titleAr: 'تسريع تحديث المنشآت الرياضية',
      titleEn: 'Accelerate Facility Modernization',
      descAr: 'طلب دعم الإدارة في تسريع مشاريع البنية التحتية وتطوير المقرات.',
      descEn: 'Request board backing to push forward club infrastructure expansions.',
      requiredAuthority: 'infrastructureRequests',
    },
    {
      kind: 'academy_focus_change',
      titleAr: 'إعادة توجيه استقطاب الأكاديمية',
      titleEn: 'Shift Academy Recruitment Focus',
      descAr: 'إلزام الإدارة بمنح الصلاحية للمدرب لتحديد سياسة كشافة الفئات السنية.',
      descEn: 'Command full authority to redirect the youth intake scouting priorities.',
      requiredAuthority: 'academyDecisions',
    },
    {
      kind: 'release_player',
      titleAr: 'فسخ عقد لاعب بالتراضي',
      titleEn: 'Mutual Player Contract Release',
      descAr: 'طلب موافقة مجلس الإدارة على تسوية مستحقات وفسخ عقد لاعب خارج الحسابات.',
      descEn: 'Request board permission and funds to terminate an unwanted player contract.',
      requiredAuthority: 'playerAuthority',
    },
  ];

  const handleExecuteRequest = () => {
    onSubmitBoardRequest(selectedRequest);
    setRequestModalOpen(false);
  };

  return (
    <div className="space-y-6">
      
      {/* Row 1: Board of Directors & Objectives Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Card 1: Board Governance & Consequence Ladder */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-5 shadow-xl flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading font-black text-base text-white">
                    {isAr ? 'مجلس الإدارة والسياسة' : 'Board Governance'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {isAr ? 'رؤية النادي وثقة صناع القرار' : 'Strategic vision & confidence'}
                  </p>
                </div>
              </div>

              <span className={`px-2.5 py-1 rounded-full text-[11px] font-black border ${consequenceBadge.color}`}>
                {isAr ? consequenceBadge.textAr : consequenceBadge.textEn}
              </span>
            </div>

            {/* Vision Pill */}
            <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 text-xs">
              <span className="text-[10px] text-indigo-400 block font-bold mb-0.5">
                {isAr ? 'رؤية مجلس الإدارة للموسم:' : 'Board Season Vision:'}
              </span>
              <span className="font-bold text-slate-200">
                {visionDescriptions[board.vision]
                  ? (isAr ? visionDescriptions[board.vision].ar : visionDescriptions[board.vision].en)
                  : board.vision}
              </span>
            </div>

            {/* Gauges */}
            <div className="space-y-3">
              {/* Trust Meter */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-300 font-bold">{isAr ? 'ثقة مجلس الإدارة' : 'Board Trust'}</span>
                  <span className={`font-black ${board.trust >= 60 ? 'text-emerald-400' : board.trust >= 35 ? 'text-amber-400' : 'text-rose-400'}`}>
                    {board.trust}%
                  </span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      board.trust >= 60 ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : board.trust >= 35 ? 'bg-gradient-to-r from-amber-500 to-yellow-400' : 'bg-gradient-to-r from-rose-500 to-red-600'
                    }`}
                    style={{ width: `${board.trust}%` }}
                  />
                </div>
              </div>

              {/* Patience Meter */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-300 font-bold">{isAr ? 'صبر الإدارة على القرارات' : 'Board Patience'}</span>
                  <span className="font-black text-sky-400">{board.patience}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
                  <div 
                    className="h-full rounded-full bg-gradient-to-r from-sky-500 to-indigo-400 transition-all duration-500"
                    style={{ width: `${board.patience}%` }}
                  />
                </div>
              </div>

              {/* Expectations Meter */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-300 font-bold">{isAr ? 'سقف التطلعات' : 'Expectations Bar'}</span>
                  <span className="font-black text-purple-400">{board.expectations}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
                  <div 
                    className="h-full rounded-full bg-gradient-to-r from-purple-500 to-fuchsia-400 transition-all duration-500"
                    style={{ width: `${board.expectations}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Action to Request from Board */}
          <button
            onClick={() => setRequestModalOpen(true)}
            className="w-full mt-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white font-black text-xs shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>{isAr ? 'تقديم طلب إلى مجلس الإدارة' : 'Submit Board Request'}</span>
          </button>
        </div>

        {/* Card 2: Season Objectives */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-heading font-black text-base text-white">
                  {isAr ? 'أهداف الموسم الرسمية' : 'Season Objectives'}
                </h3>
                <p className="text-[11px] text-slate-400">
                  {isAr ? 'المعايير المحددة لتقييم أداء المدرب' : 'Contractual key performance targets'}
                </p>
              </div>
            </div>

            <div className="space-y-3 mt-4">
              {board.objectives.length === 0 ? (
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-center text-xs text-slate-400">
                  {isAr ? 'جاري تحديد أهداف الموسم بعد انطلاق المنافسات...' : 'Season objectives are being calibrated...'}
                </div>
              ) : (
                board.objectives.map((obj: BoardObjective) => (
                  <div key={obj.id} className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-black text-white">{obj.targetLabel}</span>
                      {obj.met ? (
                        <span className="flex items-center gap-1 text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" />
                          {isAr ? 'مكتمل' : 'Met'}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                          <Clock className="w-3 h-3" />
                          {isAr ? `${obj.progressPct}% منجز` : `${obj.progressPct}% done`}
                        </span>
                      )}
                    </div>

                    <div className="w-full h-1.5 rounded-full bg-slate-900 overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${obj.met ? 'bg-emerald-500' : 'bg-amber-500'}`}
                        style={{ width: `${Math.min(100, Math.max(5, obj.progressPct))}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400">
            {isAr
              ? 'تحقيق هذه الأهداف يضمن تجديد العقد تلقائياً ويرفع ميزانية التعاقدات الموسمية بنسبة 20%.'
              : 'Achieving objectives secures automatic contract extension and +20% next-season transfer budget.'}
          </div>
        </div>

        {/* Card 3: Manager Influence & Fan Sentiment */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-5 shadow-xl flex flex-col justify-between">
          <div className="space-y-4">
            
            {/* Manager Influence */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-heading font-black text-sm text-white">
                      {isAr ? 'نفوذ المدرب وصلاحياته' : 'Manager Influence'}
                    </h4>
                    <p className="text-[10px] text-slate-400">
                      {isAr ? 'مكتسب من الألقاب والانتصارات واستقرار النادي' : 'Earned through silverware & tenure'}
                    </p>
                  </div>
                </div>

                <span className="text-xl font-black text-purple-400">
                  {influence.score}/100
                </span>
              </div>

              {/* Unlocked Authorities Pills */}
              <div className="grid grid-cols-2 gap-1.5 mt-2">
                <div className={`p-1.5 rounded-lg text-[10px] font-bold border text-center ${
                  influence.unlocked.transferBudgetSay 
                    ? 'bg-purple-950/40 text-purple-300 border-purple-500/30' 
                    : 'bg-slate-950 text-slate-500 border-slate-800'
                }`}>
                  {isAr ? 'صلاحية الميزانية' : 'Budget Voice'}
                </div>

                <div className={`p-1.5 rounded-lg text-[10px] font-bold border text-center ${
                  influence.unlocked.staffDecisions 
                    ? 'bg-purple-950/40 text-purple-300 border-purple-500/30' 
                    : 'bg-slate-950 text-slate-500 border-slate-800'
                }`}>
                  {isAr ? 'قرارات الطاقم الفني' : 'Staff Decisions'}
                </div>

                <div className={`p-1.5 rounded-lg text-[10px] font-bold border text-center ${
                  influence.unlocked.academyDecisions 
                    ? 'bg-purple-950/40 text-purple-300 border-purple-500/30' 
                    : 'bg-slate-950 text-slate-500 border-slate-800'
                }`}>
                  {isAr ? 'سياسة الأكاديمية' : 'Academy Policy'}
                </div>

                <div className={`p-1.5 rounded-lg text-[10px] font-bold border text-center ${
                  influence.unlocked.tacticalAutonomy 
                    ? 'bg-purple-950/40 text-purple-300 border-purple-500/30' 
                    : 'bg-slate-950 text-slate-500 border-slate-800'
                }`}>
                  {isAr ? 'استقلالية التكتيك' : 'Tactical Autonomy'}
                </div>
              </div>
            </div>

            {/* Fan Sentiment */}
            <div className="pt-3 border-t border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-black text-white">
                  <Flame className="w-4 h-4 text-amber-500" />
                  <span>{isAr ? 'مزاج الجماهير والأنصار' : 'Fan Loyalty & Mood'}</span>
                </div>
                <span className={`text-xs font-black ${fans.mood >= 65 ? 'text-emerald-400' : fans.mood >= 40 ? 'text-amber-400' : 'text-rose-400'}`}>
                  {fans.mood}%
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center text-xs">
                <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">{isAr ? 'ثقة المشجعين' : 'Fan Confidence'}</span>
                  <span className="font-black text-sky-400">{fans.confidence}%</span>
                </div>

                <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">{isAr ? 'الولاء للنادي' : 'Club Trust'}</span>
                  <span className="font-black text-emerald-400">{fans.trust}%</span>
                </div>
              </div>
            </div>

          </div>

          <div className="text-[10px] text-slate-500 text-center">
            {isAr ? 'نتائج المباريات الرسمية تنعكس مباشرة على ثقة المشجعين' : 'Matchday performance directly drives fan sentiment'}
          </div>
        </div>

      </div>

      {/* Board Request Modal */}
      {requestModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 max-w-lg w-full space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Send className="w-5 h-5 text-indigo-400" />
                <h3 className="font-heading font-black text-base text-white">
                  {isAr ? 'تقديم طلب رسمي لمجلس الإدارة' : 'Submit Formal Board Request'}
                </h3>
              </div>
              <button
                onClick={() => setRequestModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              {isAr
                ? 'اختر نوع الطلب الموجه للإدارة. يعتمد قرار القبول أو الرفض على مستوى نفوذك الإداري الحالي وثقة مجلس الإدارة.'
                : 'Select a formal request for the board. Approval depends on your managerial influence score and current board trust.'}
            </p>

            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {availableRequests.map((req) => {
                const isSelected = selectedRequest === req.kind;
                const hasAuthority = influence.unlocked[req.requiredAuthority];

                return (
                  <div
                    key={req.kind}
                    onClick={() => setSelectedRequest(req.kind)}
                    className={`p-3.5 rounded-2xl border text-xs cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-indigo-950/70 border-indigo-500 text-white shadow-md'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black text-sm">{isAr ? req.titleAr : req.titleEn}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        hasAuthority ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                      }`}>
                        {hasAuthority ? (isAr ? 'الصلاحية مفتوحة' : 'Authority Unlocked') : (isAr ? 'مغلقة' : 'Locked')}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">{isAr ? req.descAr : req.descEn}</p>
                  </div>
                );
              })}
            </div>

            {/* Live Domain Prediction */}
            <div className={`p-3 rounded-2xl border text-xs flex items-center justify-between ${
              previewEval.approved
                ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                : 'bg-amber-950/40 border-amber-500/30 text-amber-300'
            }`}>
              <span className="font-bold">
                {isAr ? 'التقييم المتوقع للطلب:' : 'Expected Outcome:'}
              </span>
              <span className="font-black">
                {previewEval.approved ? (isAr ? '✅ موافقة مرجحة' : '✅ Likely Approved') : (isAr ? '⚠️ رفض مرجح' : '⚠️ Likely Rejected')}
              </span>
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setRequestModalOpen(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-800 text-slate-400 hover:text-white text-xs font-bold"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={handleExecuteRequest}
                className="flex-1 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black shadow-lg shadow-indigo-600/30 cursor-pointer"
              >
                {isAr ? 'إرسال الطلب الآن' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
