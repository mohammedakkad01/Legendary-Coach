/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Season Finale Modal (ختام الموسم وحصاد البطولة)
 * Shown when all fixtures of a season have been played.
 * Celebrates the final ranking, awards season prizes, and gives the user
 * the choice to:
 * 1. Stay with the same club for a new season (Season 2)
 * 2. Transfer to another club in the same league
 * 3. Move to another world league
 */

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useGameStore } from '../state/useGameStore';
import { Trophy, Star, Crown, Globe, RefreshCw, Award, ArrowRight, ShieldCheck, Coins, Gem } from 'lucide-react';

export const SeasonFinaleModal: React.FC = () => {
  const {
    isSeasonFinaleModalOpen,
    setSeasonFinaleModalOpen,
    club,
    leagueStandings,
    renewSeasonWithCurrentClub,
    setClubSelectionModalOpen,
    language,
  } = useGameStore();

  const isAr = language === 'ar';

  const finalStanding = useMemo(() => {
    const sorted = [...leagueStandings].sort(
      (a, b) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor
    );
    const idx = sorted.findIndex(s => s.clubId === club.id);
    const standing = idx >= 0 ? sorted[idx] : null;
    const rank = idx >= 0 ? idx + 1 : 1;
    const isChampion = rank === 1;
    const prizeCoins = isChampion ? 500000 : rank <= 4 ? 300000 : 150000;
    const prizeDiamonds = isChampion ? 100 : rank <= 4 ? 50 : 25;

    return { rank, totalTeams: sorted.length, standing, isChampion, prizeCoins, prizeDiamonds };
  }, [leagueStandings, club.id]);

  if (!isSeasonFinaleModalOpen) return null;

  const { rank, totalTeams, standing, isChampion, prizeCoins, prizeDiamonds } = finalStanding;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-fadeIn">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          className="relative w-full max-w-2xl bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-amber-500/40 rounded-3xl p-5 sm:p-8 shadow-2xl overflow-hidden my-auto"
        >
          {/* Subtle background glow */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: isChampion
                ? 'radial-gradient(circle at 50% 0%, rgba(245,158,11,0.2), transparent 60%)'
                : 'radial-gradient(circle at 50% 0%, rgba(14,165,233,0.18), transparent 60%)',
            }}
          />

          {/* Modal Header */}
          <div className="relative text-center space-y-3 mb-6">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-amber-500/20 border-2 border-amber-400/40 text-4xl shadow-xl shadow-amber-500/20 mx-auto">
              {isChampion ? '🏆' : rank <= 4 ? '🌟' : '🎖️'}
            </div>

            <div>
              <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase tracking-wider">
                {isAr ? `نهاية موسم ${club.divisionName}` : `${club.divisionName} Season Complete`}
              </span>
              <h2 className="text-2xl sm:text-3xl font-black font-heading text-white mt-2">
                {isChampion
                  ? (isAr ? `مبروك! توّجت بطلاً لدوري ${club.divisionName}!` : `Champion! You won the ${club.divisionName} Title!`)
                  : rank <= 4
                  ? (isAr ? `أداء بطولي! أنهيت الموسم في المركز ${rank}!` : `Phenomenal Season! Finished in ${rank}th Position!`)
                  : (isAr ? `صافرة نهاية الموسم! المركز النهائي: ${rank} من ${totalTeams}` : `Season Concluded! Final Standing: ${rank}/${totalTeams}`)}
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 max-w-lg mx-auto mt-1">
                {isChampion
                  ? (isAr ? `قاد المدرب نادي ${club.name} لمنصة التتويج التاريخية ورفع الكأس بجدارة واستحقاق!` : `Led ${club.nameEn || club.name} to a historic title and lifted the championship trophy!`)
                  : (isAr ? `موسم كروي حافل بالمواجهات الصعبة، حصدت خلاله ثقة الإدارة والجماهير.` : `A memorable campaign full of fierce battles and great progress.`)}
              </p>
            </div>

            {/* Prize Reward Banner */}
            <div className="bg-slate-950/80 border border-amber-500/30 rounded-2xl p-3 sm:p-4 flex items-center justify-around gap-4 text-center">
              <div>
                <span className="text-[11px] text-slate-400 font-bold block">{isAr ? 'مكافأة الكوينز 🪙' : 'Coins Prize 🪙'}</span>
                <span className="font-mono text-lg sm:text-xl font-black text-amber-300">+{prizeCoins.toLocaleString()}</span>
              </div>
              <div className="w-px h-8 bg-slate-800" />
              <div>
                <span className="text-[11px] text-slate-400 font-bold block">{isAr ? 'مكافأة الجواهر 💎' : 'Diamonds Prize 💎'}</span>
                <span className="font-mono text-lg sm:text-xl font-black text-sky-300">+{prizeDiamonds}</span>
              </div>
              <div className="w-px h-8 bg-slate-800" />
              <div>
                <span className="text-[11px] text-slate-400 font-bold block">{isAr ? 'النقاط الإجمالية' : 'Total Points'}</span>
                <span className="font-mono text-lg sm:text-xl font-black text-emerald-400">{standing?.points ?? 0}</span>
              </div>
            </div>
          </div>

          {/* Manager Career Choices */}
          <div className="relative space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 text-center">
              {isAr ? 'حدد خطوتك القادمة في مسيرتك التدريبية:' : 'Decide Your Next Career Step:'}
            </h4>

            {/* Option 1: Stay & Renew with same club */}
            <button
              onClick={() => renewSeasonWithCurrentClub()}
              className="w-full text-right sm:text-right p-4 rounded-2xl bg-gradient-to-r from-emerald-950/70 to-slate-900 border border-emerald-500/40 hover:border-emerald-400 transition-all group cursor-pointer shadow-lg space-y-1 block"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <RefreshCw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
                  </div>
                  <div>
                    <h3 className="font-heading font-black text-sm sm:text-base text-white group-hover:text-emerald-300">
                      {isAr ? `تجديد العقد والاستمرار مع ${club.name} (الموسم 2)` : `Stay with ${club.nameEn || club.name} (Season 2)`}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      {isAr ? 'الاحتفاظ بنفس التشكيلة والأموال، وبدء موسم جديد بجدول مباريات طازج والتنافس على اللقب مجدداً' : 'Keep current squad & funds, reset table with a fresh season schedule'}
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-emerald-400 shrink-0 rtl:rotate-180" />
              </div>
            </button>

            {/* Option 2: Change Club in Same League */}
            <button
              onClick={() => {
                setSeasonFinaleModalOpen(false);
                setClubSelectionModalOpen(true);
              }}
              className="w-full text-right sm:text-right p-4 rounded-2xl bg-gradient-to-r from-sky-950/70 to-slate-900 border border-sky-500/40 hover:border-sky-400 transition-all group cursor-pointer shadow-lg space-y-1 block"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-heading font-black text-sm sm:text-base text-white group-hover:text-sky-300">
                      {isAr ? 'الانتقال إلى نادٍ آخر في نفس الدوري' : 'Transfer to Another Club in this League'}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      {isAr ? 'توقيع عقد تدريب مع نادٍ منافس في الدوري لخوض التحدي من منظور جديد' : 'Sign a coaching deal with a rival club in the same competition'}
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-sky-400 shrink-0 rtl:rotate-180" />
              </div>
            </button>

            {/* Option 3: Change to Another World League */}
            <button
              onClick={() => {
                setSeasonFinaleModalOpen(false);
                setClubSelectionModalOpen(true);
              }}
              className="w-full text-right sm:text-right p-4 rounded-2xl bg-gradient-to-r from-purple-950/70 to-slate-900 border border-purple-500/40 hover:border-purple-400 transition-all group cursor-pointer shadow-lg space-y-1 block"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-heading font-black text-sm sm:text-base text-white group-hover:text-purple-300">
                      {isAr ? 'خوض تحدٍ في دوري عالمي آخر' : 'Embark on a Challenge in Another World League'}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      {isAr ? 'الانتقال للتدريب في الدوري الإنجليزي، الإسباني، الإيطالي أو السعودي مع الحفاظ على رتبة VIP' : 'Move to Premier League, La Liga, Serie A or Saudi League while keeping VIP rank'}
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-purple-400 shrink-0 rtl:rotate-180" />
              </div>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
