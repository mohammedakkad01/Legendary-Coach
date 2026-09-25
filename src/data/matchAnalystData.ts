/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Match Results Character & Tactical Analyst Engine
 * Generates dynamic, realistic post-match commentary and evaluation based on real match stats.
 */

import { MatchRecord, MatchResultsCharacter, Club } from '../types/game';

export function generatePostMatchCharacter(
  record: MatchRecord,
  club: Club,
  isAr: boolean
): MatchResultsCharacter {
  const isHome = record.homeClubId === club.id;
  const teamScore = isHome ? record.homeScore : record.awayScore;
  const opponentScore = isHome ? record.awayScore : record.homeScore;
  const isWin = teamScore > opponentScore;
  const isDraw = teamScore === opponentScore;
  const isLoss = teamScore < opponentScore;
  const goalDiff = Math.abs(teamScore - opponentScore);

  // Determine MVP player from team
  const squad = club.footballSquad;
  const mvp = squad.length > 0
    ? [...squad].sort((a, b) => b.overall - a.overall)[0]
    : { name: 'نجم الفريق', nameEn: 'Star Player', overall: 85 };

  let mood: 'ecstatic' | 'happy' | 'neutral' | 'concerned' | 'analytical' = 'neutral';
  let headlineAr = '';
  let headlineEn = '';
  let dialogueAr = '';
  let dialogueEn = '';
  let tacticalAdviceAr = '';
  let tacticalAdviceEn = '';

  if (isWin) {
    if (goalDiff >= 3) {
      mood = 'ecstatic';
      headlineAr = 'انتصار ساحق ومهرجان أهداف لا يُنسى! 🌟';
      headlineEn = 'A Dominant Masterclass & Goal Fest! 🌟';
      dialogueAr = `يا لها من ليلة تاريخية يا كوتش! فرضنا سيطرتنا من الدقيقة الأولى، وتحركات ${mvp.name} شلت حركة دفاع الخصم تماماً. هذا هو النهج التكتيكي الذي يقودنا لمنصات التتويج!`;
      dialogueEn = `What a historic night, Coach! Complete tactical domination from minute one. ${mvp.nameEn}'s movements ripped through their backline. This is championship caliber football!`;
      tacticalAdviceAr = 'حافظ على إيقاع اللعب الحالي ولكن راقب إجهاد خط الوسط في التمارين القادمة.';
      tacticalAdviceEn = 'Maintain this tempo, but monitor midfield fatigue levels in upcoming recovery.';
    } else {
      mood = 'happy';
      headlineAr = 'فوز ثمين وقتال حتى الرمق الأخير! ⚽';
      headlineEn = 'Hard-Fought Victory Earned With Grit! ⚽';
      dialogueAr = `ثلاث نقاط من ذهب يا كوتش! المباراة كانت معقدة بدنياً وتكتيكياً، لكن انضباط الخط الخلفي وتألق ${mvp.name} حسم الموقعة في اللحظات الحرجة.`;
      dialogueEn = `Crucial three points secured, Coach! It was a grueling physical test, but defensive discipline and clutch plays by ${mvp.nameEn} got us the win.`;
      tacticalAdviceAr = 'ننصح بإجراء تبديلات مبكرة في المباراة القادمة لتجنب انخفاض اللياقة في آخر 20 دقيقة.';
      tacticalAdviceEn = 'Consider early tactical substitutions next match to prevent late physical dips.';
    }
  } else if (isDraw) {
    mood = 'analytical';
    headlineAr = 'تعادل تكتيكي ونقطة ثمينة وسط صراع محتدم ⚖️';
    headlineEn = 'Tactical Stalemate & Shared Spoils ⚖️';
    dialogueAr = `مواجهة متكافئة جداً يا كوتش. أتيحت لنا فرص محققة للتسجيل ولكن التسرع أمام المرمى حرمنا من الفوز. مع ذلك، الحفاظ على التوازن الدفاعي نقطة إيجابية.`;
    dialogueEn = `Very balanced tactical clash, Coach. We had golden chances to bury the game, but lacked the final killer touch. Solid defensive shape kept us in it.`;
    tacticalAdviceAr = 'قم بزيادة حدة التمارين الهجومية وإنهاء الهجمات لرفع نسبة تحويل الفرص إلى أهداف.';
    tacticalAdviceEn = 'Focus next drills on clinical finishing and quick box transitions.';
  } else {
    // Loss
    if (goalDiff >= 3) {
      mood = 'concerned';
      headlineAr = 'عثرة قاسية تحتاج مراجعة تكتيكية سريعة ⚠️';
      headlineEn = 'A Tough Blow Requiring Tactical Assessment ⚠️';
      dialogueAr = `يوم غير موفق تماماً يا كوتش. فقدنا السيطرة على خط المنتصف وظهر إجهاد واضح على تحركات اللاعبين مما أتاح للمنافس استغلال المساحات. لا وقت للإحباط، سنصحح المسار فوراً!`;
      dialogueEn = `A frustrating match, Coach. We lost central control and visible squad fatigue opened wide transition corridors. Heads up, we rebuild immediately!`;
      tacticalAdviceAr = 'احرص على منح التشكيلة جلسة استشفاء بدني وفك عضلات، وفكك الضغط العالي إلى ضغط متوازن.';
      tacticalAdviceEn = 'Run an urgent squad recovery session and switch aggressive pressing to balanced block.';
    } else {
      mood = 'concerned';
      headlineAr = 'خسارة بفارق ضئيل تستوجب التعديل 🛡️';
      headlineEn = 'Narrow Defeat — Room For Tactical Tweaks 🛡️';
      dialogueAr = `كنا قريبين جداً من إدراك التعادل يا كوتش. خطأ فردي عابر كلفنا الكثير، لكن روح اللاعبين قتالية. نحتاج تركيزاً أكبر في الكرات الثابتة.`;
      dialogueEn = `We fought until the final whistle, Coach. A single lapse cost us, but the squad has heart. Sharpen concentration on set pieces.`;
      tacticalAdviceAr = 'ركز على تدوير التشكيلة وإشراك البدلاء الجاهزين لإعادة الحيوية للقوام الأساسي.';
      tacticalAdviceEn = 'Rotate tired starters and inject fresh bench talent to revitalize squad energy.';
    }
  }

  return {
    nameAr: 'الكابتن منصور',
    nameEn: 'Captain Mansoor',
    titleAr: 'كبير المحللين الفنيين بالنادي',
    titleEn: 'Senior Tactical Analyst',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
    mood,
    headlineAr,
    headlineEn,
    dialogueAr,
    dialogueEn,
    tacticalAdviceAr,
    tacticalAdviceEn,
    mvpPlayerName: isAr ? mvp.name : mvp.nameEn,
    mvpRating: Math.round(Math.min(9.1, Math.max(7.0, (mvp.overall * 0.08) + (isWin ? 0.6 : 0.1))) * 10) / 10,
    mvpStatTextAr: isWin ? 'صاحب أعلى تدخلات دقيقة وصناعة فرص حاسمة' : 'أفضل مقاتل في الخطوط وأكثر من حاول صناعة الفارق',
    mvpStatTextEn: isWin ? 'Highest key passes and decisive defensive tackles' : 'Most resilient on pitch with tireless effort'
  };
}
