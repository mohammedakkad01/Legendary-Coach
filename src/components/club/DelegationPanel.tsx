/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DelegationPanel — 7-Task Delegation Matrix & Staff Assignment Center (Phase E).
 */

import React from 'react';
import { 
  FileText, 
  Dumbbell, 
  Search, 
  Clock, 
  UserPlus, 
  Eye, 
  HeartPulse, 
  Target, 
  CheckCircle2, 
  Sliders, 
  UserCheck,
  Shield,
  HelpCircle
} from 'lucide-react';
import type { 
  DelegationMode, 
  DelegationSlice, 
  DelegationTask, 
  StaffMember 
} from '../../domain/clubManagement/types';

interface DelegationPanelProps {
  isAr: boolean;
  delegation: DelegationSlice;
  staffMembers: StaffMember[];
  onUpdateDelegation: (task: DelegationTask, mode: DelegationMode, assigneeStaffId?: string) => void;
}

export const DelegationPanel: React.FC<DelegationPanelProps> = ({
  isAr,
  delegation,
  staffMembers,
  onUpdateDelegation,
}) => {

  const taskDefinitions: {
    task: DelegationTask;
    titleAr: string;
    titleEn: string;
    descAr: string;
    descEn: string;
    icon: React.ComponentType<{ className?: string }>;
    recommendedCategory: string;
  }[] = [
    {
      task: 'training',
      titleAr: 'الحصص التدريبية والجاهزية الفنية',
      titleEn: 'Tactical Drills & Sharpness',
      descAr: 'جدولة الحصص الفنية تلقائياً لرفع حدة وجاهزية اللاعبين للمباريات الرسمية.',
      descEn: 'Automate weekly training drills to maintain squad sharpness and form.',
      icon: Dumbbell,
      recommendedCategory: 'head_coach',
    },
    {
      task: 'fitness_management',
      titleAr: 'إدارة الأحمال البدنية والاستشفاء',
      titleEn: 'Workload & Fitness Recovery',
      descAr: 'توزيع تمارين التحمل واسترجاع اللياقة وتخفيف الإجهاد التراكمي للتشكيلة.',
      descEn: 'Oversee stamina conditioning, aerobic recovery, and fatigue mitigation.',
      icon: HeartPulse,
      recommendedCategory: 'fitness_coach',
    },
    {
      task: 'scouting',
      titleAr: 'تقارير الكشافة وبنك الأهداف',
      titleEn: 'Scouting Reports & Targets',
      descAr: 'تكليف الكشافة بالبحث الدوري عن صفقات مميزة متوافقة مع احتياجات التشكيلة.',
      descEn: 'Continuously scout transfer market targets matching squad tactical needs.',
      icon: Search,
      recommendedCategory: 'scout',
    },
    {
      task: 'loan_search',
      titleAr: 'إدارة إعارات المواهب الشابة',
      titleEn: 'Loan Search & Placement',
      descAr: 'تحديد أفضل الوجهات التنافسية لإعارة اللاعبين الشباب لضمان دقائق لعب كافية.',
      descEn: 'Rank and identify optimal loan destinations with high playing-time guarantees.',
      icon: Clock,
      recommendedCategory: 'recruitment_analyst',
    },
    {
      task: 'youth_recruitment',
      titleAr: 'استقطاب وتصعيد مواهب الأكاديمية',
      titleEn: 'Youth Recruitment & Intake',
      descAr: 'متابعة بطولات الفئات السنية وتنسيق استقطاب المواهب الاستثنائية للأكاديمية.',
      descEn: 'Direct youth academy scouting drives to uncover high-ceiling wonderkids.',
      icon: UserPlus,
      recommendedCategory: 'youth_director',
    },
    {
      task: 'opposition_analysis',
      titleAr: 'تحليل المنافسين والمخططات التكتيكية',
      titleEn: 'Opposition Tactical Analysis',
      descAr: 'إعداد تقارير مفصلة عن أسلوب لعب الخصم القادم ونقاط القوة والضعف.',
      descEn: 'Compile pre-match scouting dossiers on upcoming rival tactics and weaknesses.',
      icon: Eye,
      recommendedCategory: 'assistant_manager',
    },
    {
      task: 'set_pieces',
      titleAr: 'التدريب على الكرات الثابتة والركنيات',
      titleEn: 'Set Piece Routines',
      descAr: 'تدريب الفريق على التمركز الدفاعي والهجومي في الركنيات والمخالفات المباشرة.',
      descEn: 'Refine set-piece execution, corner deliveries, and defensive marking.',
      icon: Target,
      recommendedCategory: 'assistant_manager',
    },
  ];

  return (
    <div className="space-y-6">
      
      {/* Overview Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold">
            <Sliders className="w-4 h-4" />
            <span>{isAr ? 'مصفوفة تفويض المسؤوليات' : 'Executive Delegation Matrix'}</span>
          </div>
          <h3 className="font-heading font-black text-lg text-white">
            {isAr ? 'توزيع الصلاحيات بين المدرب والجهاز الفني' : 'Distribute Responsibilities with Coaching Staff'}
          </h3>
          <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
            {isAr
              ? 'يمكنك إدارة أي مهمة يدوياً أو تفويضها لأحد أعضاء الطاقم الفني المؤهلين. المهام المفوضة تطبق نفس القواعد والآليات الحسابية بدقة وتولد تقارير أسبوعية للمدرب.'
              : 'Execute tasks manually or delegate to qualified staff members. Delegated actions run through the authoritative domain pipeline and generate weekly review reports.'}
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-950/80 p-3 rounded-2xl border border-slate-800 text-xs">
          <Shield className="w-5 h-5 text-indigo-400 shrink-0" />
          <span className="text-slate-300">
            {isAr ? '7 مهام حيوية خاضعة للتفويض' : '7 Core Delegable Modules'}
          </span>
        </div>
      </div>

      {/* Delegation Tasks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {taskDefinitions.map((item) => {
          const Icon = item.icon;
          const currentMode = delegation.modes[item.task] || 'manual';
          const isDelegated = currentMode === 'delegate';
          const assigneeId = delegation.assigneeByTask[item.task];
          const assignee = staffMembers.find((m) => m.id === assigneeId);

          return (
            <div
              key={item.task}
              className={`bg-slate-900 border rounded-3xl p-5 space-y-4 shadow-xl flex flex-col justify-between transition-all ${
                isDelegated ? 'border-indigo-500/40 bg-slate-900/90' : 'border-slate-800'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                      isDelegated ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-800 text-slate-400'
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-heading font-black text-sm text-white">
                        {isAr ? item.titleAr : item.titleEn}
                      </h4>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                        isDelegated 
                          ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20' 
                          : 'bg-slate-950 text-slate-400 border-slate-800'
                      }`}>
                        {isDelegated ? (isAr ? 'مفوض للجهاز' : 'Delegated') : (isAr ? 'يدوي (إشراف المدرب)' : 'Manual Supervision')}
                      </span>
                    </div>
                  </div>

                  {/* Mode Toggle Button */}
                  <button
                    onClick={() => {
                      const nextMode = isDelegated ? 'manual' : 'delegate';
                      onUpdateDelegation(item.task, nextMode, assigneeId);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                      isDelegated
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                        : 'bg-slate-800 text-slate-300 hover:text-white'
                    }`}
                  >
                    {isDelegated ? (isAr ? 'إلغاء التفويض' : 'Make Manual') : (isAr ? 'تفويض المهمة' : 'Delegate Task')}
                  </button>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  {isAr ? item.descAr : item.descEn}
                </p>
              </div>

              {/* Assignee Selection */}
              <div className="pt-3 border-t border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-bold">{isAr ? 'المسؤول المكلف:' : 'Assigned Staff:'}</span>
                  {assignee ? (
                    <span className="text-emerald-400 font-bold flex items-center gap-1 text-[11px]">
                      <UserCheck className="w-3.5 h-3.5" />
                      {assignee.name}
                    </span>
                  ) : (
                    <span className="text-slate-500 text-[11px]">
                      {isAr ? 'غير محدد (جهاز عام)' : 'Unassigned (General)'}
                    </span>
                  )}
                </div>

                {isDelegated && (
                  <select
                    value={assigneeId || ''}
                    onChange={(e) => onUpdateDelegation(item.task, 'delegate', e.target.value || undefined)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="">{isAr ? '-- اختر عضواً من الطاقم الفني --' : '-- Select Staff Member --'}</option>
                    {staffMembers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.category}) — {m.reputation}⭐
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};
