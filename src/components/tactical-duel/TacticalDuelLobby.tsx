/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Tactical Duel PvP Lobby component for creating, joining rooms, and viewing stats.
 */

import React from 'react';
import { TrendingUp, Swords, Sparkles, Users, ArrowRight } from 'lucide-react';
import { Club } from '../../types/game';

interface TacticalDuelLobbyProps {
  isAr: boolean;
  club: Club;
  errorMessage: string | null;
  isCreatingRoom: boolean;
  isJoiningRoom: boolean;
  roomCodeInput: string;
  setRoomCodeInput: (val: string) => void;
  onCreateRoom: () => void;
  onJoinRoom: () => void;
  onPlayBot: () => void;
}

export const TacticalDuelLobby: React.FC<TacticalDuelLobbyProps> = ({
  isAr,
  club,
  errorMessage,
  isCreatingRoom,
  isJoiningRoom,
  roomCodeInput,
  setRoomCodeInput,
  onCreateRoom,
  onJoinRoom,
  onPlayBot,
}) => {
  return (
    <div className="p-6 space-y-6">
      <div className="text-center space-y-1">
        <h3 className="text-lg font-black text-white">
          {isAr ? 'غرف التحدي المباشر 1 ضد 1 (لاعب حقيقي)' : '1v1 Realtime PvP Battle Rooms'}
        </h3>
        <p className="text-xs text-neutral-400">
          {isAr 
            ? 'العب ضد مدرب حقيقي بكود دعوة خاص وبنظام كشف متزامن محمي من التجسس والغش.' 
            : 'Challenge another manager via invite code with Zero-Knowledge stance reveal.'}
        </p>
      </div>

      {/* Player Rating & Stats Banner */}
      <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-neutral-400 block">{isAr ? 'تصنيفك في صانع المعارك ELO:' : 'Duel ELO Rating:'}</span>
            <span className="text-base font-black text-amber-300 font-mono">{club.duelRating || 1200} PTS</span>
          </div>
        </div>
        <div className="text-right text-xs">
          <span className="text-emerald-400 font-bold">{club.duelWins || 0}W</span>
          <span className="text-neutral-500 mx-1">/</span>
          <span className="text-rose-400 font-bold">{club.duelLosses || 0}L</span>
          <span className="text-neutral-500 mx-1">/</span>
          <span className="text-neutral-400 font-bold">{club.duelDraws || 0}D</span>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/50 text-red-200 text-xs font-bold">
          {errorMessage}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Create Room Box */}
        <div className="p-5 rounded-2xl bg-neutral-950/70 border border-purple-500/30 space-y-3 flex flex-col justify-between">
          <div className="space-y-1.5">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/40 flex items-center justify-center">
              <Swords className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-white text-sm">
              {isAr ? 'إنشاء غرفة جديدة (مضيف)' : 'Create New Room (Host)'}
            </h4>
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              {isAr 
                ? 'أنشئ غرفة واحصل على رمز قصير شاركه مع صديقك أو منافسك.' 
                : 'Host a room and receive a short invite code to share with a rival.'}
            </p>
          </div>

          <button
            onClick={onCreateRoom}
            disabled={isCreatingRoom}
            className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md transition cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Sparkles className="w-4 h-4" />
            <span>{isCreatingRoom ? (isAr ? 'جاري الإنشاء...' : 'Creating...') : (isAr ? 'إنشاء غرفة الآن' : 'Create Room')}</span>
          </button>
        </div>

        {/* Join Room Box */}
        <div className="p-5 rounded-2xl bg-neutral-950/70 border border-neutral-800 space-y-3 flex flex-col justify-between">
          <div className="space-y-1.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/40 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-white text-sm">
              {isAr ? 'الانضمام بكود الغرفة (ضيف)' : 'Join with Room Code (Guest)'}
            </h4>
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              {isAr ? 'أدخل رمز الغرفة الذي شاركه معك المضيف للانضمام فوراً.' : 'Enter the invite code shared by the host to join instantly.'}
            </p>
          </div>

          <div className="space-y-2">
            <input
              type="text"
              value={roomCodeInput}
              onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
              placeholder="e.g. TC-7K9A"
              className="w-full p-2.5 rounded-xl bg-neutral-900 border border-neutral-700 text-white text-center font-mono font-bold uppercase tracking-wider text-xs focus:border-purple-500 focus:outline-none"
            />
            <button
              onClick={onJoinRoom}
              disabled={isJoiningRoom || !roomCodeInput.trim()}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs shadow-md transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <ArrowRight className="w-4 h-4" />
              <span>{isJoiningRoom ? (isAr ? 'جاري الاتصال...' : 'Joining...') : (isAr ? 'الانضمام للغرفة' : 'Join Room')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bot Training Option */}
      <div className="p-4 rounded-xl bg-neutral-950/50 border border-neutral-800 flex items-center justify-between">
        <div>
          <h4 className="text-xs font-bold text-neutral-200">
            {isAr ? 'هل تريد التدريب بمفردك؟' : 'Want solo training instead?'}
          </h4>
          <p className="text-[11px] text-neutral-400">
            {isAr ? 'خض جولة ضد خوارزمية الذكاء الاصطناعي لاختبار استراتيجيتك.' : 'Play against an offline tactical bot to hone your skills.'}
          </p>
        </div>
        <button
          onClick={onPlayBot}
          className="px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold border border-neutral-700 transition cursor-pointer"
        >
          {isAr ? 'بدء تدريب البوت' : 'Play Bot'}
        </button>
      </div>
    </div>
  );
};
