/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LIVING_WORLD_TUNING } from '../config/livingWorldTuning';
import type { LivingWorldState } from '../types';
import { ensurePhaseFState } from '../phaseF/ensurePhaseF';
import type { PressConferenceSession, PressQuestion } from './types';

export interface PressContextInput {
  livingWorld: LivingWorldState;
  clubId: string;
  gameWeek: number;
  boardPressure: boolean;
  losingStreak: boolean;
  captainSaleRumor: boolean;
  academyStarter: boolean;
}

export function canSchedulePressConference(input: PressContextInput): boolean {
  const phaseF = ensurePhaseFState(input.livingWorld, input.clubId);
  const gap = input.gameWeek - phaseF.pressCooldowns.lastConferenceGameWeek;
  if (gap < LIVING_WORLD_TUNING.press.minWeeksBetween) return false;
  return (
    input.boardPressure ||
    input.losingStreak ||
    input.captainSaleRumor ||
    input.academyStarter
  );
}

function baseOptions(contextKind: string): PressQuestion['options'] {
  return [
    {
      id: `${contextKind}_calm`,
      tone: 'calm',
      stance: 'professional',
      labelEn: 'We stay focused on the next match.',
      labelAr: 'نركز على المباراة القادمة.',
    },
    {
      id: `${contextKind}_support`,
      tone: 'support',
      stance: 'backing_squad',
      labelEn: 'I back my players fully.',
      labelAr: 'أؤيد لاعبّي fully.',
    },
    {
      id: `${contextKind}_deflect`,
      tone: 'deflect',
      stance: 'media_shield',
      labelEn: 'Speculation is part of football; we control what we can.',
      labelAr: 'الشائعات جزء من اللعبة.',
    },
  ];
}

export function generatePressConference(input: PressContextInput): PressConferenceSession | null {
  if (!canSchedulePressConference(input)) return null;

  let contextKind = 'general';
  let promptEn = 'How do you respond to the current situation?';
  let promptAr = 'كيف ترد على الوضع الحالي؟';
  const subjectIds: string[] = [input.clubId];

  if (input.boardPressure) {
    contextKind = 'board_pressure';
    promptEn = 'The board is under pressure. What is your message?';
    promptAr = 'مجلس الإدارة تحت الضغط. ما رسالتك؟';
  } else if (input.losingStreak) {
    contextKind = 'losing_streak';
    promptEn = 'After consecutive defeats, what do you tell the media?';
    promptAr = 'بعد هزائم مت consecutive، ماذا تقول؟';
  } else if (input.captainSaleRumor) {
    contextKind = 'captain_sale';
    promptEn = 'Reporters ask about your captain’s future.';
    promptAr = 'أسئلة حول مستقبل الكابتن.';
  } else if (input.academyStarter) {
    contextKind = 'academy_starter';
    promptEn = 'A youth player starts — how do you frame it?';
    promptAr = 'لاعب شاب in التشكيلة — كيف تصف ذلك؟';
  }

  const question: PressQuestion = {
    id: `press_${input.gameWeek}_${contextKind}`,
    contextKind,
    subjectIds,
    promptEn,
    promptAr,
    options: baseOptions(contextKind),
  };

  return {
    question,
    gameWeek: input.gameWeek,
    season: input.livingWorld.currentSeason,
  };
}
