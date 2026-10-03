/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * RichNegotiationModal — Comprehensive Transfer Negotiation Screen (Phase D)
 * Handles multi-clause offers, counter-proposals, validation codes, status timeline.
 */

import React, { useState, useMemo } from 'react';
import {
  X,
  Handshake,
  CheckCircle,
  AlertCircle,
  Clock,
  ArrowRight,
  ShieldAlert,
  Ban,
  Check,
} from 'lucide-react';
import { useGameStore } from '../../../state/useGameStore';
import type { Player } from '../../../types/game';
import type {
  TransferNegotiation,
  TransferOffer,
  TransferOfferClause,
} from '../../../domain/recruitment/negotiation/offerTypes';
import {
  validateOffer,
  submitNegotiationOffer,
  acceptCounterOffer,
  withdrawNegotiation,
  createDraftNegotiation,
} from '../../../domain/recruitment/index';
import { ClauseEditor } from './ClauseEditor';
import { PlayerMotivationCard } from '../motivation/PlayerMotivationCard';

interface RichNegotiationModalProps {
  player: Player | null;
  onClose: () => void;
  isAr?: boolean;
}

export const RichNegotiationModal: React.FC<RichNegotiationModalProps> = ({
  player,
  onClose,
  isAr = false,
}) => {
  const { club, recruitmentWorld, livingWorld, saveId } = useGameStore();

  const userSquad = club.footballSquad ?? [];
  const negotiations = recruitmentWorld?.negotiations ?? [];

  // Find or initialize negotiation for this player
  const existingNeg = useMemo(
    () => (player ? negotiations.find((n) => n.playerId === player.id) : null),
    [negotiations, player],
  );

  const [clauses, setClauses] = useState<TransferOfferClause[]>(() => {
    if (existingNeg?.currentOffer.clauses) {
      return [...existingNeg.currentOffer.clauses];
    }
    const baseFee = player ? Math.max(1_000_000, player.marketValue) : 10_000_000;
    return [{ kind: 'fee', amount: baseFee }];
  });

  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  if (!player || !recruitmentWorld) return null;

  const currentNeg: TransferNegotiation =
    existingNeg ??
    createDraftNegotiation({
      id: `neg_${player.id}_${Date.now()}`,
      playerId: player.id,
      sellingClubId: player.realTeam || 'club_selling',
      buyingClubId: club.id,
      startedWeek: recruitmentWorld.gameWeek,
      initialOffer: {
        id: `off_${Date.now()}`,
        fromClubId: club.id,
        toClubId: player.realTeam || 'club_selling',
        playerId: player.id,
        clauses,
      },
    });

  const buyerContext = {
    clubId: club.id,
    coinsAvailable: club.finances.coins,
    wageBudgetRemainingWeekly: Math.round(club.finances.coins / 50),
    squadSize: userSquad.length,
    maxSquadSize: 30,
    transferWindow: recruitmentWorld.transferWindow,
  };

  const sellerContext = {
    clubId: player.realTeam || 'club_selling',
    coinsAvailable: 40_000_000,
    wageBudgetRemainingWeekly: 200_000,
    squadSize: 22,
    maxSquadSize: 30,
    transferWindow: recruitmentWorld.transferWindow,
  };

  const playerContext = {
    playerId: player.id,
    personality: player.personality ?? 'professional',
    weeklyWage: player.wage,
    referenceMarketValue: player.marketValue,
    transferDesire: 50,
    contractYearsRemaining: player.contractYears ?? 2,
    availableForTransfer: true,
  };

  // Domain reason code translator (No local AI logic)
  const translateCode = (code: string): string => {
    switch (code) {
      case 'insulting_low_fee':
        return isAr ? 'العرض المالي منخفض جداً واعتبره النادي البائع غير لائق' : 'Offer rejected: Financially insulting';
      case 'counter_fee_demanded':
        return isAr ? 'طلب النادي البائع زيادة المبلغ المالي للموافقة' : 'Counter offer: Selling club requests higher fee';
      case 'accepted_fair_valuation':
        return isAr ? 'وافق النادي على العرض واعتبره مناسباً لقيمة اللاعب' : 'Accepted: Fair valuation';
      case 'max_rounds_reached':
      case 'expired_rounds':
        return isAr ? 'استنفدت جميع جولات التفاوض المسموحة' : 'Negotiation expired: Maximum rounds reached';
      case 'withdrawn_by_buyer':
        return isAr ? 'تم سحب العرض من طرفكم' : 'Negotiation withdrawn by your club';
      case 'budget_exceeded':
        return isAr ? 'قيمة الدفعة المقدمة تتجاوز ميزانية النادي' : 'Validation error: Upfront cash exceeds club budget';
      case 'invalid_clause_amount':
        return isAr ? 'أحد بنود العرض المالي يحتوي على قيمة غير صالحة' : 'Validation error: Invalid clause amount';
      case 'counter_accepted':
        return isAr ? 'تم قبول العرض المقابل بنجاح!' : 'Counter offer accepted!';
      default:
        return code;
    }
  };

  const handleSubmitOffer = () => {
    const offer: TransferOffer = {
      id: `off_${Date.now()}`,
      fromClubId: club.id,
      toClubId: player.realTeam || 'club_selling',
      playerId: player.id,
      clauses,
    };

    // Pre-validation through domain
    const validation = validateOffer(buyerContext, sellerContext, playerContext, offer, {
      exchangePlayerIdsInBuyerSquad: userSquad.map((p) => p.id),
    });

    if (!validation.valid) {
      setFeedback({
        ok: false,
        msg: validation.reasonCodes.map(translateCode).join(' • '),
      });
      return;
    }

    const flow = submitNegotiationOffer({
      negotiation: currentNeg,
      offer,
      buyer: buyerContext,
      seller: sellerContext,
      player: playerContext,
      gameWeek: recruitmentWorld.gameWeek,
      worldSeed: recruitmentWorld.worldSeed,
      timestampIso: new Date().toISOString(),
      season: livingWorld?.currentSeason ?? 1,
      exchangePlayerIdsInBuyerSquad: userSquad.map((p) => p.id),
    });

    if (!flow.ok) {
      setFeedback({
        ok: false,
        msg: flow.validationCodes?.map(translateCode).join(' • ') ?? 'Negotiation error',
      });
      return;
    }

    // Apply recruitment patches
    useGameStore.setState((state) => ({
      recruitmentWorld: {
        ...state.recruitmentWorld,
        negotiations: [
          ...state.recruitmentWorld.negotiations.filter((n) => n.id !== currentNeg.id),
          flow.negotiation!,
        ],
      },
    }));

    setFeedback({
      ok: true,
      msg: flow.negotiation?.status === 'accepted'
        ? (isAr ? '🎉 تم قبول العرض بنجاح! تم حسم الصفقة!' : '🎉 Offer Accepted! Deal finalized!')
        : flow.negotiation?.status === 'countered'
        ? (isAr ? 'رد النادي البائع بعرض مقابل معدل.' : 'Club countered with revised terms.')
        : (isAr ? 'تم تقديم العرض للنادي البائع.' : 'Offer submitted to selling club.'),
    });
  };

  const handleAcceptCounter = () => {
    if (!currentNeg.counterOffer) return;

    const flow = acceptCounterOffer({
      negotiation: currentNeg,
      buyer: buyerContext,
      seller: sellerContext,
      player: playerContext,
      gameWeek: recruitmentWorld.gameWeek,
      exchangePlayerIdsInBuyerSquad: userSquad.map((p) => p.id),
    });

    if (!flow.ok) {
      setFeedback({
        ok: false,
        msg: flow.validationCodes?.map(translateCode).join(' • ') ?? 'Failed to accept counter',
      });
      return;
    }

    useGameStore.setState((state) => ({
      recruitmentWorld: {
        ...state.recruitmentWorld,
        negotiations: [
          ...state.recruitmentWorld.negotiations.filter((n) => n.id !== currentNeg.id),
          flow.negotiation!,
        ],
      },
    }));

    setFeedback({
      ok: true,
      msg: isAr ? '🎉 تم قبول العرض المقابل وتأكيد الصفقة!' : '🎉 Counter offer accepted and deal signed!',
    });
  };

  const handleWithdraw = () => {
    const flow = withdrawNegotiation(currentNeg, recruitmentWorld.gameWeek);
    if (flow.ok) {
      useGameStore.setState((state) => ({
        recruitmentWorld: {
          ...state.recruitmentWorld,
          negotiations: [
            ...state.recruitmentWorld.negotiations.filter((n) => n.id !== currentNeg.id),
            flow.negotiation!,
          ],
        },
      }));
      setFeedback({
        ok: true,
        msg: isAr ? 'تم سحب العرض وإغلاق المفاوضات.' : 'Negotiation withdrawn and closed.',
      });
    }
  };

  const isTerminal = ['accepted', 'rejected', 'withdrawn', 'expired'].includes(currentNeg.status);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl p-5 sm:p-6 shadow-2xl space-y-5 my-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Handshake className="w-6 h-6 text-amber-400" />
            <div>
              <h3 className="text-base sm:text-lg font-black text-white">
                {isAr ? `مفاوضات التعاقد مع ${player.name}` : `Transfer Negotiations: ${player.name}`}
              </h3>
              <p className="text-xs text-slate-400">
                {player.realTeam ?? 'Free Agent'} • {player.position}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Timeline */}
        <div className="p-3.5 bg-slate-950/70 border border-slate-800/80 rounded-2xl flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-sky-400" />
            <span className="text-slate-400 font-semibold">
              {isAr ? 'الجولة:' : 'Round:'}{' '}
              <strong className="text-white font-mono">{currentNeg.roundsUsed}</strong> / {currentNeg.maxRounds}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400">{isAr ? 'الحالة:' : 'Status:'}</span>
            <span
              className={`px-2.5 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                currentNeg.status === 'accepted'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : currentNeg.status === 'countered'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : currentNeg.status === 'rejected' || currentNeg.status === 'expired'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  : 'bg-slate-800 text-slate-300'
              }`}
            >
              {currentNeg.status}
            </span>
          </div>
        </div>

        {/* Player Motivation & Agent Demands Summary */}
        <PlayerMotivationCard
          player={player}
          userClub={club}
          recruitmentWorld={recruitmentWorld}
          isAr={isAr}
        />

        {/* Counter Offer Alert if Present */}
        {currentNeg.status === 'countered' && currentNeg.counterOffer && (
          <div className="p-4 bg-amber-950/40 border border-amber-500/40 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                <ArrowRight className="w-4 h-4 text-amber-400" />
                <span>{isAr ? 'عرض النادي البائع المقابل:' : 'Selling Club Counter-Offer:'}</span>
              </span>
              <span className="text-[10px] text-amber-400/80 font-mono">
                {currentNeg.lastReasonCodes.map(translateCode).join(' • ')}
              </span>
            </div>

            <div className="space-y-1.5 text-xs text-slate-300 font-mono">
              {currentNeg.counterOffer.clauses.map((clause, idx) => (
                <div key={idx} className="flex justify-between border-b border-amber-900/30 pb-1">
                  <span>{clause.kind.toUpperCase()}:</span>
                  <span className="font-bold text-amber-200">
                    {'amount' in clause ? `€${clause.amount.toLocaleString()}` : 'Custom terms'}
                  </span>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={handleAcceptCounter}
              className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              <Check className="w-4 h-4" />
              <span>{isAr ? 'قبول العرض المقابل وحسم الصفقة' : 'Accept Counter Offer & Sign'}</span>
            </button>
          </div>
        )}

        {/* Clause Editor (if negotiation is still open) */}
        {!isTerminal && (
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-300">
              {isAr ? 'صياغة بنود العرض المقدم:' : 'Draft Your Offer Clauses:'}
            </h4>
            <ClauseEditor
              clauses={clauses}
              onChange={setClauses}
              userSquad={userSquad}
              isAr={isAr}
            />
          </div>
        )}

        {/* Reason Codes & Feedback Banner */}
        {feedback && (
          <div
            className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
              feedback.ok
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
            }`}
          >
            {feedback.ok ? (
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{feedback.msg}</span>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-800">
          {!isTerminal ? (
            <>
              <button
                type="button"
                onClick={handleWithdraw}
                className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-400 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Ban className="w-3.5 h-3.5" />
                <span>{isAr ? 'سحب العرض' : 'Withdraw'}</span>
              </button>

              <button
                type="button"
                onClick={handleSubmitOffer}
                className="py-2.5 px-6 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all shadow-md cursor-pointer flex items-center gap-2"
              >
                <Handshake className="w-4 h-4" />
                <span>{isAr ? 'تقديم العرض الرسمي' : 'Submit Formal Offer'}</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-slate-800 text-slate-200 text-xs font-bold transition-colors"
            >
              {isAr ? 'إغلاق نافذة المفاوضات' : 'Close Negotiation'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
