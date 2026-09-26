/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Redeem Code Modal — لصندوق أكواد الهدايا
 * Codes are validated & redeemed server-side (Firestore transaction, see
 * firebase/firebase.ts::redeemGiftCodeInFirestore). This component only
 * collects the 10-character code and shows the result.
 */

import React, { useState } from 'react';
import { useGameStore } from '../state/useGameStore';
import { useFirebase } from '../firebase/FirebaseContext';
import { Gift, X, Loader2 } from 'lucide-react';

interface RedeemCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RedeemCodeModal: React.FC<RedeemCodeModalProps> = ({ isOpen, onClose }) => {
  const { language } = useGameStore();
  const { user, redeemGiftCode, setAuthModalOpen } = useFirebase();
  const isAr = language === 'ar';

  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!user) {
      onClose();
      setAuthModalOpen(true);
      return;
    }
    if (submitting) return;
    setSubmitting(true);
    setFeedback(null);
    const res = await redeemGiftCode(code);
    setFeedback({ text: res.message, type: res.success ? 'success' : 'error' });
    setSubmitting(false);
    if (res.success) setCode('');
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="w-full max-w-md bg-gradient-to-b from-slate-900 to-slate-950 border border-amber-500/40 rounded-3xl p-6 shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
        dir={isAr ? 'rtl' : 'ltr'}
      >
        <button
          onClick={onClose}
          className="absolute top-4 end-4 w-8 h-8 flex items-center justify-center rounded-full bg-black/30 hover:bg-black/50 text-slate-300"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
            <Gift className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h3 className="text-lg font-black text-white">{isAr ? 'كود الهدية' : 'Gift Code'}</h3>
            <p className="text-xs text-slate-400">
              {isAr ? 'أدخل الكود المكوّن من 10 خانات لاستلام مكافأتك' : 'Enter your 10-character code to claim your reward'}
            </p>
          </div>
        </div>

        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 10))}
          placeholder={isAr ? 'مثال: ABC123XYZ0' : 'e.g. ABC123XYZ0'}
          maxLength={10}
          dir="ltr"
          className="w-full text-center tracking-[0.3em] font-mono font-bold text-lg bg-black/40 border border-amber-500/30 rounded-2xl px-4 py-3 text-amber-300 placeholder:text-slate-600 focus:outline-none focus:border-amber-400"
        />

        {feedback && (
          <div
            className={`mt-3 p-3 rounded-xl text-sm font-bold ${
              feedback.type === 'success'
                ? 'bg-emerald-950/70 border border-emerald-500 text-emerald-200'
                : 'bg-rose-950/70 border border-rose-500 text-rose-200'
            }`}
          >
            {feedback.text}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={submitting || code.length !== 10}
          className="mt-4 w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-black flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Gift className="w-4 h-4" />}
          {isAr ? 'استلام المكافأة' : 'Redeem'}
        </button>

        {!user && (
          <p className="mt-3 text-center text-xs text-slate-500">
            {isAr ? 'يجب تسجيل الدخول بحساب Google لاستخدام الكود.' : 'Sign in with Google to use a code.'}
          </p>
        )}
      </div>
    </div>
  );
};
