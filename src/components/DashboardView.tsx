/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Club Hub / Dashboard View
 * Coach standing, Board trust, Fan mood, Next fixture, Daily Check-in & VIP chest.
 */

import React from 'react';
import { useGameStore } from '../state/useGameStore';
import { useFirebase } from '../firebase/FirebaseContext';
import { VIP_LEVELS } from '../data/vipData';
import { 
  Trophy, 
  Flame, 
  CheckCircle2, 
  Gift, 
  Calendar, 
  Users, 
  BookOpen, 
  Dumbbell, 
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  Building2,
  Crown,
  Gem,
  Sparkles,
  Globe,
  Swords,
  Activity,
  HeartPulse
} from 'lucide-react';

export const DashboardView: React.FC = () => {
  const { 
    club, 
    vipPoints, 
    vipClaimedToday, 
    claimDailyVIPReward, 
    checkInStreak, 
    checkInClaimedToday, 
    claimDailyCheckIn,
    storyMissions, 
    setActiveTab, 
    startNewMatch, 
    setClubSelectionModalOpen,
    dailyMissions,
    setDailyMissionsModalOpen,
    startTacticalDuel,
    runSquadRecoverySession,
    hasSelectedInitialClub,
    isLoadingMatch,
    language 
  } = useGameStore();

  const { user, setAuthModalOpen } = useFirebase();
  const isAr = language === 'ar';

  const squad = club.footballSquad || [];
  const avgFatigue = squad.length > 0 
    ? Math.round(squad.reduce((acc, p) => acc + (p.fatigue || 0), 0) / squad.length)
    : 0;

  const totalDaily = dailyMissions?.length || 0;
  const completedDaily = (dailyMissions || []).filter(m => m.current >= m.target).length;
  const claimedDaily = (dailyMissions || []).filter(m => m.isClaimed).length;

  // Calculate VIP Tier
  let currentTier = VIP_LEVELS[0];
  let nextTier = VIP_LEVELS[1];
  for (let i = 0; i < VIP_LEVELS.length; i++) {
    if (vipPoints >= VIP_LEVELS[i].pointsRequired) {
      currentTier = VIP_LEVELS[i];
      nextTier = VIP_LEVELS[i + 1] || VIP_LEVELS[i];
    }
  }

  const nextMission = storyMissions.find(m => !m.isCompleted);
  const completedMissionsCount = storyMissions.filter(m => m.isCompleted).length;

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-6 space-y-6">
      
      {/* Top Banner: Club & Coach Identity */}
      <div className="relative bg-gradient-to-br from-slate-900 via-slate-900 to-sky-950 border border-slate-800 rounded-3xl p-5 sm:p-8 shadow-2xl overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(circle at 85% 0%, rgba(14,165,233,0.12), transparent 45%)' }} />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-slate-950 border border-slate-800 p-2 flex items-center justify-center shadow-xl shadow-sky-500/10 shrink-0">
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
                <span className="text-3xl sm:text-4xl">{club.logoBadge || '🛡️'}</span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl sm:text-3xl font-black font-heading text-white">
                  {isAr ? club.name : club.nameEn}
                </h2>
                <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                  {club.divisionName}
                </span>
                <button
                  onClick={() => setClubSelectionModalOpen(true)}
                  className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Trophy className="w-3 h-3 text-amber-400" />
                  <span>{isAr ? 'تغيير الدوري أو الفريق' : 'Change League/Club'}</span>
                </button>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
                <span>📍 {club.city}</span>
                <span>•</span>
                <span>🏟️ {isAr ? `الملعب: ${club.stadiumName}` : `Stadium: ${club.stadiumName}`}</span>
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-3 flex-wrap">
            {!hasSelectedInitialClub && (
              <button
                onClick={() => setClubSelectionModalOpen(true)}
                className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-400/30 font-bold text-xs sm:text-sm shadow-lg transition-all cursor-pointer"
              >
                <Trophy className="w-4 h-4 text-amber-400" />
                <span>{isAr ? 'اختر دورياً وفريقاً' : 'Select League & Team'}</span>
              </button>
            )}

            <button
              id="btn_dashboard_kickoff"
              disabled={isLoadingMatch}
              onClick={() => startNewMatch()}
              className="flex items-center gap-2.5 px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 disabled:opacity-50 text-slate-950 font-black text-sm sm:text-base shadow-xl shadow-emerald-500/30 group transition-all cursor-pointer"
            >
              <Flame className={`w-5 h-5 text-slate-950 ${isLoadingMatch ? 'animate-spin' : 'group-hover:scale-110'} transition-transform`} />
              <span>
                {isLoadingMatch 
                  ? (isAr ? 'جاري تحضير المعاينة...' : 'Loading Clash...') 
                  : (isAr ? 'خوض المباراة القادمة' : 'Play Next Match')}
              </span>
            </button>
          </div>
        </div>

        {/* Vital Indicators Bar (Board Trust, Fan Mood, VIP Bar) */}
        <div className="mt-6 pt-6 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-4">
          
          {/* Board Trust */}
          <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-400 font-bold">{isAr ? 'ثقة مجلس الإدارة' : 'Board Trust'}</span>
              <span className={`font-black ${club.boardTrust >= 70 ? 'text-emerald-400' : club.boardTrust >= 40 ? 'text-amber-400' : 'text-rose-400'}`}>
                {club.boardTrust}%
              </span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${club.boardTrust >= 70 ? 'bg-emerald-500' : club.boardTrust >= 40 ? 'bg-amber-500' : 'bg-rose-500'}`}
                style={{ width: `${club.boardTrust}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">
              {club.boardTrust >= 70 ? (isAr ? 'إدارة داعمة ومستقرة' : 'Secure & Backed') : (isAr ? 'تحذير: نتائج الفريق تحت المجهر' : 'Under Review')}
            </span>
          </div>

          {/* Fan Mood */}
          <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-400 font-bold">{isAr ? 'حماس الجماهير' : 'Fan Support'}</span>
              <span className="font-black text-sky-400">{club.fanMood}%</span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div 
                className="h-full bg-sky-500 rounded-full transition-all duration-500"
                style={{ width: `${club.fanMood}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">
              {isAr ? 'المدرجات تهتف بحماسة' : 'Crowd in Full Voice'}
            </span>
          </div>

          {/* Club Reputation */}
          <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-400 font-bold">{isAr ? 'الهيبة والسمعة' : 'Prestige'}</span>
              <span className="font-black text-amber-400">{club.finances.reputation}</span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div 
                className="h-full bg-amber-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (club.finances.reputation / 1000) * 100)}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">
              {isAr ? 'نادي محترم صاعد' : 'Rising Contender'}
            </span>
          </div>

          {/* VIP Level */}
          <div 
            onClick={() => setActiveTab('vip')}
            className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800 hover:border-amber-500/50 cursor-pointer transition-colors"
          >
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-amber-400 font-bold flex items-center gap-1">
                <Crown className="w-3.5 h-3.5" />
                <span>{currentTier.nameAr}</span>
              </span>
              <span className="font-black text-white">{vipPoints} XP</span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full"
                style={{ width: `${Math.min(100, (vipPoints / (nextTier.pointsRequired || 1000)) * 100)}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">
              {isAr ? 'تقدم باللعب فقط، لا مدفوعات' : 'Earned purely by gameplay'}
            </span>
          </div>

        </div>
      </div>

      {/* REAL LEAGUES & 300 GEMS BONUS HIGHLIGHT BANNER */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Banner 1: Real Leagues & Clubs Selection */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950/80 via-slate-900 to-sky-950/80 border border-sky-500/30 p-5 shadow-xl flex flex-col justify-between">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs">
                <Trophy className="w-4 h-4" />
                <span>{hasSelectedInitialClub ? (isAr ? 'النادي والدوري المختار' : 'Active Club & League') : (isAr ? 'الدوريات والأندية الرسمية' : 'Official Leagues & Clubs')}</span>
              </div>
              <h3 className="text-lg font-black font-heading text-white mt-1">
                {hasSelectedInitialClub 
                  ? (isAr ? `${club.name} • ${club.divisionName}` : `${club.nameEn} • ${club.divisionName}`)
                  : (isAr ? 'اختر دوريك وناديك لبدء المسيرة' : 'Select Your League & Team')}
              </h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                {hasSelectedInitialClub
                  ? (isAr 
                      ? 'أنت تدرب هذا النادي حالياً. الانتقال إلى نادٍ آخر يتطلب رسوم انتقال رسمية لفسخ العقد (25,000 🪙 أو 50 💎).' 
                      : 'You currently manage this club. Mid-career transfers require an official release fee (25,000 🪙 or 50 💎).')
                  : (isAr 
                      ? 'اختر ناديك المفضل في الدوريات العالمية. أندية المركز الأول والنخبة تتطلب 100 💎، وأندية التحدي مجانية بالكامل (0 💎).' 
                      : 'Pick your club in world leagues. Top-tier clubs require 100 💎, challenger clubs are free (0 💎).')}
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-2xl shrink-0">
              🏆
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">
              {hasSelectedInitialClub 
                ? (isAr ? `الملعب: ${club.stadiumName}` : `Stadium: ${club.stadiumName}`)
                : (isAr ? 'شعار حقيقي وملعب رسمي ومسيرة واقعية' : 'Real badges, official stadiums & stats')}
            </span>
            <button
              onClick={() => setClubSelectionModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-black text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer hover:brightness-110"
            >
              <Trophy className="w-3.5 h-3.5 text-slate-950" />
              <span>{hasSelectedInitialClub ? (isAr ? 'سوق الانتقال لدوري آخر' : 'Transfer League/Club') : (isAr ? 'اختيار الدوري والنادي' : 'Choose League & Club')}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Banner 2: 300 Diamonds Login Bonus / Status */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-950/80 via-slate-900 to-fuchsia-950/80 border border-fuchsia-500/40 p-5 shadow-xl flex flex-col justify-between">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-1.5 text-fuchsia-300 font-bold text-xs">
                <Sparkles className="w-4 h-4 text-yellow-300" />
                <span>{isAr ? 'مكافأة تسجيل الدخول' : 'Sign In Reward'}</span>
              </div>
              <h3 className="text-lg font-black font-heading text-white mt-1">
                {user 
                  ? (isAr ? `رصيدك: ${club.finances.diamonds || 0} جوهرة 💎` : `Balance: ${club.finances.diamonds || 0} Diamonds 💎`)
                  : (isAr ? 'احصل على 300 جوهرة 💎 مجاناً!' : 'Claim 300 Free Diamonds 💎!')}
              </h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                {user 
                  ? (isAr ? 'تم توثيق حسابك وحفظ بياناتك سحابياً! يمكنك استخدام الجواهر للتعاقد مع كبار النجوم.' : 'Account verified with cloud sync! Use diamonds to sign top world stars.')
                  : (isAr ? 'سجل دخولك بحساب Google لتحصل فوراً على 300 جوهرة في حسابك وتحفظ تقدمك سحابياً، أو تابع كـ ضيف من الصفر.' : 'Sign in with Google to get 300 diamonds instantly and enable cloud sync, or play as guest.')}
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-fuchsia-500/20 border border-fuchsia-400/30 flex items-center justify-center text-2xl shrink-0">
              <Gem className="w-6 h-6 text-fuchsia-300 animate-pulse" />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
            <span className="text-[11px] text-fuchsia-300 font-medium">
              {user ? (isAr ? '✓ تم تفعيل الحفظ السحابي' : '✓ Cloud Sync Active') : (isAr ? '300 جوهرة في انتظارك' : '300 gems waiting for you')}
            </span>
            <button
              onClick={() => setAuthModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-500 hover:to-pink-500 text-white font-bold text-xs shadow-md shadow-fuchsia-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              {user ? (
                <>
                  <span>{isAr ? 'الملف والحفظ السحابي' : 'Profile & Saves'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-yellow-200" />
                  <span>{isAr ? 'تسجيل الدخول (300 💎)' : 'Sign In (300 💎)'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* CORE PVP & SQUAD READINESS TRIO (صانع المعارك، المهام اليومية، إجهاد التشكيلة) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Simultaneous Reveal Tactical Duel (صانع المعارك) */}
        <div className="bg-gradient-to-br from-purple-950/60 via-slate-900 to-indigo-950/60 border border-purple-500/30 rounded-3xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-bold border border-purple-500/30">
                {isAr ? 'كشف متزامن 1v1' : 'Simultaneous 1v1'}
              </span>
              <span className="text-xl">⚔️</span>
            </div>
            <h3 className="text-base font-black text-white mt-2">
              {isAr ? 'صانع المعارك التكتيكي' : 'Battle Maker PvP Duel'}
            </h3>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              {isAr 
                ? 'مواجهة تكتيكية سريعة (5-8 دقائق) بنظام الكشف المتزامن والأوامر السرية. لا أفضلية للدفع، التكتيك وحده يحسم الموقعة!' 
                : 'Rapid 5-8 min tactical clash with simultaneous order reveal. Pure strategy, zero pay-to-win!'}
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-purple-500/20 flex items-center justify-between">
            <span className="text-[11px] text-purple-300 font-medium">
              {isAr ? 'جوائز كوينز وجواهر وVIP' : 'Earn Coins, Gems & VIP'}
            </span>
            <button
              id="dashboard_play_duel_btn"
              onClick={() => startTacticalDuel('tactical')}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1 active:scale-95"
            >
              <Swords className="w-3.5 h-3.5" />
              <span>{isAr ? 'بدء المواجهة' : 'Start Duel'}</span>
            </button>
          </div>
        </div>

        {/* Card 2: Daily Missions */}
        <div className="bg-gradient-to-br from-amber-950/60 via-slate-900 to-yellow-950/40 border border-amber-500/30 rounded-3xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30">
                {isAr ? 'تجدد يومي 24h' : '24h Reset'}
              </span>
              <span className="text-xs font-bold text-amber-400">
                {completedDaily} / {totalDaily} {isAr ? 'مكتمل' : 'Done'}
              </span>
            </div>
            <h3 className="text-base font-black text-white mt-2">
              {isAr ? 'المهام اليومية الرسمية' : 'Official Daily Missions'}
            </h3>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              {isAr 
                ? 'خض مباريات، وسجل أهدافاً، وحافظ على شباكك نظيفة لجمع الكوينز والجواهر ونقاط ترقية VIP.' 
                : 'Play matches, score goals, and manage your squad to unlock rewards and VIP points.'}
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-amber-500/20 flex items-center justify-between">
            <div className="w-24 bg-slate-800 h-2 rounded-full overflow-hidden">
              <div 
                className="h-full bg-amber-400 rounded-full"
                style={{ width: `${totalDaily > 0 ? (claimedDaily / totalDaily) * 100 : 0}%` }}
              />
            </div>
            <button
              id="dashboard_open_missions_btn"
              onClick={() => setDailyMissionsModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs shadow-md transition-all flex items-center gap-1 active:scale-95"
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>{isAr ? 'فتح المهام' : 'Open Tasks'}</span>
            </button>
          </div>
        </div>

        {/* Card 3: Squad Fatigue & Readiness */}
        <div className="bg-gradient-to-br from-emerald-950/60 via-slate-900 to-teal-950/40 border border-emerald-500/30 rounded-3xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${avgFatigue > 45 ? 'bg-red-500/20 text-red-300 border-red-500/30' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'}`}>
                {avgFatigue > 45 ? (isAr ? 'إجهاد مرتفع' : 'Fatigued') : (isAr ? 'جاهزية ممتازة' : 'Match Ready')}
              </span>
              <span className={`text-sm font-black ${avgFatigue > 45 ? 'text-red-400' : 'text-emerald-400'}`}>
                %{avgFatigue}
              </span>
            </div>
            <h3 className="text-base font-black text-white mt-2">
              {isAr ? 'جاهزية واستشفاء التشكيلة' : 'Squad Fatigue & Recovery'}
            </h3>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              {isAr 
                ? 'استنزاف لياقة اللاعبين في المباريات يرفع الإجهاد. قم بتدوير التشكيلة أو إجراء استشفاء بدني لتفادي الإصابات.' 
                : 'Match minutes accumulate fatigue. Rotate starters or conduct physical recovery sessions.'}
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-emerald-500/20 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">
              {isAr ? 'تكلفة الاستشفاء: 500 كوينز' : 'Cost: 500 Coins'}
            </span>
            <button
              id="dashboard_squad_recovery_btn"
              onClick={() => {
                const res = runSquadRecoverySession();
                alert(res.message);
              }}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1 active:scale-95"
            >
              <HeartPulse className="w-3.5 h-3.5" />
              <span>{isAr ? 'جلسة استشفاء' : 'Recovery'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Daily Activities & Rewards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* 7-Day Check-in Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-400" />
              <h3 className="font-heading font-black text-sm sm:text-base text-white">
                {isAr ? 'حضور المدرب اليومي (سلسلة 7 أيام)' : '7-Day Daily Coach Check-In'}
              </h3>
            </div>
            <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
              {isAr ? `اليوم ${checkInStreak} من 7` : `Day ${checkInStreak} of 7`}
            </span>
          </div>

          <div className="grid grid-cols-7 gap-1.5 text-center">
            {[1, 2, 3, 4, 5, 6, 7].map((day) => {
              const isPast = day < checkInStreak;
              const isToday = day === checkInStreak;
              return (
                <div 
                  key={day}
                  className={`p-2 rounded-xl border text-xs font-bold transition-all ${
                    isPast ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300' :
                    isToday ? 'bg-amber-950/50 border-amber-500 text-amber-300 ring-2 ring-amber-400/40' :
                    'bg-slate-950/60 border-slate-800 text-slate-500'
                  }`}
                >
                  <span className="text-[10px] block">{isAr ? `يوم ${day}` : `D${day}`}</span>
                  <span className="text-sm block my-0.5">{day === 7 ? '👑' : '💰'}</span>
                  <span className="text-[9px] font-black">{day * 8}K</span>
                </div>
              );
            })}
          </div>

          <button
            id="btn_claim_checkin"
            disabled={checkInClaimedToday}
            onClick={claimDailyCheckIn}
            className={`w-full py-2.5 rounded-xl font-black text-xs shadow-lg transition-all ${
              checkInClaimedToday
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-emerald-600/30'
            }`}
          >
            {checkInClaimedToday 
              ? (isAr ? 'تم استلام مكافأة الحضور اليومية بنجاح ✓' : 'Daily Check-in Claimed ✓')
              : (isAr ? 'استلام مكافأة اليوم' : 'Claim Today’s Reward')}
          </button>
        </div>

        {/* Daily VIP Chest Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-amber-400" />
              <h3 className="font-heading font-black text-sm sm:text-base text-white">
                {isAr ? 'صندوق الـ VIP اليومي' : 'Daily VIP Reward Chest'}
              </h3>
            </div>
            <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
              VIP {currentTier.level}
            </span>
          </div>

          <p className="text-xs text-slate-400">
            {isAr 
              ? `صندوق حصري يتضمن كوينز ونقاط تدريب بناءً على مستواك في الـ VIP (${currentTier.level}). يُعاد تجديده يومياً.`
              : `Exclusive chest containing coins & training points scaled to your VIP tier (${currentTier.level}).`}
          </p>

          <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 flex items-center justify-between text-xs font-bold">
            <div className="flex items-center gap-2">
              <span className="text-xl">🎁</span>
              <span className="text-slate-300">{isAr ? 'مكافأة اليوم:' : 'Today: '}</span>
            </div>
            <div className="text-right text-amber-300 font-black">
              +{(10000 + currentTier.level * 4000).toLocaleString()} {isAr ? 'كوينز' : 'Coins'}
            </div>
          </div>

          <button
            id="btn_claim_vip_chest"
            disabled={vipClaimedToday}
            onClick={claimDailyVIPReward}
            className={`w-full py-2.5 rounded-xl font-black text-xs shadow-lg transition-all ${
              vipClaimedToday
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer shadow-amber-500/30'
            }`}
          >
            {vipClaimedToday 
              ? (isAr ? 'تم فتح صندوق الـ VIP لليوم ✓' : 'VIP Chest Opened Today ✓')
              : (isAr ? 'فتح الصندوق واستلام الجائزة' : 'Open VIP Chest')}
          </button>
        </div>

      </div>

      {/* Story Mission Spotlight */}
      {nextMission && (
        <div className="bg-gradient-to-r from-sky-950/50 via-slate-900 to-sky-950/50 border border-sky-500/40 rounded-3xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-sky-400" />
              <h3 className="font-heading font-black text-base text-white">
                {isAr ? 'مهمة القصة النشطة — الفصل الأول' : 'Active Story Mission — Chapter 1'}
              </h3>
            </div>
            <span className="text-xs text-sky-300 font-bold">
              {completedMissionsCount}/10 {isAr ? 'مهام مكتملة' : 'Completed'}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{nextMission.speakerAvatar}</span>
              <div>
                <h4 className="text-sm font-black text-white">
                  {isAr ? nextMission.titleAr : nextMission.titleEn}
                </h4>
                <p className="text-xs text-slate-400 line-clamp-1">
                  {isAr ? nextMission.objectiveAr : nextMission.objectiveEn}
                </p>
              </div>
            </div>

            <button
              onClick={() => setActiveTab('story')}
              className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-black text-xs shadow-md flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <span>{isAr ? 'دخول المشهد والقرار' : 'Enter Scene'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Quick Access Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => setActiveTab('tactics')}
          className="bg-slate-900 p-4 rounded-2xl border border-slate-800 hover:border-sky-500/50 text-left sm:text-right space-y-1 transition-all group"
        >
          <div className="w-9 h-9 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center text-lg mb-2 group-hover:scale-110 transition-transform">
            📋
          </div>
          <h4 className="font-heading font-black text-sm text-white">
            {isAr ? 'لوحة التكتيك' : 'Tactics Board'}
          </h4>
          <p className="text-xs text-slate-400">
            {club.footballTactics.formation} • {club.footballTactics.mentality}
          </p>
        </button>

        <button
          onClick={() => setActiveTab('training')}
          className="bg-slate-900 p-4 rounded-2xl border border-slate-800 hover:border-emerald-500/50 text-left sm:text-right space-y-1 transition-all group"
        >
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-lg mb-2 group-hover:scale-110 transition-transform">
            ⚡
          </div>
          <h4 className="font-heading font-black text-sm text-white">
            {isAr ? 'التدريب والأكاديمية' : 'Training & Academy'}
          </h4>
          <p className="text-xs text-slate-400">
            {club.finances.trainingPoints} {isAr ? 'نقطة تدريب متاحة' : 'TP available'}
          </p>
        </button>

        <button
          onClick={() => setActiveTab('transfers')}
          className="bg-slate-900 p-4 rounded-2xl border border-slate-800 hover:border-amber-500/50 text-left sm:text-right space-y-1 transition-all group"
        >
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-lg mb-2 group-hover:scale-110 transition-transform">
            🔍
          </div>
          <h4 className="font-heading font-black text-sm text-white">
            {isAr ? 'سوق الانتقالات' : 'Transfer Market'}
          </h4>
          <p className="text-xs text-slate-400">
            {isAr ? 'اكتشف صفقات مميزة' : 'Scouted talents'}
          </p>
        </button>

        <button
          onClick={() => setActiveTab('league')}
          className="bg-slate-900 p-4 rounded-2xl border border-slate-800 hover:border-purple-500/50 text-left sm:text-right space-y-1 transition-all group"
        >
          <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center text-lg mb-2 group-hover:scale-110 transition-transform">
            🏆
          </div>
          <h4 className="font-heading font-black text-sm text-white">
            {isAr ? 'جدول ترتيب الدوري' : 'League Standings'}
          </h4>
          <p className="text-xs text-slate-400">
            {isAr ? 'المركز الثاني (10 نقاط)' : '2nd place (10 pts)'}
          </p>
        </button>
      </div>

    </div>
  );
};