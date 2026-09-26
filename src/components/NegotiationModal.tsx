/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Negotiation Modal — مفاوضة انتقال لاعب حقيقية
 * A real back-and-forth: opening offer -> agent accepts / counters / rejects,
 * you can raise your offer or accept their counter, up to a limited number
 * of rounds. VIP 6+ get an extra simultaneous negotiation slot (see
 * useGameStore.getMaxActiveNegotiations / VIPPrivilege.maxActiveNegotiations).
 */

import React, { useState } from 'react';
import { useGameStore } from '../state/useGameStore';
import { Player } from '../types/game';
import { X, Handshake, TrendingUp, Check, Ban, Crown } from 'lucide-react';
import { VIP_LEVELS } from '../data/vipData';

interface NegotiationModalProps {
  player: Player | null;
  onClose: () => void;
}

export const NegotiationModal: React.FC<NegotiationModalProps> = ({ player, onClose }) => {
  const {
    club,
    language,
    vipPoints,
    activeNegotiations,
    startNegotiation,
    submitCounterOffer,
    acceptNegotiationCounter,
    cancelNegotiation,
  } = useGameStore();
  const isAr = language === 'ar';

  const [offerInput, setOfferInput] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!player) return null;

  let currentVipLevel = 1;
  for (const tier of VIP_LEVELS) {
    if (vipPoints >= tier.pointsRequired) currentVipLevel = tier.level;
  }
  const currentTier = VIP_LEVELS.find(t => t.level === currentVipLevel) || VIP_LEVELS[0];
  const maxSlots = currentTier.maxActiveNegotiations || 1;

  const negotiation = activeNegotiations.find(n => n.playerId === player.id);
  const otherSlotsUsed = activeNegotiations.filter(n => n.playerId !== player.id).length;

  const handleStart = () => {
    const amount = parseInt(offerInput.replace(/[^\d]/g, ''), 10);
    if (!amount || amount <= 0) {
      setFeedback(isAr ? 'أدخل مبلغاً صحيحاً للعرض' : 'Enter a valid offer amount');
      return;
    }
    const res = startNegotiation(player.id, amount);
    setFeedback(res.message);
    if (res.success) setOfferInput('');
  };

  const handleRaise = () => {
    if (!negotiation) return;
    const amount = parseInt(offerInput.replace(/[^\d]/g, ''), 10);
    if (!amount || amount <= negotiation.currentOfferAmount) {
      setFeedback(isAr ? 'العرض الجديد يجب أن يكون أعلى من السابق' : 'The new offer must be higher than the previous one');
      return;
    }
    const res = submitCounterOffer(negotiation.id, amount);
    setFeedback(res.message);
    if (res.success) setOfferInput('');
  };

  const handleAccept = () => {
    if (!negotiation) return;
    const res = acceptNegotiationCounter(negotiation.id);
    setFeedback(res.message);
    if (res.success) setTimeout(onClose, 1200);
  };

  const handleCancel = () => {
    if (!negotiation) return;
    cancelNegotiation(negotiation.id);
    onClose();
  };

  const suggestedOpening = Math.round((player.marketValue * 0.85) / 5000) * 5000;

  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="w-full max-w-md bg-gradient-to-b from-slate-900 to-slate-950 border border-sky-500/40 rounded-3xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto"
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
          <div className="w-11 h-11 rounded-2xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center">
            <Handshake className="w-6 h-6 text-sky-400" />
          </div>
          <div>
            <h3 className="text-lg font-black text-white">{isAr ? player.name : player.nameEn}</h3>
            <p className="text-xs text-slate-400">
              {isAr ? 'القيمة السوقية' : 'Market Value'}: {player.marketValue.toLocaleString()} 💰
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between mb-3 px-3 py-2 rounded-xl bg-slate-800/60 text-[11px] text-slate-400">
          <span>{isAr ? 'خانات التفاوض المستخدمة' : 'Negotiation slots used'}</span>
          <span className="font-bold text-white">{otherSlotsUsed + (negotiation ? 1 : 0)}/{maxSlots}</span>
        </div>

        {!negotiation ? (
          <div className="space-y-3">
            <p className="text-xs text-slate-400">
              {isAr
                ? `قدّم عرضك الأول لوكيل اللاعب. عرض أقل بكثير من القيمة السوقية قد يُرفض فوراً، وعرض معقول (${suggestedOpening.toLocaleString()} 💰 تقريباً) غالباً ما يفتح باب التفاوض.`
                : `Make your opening bid to the player's agent. A lowball offer may be rejected instantly; a reasonable one (around ${suggestedOpening.toLocaleString()} 💰) usually opens negotiations.`}
            </p>
            <input
              value={offerInput}
              onChange={(e) => setOfferInput(e.target.value)}
              placeholder={isAr ? `مثال: ${suggestedOpening.toLocaleString()}` : `e.g. ${suggestedOpening.toLocaleString()}`}
              inputMode="numeric"
              className="w-full bg-black/40 border border-sky-500/30 rounded-2xl px-4 py-3 text-center font-mono font-bold text-lg text-sky-300 placeholder:text-slate-600 focus:outline-none focus:border-sky-400"
            />
            <button
              onClick={handleStart}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-sky-500 to-cyan-500 text-black font-black flex items-center justify-center gap-2"
            >
              <Handshake className="w-4 h-4" />
              {isAr ? 'تقديم العرض' : 'Submit Offer'}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700 text-xs text-slate-200">
              {isAr ? negotiation.lastMessageAr : negotiation.lastMessageEn}
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 px-1">
              <span>{isAr ? 'جولتك الحالية' : 'Round'}: {negotiation.roundsUsed}/{negotiation.maxRounds}</span>
              <span>{isAr ? 'آخر عرض منك' : 'Your last offer'}: {negotiation.currentOfferAmount.toLocaleString()} 💰</span>
            </div>

            {negotiation.status === 'countered' && negotiation.counterAmount && (
              <>
                <div className="p-3 rounded-2xl bg-amber-950/40 border border-amber-500/40 text-center">
                  <p className="text-[11px] text-amber-300 mb-1">{isAr ? 'طلب الوكيل المضاد' : "Agent's counter-demand"}</p>
                  <p className="text-xl font-black text-amber-300">{negotiation.counterAmount.toLocaleString()} 💰</p>
                </div>
                <button
                  onClick={handleAccept}
                  disabled={negotiation.counterAmount > club.finances.coins}
                  className="w-full py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-500 text-black font-black flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Check className="w-4 h-4" />
                  {isAr ? `قبول بـ ${negotiation.counterAmount.toLocaleString()}` : `Accept at ${negotiation.counterAmount.toLocaleString()}`}
                </button>

                <div className="flex items-center gap-2">
                  <input
                    value={offerInput}
                    onChange={(e) => setOfferInput(e.target.value)}
                    placeholder={isAr ? 'أو قدّم عرضاً أعلى...' : 'Or raise your offer...'}
                    inputMode="numeric"
                    className="flex-1 bg-black/40 border border-sky-500/30 rounded-xl px-3 py-2 text-center font-mono text-sm text-sky-300 placeholder:text-slate-600 focus:outline-none focus:border-sky-400"
                  />
                  <button
                    onClick={handleRaise}
                    className="px-3 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-black flex items-center gap-1"
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                    {isAr ? 'رفع العرض' : 'Raise'}
                  </button>
                </div>
              </>
            )}

            {(negotiation.status === 'rejected' || negotiation.status === 'expired') && (
              <div className="p-3 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-center text-xs text-rose-200">
                {isAr ? 'انتهت هذه المفاوضة بلا اتفاق.' : 'This negotiation ended with no deal.'}
              </div>
            )}

            <button
              onClick={handleCancel}
              className="w-full py-2 rounded-2xl bg-slate-800 hover:bg-rose-900/50 text-slate-300 hover:text-rose-200 text-xs font-bold flex items-center justify-center gap-1.5"
            >
              <Ban className="w-3.5 h-3.5" />
              {isAr ? 'إنهاء المفاوضة' : 'End Negotiation'}
            </button>
          </div>
        )}

        {feedback && (
          <div className="mt-3 text-center text-[11px] text-slate-400">{feedback}</div>
        )}

        {maxSlots < 2 && (
          <p className="mt-3 text-center text-[10px] text-purple-400 flex items-center justify-center gap-1">
            <Crown className="w-3 h-3" /> {isAr ? 'VIP 6 يفتح خانة تفاوض ثانية متزامنة' : 'VIP 6 unlocks a second simultaneous negotiation slot'}
          </p>
        )}
      </div>
    </div>
  );
};
