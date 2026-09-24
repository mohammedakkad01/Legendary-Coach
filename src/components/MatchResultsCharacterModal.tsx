/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Match Results Character Modal
 * Featuring "Captain Mansoor" — dynamic tactical commentary, MVP breakdown, and shareable match card.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Share2, 
  Check, 
  Award, 
  Compass, 
  MessageSquare, 
  ShieldCheck, 
  Sparkles, 
  Trophy,
  BarChart3
} from 'lucide-react';
import { useGameStore } from '../state/useGameStore';
import confetti from 'canvas-confetti';

export const MatchResultsCharacterModal: React.FC = () => {
  const { postMatchAnalyst, setPostMatchAnalyst, activeMatchRecord, club, language } = useGameStore();
  const [copied, setCopied] = useState(false);

  if (!postMatchAnalyst) return null;

  const isAr = language === 'ar';
  const record = activeMatchRecord;
  const isHome = record ? record.homeClubId === club.id : true;
  const teamScore = record ? (isHome ? record.homeScore : record.awayScore) : 0;
  const opponentScore = record ? (isHome ? record.awayScore : record.homeScore) : 0;
  const opponentName = record ? (isHome ? record.awayClubName : record.homeClubName) : 'الخصم';

  const getMoodBadge = (mood: string) => {
    switch (mood) {
      case 'ecstatic':
        return <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold flex items-center gap-1">🌟 {isAr ? 'مبتهج وفخور جداً' : 'Ecstatic & Proud'}</span>;
      case 'happy':
        return <span className="px-2.5 py-1 rounded-full bg-teal-500/20 text-teal-400 border border-teal-500/30 text-xs font-bold flex items-center gap-1">⚽ {isAr ? 'سعيد بالأداء' : 'Pleased With Performance'}</span>;
      case 'analytical':
        return <span className="px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs font-bold flex items-center gap-1">⚖️ {isAr ? 'تحليل متوازن' : 'Tactical Assessment'}</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold flex items-center gap-1">⚠️ {isAr ? 'قلق ويتطلب تصحيحاً' : 'Concerned & Needs Tweak'}</span>;
    }
  };

  const handleShare = async () => {
    confetti({ particleCount: 60, spread: 70 });
    const shareText = isAr
      ? `🏆 تقرير الكابتن منصور لمباراة ${club.name} ضد ${opponentName}!\nالنتيجة: ${club.name} ${teamScore} - ${opponentScore} ${opponentName}\nرجل المباراة: ${postMatchAnalyst.mvpPlayerName} (تقييم ${postMatchAnalyst.mvpRating})\n"${postMatchAnalyst.dialogueAr}"\n#صانع_المعارك #ModarebLegend`
      : `🏆 Captain Mansoor Match Report for ${club.name} vs ${opponentName}!\nScore: ${club.name} ${teamScore} - ${opponentScore} ${opponentName}\nMVP: ${postMatchAnalyst.mvpPlayerName} (Rating ${postMatchAnalyst.mvpRating})\n"${postMatchAnalyst.dialogueEn}"\n#BattleMaker #ModarebLegend`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: isAr ? 'تقرير الكابتن منصور الفني' : 'Captain Mansoor Tactical Report',
          text: shareText,
        });
        return;
      } catch (e) {
        // Fallback to clipboard
      }
    }

    navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <AnimatePresence>
      <div 
        id="match-analyst-overlay"
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto"
        dir={isAr ? 'rtl' : 'ltr'}
      >
        <motion.div
          id="match-analyst-card"
          initial={{ opacity: 0, scale: 0.92, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 24 }}
          className="relative w-full max-w-xl bg-neutral-900 border border-neutral-700/80 rounded-2xl shadow-2xl overflow-hidden my-auto"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-950/80 via-neutral-900 to-indigo-950/60 p-5 border-b border-blue-500/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <img 
                  src={postMatchAnalyst.avatarUrl} 
                  alt={isAr ? postMatchAnalyst.nameAr : postMatchAnalyst.nameEn}
                  className="w-13 h-13 rounded-2xl object-cover border-2 border-blue-400 shadow-md"
                  referrerPolicy="no-referrer"
                />
                <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-neutral-900 rounded-full" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-white">
                    {isAr ? postMatchAnalyst.nameAr : postMatchAnalyst.nameEn}
                  </h2>
                  {getMoodBadge(postMatchAnalyst.mood)}
                </div>
                <p className="text-xs text-blue-300 font-medium">
                  {isAr ? postMatchAnalyst.titleAr : postMatchAnalyst.titleEn}
                </p>
              </div>
            </div>

            <button
              id="close-match-analyst-btn"
              onClick={() => setPostMatchAnalyst(null)}
              className="w-8 h-8 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white flex items-center justify-center transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 space-y-4">
            {/* Match Score Banner */}
            <div className="p-3.5 rounded-xl bg-neutral-950/80 border border-neutral-800 flex items-center justify-between text-center">
              <div className="flex-1">
                <span className="text-xs text-neutral-400 font-medium block">{club.name}</span>
                <span className="text-2xl font-black text-white">{teamScore}</span>
              </div>
              <div className="px-3">
                <span className="px-2 py-0.5 rounded-md bg-neutral-800 text-[11px] font-bold text-neutral-400">
                  {isAr ? 'النتيجة النهائية' : 'Final FT'}
                </span>
              </div>
              <div className="flex-1">
                <span className="text-xs text-neutral-400 font-medium block">{opponentName}</span>
                <span className="text-2xl font-black text-white">{opponentScore}</span>
              </div>
            </div>

            {/* Character Dialogue Box */}
            <div className="relative p-4 rounded-xl bg-blue-950/20 border border-blue-500/30 text-white space-y-2">
              <div className="flex items-center gap-2 text-blue-400 text-xs font-bold">
                <MessageSquare className="w-4 h-4" />
                <span>{isAr ? postMatchAnalyst.headlineAr : postMatchAnalyst.headlineEn}</span>
              </div>
              <p className="text-sm leading-relaxed text-neutral-200">
                "{isAr ? postMatchAnalyst.dialogueAr : postMatchAnalyst.dialogueEn}"
              </p>
            </div>

            {/* MVP Breakdown Card */}
            <div className="p-3.5 rounded-xl bg-neutral-800/70 border border-neutral-700/60 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-amber-400 font-semibold">{isAr ? 'رجل المباراة (MVP):' : 'Match MVP:'}</span>
                    <span className="text-sm font-bold text-white">{postMatchAnalyst.mvpPlayerName}</span>
                  </div>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    {isAr ? postMatchAnalyst.mvpStatTextAr : postMatchAnalyst.mvpStatTextEn}
                  </p>
                </div>
              </div>
              <div className="px-3 py-1 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 font-black text-base flex-shrink-0">
                ★ {postMatchAnalyst.mvpRating.toFixed(1)}
              </div>
            </div>

            {/* Full Match Statistics Summary */}
            {record?.stats && (
              <div className="p-3.5 rounded-xl bg-neutral-950/80 border border-neutral-800 space-y-2.5">
                <div className="flex items-center justify-between text-xs font-bold text-neutral-400 border-b border-neutral-800 pb-1.5">
                  <span className="text-blue-400 truncate max-w-[110px]">{club.name}</span>
                  <div className="flex items-center gap-1 text-[11px] text-neutral-400">
                    <BarChart3 className="w-3.5 h-3.5 text-blue-400" />
                    <span>{isAr ? 'الملخص الإحصائي الشامل' : 'Full Match Stats Summary'}</span>
                  </div>
                  <span className="text-rose-400 truncate max-w-[110px] text-right">{opponentName}</span>
                </div>

                {/* Possession Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-bold">
                    <span className="text-blue-400 font-mono">
                      {isHome ? record.stats.homePossession : record.stats.awayPossession}%
                    </span>
                    <span className="text-[10px] text-neutral-400">{isAr ? 'الاستحواذ' : 'Possession'}</span>
                    <span className="text-rose-400 font-mono">
                      {isHome ? record.stats.awayPossession : record.stats.homePossession}%
                    </span>
                  </div>
                  <div className="w-full h-1 bg-neutral-800 rounded-full overflow-hidden flex">
                    <div 
                      className="bg-blue-500" 
                      style={{ width: `${isHome ? record.stats.homePossession : record.stats.awayPossession}%` }} 
                    />
                    <div 
                      className="bg-rose-500" 
                      style={{ width: `${isHome ? record.stats.awayPossession : record.stats.homePossession}%` }} 
                    />
                  </div>
                </div>

                {/* Stats Key Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
                  {/* Shots */}
                  <div className="bg-neutral-900/80 p-2 rounded-lg border border-neutral-800/80 text-center">
                    <span className="text-[9px] text-neutral-400 block">{isAr ? 'التسديدات (على المرمى)' : 'Shots (On Target)'}</span>
                    <span className="font-bold text-white font-mono">
                      {isHome ? record.stats.homeShots : record.stats.awayShots} ({isHome ? record.stats.homeShotsOnTarget : record.stats.awayShotsOnTarget})
                      {' - '}
                      {isHome ? record.stats.awayShots : record.stats.homeShots} ({isHome ? record.stats.awayShotsOnTarget : record.stats.homeShotsOnTarget})
                    </span>
                  </div>

                  {/* xG */}
                  <div className="bg-neutral-900/80 p-2 rounded-lg border border-neutral-800/80 text-center">
                    <span className="text-[9px] text-neutral-400 block">{isAr ? 'الأهداف المتوقعة xG' : 'Expected Goals (xG)'}</span>
                    <span className="font-bold text-amber-400 font-mono">
                      {isHome ? record.stats.homeXg.toFixed(2) : record.stats.awayXg.toFixed(2)} - {isHome ? record.stats.awayXg.toFixed(2) : record.stats.homeXg.toFixed(2)}
                    </span>
                  </div>

                  {/* Corners */}
                  <div className="bg-neutral-900/80 p-2 rounded-lg border border-neutral-800/80 text-center">
                    <span className="text-[9px] text-neutral-400 block">{isAr ? 'الركنيات' : 'Corners'}</span>
                    <span className="font-bold text-emerald-400 font-mono">
                      {isHome ? record.stats.homeCorners : record.stats.awayCorners} - {isHome ? record.stats.awayCorners : record.stats.homeCorners}
                    </span>
                  </div>

                  {/* Fouls & Yellows */}
                  <div className="bg-neutral-900/80 p-2 rounded-lg border border-neutral-800/80 text-center">
                    <span className="text-[9px] text-neutral-400 block">{isAr ? 'الأخطاء / الإنذارات' : 'Fouls / Yellow Cards'}</span>
                    <span className="font-bold text-white font-mono">
                      {isHome ? record.stats.homeFouls : record.stats.awayFouls} ({isHome ? record.stats.homeYellowCards : record.stats.awayYellowCards}🟨)
                      {' - '}
                      {isHome ? record.stats.awayFouls : record.stats.homeFouls} ({isHome ? record.stats.awayYellowCards : record.stats.homeYellowCards}🟨)
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Tactical Advice for Next Game */}
            <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30 flex items-start gap-3">
              <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 mt-0.5">
                <Compass className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-emerald-400 block mb-0.5">
                  {isAr ? 'نصيحة الكابتن منصور للمباراة القادمة:' : 'Captain Mansoor Next Match Advice:'}
                </span>
                <p className="text-xs text-neutral-300 leading-normal">
                  {isAr ? postMatchAnalyst.tacticalAdviceAr : postMatchAnalyst.tacticalAdviceEn}
                </p>
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="p-4 bg-neutral-950 border-t border-neutral-800 flex items-center justify-between gap-3">
            <button
              id="share-match-result-card-btn"
              onClick={handleShare}
              className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs sm:text-sm font-semibold flex items-center gap-2 transition active:scale-95 border border-neutral-700"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4 text-blue-400" />}
              <span>{copied ? (isAr ? 'تم نسخ التقرير!' : 'Report Copied!') : (isAr ? 'مشاركة بطاقة النتيجة' : 'Share Result Card')}</span>
            </button>

            <button
              id="confirm-match-analyst-btn"
              onClick={() => setPostMatchAnalyst(null)}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm shadow-md transition active:scale-95"
            >
              {isAr ? 'فهمت، شكراً يا كابتن!' : 'Understood, Thank You Coach!'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
