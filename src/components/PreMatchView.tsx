/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PreMatchView.tsx
 * شاشة ما قبل المباراة (Pre-Match Tactical Preview)
 * تظهر قبل إطلاق صافرة البداية:
 * - شعار واسم الفريقين (المضيف والضيف)
 * - بطاقات القوة التكتيكية (هجوم ودفاع) مستخرجة من الـ 11 لاعباً الأساسيين
 * - ميزات الـ VIP التكتيكية النشطة (+X% هجوم ودفاع)
 * - احتمالات النتيجة المتوقعة (فوز / تعادل / خسارة) محسوبة إحصائياً
 * - أزرار الانتقال المباشر لتعديل الخطة أو إطلاق صافرة البداية
 */

import React from 'react';
import { useGameStore } from '../state/useGameStore';
import { 
  Flame, 
  Swords, 
  ShieldAlert, 
  Crown, 
  Trophy, 
  ArrowLeft, 
  Sparkles,
  Sliders,
  CheckCircle2,
  Calendar
} from 'lucide-react';
import { countdownLabel, formatFixtureDate } from '../utils/fixtureDate';

export const PreMatchView: React.FC = () => {
  const { 
    club, 
    preMatchPreview, 
    confirmStartMatch, 
    closePreMatchPreview, 
    setActiveTab, 
    language 
  } = useGameStore();

  const isAr = language === 'ar';

  if (!preMatchPreview) return null;

  const {
    fixture,
    competition,
    opponentClub,
    userAttackPower,
    userDefensePower,
    userVipAttackBoost,
    userVipDefenseBoost,
    opponentAttackPower,
    opponentDefensePower,
    winProbability,
    drawProbability,
    lossProbability,
    technicalGap,
    expectedUserGoals,
    expectedOpponentGoals,
    mostLikelyScore,
    opponentStarters,
  } = preMatchPreview;

  const gapColor = technicalGap > 1 ? 'text-emerald-400' : technicalGap < -1 ? 'text-rose-400' : 'text-amber-400';
  const gapText = technicalGap > 1
    ? (isAr ? `أفضلية فنية لك بفارق ${technicalGap}` : `You lead by ${technicalGap}`)
    : technicalGap < -1
    ? (isAr ? `الخصم أقوى بفارق ${Math.abs(technicalGap)}` : `Opponent leads by ${Math.abs(technicalGap)}`)
    : (isAr ? 'مستوى متقارب' : 'Evenly matched');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/90 backdrop-blur-md overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-3xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-5 sm:p-8 shadow-2xl overflow-hidden my-auto">
        {/* Glow Effects */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(circle at 20% 0%, rgba(14,165,233,0.12), transparent 45%), radial-gradient(circle at 80% 0%, rgba(244,63,94,0.10), transparent 45%)' }} />

        {/* Header Ribbon */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-amber-400 block">
                {competition}
              </span>
              <h2 className="text-lg sm:text-xl font-black font-heading text-white">
                {isAr ? `معاينة الجولة #${fixture.matchday}` : `Matchday #${fixture.matchday} Preview`}
              </h2>
            </div>
          </div>

          <button
            onClick={closePreMatchPreview}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800/60 transition-colors"
            title={isAr ? 'إلغاء والعودة' : 'Cancel & Return'}
          >
            <ArrowLeft className={`w-5 h-5 ${isAr ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Versus Clash Header */}
        <div className="grid grid-cols-3 items-center gap-3 bg-slate-950/80 p-4 sm:p-6 rounded-2xl border border-slate-800 shadow-inner">
          {/* Home / Player Club */}
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-sky-500/10 border-2 border-sky-500/40 p-2.5 flex items-center justify-center shadow-lg relative overflow-hidden">
              {club.logoUrl ? (
                <img
                  src={club.logoUrl}
                  alt={club.name}
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <span className="text-3xl">{club.logoBadge || '🛡️'}</span>
              )}
            </div>
            <h3 className="text-sm sm:text-base font-black font-heading text-white mt-2">
              {isAr ? club.name : club.nameEn}
            </h3>
            <span className="text-[10px] font-bold text-sky-400">
              {fixture.isHome ? (isAr ? 'المضيف (أرضك)' : 'Home') : (isAr ? 'الضيف (خارج أرضك)' : 'Away')}
            </span>
          </div>

          {/* Center Swords / Clash */}
          <div className="flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-amber-400 shadow-xl">
              <Swords className="w-6 h-6 animate-pulse" />
            </div>
            <span className="text-xs font-black text-slate-500 mt-2 uppercase tracking-widest">VS</span>
          </div>

          {/* Opponent Club */}
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-rose-500/10 border-2 border-rose-500/40 p-2.5 flex items-center justify-center shadow-lg relative overflow-hidden">
              {fixture.opponentBadge ? (
                <img
                  src={fixture.opponentBadge}
                  alt={fixture.opponentClubName}
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <span className="text-3xl">⚔️</span>
              )}
            </div>
            <h3 className="text-sm sm:text-base font-black font-heading text-white mt-2">
              {fixture.opponentClubName}
            </h3>
            <span className="text-[10px] font-bold text-rose-400">
              {!fixture.isHome ? (isAr ? 'المضيف (ملعبه)' : 'Home') : (isAr ? 'الضيف المنافس' : 'Away')}
            </span>
          </div>
        </div>

        {/* Kick-off date */}
        <div className="mt-3 flex items-center justify-center gap-2 text-xs font-bold text-slate-300">
          <Calendar className="w-3.5 h-3.5 text-sky-400" />
          <span>{formatFixtureDate(fixture.date, isAr)}</span>
          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black">
            {countdownLabel(fixture.date, isAr)}
          </span>
        </div>

        {/* Expected Win/Draw/Loss Odds */}
        <div className="mt-5 bg-slate-900/60 border border-slate-800 p-4 rounded-2xl">
          <div className="flex items-center justify-between text-xs font-black mb-2 text-slate-300">
            <span className="text-emerald-400 flex items-center gap-1">
              <span>{isAr ? 'فوزك' : 'Win'}</span>
              <span className="font-mono text-sm">{winProbability}%</span>
            </span>
            <span className="text-amber-400 flex items-center gap-1">
              <span>{isAr ? 'تعادل' : 'Draw'}</span>
              <span className="font-mono text-sm">{drawProbability}%</span>
            </span>
            <span className="text-rose-400 flex items-center gap-1">
              <span>{isAr ? 'خسارة' : 'Loss'}</span>
              <span className="font-mono text-sm">{lossProbability}%</span>
            </span>
          </div>

          {/* Triple-segmented probability bar */}
          <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden flex border border-slate-800 shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-700"
              style={{ width: `${winProbability}%` }}
              title={`Win: ${winProbability}%`}
            />
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-yellow-500 transition-all duration-700"
              style={{ width: `${drawProbability}%` }}
              title={`Draw: ${drawProbability}%`}
            />
            <div
              className="h-full bg-gradient-to-r from-rose-500 to-red-600 transition-all duration-700"
              style={{ width: `${lossProbability}%` }}
              title={`Loss: ${lossProbability}%`}
            />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 text-center">
            <div className="bg-slate-950/70 rounded-xl border border-slate-800 p-2.5">
              <span className="text-[10px] text-slate-500 font-bold block">{isAr ? 'النتيجة الأرجح' : 'Most likely score'}</span>
              <span className="font-mono text-lg font-black text-white">{mostLikelyScore}</span>
              <span className="text-[10px] text-slate-500 block">{isAr ? `متوسط الأهداف ${expectedUserGoals} - ${expectedOpponentGoals}` : `xG ${expectedUserGoals} - ${expectedOpponentGoals}`}</span>
            </div>
            <div className="bg-slate-950/70 rounded-xl border border-slate-800 p-2.5">
              <span className="text-[10px] text-slate-500 font-bold block">{isAr ? 'الفارق الفني' : 'Technical gap'}</span>
              <span className={`font-mono text-lg font-black ${gapColor}`}>{technicalGap > 0 ? `+${technicalGap}` : technicalGap}</span>
              <span className={`text-[10px] block font-bold ${gapColor}`}>{gapText}</span>
            </div>
          </div>
          <span className="text-[10px] text-slate-400 text-center block mt-1.5 font-bold">
            {isAr 
              ? 'توقعات الذكاء التكتيكي مبنية على التشكيلة الأساسية ومكافآت الـ VIP والفارق الفني بين الفريقين'
              : 'Statistical prediction grounded in starting XI ratings, tactics, and active VIP bonuses'}
          </span>
        </div>

        {/* Tactical Powers Comparison Grid */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* User Club Tactical Stats */}
          <div className="bg-slate-950/70 p-4 rounded-2xl border border-sky-500/30 shadow-md">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-black text-sky-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {isAr ? 'قوة فريقك (الأساسيون)' : 'Your Starting XI Power'}
              </span>
              {userVipAttackBoost > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-black flex items-center gap-1">
                  <Crown className="w-2.5 h-2.5 text-amber-400" />
                  <span>VIP +{userVipAttackBoost}%</span>
                </span>
              )}
            </div>

            <div className="space-y-2">
              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-slate-400">{isAr ? '⚔️ الهجوم' : '⚔️ Attack'}</span>
                  <span className="text-sky-300 font-mono">{userAttackPower}</span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div className="h-full bg-sky-500" style={{ width: `${Math.min(100, (userAttackPower / 99) * 100)}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-slate-400">{isAr ? '🛡️ الدفاع' : '🛡️ Defense'}</span>
                  <span className="text-sky-300 font-mono">{userDefensePower}</span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500" style={{ width: `${Math.min(100, (userDefensePower / 99) * 100)}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* Opponent Club Tactical Stats */}
          <div className="bg-slate-950/70 p-4 rounded-2xl border border-rose-500/30 shadow-md">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-black text-rose-400 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5" />
                {isAr ? 'قوة الخصم المتوقعة' : 'Opponent Power'}
              </span>
              <span className="text-[10px] font-bold text-slate-500">
                {opponentClub.footballSquad.length} {isAr ? 'لاعباً' : 'players'} · {isAr ? `الأساسيون ${opponentStarters}` : `XI ${opponentStarters}`}
              </span>
            </div>

            <div className="space-y-2">
              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-slate-400">{isAr ? '⚔️ الهجوم' : '⚔️ Attack'}</span>
                  <span className="text-rose-300 font-mono">{opponentAttackPower}</span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div className="h-full bg-rose-500" style={{ width: `${Math.min(100, (opponentAttackPower / 99) * 100)}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-slate-400">{isAr ? '🛡️ الدفاع' : '🛡️ Defense'}</span>
                  <span className="text-rose-300 font-mono">{opponentDefensePower}</span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div className="h-full bg-orange-500" style={{ width: `${Math.min(100, (opponentDefensePower / 99) * 100)}%` }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={() => {
              closePreMatchPreview();
              setActiveTab('tactics');
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-bold border border-slate-700 transition-all cursor-pointer"
          >
            <Sliders className="w-4 h-4 text-sky-400" />
            <span>{isAr ? 'غرفة التكتيك وتعديل التشكيلة' : 'Adjust Tactics & Lineup'}</span>
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={closePreMatchPreview}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white text-xs sm:text-sm font-bold border border-slate-800 transition-colors cursor-pointer"
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>

            <button
              id="btn_confirm_kickoff"
              onClick={confirmStartMatch}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 text-xs sm:text-sm font-black shadow-xl shadow-emerald-500/30 transition-all cursor-pointer"
            >
              <Flame className="w-4 h-4 text-slate-950" />
              <span>{isAr ? 'ابدأ المباراة الآن ⚽' : 'Start Match Now ⚽'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};