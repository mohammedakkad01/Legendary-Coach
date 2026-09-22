/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Official Missions System:
 * 1. Daily Missions (يومية)
 * 2. Weekly Missions (أسبوعية)
 * 3. Achievements (إنجازات تراكمية)
 * 
 * All missions reward generous Diamonds (الجواهر) so players can upgrade VIP to level 20 purely through gameplay!
 */

import { DailyMission } from '../types/game';

export const INITIAL_DAILY_MISSIONS: DailyMission[] = [
  // ─── DAILY MISSIONS (مهام يومية) ───
  {
    id: 'mission_login_daily',
    titleAr: 'تسجيل الدخول اليومي للمدرب',
    titleEn: 'Daily Coach Sign-In',
    descriptionAr: 'افتح النادي وتفقد الفريق اليوم لبدء يومك الرياضي.',
    descriptionEn: 'Log into your club and inspect your squad.',
    category: 'matches',
    periodicity: 'daily',
    target: 1,
    current: 1, // Ready to claim upon login
    isClaimed: false,
    rewardCoins: 3000,
    rewardDiamonds: 30,
    rewardTrainingPoints: 20,
    rewardVipPoints: 30,
    iconName: 'UserCheck'
  },
  {
    id: 'mission_play_matches',
    titleAr: 'قائد المباريات الرسمية',
    titleEn: 'Official Match Leader',
    descriptionAr: 'خض مباراتين رسميتين كاملتين في الدوري أو البطولة لاختبار تكتيكك.',
    descriptionEn: 'Play 2 full competitive matches to test your tactical setup.',
    category: 'matches',
    periodicity: 'daily',
    target: 2,
    current: 0,
    isClaimed: false,
    rewardCoins: 5000,
    rewardDiamonds: 50,
    rewardTrainingPoints: 30,
    rewardVipPoints: 40,
    iconName: 'Trophy'
  },
  {
    id: 'mission_score_goals',
    titleAr: 'القوة الهجومية الضاربة',
    titleEn: 'Devastating Strike Force',
    descriptionAr: 'سجل 3 أهداف في شباك المنافسين لإبراز فعالية المهاجمين.',
    descriptionEn: 'Score 3 goals against opponents to showcase attacking prowess.',
    category: 'goals',
    periodicity: 'daily',
    target: 3,
    current: 0,
    isClaimed: false,
    rewardCoins: 4500,
    rewardDiamonds: 40,
    rewardTrainingPoints: 40,
    rewardVipPoints: 35,
    iconName: 'Target'
  },
  {
    id: 'mission_clean_sheet',
    titleAr: 'الحصن الدفاعي المنيع',
    titleEn: 'Impenetrable Defense',
    descriptionAr: 'حافظ على نظافة الشباك دون استقبال أهداف في مباراة رسمية واحدة.',
    descriptionEn: 'Keep a clean sheet with 0 goals conceded in 1 competitive match.',
    category: 'defense',
    periodicity: 'daily',
    target: 1,
    current: 0,
    isClaimed: false,
    rewardCoins: 6000,
    rewardDiamonds: 60,
    rewardTrainingPoints: 50,
    rewardVipPoints: 50,
    iconName: 'Shield'
  },
  {
    id: 'mission_manage_fatigue',
    titleAr: 'الاستشفاء والجاهزية البدنية',
    titleEn: 'Squad Recovery & Wellness',
    descriptionAr: 'قم بإجراء جلسة استشفاء بدني وتدليك لحماية التشكيلة من الإجهاد والإصابات.',
    descriptionEn: 'Run a squad recovery session to relieve fatigue and avoid injuries.',
    category: 'fatigue',
    periodicity: 'daily',
    target: 1,
    current: 0,
    isClaimed: false,
    rewardCoins: 3000,
    rewardDiamonds: 35,
    rewardTrainingPoints: 25,
    rewardVipPoints: 30,
    iconName: 'Activity'
  },
  {
    id: 'mission_tactical_duel',
    titleAr: 'سيد صانع المعارك المتزامن',
    titleEn: 'Tactical Clash Champion',
    descriptionAr: 'خض مواجهة تكتيكية بنظام الكشف المتزامن (هجوم، دفاع، التفاف) وحقق الانتصار.',
    descriptionEn: 'Compete in a simultaneous reveal tactical duel and claim victory.',
    category: 'matches',
    periodicity: 'daily',
    target: 1,
    current: 0,
    isClaimed: false,
    rewardCoins: 7000,
    rewardDiamonds: 80,
    rewardTrainingPoints: 60,
    rewardVipPoints: 60,
    iconName: 'Swords'
  },
  {
    id: 'mission_train_squad',
    titleAr: 'تطوير وصقل المهارات',
    titleEn: 'Drill & Development',
    descriptionAr: 'نفذ تدريباً تكتيكياً أو بدنياً واحداً لرفع لياقة وإتقان اللاعبين.',
    descriptionEn: 'Run 1 training drill session to sharpen player skills.',
    category: 'training',
    periodicity: 'daily',
    target: 1,
    current: 0,
    isClaimed: false,
    rewardCoins: 3500,
    rewardDiamonds: 30,
    rewardTrainingPoints: 35,
    rewardVipPoints: 30,
    iconName: 'Zap'
  },

  // ─── WEEKLY MISSIONS (مهام أسبوعية) ───
  {
    id: 'weekly_win_matches',
    titleAr: 'سلسلة انتصارات الأسبوع (5 انتصارات)',
    titleEn: 'Weekly 5 Victories',
    descriptionAr: 'حقق 5 انتصارات في مباريات الدوري أو الكأس لإثبات الهيمنة التكتيكية.',
    descriptionEn: 'Claim 5 victories in league or cup fixtures this week.',
    category: 'matches',
    periodicity: 'weekly',
    target: 5,
    current: 0,
    isClaimed: false,
    rewardCoins: 25000,
    rewardDiamonds: 250,
    rewardTrainingPoints: 200,
    rewardVipPoints: 180,
    iconName: 'Trophy'
  },
  {
    id: 'weekly_upgrade_player',
    titleAr: 'صناعة النجوم (ترقية قدرات لاعب)',
    titleEn: 'Star Maker (Player Upgrade)',
    descriptionAr: 'أنجز 3 حصص تدريب مكثفة لتطوير وإتقان طاقات لاعبيك الأساسيين.',
    descriptionEn: 'Run 3 high-intensity training sessions to upgrade player ratings.',
    category: 'training',
    periodicity: 'weekly',
    target: 3,
    current: 0,
    isClaimed: false,
    rewardCoins: 20000,
    rewardDiamonds: 180,
    rewardTrainingPoints: 180,
    rewardVipPoints: 150,
    iconName: 'Sparkles'
  },
  {
    id: 'weekly_transfer_deal',
    titleAr: 'صفقة الانتقالات الأسبوعية',
    titleEn: 'Weekly Transfer Market Deal',
    descriptionAr: 'أتمم صفقة شراء أو استقطاب لاعب من الكشافة أو سوق الانتقالات.',
    descriptionEn: 'Complete a scout signing or transfer market contract deal.',
    category: 'scouting',
    periodicity: 'weekly',
    target: 1,
    current: 0,
    isClaimed: false,
    rewardCoins: 30000,
    rewardDiamonds: 220,
    rewardTrainingPoints: 150,
    rewardVipPoints: 200,
    iconName: 'ArrowLeftRight'
  },

  // ─── ACHIEVEMENTS (إنجازات دائمة) ───
  {
    id: 'achieve_win_streak_5',
    titleAr: 'إنجاز: سلسلة انتصارات خرافية (Win Streak)',
    titleEn: 'Achievement: 5-Match Win Streak',
    descriptionAr: 'حافظ على سجل انتصارات متتالية لخمس مباريات دون هزيمة.',
    descriptionEn: 'Maintain an unbeaten 5-match winning streak across all tournaments.',
    category: 'matches',
    periodicity: 'achievement',
    target: 5,
    current: 0,
    isClaimed: false,
    rewardCoins: 60000,
    rewardDiamonds: 500,
    rewardTrainingPoints: 400,
    rewardVipPoints: 400,
    iconName: 'Flame'
  },
  {
    id: 'achieve_club_reputation_1000',
    titleAr: 'إنجاز: هيبة النادي العظيمة (سمعة 1000+)',
    titleEn: 'Achievement: Prestigious Club',
    descriptionAr: 'ارفع سمعة ناديك وبريقه إلى أكثر من 1,000 نقطة لتجذب كبار النجوم.',
    descriptionEn: 'Reach 1,000+ club prestige reputation through victories and facilities.',
    category: 'matches',
    periodicity: 'achievement',
    target: 1000,
    current: 350,
    isClaimed: false,
    rewardCoins: 80000,
    rewardDiamonds: 600,
    rewardTrainingPoints: 500,
    rewardVipPoints: 500,
    iconName: 'Crown'
  },
  {
    id: 'achieve_reach_vip_5',
    titleAr: 'إنجاز: بلوغ رتبة VIP 5 الاحترافية',
    titleEn: 'Achievement: Reach VIP 5 Status',
    descriptionAr: 'ارتقِ برتبة VIP إلى المستوى الخامس لفتح امتيازات المدرب المحترف.',
    descriptionEn: 'Reach VIP Level 5 to unlock professional coaching bonuses.',
    category: 'matches',
    periodicity: 'achievement',
    target: 5,
    current: 1,
    isClaimed: false,
    rewardCoins: 100000,
    rewardDiamonds: 800,
    rewardTrainingPoints: 600,
    rewardVipPoints: 600,
    iconName: 'Award'
  }
];
