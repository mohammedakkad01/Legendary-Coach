/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Live Match Scoreboard & Control Tablet Banner.
 */

import React from 'react';
import { Crown, Play, Pause, Lock, FastForward } from 'lucide-react';
import { Club, MatchRecord, VIPPrivilege } from '../../types/game';

interface MatchScoreboardProps {
  record: MatchRecord;
  club: Club;
  isAr: boolean;
  currentVipTier: VIPPrivilege;
  currentMatchMinute: number;
  isMatchPaused: boolean;
  matchSpeed: number;
  unlockedSpeed2x: boolean;
  onTogglePause: () => void;
  onSetSpeed: (speed: number) => void;
  onOpenSpeedModal: () => void;
  onInstantSimulate: () => void;
}

export const MatchScoreboard: React.FC<MatchScoreboardProps> = ({
  record,
  club,
  isAr,
  currentVipTier,
  currentMatchMinute,
  isMatchPaused,
  matchSpeed,
  unlockedSpeed2x,
  onTogglePause,
  onSetSpeed,
  onOpenSpeedModal,
  onInstantSimulate,
}) => {
  const isFinished = record.isFinished;

  return (
    <div className="relative bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-2xl overflow-hidden">
      {/* Glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(14,165,233,0.14), transparent 55%)' }}
      />

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Home Team */}
        <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-1/3 justify-start sm:justify-end order-1">
          <div className="text-left sm:text-right">
            <h3 className="text-base sm:text-lg font-black font-heading text-white">
              {record.homeClubName}
            </h3>
            <div className="flex items-center gap-1.5 justify-start sm:justify-end">
              <span className="text-[11px] text-sky-400 font-bold">{isAr ? 'المضيف (فريقك)' : 'Home (You)'}</span>
              {currentVipTier.attackBoostPercent > 0 && (
                <span
                  className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-black"
                  title={isAr ? `ميزة تكتيكية VIP: +${currentVipTier.attackBoostPercent}% هجوم ودفاع` : `VIP Tactical Bonus: +${currentVipTier.attackBoostPercent}% atk & def`}
                >
                  <Crown className="w-2.5 h-2.5 text-amber-400" />
                  <span>VIP {currentVipTier.level} (+{currentVipTier.attackBoostPercent}%)</span>
                </span>
              )}
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-2xl shadow-lg">
            {club.logoBadge || '🛡️'}
          </div>
        </div>

        {/* Score & Timer Center */}
        <div className="flex flex-col items-center justify-center order-3 sm:order-2 w-full sm:w-auto">
          <div className="flex items-center gap-4 bg-slate-950/80 px-6 py-2 rounded-2xl border border-slate-800 shadow-inner">
            <span className="text-3xl sm:text-5xl font-black font-heading text-white tracking-tight">
              {record.homeScore}
            </span>
            <span className="text-xl sm:text-2xl font-black text-slate-500">-</span>
            <span className="text-3xl sm:text-5xl font-black font-heading text-white tracking-tight">
              {record.awayScore}
            </span>
          </div>

          {/* Minute Badge & Status */}
          <div className="mt-2 flex items-center gap-2">
            {isFinished ? (
              (() => {
                const isUserHome = record.homeClubId === club.id;
                const userScore = isUserHome ? record.homeScore : record.awayScore;
                const oppScore = isUserHome ? record.awayScore : record.homeScore;
                const won = userScore > oppScore;
                const drawn = userScore === oppScore;

                if (won) {
                  return (
                    <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 shadow-sm">
                      <span>🏁</span>
                      <span>{isAr ? 'صافرة النهاية — فوز' : 'Full Time — Win'}</span>
                    </span>
                  );
                }
                if (drawn) {
                  return (
                    <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1.5">
                      <span>🏁</span>
                      <span>{isAr ? 'صافرة النهاية — تعادل' : 'Full Time — Draw'}</span>
                    </span>
                  );
                }
                return (
                  <span className="px-3 py-1 rounded-full text-xs font-black bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1.5">
                    <span>🏁</span>
                    <span>{isAr ? 'صافرة النهاية — خسارة' : 'Full Time — Defeat'}</span>
                  </span>
                );
              })()
            ) : (
              <span className="px-3 py-0.5 rounded-full text-xs font-black bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                <span>{currentMatchMinute}' {isAr ? 'دقيقة' : 'Min'}</span>
              </span>
            )}
          </div>
        </div>

        {/* Away Team */}
        <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-1/3 justify-end sm:justify-start order-2 sm:order-3">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-2xl shadow-lg">
            ⚔️
          </div>
          <div className="text-right sm:text-left">
            <h3 className="text-base sm:text-lg font-black font-heading text-white">
              {record.awayClubName}
            </h3>
            <span className="text-[11px] text-rose-400 font-bold">{isAr ? 'الضيف المنافس' : 'Away Opponent'}</span>
          </div>
        </div>
      </div>

      {/* Coach Tablet Control Bar */}
      {!isFinished && (
        <div className="mt-6 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              id="btn_match_play_pause"
              onClick={onTogglePause}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-black text-white transition-colors cursor-pointer"
            >
              {isMatchPaused ? <Play className="w-4 h-4 text-emerald-400" /> : <Pause className="w-4 h-4 text-amber-400" />}
              <span>{isMatchPaused ? (isAr ? 'استئناف' : 'Resume') : (isAr ? 'إيقاف مؤقت' : 'Pause')}</span>
            </button>

            {/* Speed Buttons */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-black gap-1">
              <button
                key={1}
                onClick={() => onSetSpeed(1)}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  matchSpeed === 1 ? 'bg-sky-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
                }`}
              >
                1x
              </button>

              <button
                key={2}
                onClick={() => {
                  if (unlockedSpeed2x) {
                    onSetSpeed(2);
                  } else {
                    onOpenSpeedModal();
                  }
                }}
                className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                  matchSpeed === 2 
                    ? 'bg-sky-500 text-slate-950 font-black' 
                    : unlockedSpeed2x 
                    ? 'text-slate-400 hover:text-white' 
                    : 'text-amber-400/80 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30'
                }`}
                title={unlockedSpeed2x ? (isAr ? 'سرعة 2x مفتوحة' : '2x Unlocked') : (isAr ? 'اضغط لفتح سرعة 2x بالجواهر أو الكوينز' : 'Click to unlock 2x with Gems or Coins')}
              >
                <span>2x</span>
                {!unlockedSpeed2x && <Lock className="w-3 h-3 text-amber-400" />}
              </button>

              {(() => {
                const isVip4xUnlocked = !!currentVipTier.unlockedSpeed4x;
                return (
                  <button
                    key={4}
                    onClick={() => {
                      if (isVip4xUnlocked) {
                        onSetSpeed(4);
                      } else {
                        onOpenSpeedModal();
                      }
                    }}
                    className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                      matchSpeed === 4 
                        ? 'bg-amber-500 text-slate-950 font-black' 
                        : isVip4xUnlocked 
                        ? 'text-slate-400 hover:text-white' 
                        : 'text-purple-400/80 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30'
                    }`}
                    title={isVip4xUnlocked ? (isAr ? 'سرعة 4x متاحة لمستوى VIP الخاص بك' : '4x Unlocked for your VIP') : (isAr ? 'مقفلة: تتطلب رتبة VIP 10 فما فوق' : 'Locked: Requires VIP 10+')}
                  >
                    <span>4x</span>
                    {!isVip4xUnlocked && <Lock className="w-3 h-3 text-purple-400" />}
                  </button>
                );
              })()}
            </div>
          </div>

          <button
            id="btn_instant_simulate"
            onClick={onInstantSimulate}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 border border-amber-500/40 text-amber-300 text-xs font-black transition-colors cursor-pointer"
          >
            <FastForward className="w-4 h-4" />
            <span>{isAr ? 'محاكاة النتيجة فوراً' : 'Instant Result'}</span>
          </button>
        </div>
      )}
    </div>
  );
};
