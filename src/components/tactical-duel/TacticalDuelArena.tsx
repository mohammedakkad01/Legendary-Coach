/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Tactical Duel Battle Arena: Piece Selection, Stance Choice, and Reveal History.
 */

import React from 'react';
import { Heart, Swords, RotateCcw } from 'lucide-react';
import { DuelPiece, TacticalStance } from '../../types/game';

interface TacticalDuelArenaProps {
  isAr: boolean;
  clubName: string;
  opponentName: string;
  opponentIsBot: boolean;
  playerHp: number;
  opponentHp: number;
  winner: string | null;
  isOrderSubmitted: boolean;
  draftedPieces: DuelPiece[];
  selectedPiece: DuelPiece;
  selectedStance: TacticalStance | null;
  history: any[];
  onSelectPieceAndStance: (pieceId: string, stance: TacticalStance) => void;
  onSubmitOrder: () => void;
  onNewDuel: () => void;
  onClose: () => void;
}

export const TacticalDuelArena: React.FC<TacticalDuelArenaProps> = ({
  isAr,
  clubName,
  opponentName,
  opponentIsBot,
  playerHp,
  opponentHp,
  winner,
  isOrderSubmitted,
  draftedPieces,
  selectedPiece,
  selectedStance,
  history,
  onSelectPieceAndStance,
  onSubmitOrder,
  onNewDuel,
  onClose,
}) => {
  const stances: { id: TacticalStance; nameAr: string; nameEn: string; icon: string; descAr: string; descEn: string }[] = [
    {
      id: 'attack',
      nameAr: 'هجوم ساحق',
      nameEn: 'Frontal Assault',
      icon: '⚔️',
      descAr: 'يكسر محاولات الالتفاف (+35% ضرر)، لكن يمتصه الدفاع المحكم.',
      descEn: 'Smashes flankers (+35% dmg), vulnerable to heavy defensive shields.'
    },
    {
      id: 'defend',
      nameAr: 'دفاع حصين وتطويق',
      nameEn: 'Iron Defense & Counter',
      icon: '🛡️',
      descAr: 'يمتص الهجوم المباشر (-70% ضرر ويرد بهجوم مرتد)، لكنه عرضة للالتفاف.',
      descEn: 'Absorbs frontal attack (-70% damage & counters), vulnerable to flank.'
    },
    {
      id: 'flank',
      nameAr: 'التفاف ومناورة سريعة',
      nameEn: 'Tactical Flank',
      icon: '🐎',
      descAr: 'يتجاوز الدفاع الحصين ويضرب المؤخرة مباشرة، لكن يسحقه الهجوم المباشر.',
      descEn: 'Bypasses stationary shields, intercepted by head-on charges.'
    }
  ];

  return (
    <div className="p-4 sm:p-6 space-y-5 max-h-[80vh] overflow-y-auto">
      {/* Health & Commander Status Bar */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 p-4 rounded-xl bg-neutral-950/80 border border-neutral-800">
        {/* Player Side */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white truncate max-w-[120px] sm:max-w-[160px]">
                {clubName}
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 font-semibold">
                {isAr ? 'أنت' : 'You'}
              </span>
            </div>
            <span className="text-xs font-black text-blue-400 flex items-center gap-1 font-mono">
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
            <span className="text-xs font-black text-red-400 flex items-center gap-1 font-mono">
              <Heart className="w-3.5 h-3.5 text-red-400 fill-red-400" />
              {opponentHp}%
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 font-semibold">
                {!opponentIsBot ? (isAr ? 'الخصم الحقيقي' : 'Rival Player') : (isAr ? 'بوت' : 'Bot')}
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

      {/* Match Resolution or Waiting State */}
      {winner ? (
        <div className="p-6 rounded-2xl bg-neutral-950 border border-neutral-800 text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <span className="text-3xl">🏆</span>
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
              {!opponentIsBot
                ? (isAr 
                    ? `تم تسجيل نتيجة المباراة في سجل مواجهات الـ PvP وتحديث تقييم ELO الخاص بناديك.` 
                    : 'Match result saved to your PvP history and ELO updated.')
                : (isAr 
                    ? 'تمت إضافة مكافآت تدريب البوت وتقدم المهام اليومية لخزينتك.' 
                    : 'Rewards and Daily Mission progress credited!')}
            </p>
          </div>

          <div className="flex items-center justify-center gap-3">
            <button
              onClick={onNewDuel}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm flex items-center gap-2 shadow-lg transition active:scale-95 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>{isAr ? 'غرفة أو معركة جديدة' : 'New Duel'}</span>
            </button>
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold text-sm transition cursor-pointer"
            >
              {isAr ? 'إغلاق والعودة' : 'Close'}
            </button>
          </div>
        </div>
      ) : isOrderSubmitted ? (
        <div className="p-8 rounded-2xl bg-neutral-950/90 border border-purple-500/40 text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-full bg-purple-500/20 border border-purple-500/50 flex items-center justify-center text-purple-400 animate-spin">
            <Swords className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">
              {isAr ? 'تم إقفال أمرك السري بنجاح ✓' : 'Your Secret Order is Locked ✓'}
            </h3>
            <p className="text-xs text-purple-300 mt-1">
              {!opponentIsBot 
                ? (isAr ? 'في انتظار إرسال الخصم لأمره ليتم فك التشفير والكشف المتزامن فوراً...' : 'Waiting for opponent to commit. Simultaneous reveal will trigger automatically...')
                : (isAr ? 'جاري فك التشفير وحساب الاصطدام المباشر...' : 'Simultaneous reveal in progress...')}
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
                    onClick={() => onSelectPieceAndStance(piece.id, selectedStance || 'attack')}
                    className={`p-3 rounded-xl border text-right transition-all flex flex-col justify-between cursor-pointer ${
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
                    onClick={() => onSelectPieceAndStance(selectedPiece.id, s.id)}
                    className={`p-3.5 rounded-xl border text-right transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-neutral-850 border-amber-500 ring-2 ring-amber-500/30 shadow-lg'
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
              onClick={onSubmitOrder}
              disabled={isOrderSubmitted}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-sm shadow-xl transition active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
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
  );
};
