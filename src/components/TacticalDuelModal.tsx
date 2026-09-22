/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Tactical Duel (صانع المعارك — الكشف المتزامن)
 * 5-8 min tactical PvP/Bot simultaneous reveal game.
 * Zero Pay-to-Win, pure tactical counter-matrix (Attack, Defend, Flank).
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Swords, 
  Shield, 
  Zap, 
  Trophy, 
  Heart, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import { useGameStore } from '../state/useGameStore';
import { TacticalStance, DuelPiece } from '../types/game';

export const TacticalDuelModal: React.FC = () => {
  const {
    tacticalDuel,
    isTacticalDuelModalOpen,
    closeTacticalDuel,
    selectDuelPieceAndStance,
    submitDuelRoundOrder,
    startTacticalDuel,
    club,
    language
  } = useGameStore();

  if (!isTacticalDuelModalOpen || !tacticalDuel) return null;

  const isAr = language === 'ar';
  const {
    round,
    maxRounds,
    playerHp,
    opponentHp,
    draftedPieces,
    selectedPieceId,
    selectedStance,
    isOrderSubmitted,
    isRevealing,
    history,
    winner,
    opponentName
  } = tacticalDuel;

  const selectedPiece = draftedPieces.find(p => p.id === selectedPieceId) || draftedPieces[0];

  const stances: { id: TacticalStance; nameAr: string; nameEn: string; icon: string; descAr: string; descEn: string; color: string }[] = [
    {
      id: 'attack',
      nameAr: 'هجوم ساحق',
      nameEn: 'Frontal Assault',
      icon: '⚔️',
      descAr: 'يكسر محاولات الالتفاف (+35% ضرر)، لكن يمتصه الدفاع المحكم.',
      descEn: 'Smashes flankers (+35% dmg), vulnerable to heavy defensive shields.',
      color: 'from-red-600 to-rose-700'
    },
    {
      id: 'defend',
      nameAr: 'دفاع حصين وتطويق',
      nameEn: 'Iron Defense & Counter',
      icon: '🛡️',
      descAr: 'يمتص الهجوم المباشر (-70% ضرر ويرد بهجوم مرتد)، لكنه عرضة للالتفاف.',
      descEn: 'Absorbs frontal attack (-70% damage & counters), vulnerable to flank.',
      color: 'from-blue-600 to-indigo-700'
    },
    {
      id: 'flank',
      nameAr: 'التفاف ومناورة سريعة',
      nameEn: 'Tactical Flank',
      icon: '🐎',
      descAr: 'يتجاوز الدفاع الحصين ويضرب المؤخرة مباشرة، لكن يسحقه الهجوم المباشر.',
      descEn: 'Bypasses stationary shields, intercepted by head-on charges.',
      color: 'from-amber-600 to-yellow-600'
    }
  ];

  return (
    <AnimatePresence>
      <div 
        id="tactical-duel-overlay"
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto"
        dir={isAr ? 'rtl' : 'ltr'}
      >
        <motion.div
          id="tactical-duel-card"
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 20 }}
          className="relative w-full max-w-3xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden my-auto"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-950/80 via-neutral-900 to-red-950/70 p-4 sm:p-5 border-b border-purple-500/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
                <Swords className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-black text-white">
                    {isAr ? 'صانع المعارك — المواجهة المتزامنة 1 ضد 1' : 'Battle Maker — 1v1 Simultaneous Clash'}
                  </h2>
                  <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-bold border border-purple-500/30">
                    {isAr ? 'نزاهة تنافسية كاملة' : 'Competitive Integrity'}
                  </span>
                </div>
                <p className="text-xs text-neutral-400 mt-0.5">
                  {isAr 
                    ? `الجولة ${Math.min(round, maxRounds)} من ${maxRounds} • كشف متزامن للأوامر السرية` 
                    : `Round ${Math.min(round, maxRounds)} of ${maxRounds} • Simultaneous Secret Reveal`}
                </p>
              </div>
            </div>

            <button
              id="close-tactical-duel-btn"
              onClick={closeTacticalDuel}
              className="w-9 h-9 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white flex items-center justify-center transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 sm:p-6 space-y-5 max-h-[80vh] overflow-y-auto">
            {/* Health & Commander Status Bar */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 p-4 rounded-xl bg-neutral-950/80 border border-neutral-800">
              {/* Player Side */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white truncate max-w-[120px] sm:max-w-[160px]">
                      {club.name}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 font-semibold">
                      {isAr ? 'أنت' : 'You'}
                    </span>
                  </div>
                  <span className="text-xs font-black text-blue-400 flex items-center gap-1">
                    <Heart className="w-3.5 h-3.5 text-red-400 fill-red-400" />
                    {playerHp}%
                  </span>
                </div>
                <div className="w-full h-3 bg-neutral-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-500"
                    style={{ width: `${playerHp}%` }}
                  />
                </div>
              </div>

              {/* Opponent Side */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-red-400 flex items-center gap-1">
                    <Heart className="w-3.5 h-3.5 text-red-400 fill-red-400" />
                    {opponentHp}%
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 font-semibold">
                      {isAr ? 'المنافس' : 'Rival'}
                    </span>
                    <span className="text-sm font-bold text-white truncate max-w-[120px] sm:max-w-[160px]">
                      {opponentName}
                    </span>
                  </div>
                </div>
                <div className="w-full h-3 bg-neutral-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-red-500 to-rose-600 rounded-full transition-all duration-500 ml-auto"
                    style={{ width: `${opponentHp}%` }}
                  />
                </div>
              </div>
            </div>

            {/* If Duel has a Winner */}
            {winner ? (
              <div className="p-6 rounded-2xl bg-neutral-950 border border-neutral-800 text-center space-y-4">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <Trophy className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white">
                    {winner === 'player'
                      ? (isAr ? '🎉 انتصار تكتيكي حاسم!' : '🎉 Decisive Tactical Victory!')
                      : winner === 'opponent'
                      ? (isAr ? 'هزيمة تكتيكية بشق الأنفس' : 'Narrow Tactical Defeat')
                      : (isAr ? 'تعادل تكتيكي مشرف' : 'Honorable Tactical Stalemate')}
                  </h3>
                  <p className="text-xs text-neutral-400 mt-1 max-w-md mx-auto">
                    {winner === 'player'
                      ? (isAr ? 'تمت إضافة المكافآت وتقدم المهام اليومية لخزينتك ونقاط VIP الخاصة بالنادي.' : 'Rewards and Daily Mission progress have been credited!')
                      : (isAr ? 'استخلص العبر من خطط المنافس وأعد تشكيل صفوفك للمواجهة القادمة.' : 'Analyze rival moves and regroup for the next battle.')}
                  </p>
                </div>

                <div className="flex items-center justify-center gap-3">
                  <button
                    id="restart-tactical-duel-btn"
                    onClick={() => startTacticalDuel('tactical')}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm flex items-center gap-2 shadow-lg transition active:scale-95"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>{isAr ? 'خوض معركة جديدة' : 'New Duel'}</span>
                  </button>
                  <button
                    id="finish-duel-btn"
                    onClick={closeTacticalDuel}
                    className="px-5 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold text-sm transition"
                  >
                    {isAr ? 'العودة للمقر الرئيسي' : 'Return to HQ'}
                  </button>
                </div>
              </div>
            ) : isRevealing ? (
              /* Dramatic Simultaneous Reveal Screen */
              <div className="p-8 rounded-2xl bg-neutral-950/90 border border-purple-500/40 text-center space-y-4 animate-pulse">
                <div className="w-14 h-14 mx-auto rounded-full bg-purple-500/20 border border-purple-500/50 flex items-center justify-center text-purple-400 animate-spin">
                  <Swords className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {isAr ? 'جاري الكشف المتزامن عن أوامر القائدين...' : 'Simultaneous Reveal in Progress...'}
                  </h3>
                  <p className="text-xs text-purple-300 mt-1">
                    {isAr ? 'يتم فك تشفير الأوامر السرية وحساب تأثير الصدام المباشر' : 'Decrypting secret orders and calculating kinetic clash impact'}
                  </p>
                </div>
              </div>
            ) : (
              /* Battle Planning Interface */
              <div className="space-y-4">
                {/* Step 1: Choose War Piece */}
                <div>
                  <span className="text-xs font-bold text-purple-400 block mb-2">
                    {isAr ? '1. اختر وحدتك القتالية للجولة:' : '1. Select Your Combat Unit for This Round:'}
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {draftedPieces.map((piece: DuelPiece) => {
                      const isSelected = piece.id === selectedPiece?.id;
                      return (
                        <button
                          key={piece.id}
                          id={`select-piece-${piece.id}`}
                          onClick={() => selectDuelPieceAndStance(piece.id, selectedStance || 'attack')}
                          className={`p-3 rounded-xl border text-right transition-all flex flex-col justify-between ${
                            isSelected
                              ? 'bg-purple-950/30 border-purple-500 ring-2 ring-purple-500/30 shadow-lg'
                              : 'bg-neutral-850/70 border-neutral-800 hover:border-neutral-700'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-2xl">{piece.icon}</span>
                            <span className="text-xs font-bold text-neutral-400">
                              {isAr ? piece.nameAr : piece.nameEn}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-1 text-[11px] text-center font-mono mt-1 pt-1.5 border-t border-neutral-800">
                            <div>
                              <span className="text-neutral-500 block text-[9px]">{isAr ? 'هجوم' : 'POW'}</span>
                              <span className="text-red-400 font-bold">{piece.power}</span>
                            </div>
                            <div>
                              <span className="text-neutral-500 block text-[9px]">{isAr ? 'دفاع' : 'DEF'}</span>
                              <span className="text-blue-400 font-bold">{piece.defense}</span>
                            </div>
                            <div>
                              <span className="text-neutral-500 block text-[9px]">{isAr ? 'سرعة' : 'SPD'}</span>
                              <span className="text-emerald-400 font-bold">{piece.speed}</span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Step 2: Choose Tactical Stance */}
                <div>
                  <span className="text-xs font-bold text-amber-400 block mb-2">
                    {isAr ? '2. اختر النهج التكتيكي السري (كشف متزامن):' : '2. Select Your Secret Tactical Stance:'}
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {stances.map((s) => {
                      const isSelected = selectedStance === s.id;
                      return (
                        <button
                          key={s.id}
                          id={`select-stance-${s.id}`}
                          onClick={() => selectDuelPieceAndStance(selectedPiece.id, s.id)}
                          className={`p-3.5 rounded-xl border text-right transition-all ${
                            isSelected
                              ? 'bg-gradient-to-br from-neutral-850 to-neutral-900 border-amber-500 ring-2 ring-amber-500/30 shadow-lg'
                              : 'bg-neutral-850/70 border-neutral-800 hover:border-neutral-700'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-xl">{s.icon}</span>
                            <span className="text-sm font-bold text-white">
                              {isAr ? s.nameAr : s.nameEn}
                            </span>
                          </div>
                          <p className="text-[11px] text-neutral-400 leading-relaxed">
                            {isAr ? s.descAr : s.descEn}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Submit Secret Order Button */}
                <div className="pt-2">
                  <button
                    id="submit-tactical-duel-order-btn"
                    onClick={submitDuelRoundOrder}
                    disabled={isOrderSubmitted}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-sm shadow-xl transition active:scale-98 flex items-center justify-center gap-2"
                  >
                    <Swords className="w-4 h-4" />
                    <span>{isAr ? 'تأكيد وإقفال الأمر السري (كشف متزامن)' : 'Commit & Lock Secret Order'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Duel History / Combat Log */}
            {history.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-neutral-800">
                <span className="text-xs font-bold text-neutral-400 block">
                  {isAr ? 'سجل اشتباكات الجولات السابقة:' : 'Rounds Clash Log:'}
                </span>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {history.map((h, i) => (
                    <div 
                      key={i} 
                      className="p-3 rounded-xl bg-neutral-950/70 border border-neutral-800/80 flex flex-col gap-1.5"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-purple-400">
                          {isAr ? `الجولة ${h.round}` : `Round ${h.round}`}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="text-blue-400 font-semibold">
                            {isAr ? h.playerPiece.nameAr : h.playerPiece.nameEn} ({h.playerOrder.stance})
                          </span>
                          <span className="text-neutral-500 text-[10px]">VS</span>
                          <span className="text-red-400 font-semibold">
                            {isAr ? h.opponentPiece.nameAr : h.opponentPiece.nameEn} ({h.opponentOrder.stance})
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-neutral-300 leading-relaxed">
                        {isAr ? h.clashSummaryAr : h.clashSummaryEn}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
