/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Individual Player Card for Scout Market.
 */

import React from 'react';
import { motion } from 'motion/react';
import { Users, Sparkles, Star, Eye, Handshake } from 'lucide-react';
import { Player } from '../../types/game';

interface TransferPlayerCardProps {
  player: Player;
  isAr: boolean;
  canAfford: boolean;
  isNegotiating: boolean;
  onInspect: (player: Player) => void;
  onNegotiate: (player: Player) => void;
}

export const getPositionBadgeColor = (pos: string) => {
  if (['ST', 'CF', 'LW', 'RW'].includes(pos)) return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
  if (['CAM', 'CM', 'CDM', 'LM', 'RM'].includes(pos)) return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
  if (['CB', 'LB', 'RB', 'LWB', 'RWB'].includes(pos)) return 'bg-sky-500/20 text-sky-300 border-sky-500/30';
  return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
};

export const TransferPlayerCard: React.FC<TransferPlayerCardProps> = ({
  player,
  isAr,
  isNegotiating,
  onInspect,
  onNegotiate,
}) => {
  const isWonderkid = player.age <= 21 && player.potential >= 88;
  const isElite = player.overall >= 85;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 hover:border-slate-700 rounded-3xl p-5 shadow-xl flex flex-col justify-between transition-all group"
    >
      <div className="space-y-4">
        {/* Top Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* Photo / Avatar */}
            <div className="relative w-14 h-14 rounded-2xl bg-slate-800 overflow-hidden border border-slate-700 flex items-center justify-center shrink-0 shadow-md">
              {player.photoUrl ? (
                <img
                  src={player.photoUrl}
                  alt={player.nameEn}
                  className="w-full h-full object-cover object-top"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <Users className="w-7 h-7 text-slate-600" />
              )}
              <span className="absolute bottom-0 right-0 bg-slate-950/80 px-1 text-[9px] font-black text-amber-300 rounded-tl">
                {player.nationalityFlag}
              </span>
            </div>

            {/* Name & Club */}
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="font-heading font-black text-sm sm:text-base text-white">
                  {isAr ? player.name : player.nameEn}
                </h3>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                <span>{player.realTeam || (isAr ? 'نادي محلي' : 'Free Agent')}</span>
                <span>•</span>
                <span>{player.age} {isAr ? 'سنة' : 'yrs'}</span>
              </p>

              {/* Badges */}
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-black border ${getPositionBadgeColor(player.position)}`}>
                  {player.position}
                </span>
                {isWonderkid && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-0.5">
                    <Sparkles className="w-2.5 h-2.5 text-purple-300" />
                    <span>{isAr ? 'موهبة خارقة' : 'Wonderkid'}</span>
                  </span>
                )}
                {isElite && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-0.5">
                    <Star className="w-2.5 h-2.5 text-amber-400" />
                    <span>{isAr ? 'نجم عالمي' : 'Elite'}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Overall & Potential Pill */}
          <div className="flex flex-col items-center justify-center min-w-[46px] p-1.5 rounded-2xl bg-slate-950 border border-slate-800 text-center shadow-inner">
            <span className="text-base font-black text-amber-400 leading-none">
              {player.overall}
            </span>
            <span className="text-[9px] uppercase font-bold text-slate-400 mt-0.5">
              OVR
            </span>
            <span className="text-[10px] font-bold text-emerald-400 mt-1 border-t border-slate-800 pt-0.5 w-full">
              POT {player.potential}
            </span>
          </div>
        </div>

        {/* Attributes Quick Bar */}
        <div className="grid grid-cols-4 gap-1.5 text-center text-[10px] font-bold bg-slate-950/80 p-2.5 rounded-2xl border border-slate-800/80">
          <div>
            <span className="text-slate-500 block uppercase">{isAr ? 'سرعة' : 'PAC'}</span>
            <span className="text-emerald-400 font-black text-xs">{player.attributes.pace}</span>
          </div>
          <div>
            <span className="text-slate-500 block uppercase">{isAr ? 'تسديد' : 'SHO'}</span>
            <span className="text-amber-400 font-black text-xs">{player.attributes.shooting}</span>
          </div>
          <div>
            <span className="text-slate-500 block uppercase">{isAr ? 'تمرير' : 'PAS'}</span>
            <span className="text-sky-400 font-black text-xs">{player.attributes.passing}</span>
          </div>
          <div>
            <span className="text-slate-500 block uppercase">{isAr ? 'دفاع' : 'DEF'}</span>
            <span className="text-indigo-400 font-black text-xs">{player.attributes.defending}</span>
          </div>
        </div>

        {/* Traits */}
        {player.traits.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {player.traits.slice(0, 2).map((t) => (
              <span key={t} className="text-[10px] bg-slate-800/90 text-slate-300 px-2 py-0.5 rounded-md font-semibold border border-slate-700/50">
                {t}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Action & Price Footer */}
      <div className="mt-5 pt-3.5 border-t border-slate-800/80 flex items-center justify-between gap-2">
        <div>
          <span className="text-[10px] text-slate-500 block font-medium">{isAr ? 'قيمة الصفقة' : 'Transfer Fee'}</span>
          <span className="text-sm font-black text-amber-400">
            {player.marketValue.toLocaleString()} $
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onInspect(player)}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
            title={isAr ? 'فحص كامل إحصائيات اللاعب' : 'Inspect player stats'}
          >
            <Eye className="w-4 h-4" />
          </button>

          <button
            onClick={() => onNegotiate(player)}
            className={`px-3.5 py-2 rounded-xl text-xs font-black shadow-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              isNegotiating
                ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-black shadow-amber-500/20 active:scale-95'
                : 'bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-400 hover:to-cyan-400 text-slate-950 shadow-sky-500/20 active:scale-95'
            }`}
          >
            <Handshake className="w-3.5 h-3.5" />
            <span>
              {isNegotiating
                ? (isAr ? 'متابعة التفاوض' : 'Continue Talks')
                : (isAr ? 'بدء التفاوض' : 'Negotiate')}
            </span>
          </button>
        </div>
      </div>
    </motion.div>
  );
};
