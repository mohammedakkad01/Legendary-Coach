/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ClauseEditor — Multi-clause editor for transfer offers.
 * Supports fee, installments, bonuses, sell-on, exchange, loan structures, and release clauses.
 */

import React from 'react';
import { Plus, Trash2, DollarSign, Calendar, Gift, Percent, ArrowLeftRight, Clock, ShieldCheck } from 'lucide-react';
import type { TransferOfferClause } from '../../../domain/recruitment/negotiation/offerTypes';
import type { Player } from '../../../types/game';

interface ClauseEditorProps {
  clauses: readonly TransferOfferClause[];
  onChange: (newClauses: TransferOfferClause[]) => void;
  userSquad: readonly Player[];
  isAr?: boolean;
}

export const ClauseEditor: React.FC<ClauseEditorProps> = ({
  clauses,
  onChange,
  userSquad,
  isAr = false,
}) => {
  const feeClause = clauses.find((c): c is Extract<TransferOfferClause, { kind: 'fee' }> => c.kind === 'fee');
  const installmentsClause = clauses.find((c): c is Extract<TransferOfferClause, { kind: 'installments' }> => c.kind === 'installments');
  const sellOnClause = clauses.find((c): c is Extract<TransferOfferClause, { kind: 'sell_on' }> => c.kind === 'sell_on');
  const bonusClause = clauses.find((c): c is Extract<TransferOfferClause, { kind: 'bonus' }> => c.kind === 'bonus');
  const exchangeClause = clauses.find((c): c is Extract<TransferOfferClause, { kind: 'player_exchange' }> => c.kind === 'player_exchange');
  const loanClause = clauses.find(
    (c): c is Extract<TransferOfferClause, { kind: 'loan' | 'loan_with_option' | 'loan_with_obligation' }> =>
      c.kind === 'loan' || c.kind === 'loan_with_option' || c.kind === 'loan_with_obligation',
  );

  const updateFee = (amount: number) => {
    const remaining = clauses.filter((c) => c.kind !== 'fee');
    onChange([...remaining, { kind: 'fee', amount: Math.max(0, amount) }]);
  };

  const toggleInstallments = () => {
    if (installmentsClause) {
      onChange(clauses.filter((c) => c.kind !== 'installments'));
    } else {
      const baseFee = feeClause?.amount ?? 10_000_000;
      const upfront = Math.round(baseFee * 0.5);
      const remainingHalf = baseFee - upfront;
      onChange([
        ...clauses,
        {
          kind: 'installments',
          upfront,
          installments: [
            { amount: Math.round(remainingHalf / 2), dueWeek: 12 },
            { amount: Math.round(remainingHalf / 2), dueWeek: 24 },
          ],
        },
      ]);
    }
  };

  const toggleSellOn = () => {
    if (sellOnClause) {
      onChange(clauses.filter((c) => c.kind !== 'sell_on'));
    } else {
      onChange([...clauses, { kind: 'sell_on', percent: 15 }]);
    }
  };

  const toggleBonus = () => {
    if (bonusClause) {
      onChange(clauses.filter((c) => c.kind !== 'bonus'));
    } else {
      onChange([
        ...clauses,
        {
          kind: 'bonus',
          label: isAr ? 'مكافأة التأهل القاري' : 'Continental Qualification Bonus',
          amount: 2_000_000,
          condition: 'promotion',
        },
      ]);
    }
  };

  const toggleExchange = () => {
    if (exchangeClause) {
      onChange(clauses.filter((c) => c.kind !== 'player_exchange'));
    } else {
      const firstSquadPlayer = userSquad[0];
      onChange([
        ...clauses,
        {
          kind: 'player_exchange',
          playerId: firstSquadPlayer ? firstSquadPlayer.id : '',
          valuedAt: firstSquadPlayer ? firstSquadPlayer.marketValue : 5_000_000,
        },
      ]);
    }
  };

  const toggleLoan = (loanKind: 'loan' | 'loan_with_option' | 'loan_with_obligation') => {
    if (loanClause && loanClause.kind === loanKind) {
      onChange(clauses.filter((c) => !['loan', 'loan_with_option', 'loan_with_obligation'].includes(c.kind)));
    } else {
      const cleaned = clauses.filter((c) => !['loan', 'loan_with_option', 'loan_with_obligation'].includes(c.kind));
      if (loanKind === 'loan') {
        onChange([...cleaned, { kind: 'loan', wageSplitPercent: 50, durationWeeks: 26 }]);
      } else if (loanKind === 'loan_with_option') {
        onChange([...cleaned, { kind: 'loan_with_option', wageSplitPercent: 60, durationWeeks: 26, optionFee: 15_000_000 }]);
      } else {
        onChange([...cleaned, { kind: 'loan_with_obligation', wageSplitPercent: 70, durationWeeks: 26, obligationFee: 18_000_000 }]);
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Base Transfer Fee */}
      <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-300 flex items-center gap-1.5">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            <span>{isAr ? 'قيمة العرض المالي الأساسي (Fee):' : 'Base Transfer Fee:'}</span>
          </span>
          <span className="font-mono text-emerald-400 font-extrabold text-sm">
            €{(feeClause?.amount ?? 0).toLocaleString()}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="range"
            min={500_000}
            max={120_000_000}
            step={500_000}
            value={feeClause?.amount ?? 10_000_000}
            onChange={(e) => updateFee(parseInt(e.target.value, 10))}
            className="flex-1 accent-emerald-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
          />
        </div>
      </div>

      {/* Clause Toggles Switcher */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={toggleInstallments}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
            installmentsClause
              ? 'bg-sky-500/20 border-sky-500 text-sky-300'
              : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>{isAr ? 'أقساط مجدولة' : 'Installments'}</span>
        </button>

        <button
          type="button"
          onClick={toggleSellOn}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
            sellOnClause
              ? 'bg-amber-500/20 border-amber-500 text-amber-300'
              : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
          }`}
        >
          <Percent className="w-3.5 h-3.5" />
          <span>{isAr ? 'نسبة إعادة بيع' : 'Sell-On Clause'}</span>
        </button>

        <button
          type="button"
          onClick={toggleBonus}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
            bonusClause
              ? 'bg-purple-500/20 border-purple-500 text-purple-300'
              : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
          }`}
        >
          <Gift className="w-3.5 h-3.5" />
          <span>{isAr ? 'حوافز وإنجازات' : 'Performance Bonus'}</span>
        </button>

        <button
          type="button"
          onClick={toggleExchange}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
            exchangeClause
              ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
              : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
          }`}
        >
          <ArrowLeftRight className="w-3.5 h-3.5" />
          <span>{isAr ? 'مبادلة لاعب' : 'Player Exchange'}</span>
        </button>

        <button
          type="button"
          onClick={() => toggleLoan('loan')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
            loanClause?.kind === 'loan'
              ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300'
              : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>{isAr ? 'إعارة بسيطة' : 'Straight Loan'}</span>
        </button>

        <button
          type="button"
          onClick={() => toggleLoan('loan_with_option')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
            loanClause?.kind === 'loan_with_option'
              ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300'
              : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>{isAr ? 'إعارة + خيار شراء' : 'Loan + Option'}</span>
        </button>

        <button
          type="button"
          onClick={() => toggleLoan('loan_with_obligation')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
            loanClause?.kind === 'loan_with_obligation'
              ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300'
              : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>{isAr ? 'إعارة + إلزام شراء' : 'Loan + Obligation'}</span>
        </button>
      </div>

      {/* Active Clause Detail Panels */}
      {installmentsClause && (
        <div className="p-3 bg-sky-950/30 border border-sky-800/40 rounded-xl space-y-2 text-xs">
          <div className="font-bold text-sky-300 flex items-center justify-between">
            <span>{isAr ? 'جدول الأقساط:' : 'Installment Schedule:'}</span>
            <span className="font-mono">
              {isAr ? 'مقدم:' : 'Upfront:'} €{installmentsClause.upfront.toLocaleString()}
            </span>
          </div>
          <div className="space-y-1">
            {installmentsClause.installments.map((inst, i) => (
              <div key={i} className="flex items-center justify-between text-slate-300 font-mono">
                <span>{isAr ? `قسط أسبوع ${inst.dueWeek}:` : `Due week ${inst.dueWeek}:`}</span>
                <span>€{inst.amount.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {sellOnClause && (
        <div className="p-3 bg-amber-950/30 border border-amber-800/40 rounded-xl space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-amber-300">
              {isAr ? 'نسبة النادي البائع عند إعادة البيع:' : 'Sell-On Percentage:'}
            </span>
            <span className="font-mono font-bold text-amber-400">{sellOnClause.percent}%</span>
          </div>
          <input
            type="range"
            min={5}
            max={35}
            step={5}
            value={sellOnClause.percent}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              onChange([
                ...clauses.filter((c) => c.kind !== 'sell_on'),
                { kind: 'sell_on', percent: val },
              ]);
            }}
            className="w-full accent-amber-500"
          />
        </div>
      )}

      {bonusClause && (
        <div className="p-3 bg-purple-950/30 border border-purple-800/40 rounded-xl space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-purple-300">
              {isAr ? 'بند المكافأة المشروطة:' : 'Conditional Bonus:'}
            </span>
            <span className="font-mono font-bold text-purple-400">
              €{bonusClause.amount.toLocaleString()}
            </span>
          </div>
          <div className="text-slate-400">
            {bonusClause.label} ({bonusClause.condition})
          </div>
        </div>
      )}

      {exchangeClause && (
        <div className="p-3 bg-emerald-950/30 border border-emerald-800/40 rounded-xl space-y-2 text-xs">
          <span className="font-bold text-emerald-300">
            {isAr ? 'اختر اللاعب المعروض للمبادلة:' : 'Offered Squad Player:'}
          </span>
          <select
            value={exchangeClause.playerId}
            onChange={(e) => {
              const selectedP = userSquad.find((p) => p.id === e.target.value);
              onChange([
                ...clauses.filter((c) => c.kind !== 'player_exchange'),
                {
                  kind: 'player_exchange',
                  playerId: e.target.value,
                  valuedAt: selectedP ? selectedP.marketValue : exchangeClause.valuedAt,
                },
              ]);
            }}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-slate-200"
          >
            {userSquad.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.position} — €{(p.marketValue / 1_000_000).toFixed(1)}M)
              </option>
            ))}
          </select>
        </div>
      )}

      {loanClause && (
        <div className="p-3 bg-indigo-950/30 border border-indigo-800/40 rounded-xl space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-indigo-300">
              {loanClause.kind === 'loan'
                ? isAr ? 'إعارة بسيطة' : 'Standard Loan'
                : loanClause.kind === 'loan_with_option'
                ? isAr ? 'إعارة مع خيار شراء' : 'Loan + Buy Option'
                : isAr ? 'إعارة مع إلزامية شراء' : 'Loan + Purchase Obligation'}
            </span>
            <span className="font-mono text-indigo-400">
              {loanClause.durationWeeks} {isAr ? 'أسبوع' : 'wks'}
            </span>
          </div>
          <div className="text-slate-300 font-mono">
            {isAr ? 'تحمل الراتب:' : 'Wage split:'} {loanClause.wageSplitPercent}%
          </div>
          {'optionFee' in loanClause && (
            <div className="text-slate-300 font-mono">
              {isAr ? 'قيمة خيار الشراء:' : 'Option fee:'} €{loanClause.optionFee.toLocaleString()}
            </div>
          )}
          {'obligationFee' in loanClause && (
            <div className="text-slate-300 font-mono">
              {isAr ? 'قيمة الشراء الإلزامي:' : 'Obligation fee:'} €{loanClause.obligationFee.toLocaleString()}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
