/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Typed ar/en copy for VAR reviews and the broadcast overlay.
 * The offside wording describes a label on an existing goal — the engine
 * does not simulate offside. See gameTuning.VAR.offsideLabelRate.
 */

type Bilingual = { readonly ar: string; readonly en: string };
const t = (ar: string, en: string): Bilingual => ({ ar, en });

export const VAR_TEXT = {
  checkingOffside: t('جاري التحقق من تسلل محتمل…', 'Checking possible offside…'),
  checkingPenalty: t('جاري التحقق من ركلة جزاء…', 'Checking a possible penalty…'),
  checkingRed: t('جاري التحقق من بطاقة حمراء…', 'Checking a possible red card…'),
  badge: t('حكم الفيديو', 'VAR'),
  disallowed: t('أُلغي بعد المراجعة', 'Disallowed after review'),
  goalConfirmed: t('الحكم يثبت الهدف بعد المراجعة.', 'VAR confirms the goal.'),
  goalOverturned: t('الحكم يلغي الهدف بداعي التسلل.', 'VAR disallows the goal for offside.'),
  penaltyConfirmed: t('الحكم يثبت ركلة الجزاء.', 'VAR confirms the penalty.'),
  penaltyCancelled: t('الحكم يلغي ركلة الجزاء.', 'VAR cancels the penalty.'),
  penaltyAwardedScored: t('الحكم يحتسب ركلة جزاء وتُسجل.', 'VAR awards a penalty and it is scored.'),
  penaltyAwardedMissed: t('الحكم يحتسب ركلة جزاء لكنها تُهدر.', 'VAR awards a penalty and it is missed.'),
  redConfirmed: t('الحكم يثبت البطاقة الحمراء.', 'VAR confirms the red card.'),
  redOverturned: t('الحكم يلغي البطاقة الحمراء.', 'VAR overturns the red card.'),
  playOnAr: 'الحكم يشير باستمرار اللعب — لا ركلة جزاء.',
  playOnEn: 'Referee waves play on — no penalty.',
} as const;

export const pickVar = (b: Bilingual, isAr: boolean): string => (isAr ? b.ar : b.en);

export function awardedGoalText(name: string, nameEn: string, minute: number, home: number, away: number): Bilingual {
  return t(
    `⚽ ركلة جزاء بعد مراجعة الفيديو! ${name} يسجل (الدقيقة ${minute}) (${home}-${away})`,
    `⚽ Penalty after VAR! ${nameEn} scores (min ${minute}) (${home}-${away})`,
  );
}

export function awardedMissText(name: string, nameEn: string, minute: number): Bilingual {
  return t(
    `❌ ركلة جزاء أُحتسبت بعد المراجعة وضائعة — ${name} (الدقيقة ${minute})`,
    `❌ VAR penalty missed by ${nameEn} (min ${minute})`,
  );
}
