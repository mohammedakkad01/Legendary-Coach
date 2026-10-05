/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * StaffManagementPanel — Staff Roster, Attributes Breakdown, Hiring Pool & Terminations (Phase E).
 */

import React, { useState, useMemo } from 'react';
import { 
  Users, 
  UserPlus, 
  UserMinus, 
  Award, 
  Coins, 
  Clock, 
  ShieldCheck, 
  Activity, 
  Sparkles, 
  Search, 
  AlertTriangle,
  X,
  CheckCircle2,
  HelpCircle
} from 'lucide-react';
import type { 
  StaffCategory, 
  StaffMember, 
  StaffSlice 
} from '../../domain/clubManagement/types';
import { generateHiringPoolCandidates } from '../../domain/clubManagement/staff/hiringPool';

interface StaffManagementPanelProps {
  isAr: boolean;
  clubId: string;
  gameWeek: number;
  staff: StaffSlice;
  onHireStaff: (candidate: StaffMember) => { success: boolean; message: string };
  onFireStaff: (staffId: string) => { success: boolean; message: string };
}

export const StaffManagementPanel: React.FC<StaffManagementPanelProps> = ({
  isAr,
  clubId,
  gameWeek,
  staff,
  onHireStaff,
  onFireStaff,
}) => {
  const [activeTab, setActiveTab] = useState<'roster' | 'hiring'>('roster');
  const [selectedStaffDetail, setSelectedStaffDetail] = useState<StaffMember | null>(null);
  const [confirmDismissStaff, setConfirmDismissStaff] = useState<StaffMember | null>(null);
  // Generate deterministic hiring pool candidates for the current game week
  const hiringPool = useMemo(() => {
    return generateHiringPoolCandidates(clubId, 42, gameWeek);
  }, [clubId, gameWeek]);

  const categoryTitles: Record<StaffCategory, { ar: string; en: string; icon: string }> = {
    head_coach: { ar: 'المدرب الأول (مدرب رئيسي)', en: 'Head Coach', icon: '⚽' },
    assistant_manager: { ar: 'المدرب المساعد', en: 'Assistant Manager', icon: '📋' },
    fitness_coach: { ar: 'مدرب اللياقة والبدنية', en: 'Fitness Coach', icon: '🏋️' },
    goalkeeping_coach: { ar: 'مدرب حراس المرمى', en: 'Goalkeeping Coach', icon: '🧤' },
    physio: { ar: 'أخصائي العلاج الطبيعي', en: 'Head Physio', icon: '🩹' },
    medical_staff: { ar: 'طبيب الفريق والأخصائي', en: 'Club Doctor', icon: '🩺' },
    sports_scientist: { ar: 'أخصائي علوم الرياضة', en: 'Sports Scientist', icon: '🧬' },
    scout: { ar: 'كشاف مواهب دولي', en: 'Senior Scout', icon: '🔭' },
    recruitment_analyst: { ar: 'محلل التعاقدات والبيانات', en: 'Recruitment Analyst', icon: '📊' },
    director_of_football: { ar: 'المدير الرياضي', en: 'Director of Football', icon: '👔' },
    youth_director: { ar: 'مدير قطاع الفئات السنية', en: 'Youth Academy Director', icon: '⭐' },
  };

  const attributeLabels: Record<string, { ar: string; en: string }> = {
    tacticalKnowledge: { ar: 'المعرفة التكتيكية', en: 'Tactical Knowledge' },
    manManagement: { ar: 'إدارة وتوجيه الأفراد', en: 'Man Management' },
    youthDevelopment: { ar: 'تطوير المواهب الشابة', en: 'Youth Development' },
    judgingAbility: { ar: 'تقييم قدرات اللاعبين', en: 'Judging Ability' },
    injuryPrevention: { ar: 'الوقاية من الإصابات', en: 'Injury Prevention' },
    diagnosisAccuracy: { ar: 'دقة التشخيص الطبي', en: 'Diagnosis Accuracy' },
    setPieceCoaching: { ar: 'تدريب الكرات الثابتة', en: 'Set Piece Coaching' },
    fitnessCoaching: { ar: 'التأهيل واللياقة البدنية', en: 'Fitness Coaching' },
    scoutingRange: { ar: 'نطاق وتغطية الكشافة', en: 'Scouting Range' },
  };

  const handleHire = (candidate: StaffMember) => {
    onHireStaff(candidate);
  };

  const handleFire = (staffId: string) => {
    onFireStaff(staffId);
    setConfirmDismissStaff(null);
  };

  return (
    <div className="space-y-6">
      
      {/* Roster vs Hiring Navigation */}
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-800 pb-3">
        <div className="flex items-center bg-slate-900 p-1.5 rounded-2xl border border-slate-800">
          <button
            onClick={() => setActiveTab('roster')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeTab === 'roster'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>{isAr ? 'الطاقم الفني الحالي' : 'Employed Staff'}</span>
            <span className="px-2 py-0.5 rounded-full bg-slate-950 text-[10px] text-slate-300">
              {staff.members.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('hiring')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeTab === 'hiring'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>{isAr ? 'سوق التعاقد مع الكفاءات' : 'Staff Hiring Pool'}</span>
            <span className="px-2 py-0.5 rounded-full bg-slate-950 text-[10px] text-amber-400">
              {hiringPool.length}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span>{isAr ? 'سمعة الطاقم الإجمالية:' : 'Staff Reputation:'}</span>
          <span className="font-black text-white px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-800">
            {staff.staffReputation}/99 ⭐
          </span>
        </div>
      </div>

      {/* Tab 1: Current Employed Staff Roster */}
      {activeTab === 'roster' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {staff.members.map((member) => {
            const cat = categoryTitles[member.category] || { ar: member.category, en: member.category, icon: '👔' };

            return (
              <div
                key={member.id}
                className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-xl flex flex-col justify-between hover:border-slate-700 transition-all"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl">{cat.icon}</span>
                      <div>
                        <h4 className="font-heading font-black text-sm text-white">
                          {member.name}
                        </h4>
                        <span className="text-[11px] font-bold text-indigo-400">
                          {isAr ? cat.ar : cat.en}
                        </span>
                      </div>
                    </div>

                    <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      {member.reputation} ⭐
                    </span>
                  </div>

                  {/* Wage & Contract */}
                  <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-800/80">
                    <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800/80">
                      <span className="text-[10px] text-slate-400 block">{isAr ? 'الراتب الأسبوعي' : 'Weekly Wage'}</span>
                      <span className="font-black text-emerald-400">{member.weeklyWage.toLocaleString()} 💰</span>
                    </div>

                    <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800/80">
                      <span className="text-[10px] text-slate-400 block">{isAr ? 'العقد المتبقي' : 'Contract Length'}</span>
                      <span className="font-black text-sky-400">
                        {isAr ? `${member.contractWeeksRemaining} أسبوع` : `${member.contractWeeksRemaining} wks`}
                      </span>
                    </div>
                  </div>

                  {/* Attributes Snapshot */}
                  <div className="space-y-1.5 pt-1">
                    {Object.entries(member.attributes).slice(0, 3).map(([key, val]) => {
                      const attrName = attributeLabels[key] || { ar: key, en: key };
                      return (
                        <div key={key} className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-400">{isAr ? attrName.ar : attrName.en}</span>
                          <span className="font-black text-slate-200">{val}/99</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                  <button
                    onClick={() => setSelectedStaffDetail(member)}
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold text-center cursor-pointer transition-all"
                  >
                    {isAr ? 'البيانات الكاملة' : 'View Full Profile'}
                  </button>

                  <button
                    onClick={() => setConfirmDismissStaff(member)}
                    className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 cursor-pointer transition-all"
                    title={isAr ? 'إنهاء العقد' : 'Terminate Contract'}
                  >
                    <UserMinus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tab 2: Hiring Pool */}
      {activeTab === 'hiring' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 text-xs text-indigo-300 flex items-center gap-3">
            <Sparkles className="w-5 h-5 shrink-0 text-indigo-400" />
            <span>
              {isAr
                ? 'قائمة الكفاءات المتاحة للتعاقد الفوري في السوق. يتم تجديد القائمة أسبوعياً بحسب سمعة النادي والميزانية المعتمدة.'
                : 'Available free-agent candidates open for immediate signing. Refreshes weekly based on club prestige.'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {hiringPool.map((candidate) => {
              const cat = categoryTitles[candidate.category] || { ar: candidate.category, en: candidate.category, icon: '👔' };
              const signingFee = candidate.weeklyWage * 2;

              return (
                <div
                  key={candidate.id}
                  className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-xl flex flex-col justify-between hover:border-indigo-500/40 transition-all"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="text-2xl">{cat.icon}</span>
                        <div>
                          <h4 className="font-heading font-black text-sm text-white">
                            {candidate.name}
                          </h4>
                          <span className="text-[11px] font-bold text-indigo-400">
                            {isAr ? cat.ar : cat.en}
                          </span>
                        </div>
                      </div>

                      <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                        {candidate.reputation} ⭐
                      </span>
                    </div>

                    {/* Wage & Signing Fee */}
                    <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-800/80">
                      <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800/80">
                        <span className="text-[10px] text-slate-400 block">{isAr ? 'الراتب المطلوب' : 'Demanded Wage'}</span>
                        <span className="font-black text-emerald-400">{candidate.weeklyWage.toLocaleString()} 💰</span>
                      </div>

                      <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800/80">
                        <span className="text-[10px] text-slate-400 block">{isAr ? 'مقدم التعاقد' : 'Signing Bonus'}</span>
                        <span className="font-black text-amber-300">{signingFee.toLocaleString()} 💰</span>
                      </div>
                    </div>

                    {/* Attributes preview */}
                    <div className="space-y-1.5 pt-1">
                      {Object.entries(candidate.attributes).slice(0, 3).map(([key, val]) => {
                        const attrName = attributeLabels[key] || { ar: key, en: key };
                        return (
                          <div key={key} className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-400">{isAr ? attrName.ar : attrName.en}</span>
                            <span className="font-black text-slate-200">{val}/99</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <button
                    onClick={() => handleHire(candidate)}
                    className="w-full mt-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>{isAr ? 'توقيع العقد فوراً' : 'Sign Staff Member'}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Staff Full Profile Inspection Modal */}
      {selectedStaffDetail && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 max-w-md w-full space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{categoryTitles[selectedStaffDetail.category]?.icon || '👔'}</span>
                <div>
                  <h3 className="font-heading font-black text-base text-white">
                    {selectedStaffDetail.name}
                  </h3>
                  <p className="text-xs text-indigo-400 font-bold">
                    {isAr ? categoryTitles[selectedStaffDetail.category]?.ar : categoryTitles[selectedStaffDetail.category]?.en}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedStaffDetail(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Attributes Grid */}
            <div className="space-y-2">
              <span className="text-xs font-black text-slate-300 block mb-2">
                {isAr ? 'الكفاءات والقدرات التدريبية والطبية:' : 'Coaching & Medical Attributes:'}
              </span>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {Object.entries(selectedStaffDetail.attributes).map(([key, val]) => {
                  const label = attributeLabels[key] || { ar: key, en: key };
                  return (
                    <div key={key} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">{isAr ? label.ar : label.en}</span>
                        <span className="font-black text-white">{val}/99</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-950 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-sky-400"
                          style={{ width: `${val}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <button
              onClick={() => setSelectedStaffDetail(null)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-800 text-white font-bold text-xs"
            >
              {isAr ? 'إغلاق' : 'Close'}
            </button>
          </div>
        </div>
      )}

      {/* Dismissal Confirmation Modal */}
      {confirmDismissStaff && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-900 border border-rose-500/40 rounded-3xl p-5 sm:p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="font-heading font-black text-base text-white">
                {isAr ? 'تأكيد إنهاء العقد' : 'Confirm Contract Termination'}
              </h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {isAr
                ? `هل أنت متأكد من رغبتك في إقالة ${confirmDismissStaff.name}؟ سيتطلب الأمر دفع مستحقات نهاية خدمة قدرها ${(confirmDismissStaff.weeklyWage * 4).toLocaleString()} كوينز فوراً.`
                : `Are you sure you want to dismiss ${confirmDismissStaff.name}? This will require an immediate severance payment of ${(confirmDismissStaff.weeklyWage * 4).toLocaleString()} coins.`}
            </p>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setConfirmDismissStaff(null)}
                className="flex-1 px-4 py-2 rounded-xl border border-slate-800 text-slate-400 text-xs font-bold"
              >
                {isAr ? 'تراجع' : 'Cancel'}
              </button>
              <button
                onClick={() => handleFire(confirmDismissStaff.id)}
                className="flex-1 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black shadow-lg shadow-rose-600/30 cursor-pointer"
              >
                {isAr ? 'تأكيد الإقالة' : 'Dismiss Staff'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
