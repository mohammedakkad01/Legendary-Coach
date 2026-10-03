/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ClubManagementHeader — Top summary bar and sub-tab switcher for Club Management (Phase E).
 */

import React from 'react';
import { 
  Building2, 
  Coins, 
  Landmark, 
  Users, 
  FileText, 
  ShieldAlert, 
  Sparkles,
  Award,
  AlertTriangle
} from 'lucide-react';
import type { ClubManagementState } from '../../domain/clubManagement/types';

export type ClubManagementTab = 'overview' | 'finances' | 'staff' | 'delegation' | 'facilities';

interface ClubManagementHeaderProps {
  isAr: boolean;
  clubName: string;
  divisionName: string;
  activeSubTab: ClubManagementTab;
  onTabChange: (tab: ClubManagementTab) => void;
  cm: ClubManagementState;
}

export const ClubManagementHeader: React.FC<ClubManagementHeaderProps> = ({
  isAr,
  clubName,
  divisionName,
  activeSubTab,
  onTabChange,
  cm,
}) => {
  const isTransferRestricted = cm.board.consequenceLevel === 'transfer_restricted' || 
    (cm.finance.transferRestrictedUntilWeek !== undefined && cm.finance.transferRestrictedUntilWeek > 0);

  const tabs: { id: ClubManagementTab; labelAr: string; labelEn: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'overview', labelAr: 'مجلس الإدارة والرؤية', labelEn: 'Board & Vision', icon: Building2 },
    { id: 'finances', labelAr: 'المالية وسجل الأستاذ', labelEn: 'Finances & Ledger', icon: Landmark },
    { id: 'staff', labelAr: 'الجهاز الفني والتوظيف', labelEn: 'Staff & Hiring', icon: Users },
    { id: 'delegation', labelAr: 'تفويض المهام', labelEn: 'Delegation Matrix', icon: FileText },
    { id: 'facilities', labelAr: 'المنشآت والمؤشرات', labelEn: 'Facilities & Modifiers', icon: Award },
  ];

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border border-indigo-500/20 rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold mb-1">
              <Building2 className="w-4 h-4" />
              <span>{divisionName || (isAr ? 'الدوري الممتاز' : 'Premier League')}</span>
              {isTransferRestricted && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-black border border-rose-500/40 animate-pulse">
                  <AlertTriangle className="w-3 h-3" />
                  {isAr ? 'تقييد انتقالات مفروض' : 'Transfer Restricted'}
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-black font-heading text-white tracking-tight">
              {clubName} — {isAr ? 'إدارة النادي والمرافق' : 'Club Operations & HQ'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
              {isAr
                ? 'قيادة الشؤون الإدارية للنادي: اتخاذ القرارات مع مجلس الإدارة، مراقبة التدفقات المالية، تعيين وتفويض الطواقم الفنية وتحديث المنشآت.'
                : 'Direct high-level club operations: oversee board expectations, track ledger finances, appoint & delegate staff, and upgrade infrastructure.'}
            </p>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 block font-bold">{isAr ? 'الخزينة النقدية' : 'Treasury Balance'}</span>
              <span className="text-base sm:text-lg font-black text-amber-300">{cm.finance.coins.toLocaleString()} 💰</span>
            </div>

            <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 block font-bold">{isAr ? 'ميزانية الانتقالات' : 'Transfer Budget'}</span>
              <span className="text-base sm:text-lg font-black text-sky-400">{cm.finance.transferBudget.toLocaleString()} 💰</span>
            </div>

            <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800 text-center col-span-2 sm:col-span-1">
              <span className="text-[10px] text-slate-400 block font-bold">{isAr ? 'سقف الرواتب الأسبوعي' : 'Weekly Wage Cap'}</span>
              <span className="text-base sm:text-lg font-black text-emerald-400">{cm.finance.wageBudgetWeekly.toLocaleString()} 💰</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-Tab Navigation Switcher */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 shadow-inner">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-black whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{isAr ? tab.labelAr : tab.labelEn}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
