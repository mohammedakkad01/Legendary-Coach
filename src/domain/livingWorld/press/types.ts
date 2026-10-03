/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type PressTone = 'calm' | 'deflect' | 'attack' | 'support' | 'honest';

export interface PressAnswerOption {
  id: string;
  tone: PressTone;
  stance: string;
  labelEn: string;
  labelAr: string;
}

export interface PressQuestion {
  id: string;
  contextKind: string;
  subjectIds: string[];
  promptEn: string;
  promptAr: string;
  options: PressAnswerOption[];
}

export interface PressConferenceSession {
  question: PressQuestion;
  gameWeek: number;
  season: number;
}
