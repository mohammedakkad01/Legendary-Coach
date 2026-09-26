/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * VIP System (20 Full Levels) — Pure Gameplay & Gem Progression
 * Includes:
 * 1. Attack boost (+1% to +10%)
 * 2. Defense boost (+1% to +10%)
 * 3. Loss mitigation / penalty reduction (2% to 30%)
 * 4. Upgrade Chest (one-time on reaching tier) & Daily Tier Chest
 * 5. Can be upgraded with Gems/Diamonds (earned from daily/weekly/story missions) or earned via VIP XP.
 */

import { VIPPrivilege } from '../types/game';

export const VIP_LEVELS: VIPPrivilege[] = [
  // ─── TIER 1 - 5 (البداية) ───
  {
    level: 1,
    maxAcademySlots: 1,
    maxActiveNegotiations: 1,
    maxBenchSlots: 5,
    pointsRequired: 0,
    diamondsCostToUpgrade: 1,
    nameAr: 'مدرب مبتدئ (VIP 1)',
    nameEn: 'Novice Coach (VIP 1)',
    incomeBonusPercent: 3,
    trainingSpeedPercent: 2,
    attackBoostPercent: 1.0,
    defenseBoostPercent: 1.0,
    lossMitigationPercent: 2.0,
    bonusesAr: [
      '⚔️ قوة الهجوم: +1% في المباريات',
      '🛡️ قوة الدفاع: +1% في المباريات',
      '🛡️ تقليل خسارة المكافآت والنقاط عند الهزيمة بنسبة 2%',
      '+3% دخل مالي إضافي من المباريات',
      'إطار وشارة VIP برونزية أولية',
      'صندوق VIP اليومي الأساسي'
    ],
    bonusesEn: [
      '⚔️ Attack Power: +1% in matches',
      '🛡️ Defense Power: +1% in matches',
      '🛡️ 2% match loss penalty reduction',
      '+3% matchday financial revenue bonus',
      'Bronze VIP badge & coach border',
      'Daily basic VIP chest'
    ],
    upgradeChestReward: {
      coins: 10000,
      trainingPoints: 30,
      specialDescriptionAr: 'عملات ترحيبية + كروت تدريب أولية',
      specialDescriptionEn: 'Welcome coins + starter training drills',
    },
    dailyChestReward: {
      coins: 5000,
      trainingPoints: 15,
      diamonds: 5,
    }
  },
  {
    level: 2,
    recoverySpeedBonusPercent: 4,
    maxAcademySlots: 1,
    maxActiveNegotiations: 1,
    maxBenchSlots: 5,
    pointsRequired: 150,
    diamondsCostToUpgrade: 5,
    nameAr: 'مدرب واعد (VIP 2)',
    nameEn: 'Promising Coach (VIP 2)',
    incomeBonusPercent: 5,
    trainingSpeedPercent: 4,
    attackBoostPercent: 1.5,
    defenseBoostPercent: 1.5,
    lossMitigationPercent: 3.0,
    bonusesAr: [
      '⚔️ قوة الهجوم: +1.5%',
      '🛡️ قوة الدفاع: +1.5%',
      '🛡️ تقليل خسارة النقاط عند الهزيمة بنسبة 3%',
      'فتح تشكيل تكتيكي متقدم: 4-1-4-1',
      '+5% دخل مالي من التذاكر ومبيعات المتجر',
      'تسريع تمارين الاستشفاء البدني بنسبة 4%'
    ],
    bonusesEn: [
      '⚔️ Attack Power: +1.5%',
      '🛡️ Defense Power: +1.5%',
      '🛡️ 3% match loss penalty reduction',
      'Unlock Advanced Formation: 4-1-4-1',
      '+5% ticket & merchandise income',
      '4% faster player recovery drills'
    ],
    upgradeChestReward: {
      coins: 20000,
      trainingPoints: 50,
      specialDescriptionAr: '20,000 كوينز + 50 نقطة تدريب + حزمة كروت لياقة',
      specialDescriptionEn: '20k Coins + 50 Training Pts + Stamina cards',
    },
    dailyChestReward: {
      coins: 8000,
      trainingPoints: 25,
      diamonds: 8,
    }
  },
  {
    level: 3,
    recoverySpeedBonusPercent: 4,
    maxAcademySlots: 1,
    maxActiveNegotiations: 1,
    maxBenchSlots: 6,
    pointsRequired: 400,
    diamondsCostToUpgrade: 10,
    nameAr: 'مدرب طموح (VIP 3)',
    nameEn: 'Ambitious Coach (VIP 3)',
    incomeBonusPercent: 7,
    trainingSpeedPercent: 6,
    attackBoostPercent: 2.0,
    defenseBoostPercent: 2.0,
    lossMitigationPercent: 4.0,
    bonusesAr: [
      '⚔️ قوة الهجوم: +2.0%',
      '🛡️ قوة الدفاع: +2.0%',
      '🛡️ تقليل خسارة النقاط والعملات بنسبة 4%',
      'فتح تشكيل تكتيكي هجومي: 3-4-3',
      '+7% دخل مالي إضافي من الرعاة',
      'خانة إضافية مخصصة في دكة البدلاء'
    ],
    bonusesEn: [
      '⚔️ Attack Power: +2.0%',
      '🛡️ Defense Power: +2.0%',
      '🛡️ 4% loss penalty mitigation',
      'Unlock Offensive Formation: 3-4-3',
      '+7% sponsor match bonus',
      'Extra tactical bench flexibility'
    ],
    upgradeChestReward: {
      coins: 35000,
      trainingPoints: 80,
      diamonds: 20,
      specialDescriptionAr: '35,000 كوينز + 20 جوهرة + كروت تدريب تكتيكي',
      specialDescriptionEn: '35k Coins + 20 Gems + Tactical drill cards',
    },
    dailyChestReward: {
      coins: 12000,
      trainingPoints: 35,
      diamonds: 10,
    }
  },
  {
    level: 4,
    recoverySpeedBonusPercent: 4,
    maxAcademySlots: 1,
    maxActiveNegotiations: 1,
    maxBenchSlots: 6,
    pointsRequired: 800,
    diamondsCostToUpgrade: 50,
    nameAr: 'مدرب تكتيكي (VIP 4)',
    nameEn: 'Tactical Coach (VIP 4)',
    incomeBonusPercent: 9,
    trainingSpeedPercent: 8,
    attackBoostPercent: 2.5,
    defenseBoostPercent: 2.5,
    lossMitigationPercent: 5.0,
    bonusesAr: [
      '⚔️ قوة الهجوم: +2.5%',
      '🛡️ قوة الدفاع: +2.5%',
      '🛡️ تقليل خسارة الترتيب والعملات بنسبة 5%',
      '+9% مكافآت الانتصارات في الدوري',
      'إطار فضي مصقول للمدرب والشعار'
    ],
    bonusesEn: [
      '⚔️ Attack Power: +2.5%',
      '🛡️ Defense Power: +2.5%',
      '🛡️ 5% loss mitigation',
      '+9% league victory bonus',
      'Silver coach & badge border'
    ],
    upgradeChestReward: {
      coins: 50000,
      trainingPoints: 120,
      diamonds: 30,
      specialDescriptionAr: '50,000 كوينز + 30 جوهرة + بطاقات لياقة مكثفة',
      specialDescriptionEn: '50k Coins + 30 Gems + High-grade fitness pack',
    },
    dailyChestReward: {
      coins: 16000,
      trainingPoints: 45,
      diamonds: 15,
    }
  },
  {
    level: 5,
    recoverySpeedBonusPercent: 4,
    maxAcademySlots: 1,
    maxActiveNegotiations: 1,
    maxBenchSlots: 6,
    pointsRequired: 1500,
    diamondsCostToUpgrade: 100,
    nameAr: 'مدرب محترف (VIP 5)',
    nameEn: 'Professional Coach (VIP 5)',
    incomeBonusPercent: 12,
    trainingSpeedPercent: 10,
    attackBoostPercent: 3.0,
    defenseBoostPercent: 3.0,
    lossMitigationPercent: 6.0,
    bonusesAr: [
      '⚔️ قوة الهجوم: +3.0%',
      '🛡️ قوة الدفاع: +3.0%',
      '🛡️ تقليل خسارة النقاط عند الهزيمة بنسبة 6%',
      '+12% دخل شامل للنادي والمرافق',
      'خصم 10% على رواتب الطاقم الفني',
      'كارت مدرب ذهبي وصندوق ترقية مميز'
    ],
    bonusesEn: [
      '⚔️ Attack Power: +3.0%',
      '🛡️ Defense Power: +3.0%',
      '🛡️ 6% loss penalty mitigation',
      '+12% overall club revenue',
      '10% staff salary discount',
      'Golden Coach card & Milestone chest'
    ],
    upgradeChestReward: {
      coins: 80000,
      trainingPoints: 180,
      diamonds: 50,
      specialDescriptionAr: '80,000 كوينز + 50 جوهرة + كارت لاعب نادر من الكشاف',
      specialDescriptionEn: '80k Coins + 50 Gems + Rare Scout Player Card',
    },
    dailyChestReward: {
      coins: 22000,
      trainingPoints: 60,
      diamonds: 20,
    }
  },

  // ─── TIER 6 - 10 (التطور والنمو) ───
  {
    level: 6,
    recoverySpeedBonusPercent: 4,
    maxAcademySlots: 1,
    maxActiveNegotiations: 2,
    maxBenchSlots: 6,
    pointsRequired: 2500,
    diamondsCostToUpgrade: 200,
    nameAr: 'مدرب خبير (VIP 6)',
    nameEn: 'Expert Coach (VIP 6)',
    incomeBonusPercent: 15,
    trainingSpeedPercent: 12,
    attackBoostPercent: 3.5,
    defenseBoostPercent: 3.5,
    lossMitigationPercent: 8.0,
    bonusesAr: [
      '⚔️ قوة الهجوم: +3.5%',
      '🛡️ قوة الدفاع: +3.5%',
      '🛡️ تقليل خسارة النقاط بنسبة 8%',
      '+15% خبرة إضافية للاعبين من المباريات',
      'تسريع تعافي اللاعبين من الإصابات والإجهاد بنسبة 12%',
      'خانة إضافية في قائمة تفاوض سوق الانتقالات'
    ],
    bonusesEn: [
      '⚔️ Attack Power: +3.5%',
      '🛡️ Defense Power: +3.5%',
      '🛡️ 8% loss mitigation',
      '+15% match player XP',
      '12% faster injury recovery',
      'Extra transfer negotiation slot'
    ],
    upgradeChestReward: {
      coins: 120000,
      trainingPoints: 240,
      diamonds: 60,
      specialDescriptionAr: '120k كوينز + أدوات ترقية المنشآت + كروت لاعبين',
      specialDescriptionEn: '120k Coins + Facility upgrade tools + Player cards',
    },
    dailyChestReward: {
      coins: 28000,
      trainingPoints: 75,
      diamonds: 25,
    }
  },
  {
    level: 7,
    recoverySpeedBonusPercent: 4,
    maxAcademySlots: 1,
    maxActiveNegotiations: 2,
    maxBenchSlots: 6,
    pointsRequired: 4000,
    diamondsCostToUpgrade: 500,
    nameAr: 'مخطط تكتيكي بارع (VIP 7)',
    nameEn: 'Master Strategist (VIP 7)',
    incomeBonusPercent: 18,
    trainingSpeedPercent: 15,
    attackBoostPercent: 4.0,
    defenseBoostPercent: 4.0,
    lossMitigationPercent: 10.0,
    bonusesAr: [
      '⚔️ قوة الهجوم: +4.0%',
      '🛡️ قوة الدفاع: +4.0%',
      '🛡️ تقليل خسارة النقاط بنسبة 10%',
      'فتح رادار التحليل التكتيكي المتقدم للخصوم والأهداف المتوقعة xG',
      'مهمة يومية إضافية تمنح جواهر مجانية'
    ],
    bonusesEn: [
      '⚔️ Attack Power: +4.0%',
      '🛡️ Defense Power: +4.0%',
      '🛡️ 10% loss penalty mitigation',
      'Advanced xG & Rival analytical radar unlocked',
      'Bonus daily quest offering extra diamonds'
    ],
    upgradeChestReward: {
      coins: 160000,
      trainingPoints: 300,
      diamonds: 80,
      specialDescriptionAr: '160k كوينز + 80 جوهرة + أدوات تدريب النخبة',
      specialDescriptionEn: '160k Coins + 80 Gems + Elite drill materials',
    },
    dailyChestReward: {
      coins: 35000,
      trainingPoints: 90,
      diamonds: 30,
    }
  },
  {
    level: 8,
    recoverySpeedBonusPercent: 4,
    maxAcademySlots: 1,
    maxActiveNegotiations: 2,
    maxBenchSlots: 6,
    pointsRequired: 6500,
    diamondsCostToUpgrade: 1000,
    nameAr: 'المدرب الاستثنائي (VIP 8 - طابور التدريب الثاني)',
    nameEn: 'Exceptional Coach (VIP 8 Milestone)',
    incomeBonusPercent: 22,
    trainingSpeedPercent: 18,
    attackBoostPercent: 4.5,
    defenseBoostPercent: 4.5,
    lossMitigationPercent: 12.0,
    unlockedSecondTrainingQueue: true,
    bonusesAr: [
      '🔥 فتح طابور التطوير والتدريب الثاني الدائم (Queue 2)',
      '⚔️ قوة الهجوم: +4.5%',
      '🛡️ قوة الدفاع: +4.5%',
      '🛡️ تقليل خسارة النقاط بنسبة 12%',
      '+22% مكاسب مالية شاملة للنادي',
      'تسريع وقت التدريب بنسبة 18%'
    ],
    bonusesEn: [
      '🔥 Permanent 2nd Training Queue Unlocked!',
      '⚔️ Attack Power: +4.5%',
      '🛡️ Defense Power: +4.5%',
      '🛡️ 12% loss mitigation',
      '+22% club income boost',
      '18% training drill acceleration'
    ],
    upgradeChestReward: {
      coins: 220000,
      trainingPoints: 400,
      diamonds: 120,
      specialDescriptionAr: 'صندوق VIP 8 الذهبي: 220,000 كوينز + 120 جوهرة + كارت ذهبي',
      specialDescriptionEn: 'VIP 8 Golden Chest: 220k Coins + 120 Gems + Gold Card',
    },
    dailyChestReward: {
      coins: 45000,
      trainingPoints: 110,
      diamonds: 40,
    }
  },
  {
    level: 9,
    recoverySpeedBonusPercent: 4,
    maxAcademySlots: 1,
    maxActiveNegotiations: 2,
    maxBenchSlots: 6,
    pointsRequired: 9500,
    diamondsCostToUpgrade: 2000,
    nameAr: 'مدرب الصدارة (VIP 9)',
    nameEn: 'Apex Coach (VIP 9)',
    incomeBonusPercent: 25,
    trainingSpeedPercent: 20,
    attackBoostPercent: 5.0,
    defenseBoostPercent: 5.0,
    lossMitigationPercent: 14.0,
    bonusesAr: [
      '⚔️ قوة الهجوم: +5.0%',
      '🛡️ قوة الدفاع: +5.0%',
      '🛡️ تقليل خسارة النقاط بنسبة 14%',
      'إعفاء من 50% من ضرائب وعمولات سوق الانتقالات',
      'رفع سقف تراكم الدخل غير المتصل إلى 16 ساعة'
    ],
    bonusesEn: [
      '⚔️ Attack Power: +5.0%',
      '🛡️ Defense Power: +5.0%',
      '🛡️ 14% loss mitigation',
      '50% tax exemption on transfer auction market',
      '16-hour offline income cap'
    ],
    upgradeChestReward: {
      coins: 300000,
      trainingPoints: 500,
      diamonds: 150,
      specialDescriptionAr: '300,000 كوينز + 150 جوهرة + كروت كشافة فورية',
      specialDescriptionEn: '300k Coins + 150 Gems + Instant scouting cards',
    },
    dailyChestReward: {
      coins: 55000,
      trainingPoints: 130,
      diamonds: 50,
    }
  },
  {
    level: 10,
    recoverySpeedBonusPercent: 4,
    maxAcademySlots: 1,
    maxActiveNegotiations: 2,
    maxBenchSlots: 6,
    pointsRequired: 14000,
    diamondsCostToUpgrade: 5000,
    nameAr: 'صانع المجد (VIP 10)',
    nameEn: 'Glory Maker (VIP 10)',
    incomeBonusPercent: 28,
    trainingSpeedPercent: 24,
    attackBoostPercent: 5.5,
    defenseBoostPercent: 5.5,
    lossMitigationPercent: 16.0,
    unlockedSpeed4x: true,
    hasOneClickMissionSkip: true,
    bonusesAr: [
      '⚡ فتح السرعة الفائقة 4x في المباريات مجاناً ودائماً!',
      '⚔️ قوة الهجوم: +5.5%',
      '🛡️ قوة الدفاع: +5.5%',
      '🛡️ تقليل خسارة النقاط بنسبة 16%',
      'إمكانية إكمال وتخطي مهمة يومية مجاناً بنقرة واحدة',
      'إطار ذهبي متوهج لشعار النادي والمدرب'
    ],
    bonusesEn: [
      '⚡ Permanently unlock 4x Ultra Match Speed for free!',
      '⚔️ Attack Power: +5.5%',
      '🛡️ Defense Power: +5.5%',
      '🛡️ 16% loss mitigation',
      'One-click instant auto-complete for 1 daily mission',
      'Glowing golden club & avatar frame'
    ],
    upgradeChestReward: {
      coins: 400000,
      trainingPoints: 650,
      diamonds: 200,
      specialDescriptionAr: '400k كوينز + 200 جوهرة + كارت لاعب أسطوري محلي',
      specialDescriptionEn: '400k Coins + 200 Gems + Domestic Star Card',
    },
    dailyChestReward: {
      coins: 70000,
      trainingPoints: 160,
      diamonds: 60,
    }
  },

  // ─── TIER 11 - 15 (المحترفون والأبطال) ───
  {
    level: 11,
    transferDiscountPercent: 15,
    recoverySpeedBonusPercent: 4,
    maxAcademySlots: 1,
    maxActiveNegotiations: 2,
    maxBenchSlots: 6,
    hasOneClickMissionSkip: true,
    pointsRequired: 20000,
    diamondsCostToUpgrade: 6500,
    nameAr: 'مدرب البطولات (VIP 11)',
    nameEn: 'Champion Coach (VIP 11)',
    incomeBonusPercent: 32,
    trainingSpeedPercent: 27,
    attackBoostPercent: 6.0,
    defenseBoostPercent: 6.0,
    lossMitigationPercent: 18.0,
    bonusesAr: [
      '⚔️ قوة الهجوم: +6.0%',
      '🛡️ قوة الدفاع: +6.0%',
      '🛡️ تقليل خسارة النقاط بنسبة 18%',
      'خصم 15% على أسعار سوق الانتقالات وعقود اللاعبين',
      'زيادة سعة الملعب +2000 مشجع مجاناً'
    ],
    bonusesEn: [
      '⚔️ Attack Power: +6.0%',
      '🛡️ Defense Power: +6.0%',
      '🛡️ 18% loss mitigation',
      '15% discount on transfer fees & contracts',
      '+2,000 free permanent stadium capacity'
    ],
    upgradeChestReward: {
      coins: 550000,
      trainingPoints: 800,
      diamonds: 250,
      specialDescriptionAr: '550k كوينز + 250 جوهرة + كروت تطوير أكاديمية نادرة',
      specialDescriptionEn: '550k Coins + 250 Gems + Rare Academy Booster',
    },
    dailyChestReward: {
      coins: 90000,
      trainingPoints: 190,
      diamonds: 75,
    }
  },
  {
    level: 12,
    transferDiscountPercent: 15,
    recoverySpeedBonusPercent: 4,
    maxAcademySlots: 1,
    maxActiveNegotiations: 2,
    maxBenchSlots: 6,
    hasOneClickMissionSkip: true,
    pointsRequired: 28000,
    diamondsCostToUpgrade: 8000,
    nameAr: 'الداهية التكتيكي (VIP 12)',
    nameEn: 'Tactical Mastermind (VIP 12)',
    incomeBonusPercent: 35,
    trainingSpeedPercent: 30,
    attackBoostPercent: 6.5,
    defenseBoostPercent: 6.5,
    lossMitigationPercent: 20.0,
    maxSavedTacticalPlans: 5,
    bonusesAr: [
      '⚔️ قوة الهجوم: +6.5%',
      '🛡️ قوة الدفاع: +6.5%',
      '🛡️ تقليل خسارة النقاط بنسبة 20%',
      'إمكانية حفظ 5 خطط وتكتيكات لعب مختلفة والتبديل السريع بينها',
      'مكافأة الفوز في مباريات الديربي والقمة +50%'
    ],
    bonusesEn: [
      '⚔️ Attack Power: +6.5%',
      '🛡️ Defense Power: +6.5%',
      '🛡️ 20% loss mitigation',
      'Save up to 5 tactical presets with instant quick-swap',
      '+50% derby match win bonus'
    ],
    upgradeChestReward: {
      coins: 700000,
      trainingPoints: 1000,
      diamonds: 300,
      specialDescriptionAr: '700k كوينز + 300 جوهرة + كارت لاعب دولي نادر',
      specialDescriptionEn: '700k Coins + 300 Gems + International Rare Card',
    },
    dailyChestReward: {
      coins: 110000,
      trainingPoints: 230,
      diamonds: 90,
    }
  },
  {
    level: 13,
    transferDiscountPercent: 15,
    recoverySpeedBonusPercent: 4,
    maxAcademySlots: 2,
    maxActiveNegotiations: 2,
    maxBenchSlots: 6,
    maxSavedTacticalPlans: 5,
    hasOneClickMissionSkip: true,
    pointsRequired: 38000,
    diamondsCostToUpgrade: 10500,
    nameAr: 'سيد الملاعب (VIP 13)',
    nameEn: 'Stadium Overlord (VIP 13)',
    incomeBonusPercent: 38,
    trainingSpeedPercent: 33,
    attackBoostPercent: 7.0,
    defenseBoostPercent: 7.0,
    lossMitigationPercent: 22.0,
    bonusesAr: [
      '⚔️ قوة الهجوم: +7.0%',
      '🛡️ قوة الدفاع: +7.0%',
      '🛡️ تقليل خسارة النقاط بنسبة 22%',
      'خانة إضافية في أكاديمية الشباب لاكتشاف مواهب 5 نجوم',
      '+38% حقوق البث التلفزيوني والإعلاني'
    ],
    bonusesEn: [
      '⚔️ Attack Power: +7.0%',
      '🛡️ Defense Power: +7.0%',
      '🛡️ 22% loss mitigation',
      'Extra Academy Scout Slot for 5-star prodigies',
      '+38% TV broadcasting & sponsorship revenue'
    ],
    upgradeChestReward: {
      coins: 900000,
      trainingPoints: 1300,
      diamonds: 400,
      specialDescriptionAr: '900k كوينز + 400 جوهرة + أدوات ترقية أكاديمية قصوى',
      specialDescriptionEn: '900k Coins + 400 Gems + Max Academy tools',
    },
    dailyChestReward: {
      coins: 140000,
      trainingPoints: 280,
      diamonds: 110,
    }
  },
  {
    level: 14,
    transferDiscountPercent: 15,
    fatigueProtectionPercent: 25,
    recoverySpeedBonusPercent: 4,
    maxAcademySlots: 2,
    maxActiveNegotiations: 2,
    maxBenchSlots: 6,
    maxSavedTacticalPlans: 5,
    hasOneClickMissionSkip: true,
    pointsRequired: 50000,
    diamondsCostToUpgrade: 13000,
    nameAr: 'الرمز الخالد (VIP 14)',
    nameEn: 'Living Icon (VIP 14)',
    incomeBonusPercent: 42,
    trainingSpeedPercent: 36,
    attackBoostPercent: 7.5,
    defenseBoostPercent: 7.5,
    lossMitigationPercent: 24.0,
    bonusesAr: [
      '⚔️ قوة الهجوم: +7.5%',
      '🛡️ قوة الدفاع: +7.5%',
      '🛡️ تقليل خسارة النقاط بنسبة 24%',
      'حماية اللاعبين من تدهور اللياقة والإجهاد بنسبة 25%',
      'لقب "المدرب الرمز" المضاء في قائمة المتصدرين'
    ],
    bonusesEn: [
      '⚔️ Attack Power: +7.5%',
      '🛡️ Defense Power: +7.5%',
      '🛡️ 24% loss mitigation',
      '25% fatigue & stamina drop resistance',
      'Illuminated "Living Icon" badge on leaderboard'
    ],
    upgradeChestReward: {
      coins: 1200000,
      trainingPoints: 1600,
      diamonds: 500,
      specialDescriptionAr: '1,200,000 كوينز + 500 جوهرة + باقة استشفاء أسطورية',
      specialDescriptionEn: '1.2M Coins + 500 Gems + Mythic Recovery Pack',
    },
    dailyChestReward: {
      coins: 180000,
      trainingPoints: 340,
      diamonds: 130,
    }
  },
  {
    level: 15,
    transferDiscountPercent: 15,
    loginBonusMultiplier: 2.5,
    fatigueProtectionPercent: 25,
    recoverySpeedBonusPercent: 4,
    maxAcademySlots: 2,
    maxActiveNegotiations: 2,
    maxBenchSlots: 6,
    maxSavedTacticalPlans: 5,
    hasOneClickMissionSkip: true,
    pointsRequired: 65000,
    diamondsCostToUpgrade: 16500,
    nameAr: 'القائد المظفر (VIP 15)',
    nameEn: 'Triumphant Commander (VIP 15)',
    incomeBonusPercent: 45,
    trainingSpeedPercent: 40,
    attackBoostPercent: 8.0,
    defenseBoostPercent: 8.0,
    lossMitigationPercent: 25.0,
    bonusesAr: [
      '⚔️ قوة الهجوم: +8.0%',
      '🛡️ قوة الدفاع: +8.0%',
      '🛡️ تقليل خسارة النقاط بنسبة 25%',
      '+45% دخل شامل للرياضات المتعددة (قدم + سلة)',
      'مضاعفة مكافأة تسجيل الدخول اليومي بنسبة 2.5x'
    ],
    bonusesEn: [
      '⚔️ Attack Power: +8.0%',
      '🛡️ Defense Power: +8.0%',
      '🛡️ 25% loss mitigation',
      '+45% all-sports revenue boost',
      '2.5x daily check-in streak reward multiplier'
    ],
    upgradeChestReward: {
      coins: 1600000,
      trainingPoints: 2000,
      diamonds: 650,
      specialDescriptionAr: '1.6M كوينز + 650 جوهرة + كارت لاعب أسطورة عالمي',
      specialDescriptionEn: '1.6M Coins + 650 Gems + Global Icon Card',
    },
    dailyChestReward: {
      coins: 220000,
      trainingPoints: 400,
      diamonds: 160,
    }
  },

  // ─── TIER 16 - 20 (النخبة المطلقة — The Elite Zenith) ───
  {
    level: 16,
    hasFullInstantSimRewards: true,
    transferDiscountPercent: 15,
    loginBonusMultiplier: 2.5,
    fatigueProtectionPercent: 25,
    recoverySpeedBonusPercent: 4,
    maxAcademySlots: 2,
    maxActiveNegotiations: 2,
    maxBenchSlots: 6,
    maxSavedTacticalPlans: 5,
    hasOneClickMissionSkip: true,
    pointsRequired: 85000,
    diamondsCostToUpgrade: 20500,
    nameAr: 'أسطورة التدريب الذهبي (VIP 16)',
    nameEn: 'Golden Legend (VIP 16)',
    incomeBonusPercent: 48,
    trainingSpeedPercent: 43,
    attackBoostPercent: 8.5,
    defenseBoostPercent: 8.5,
    lossMitigationPercent: 26.0,
    hasDailyExclusiveChest: true,
    bonusesAr: [
      '⚔️ قوة الهجوم: +8.5%',
      '🛡️ قوة الدفاع: +8.5%',
      '🛡️ تقليل خسارة النقاط بنسبة 26%',
      '✨ صندوق يومي حصري مجاني لنخبة VIP',
      'محاكاة فورية فائقة السرعة مع الاحتفاظ بكامل مكافآت الإحصائيات'
    ],
    bonusesEn: [
      '⚔️ Attack Power: +8.5%',
      '🛡️ Defense Power: +8.5%',
      '🛡️ 26% loss mitigation',
      '✨ Daily Exclusive VIP Elite Free Chest',
      'Ultra fast-simulation with 100% full stats preservation'
    ],
    upgradeChestReward: {
      coins: 2200000,
      trainingPoints: 2500,
      diamonds: 800,
      specialDescriptionAr: '2.2M كوينز + 800 جوهرة + صندوق النخبة الحصري',
      specialDescriptionEn: '2.2M Coins + 800 Gems + Elite Exclusive Chest',
    },
    dailyChestReward: {
      coins: 280000,
      trainingPoints: 480,
      diamonds: 200,
    }
  },
  {
    level: 17,
    hasFullInstantSimRewards: true,
    transferDiscountPercent: 15,
    loginBonusMultiplier: 2.5,
    fatigueProtectionPercent: 25,
    recoverySpeedBonusPercent: 4,
    maxAcademySlots: 2,
    maxActiveNegotiations: 2,
    maxBenchSlots: 6,
    maxSavedTacticalPlans: 5,
    hasOneClickMissionSkip: true,
    pointsRequired: 110000,
    diamondsCostToUpgrade: 25000,
    nameAr: 'العقل المدبر الخارق (VIP 17)',
    nameEn: 'Supreme Mastermind (VIP 17)',
    incomeBonusPercent: 52,
    trainingSpeedPercent: 46,
    attackBoostPercent: 9.0,
    defenseBoostPercent: 9.0,
    lossMitigationPercent: 27.0,
    hasDailyExclusiveChest: true,
    hasFreeSkipWaitTimes: true,
    bonusesAr: [
      '⚔️ قوة الهجوم: +9.0%',
      '🛡️ قوة الدفاع: +9.0%',
      '🛡️ تقليل خسارة النقاط بنسبة 27%',
      'تخطي كامل لأوقات الانتظار في فترات استشفاء وتطوير المرافق',
      'أولوية مطلقة في الفعاليات والتحديات الأسبوعية'
    ],
    bonusesEn: [
      '⚔️ Attack Power: +9.0%',
      '🛡️ Defense Power: +9.0%',
      '🛡️ 27% loss mitigation',
      'Instant skip for facility development waiting times',
      'Priority access to weekly tournament events'
    ],
    upgradeChestReward: {
      coins: 3000000,
      trainingPoints: 3200,
      diamonds: 1000,
      specialDescriptionAr: '3M كوينز + 1000 جوهرة + كارت لاعب سوبر ستار 90+',
      specialDescriptionEn: '3M Coins + 1000 Gems + 90+ Superstar Player Card',
    },
    dailyChestReward: {
      coins: 350000,
      trainingPoints: 560,
      diamonds: 250,
    }
  },
  {
    level: 18,
    hasFullInstantSimRewards: true,
    transferDiscountPercent: 15,
    loginBonusMultiplier: 2.5,
    fatigueProtectionPercent: 25,
    recoverySpeedBonusPercent: 4,
    maxAcademySlots: 2,
    maxActiveNegotiations: 2,
    maxBenchSlots: 6,
    hasFreeSkipWaitTimes: true,
    maxSavedTacticalPlans: 5,
    hasOneClickMissionSkip: true,
    pointsRequired: 140000,
    diamondsCostToUpgrade: 31000,
    nameAr: 'إمبراطور التكتيك (VIP 18)',
    nameEn: 'Tactical Emperor (VIP 18)',
    incomeBonusPercent: 56,
    trainingSpeedPercent: 50,
    attackBoostPercent: 9.3,
    defenseBoostPercent: 9.3,
    lossMitigationPercent: 28.0,
    hasDailyExclusiveChest: true,
    bonusesAr: [
      '⚔️ قوة الهجوم: +9.3%',
      '🛡️ قوة الدفاع: +9.3%',
      '🛡️ تقليل خسارة النقاط بنسبة 28%',
      '+56% أعلى زيادة في العملات والخبرة للمباريات',
      'هالة بصرية ذهبية وتأثيرات أسطورية للمدرب أثناء المباريات'
    ],
    bonusesEn: [
      '⚔️ Attack Power: +9.3%',
      '🛡️ Defense Power: +9.3%',
      '🛡️ 28% loss mitigation',
      '+56% top match coins & XP boost',
      'Golden coaching aura & visual match effects'
    ],
    upgradeChestReward: {
      coins: 4000000,
      trainingPoints: 4000,
      diamonds: 1300,
      specialDescriptionAr: '4M كوينز + 1300 جوهرة + بطاقات تعزيز القدرات القصوى',
      specialDescriptionEn: '4M Coins + 1300 Gems + Max Overdrive Booster Pack',
    },
    dailyChestReward: {
      coins: 430000,
      trainingPoints: 650,
      diamonds: 300,
    }
  },
  {
    level: 19,
    hasFullInstantSimRewards: true,
    transferDiscountPercent: 15,
    loginBonusMultiplier: 2.5,
    fatigueProtectionPercent: 25,
    recoverySpeedBonusPercent: 4,
    maxAcademySlots: 2,
    maxActiveNegotiations: 2,
    maxBenchSlots: 6,
    hasFreeSkipWaitTimes: true,
    maxSavedTacticalPlans: 5,
    hasOneClickMissionSkip: true,
    pointsRequired: 180000,
    diamondsCostToUpgrade: 39000,
    nameAr: 'العاهل الأسطوري (VIP 19)',
    nameEn: 'Mythic Sovereign (VIP 19)',
    incomeBonusPercent: 60,
    trainingSpeedPercent: 55,
    attackBoostPercent: 9.7,
    defenseBoostPercent: 9.7,
    lossMitigationPercent: 29.0,
    hasDailyExclusiveChest: true,
    bonusesAr: [
      '⚔️ قوة الهجوم: +9.7%',
      '🛡️ قوة الدفاع: +9.7%',
      '🛡️ تقليل خسارة النقاط بنسبة 29%',
      'إطار أسطوري وياقوتي فريد من نوعه',
      'صندوق جواهر نخبوي مضاعف يومياً'
    ],
    bonusesEn: [
      '⚔️ Attack Power: +9.7%',
      '🛡️ Defense Power: +9.7%',
      '🛡️ 29% loss mitigation',
      'Unique Mythic Ruby avatar frame',
      'Double daily diamonds elite chest'
    ],
    upgradeChestReward: {
      coins: 5500000,
      trainingPoints: 5000,
      diamonds: 1800,
      specialDescriptionAr: '5.5M كوينز + 1800 جوهرة + كارت أسطوري مع قدرة خاصة',
      specialDescriptionEn: '5.5M Coins + 1800 Gems + Mythic Player with Special Trait',
    },
    dailyChestReward: {
      coins: 520000,
      trainingPoints: 750,
      diamonds: 360,
    }
  },
  {
    level: 20,
    hasFullInstantSimRewards: true,
    transferDiscountPercent: 15,
    loginBonusMultiplier: 2.5,
    fatigueProtectionPercent: 25,
    recoverySpeedBonusPercent: 4,
    maxAcademySlots: 2,
    maxActiveNegotiations: 2,
    maxBenchSlots: 6,
    hasFreeSkipWaitTimes: true,
    maxSavedTacticalPlans: 5,
    hasOneClickMissionSkip: true,
    pointsRequired: 230000,
    diamondsCostToUpgrade: 48000,
    nameAr: 'المدرب الأسطورة الأعظم (VIP 20 - القمة المطلقة)',
    nameEn: 'The Ultimate Legendary Coach (VIP 20 Zenith)',
    incomeBonusPercent: 65,
    trainingSpeedPercent: 60,
    attackBoostPercent: 10.0,
    defenseBoostPercent: 10.0,
    lossMitigationPercent: 30.0,
    unlockedSecondTrainingQueue: true,
    unlockedSpecialBadge: true,
    hasDailyExclusiveChest: true,
    bonusesAr: [
      '👑 عرش التدريب الأسطوري الأبدي (VIP 20)',
      '⚔️ أقصى قوة هجوم: +10.0% في كافة المسابقات',
      '🛡️ أقصى قوة دفاع: +10.0% في كافة المسابقات',
      '🛡️ أقصى حماية من الخسارة: تقليل العقوبة بنسبة 30% كاملة',
      '+65% دخل دائم لجميع الرياضات في النادي (قدم + سلة)',
      'تمثال المدرب الذهبي الدائم في النادي الرئيسي',
      'صندوق الأساطير اليومي المجاني مع جواهر وكروت نادرة'
    ],
    bonusesEn: [
      '👑 The Eternal Legendary Coaching Throne (VIP 20)',
      '⚔️ Maximum Attack Power: +10.0% in all matches',
      '🛡️ Maximum Defense Power: +10.0% in all matches',
      '🛡️ Maximum Loss Shield: 30% full penalty mitigation',
      '+65% permanent multi-sport club revenue bonus',
      'Permanent Golden Coach Statue in Club HQ',
      'Daily Legends Box with high diamonds & elite cards'
    ],
    upgradeChestReward: {
      coins: 8000000,
      trainingPoints: 7000,
      diamonds: 2500,
      specialDescriptionAr: 'تاج القمة الأسطوري: 8,000,000 كوينز + 2500 جوهرة + لقب المدرب الأسطورة الدائم',
      specialDescriptionEn: 'Zenith Crown: 8M Coins + 2500 Gems + Eternal Legend Title',
    },
    dailyChestReward: {
      coins: 650000,
      trainingPoints: 900,
      diamonds: 450,
    }
  }
];

export const getVipScoutAccuracy = (vipLevel: number): number => {
  const level = Math.max(1, Math.min(20, vipLevel || 1));
  return Math.min(98, Math.round(70 + (level - 1) * 1.5));
};

VIP_LEVELS.forEach(tier => {
  tier.scoutAccuracyPercent = getVipScoutAccuracy(tier.level);
  tier.bonusesAr.push(`🔍 دقة بيانات كشافة المباريات: ${tier.scoutAccuracyPercent}%`);
  tier.bonusesEn.push(`🔍 Match Scouting Accuracy: ${tier.scoutAccuracyPercent}%`);
});

export interface PaymentProvider {
  isAvailable(): boolean;
  initiateTransaction(itemId: string): Promise<{ success: boolean; error?: string }>;
}

export const PAYMENTS_ENABLED = false;

export const MockStrictPaymentProvider: PaymentProvider = {
  isAvailable: () => false,
  initiateTransaction: async () => {
    return { success: false, error: 'عمليات الشراء الحقيقي معطلة تماماً — اللعبة تعتمد على المهارة والإنجاز 100%' };
  }
};