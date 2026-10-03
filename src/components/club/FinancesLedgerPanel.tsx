/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * FinancesLedgerPanel — Financial Balance Sheet & Full Audit Ledger (Phase E).
 */

import React, { useState, useMemo } from 'react';
import { 
  Landmark, 
  TrendingUp, 
  TrendingDown, 
  Coins, 
  Search, 
  Filter, 
  ArrowUpRight, 
  ArrowDownLeft, 
  ShieldAlert, 
  AlertTriangle,
  Receipt,
  Building,
  Users,
  DollarSign
} from 'lucide-react';
import type { 
  FinanceSlice, 
  LedgerCategory, 
  LedgerEntry 
} from '../../domain/clubManagement/types';

interface FinancesLedgerPanelProps {
  isAr: boolean;
  finance: FinanceSlice;
  squadWeeklyWages: number;
}

export const FinancesLedgerPanel: React.FC<FinancesLedgerPanelProps> = ({
  isAr,
  finance,
  squadWeeklyWages,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const isRestricted = finance.transferRestrictedUntilWeek !== undefined && finance.transferRestrictedUntilWeek > 0;
  const netSeasonOperating = finance.seasonRevenueTotal - finance.seasonExpenseTotal;
  const wageLoadPct = Math.round((squadWeeklyWages / Math.max(1, finance.wageBudgetWeekly)) * 100);

  const categories: { id: string; labelAr: string; labelEn: string }[] = [
    { id: 'all', labelAr: 'جميع المعاملات', labelEn: 'All Transactions' },
    { id: 'match_revenue', labelAr: 'دخل المباريات', labelEn: 'Match Revenue' },
    { id: 'sponsor', labelAr: 'الرعاية التجارية', labelEn: 'Sponsors' },
    { id: 'player_wages', labelAr: 'رواتب اللاعبين', labelEn: 'Player Wages' },
    { id: 'staff_wages', labelAr: 'رواتب الطواقم', labelEn: 'Staff Wages' },
    { id: 'facility_running', labelAr: 'تشغيل المرافق', labelEn: 'Facility Costs' },
    { id: 'transfer_in', labelAr: 'صفقات الشراء', labelEn: 'Player In' },
    { id: 'transfer_out', labelAr: 'صفقات البيع', labelEn: 'Player Out' },
    { id: 'prize_money', labelAr: 'الجوائز والمكافآت', labelEn: 'Prize Money' },
  ];

  const categoryBadges: Record<string, { labelAr: string; labelEn: string; color: string; icon: string }> = {
    match_revenue: { labelAr: 'مباراة', labelEn: 'Match', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', icon: '⚽' },
    sponsor: { labelAr: 'رعاية', labelEn: 'Sponsor', color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30', icon: '💼' },
    player_wages: { labelAr: 'رواتب لاعبين', labelEn: 'Wages', color: 'bg-rose-500/20 text-rose-300 border-rose-500/30', icon: '🏃' },
    staff_wages: { labelAr: 'رواتب جهاز', labelEn: 'Staff', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30', icon: '👔' },
    facility_running: { labelAr: 'صيانة مرافق', labelEn: 'Facility', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30', icon: '🏟️' },
    transfer_in: { labelAr: 'شراء لاعب', labelEn: 'Transfer In', color: 'bg-sky-500/20 text-sky-300 border-sky-500/30', icon: '📥' },
    transfer_out: { labelAr: 'بيع لاعب', labelEn: 'Transfer Out', color: 'bg-teal-500/20 text-teal-300 border-teal-500/30', icon: '📤' },
    prize_money: { labelAr: 'جوائز', labelEn: 'Prize', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30', icon: '🏆' },
    opening_balance: { labelAr: 'رصيد افتتاحي', labelEn: 'Opening', color: 'bg-slate-500/20 text-slate-300 border-slate-500/30', icon: '🏦' },
    adjustment: { labelAr: 'تسوية', labelEn: 'Adjustment', color: 'bg-slate-500/20 text-slate-300 border-slate-500/30', icon: '⚙️' },
    monthly_summary: { labelAr: 'ملخص شهري', labelEn: 'Summary', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30', icon: '📊' },
  };

  const reasonCodeLabels: Record<string, { ar: string; en: string }> = {
    gate_receipts: { ar: 'مبيعات تذاكر المباراة الرسمية', en: 'Official Matchday Ticket Receipts' },
    sponsor_match: { ar: 'دفعة الرعاية الترويجية للمباراة', en: 'Matchday Commercial Sponsor Payout' },
    player_sale: { ar: 'عائدات بيع بطاقة لاعب', en: 'Player Contract Sale Proceeds' },
    player_purchase: { ar: 'تكلفة إتمام صفقة شراء لاعب', en: 'Player Transfer Acquisition Fee' },
    weekly_player_wages: { ar: 'مسير رواتب التشكيلة الأسبوعي', en: 'Weekly Squad Wage Payroll' },
    weekly_staff_wages: { ar: 'رواتب الأجهزة الفنية والطبية', en: 'Weekly Coaching & Medical Wages' },
    staff_hiring_fee: { ar: 'رسوم توقيع عقد طاقم فني جديد', en: 'New Staff Member Contract Fee' },
    staff_severance: { ar: 'تسوية مستحقات إنهاء عقد طاقم فني', en: 'Staff Dismissal Severance Pay' },
    facility_maintenance: { ar: 'تكاليف تشغيل وصيانة المنشآت', en: 'Weekly Facility Maintenance Costs' },
    analytics_upgrade: { ar: 'استثمار تحديث قسم التحليل الرياضي', en: 'Analytics Department Level Upgrade' },
    migration_opening_balance: { ar: 'الرصيد التأسيسي للمركز المالي', en: 'Initial Financial Balance Seed' },
  };

  // Filtered and reversed ledger (latest first)
  const filteredLedger = useMemo(() => {
    let list = [...finance.ledger];
    if (selectedCategory !== 'all') {
      list = list.filter((e) => e.category === selectedCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((e) => 
        e.reasonCode.toLowerCase().includes(q) || 
        e.category.toLowerCase().includes(q) ||
        (reasonCodeLabels[e.reasonCode]?.ar.includes(q)) ||
        (reasonCodeLabels[e.reasonCode]?.en.toLowerCase().includes(q))
      );
    }
    return list.reverse();
  }, [finance.ledger, selectedCategory, searchQuery]);

  return (
    <div className="space-y-6">
      
      {/* Transfer Restriction Warning Banner */}
      {isRestricted && (
        <div className="bg-rose-950/70 border border-rose-500/50 rounded-2xl p-4 flex items-center justify-between text-xs text-rose-200 shadow-xl animate-pulse">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            <div>
              <span className="font-black text-sm block">
                {isAr ? 'عقوبة إدارية: تجميد ميزانية التعاقدات' : 'Board Sanction: Transfer Spending Restricted'}
              </span>
              <span>
                {isAr
                  ? `بأمر من مجلس الإدارة تم تجميد استخدام ميزانية الانتقالات حتى الأسبوع ${finance.transferRestrictedUntilWeek} لعدم استيفاء الأهداف المالية.`
                  : `By board decree, transfer spend is locked until game week ${finance.transferRestrictedUntilWeek} due to budgetary concerns.`}
              </span>
            </div>
          </div>
          <span className="px-3 py-1 rounded-xl bg-rose-900/60 font-black text-white shrink-0">
            {isAr ? `أسبوع ${finance.transferRestrictedUntilWeek}` : `GW ${finance.transferRestrictedUntilWeek}`}
          </span>
        </div>
      )}

      {/* Financial Health Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Treasury */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-bold">{isAr ? 'الخزينة النقدية الكلية' : 'Treasury Balance'}</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-300">
            {finance.coins.toLocaleString()} 💰
          </div>
          <span className="text-[11px] text-slate-400 block">
            {isAr ? 'السيولة المتاحة لجميع الأنشطة' : 'Available liquid working capital'}
          </span>
        </div>

        {/* Transfer Budget */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-bold">{isAr ? 'ميزانية الانتقالات المعتمدة' : 'Transfer Budget'}</span>
            <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center">
              <Landmark className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-sky-400">
            {finance.transferBudget.toLocaleString()} 💰
          </div>
          <span className="text-[11px] text-slate-400 block">
            {isAr ? 'الحد الأقصى لرسوم الشراء' : 'Capped acquisition spend ceiling'}
          </span>
        </div>

        {/* Wage Budget vs Squad Wages */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-bold">{isAr ? 'فاتورة الرواتب الأسبوعية' : 'Weekly Wage Bill'}</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-400">
            {squadWeeklyWages.toLocaleString()} 💰
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>{isAr ? `السقف: ${finance.wageBudgetWeekly.toLocaleString()}` : `Cap: ${finance.wageBudgetWeekly.toLocaleString()}`}</span>
              <span className={`font-black ${wageLoadPct > 90 ? 'text-rose-400' : 'text-slate-300'}`}>{wageLoadPct}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-slate-950 overflow-hidden">
              <div 
                className={`h-full rounded-full ${wageLoadPct > 90 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                style={{ width: `${Math.min(100, wageLoadPct)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Operating Balance */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-bold">{isAr ? 'صافي أرباح الموسم' : 'Net Season Balance'}</span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              netSeasonOperating >= 0 ? 'bg-teal-500/20 text-teal-400' : 'bg-rose-500/20 text-rose-400'
            }`}>
              {netSeasonOperating >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            </div>
          </div>
          <div className={`text-2xl font-black ${netSeasonOperating >= 0 ? 'text-teal-400' : 'text-rose-400'}`}>
            {netSeasonOperating >= 0 ? `+${netSeasonOperating.toLocaleString()}` : netSeasonOperating.toLocaleString()} 💰
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-400">
            <span>{isAr ? `إيراد: +${finance.seasonRevenueTotal.toLocaleString()}` : `Rev: +${finance.seasonRevenueTotal.toLocaleString()}`}</span>
            <span>{isAr ? `مصروف: -${finance.seasonExpenseTotal.toLocaleString()}` : `Exp: -${finance.seasonExpenseTotal.toLocaleString()}`}</span>
          </div>
        </div>

      </div>

      {/* Ledger Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading font-black text-base text-white">
                {isAr ? 'دفتر الأستاذ والتدقيق المالي' : 'Financial Ledger & Cashflow Audit'}
              </h3>
              <p className="text-xs text-slate-400">
                {isAr ? 'سجل غير قابل للتعديل يوثق جميع الإيرادات والمصروفات بدقة' : 'Immutable financial transaction history'}
              </p>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isAr ? 'بحث في القيود المالية...' : 'Search ledger entries...'}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Filter Badges */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-2">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === c.id
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {isAr ? c.labelAr : c.labelEn}
            </button>
          ))}
        </div>

        {/* Ledger Entries List */}
        <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
          {filteredLedger.length === 0 ? (
            <div className="p-8 rounded-2xl bg-slate-950/60 border border-slate-800 text-center text-xs text-slate-400">
              {isAr ? 'لا توجد قيود مالية مطابقة للفلاتر المحددة.' : 'No ledger transactions match this filter.'}
            </div>
          ) : (
            filteredLedger.map((entry: LedgerEntry) => {
              const isPositive = entry.amount >= 0;
              const badge = categoryBadges[entry.category] || categoryBadges.adjustment;
              const reasonDesc = reasonCodeLabels[entry.reasonCode] || { ar: entry.reasonCode, en: entry.reasonCode };

              return (
                <div
                  key={entry.id}
                  className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between gap-4 hover:border-slate-700 transition-all text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl shrink-0">{badge.icon}</span>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-white text-xs sm:text-sm">
                          {isAr ? reasonDesc.ar : reasonDesc.en}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${badge.color}`}>
                          {isAr ? badge.labelAr : badge.labelEn}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-slate-500">
                        <span>{isAr ? `الأسبوع ${entry.gameWeek}` : `GW ${entry.gameWeek}`}</span>
                        <span>•</span>
                        <span>{isAr ? `الموسم ${entry.season}` : `Season ${entry.season}`}</span>
                        <span>•</span>
                        <span>{entry.timestampIso ? new Date(entry.timestampIso).toLocaleDateString() : ''}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className={`text-sm sm:text-base font-black flex items-center justify-end gap-1 ${
                      isPositive ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {isPositive ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                      <span>{isPositive ? `+${entry.amount.toLocaleString()}` : entry.amount.toLocaleString()} 💰</span>
                    </div>
                    <span className="text-[10px] text-slate-500 block">
                      {isAr ? 'الرصيد بعد القيد:' : 'Balance:'} {entry.balanceAfter.toLocaleString()} 💰
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>

    </div>
  );
};
