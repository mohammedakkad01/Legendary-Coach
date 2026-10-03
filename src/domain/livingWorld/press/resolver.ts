/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LIVING_WORLD_TUNING } from '../config/livingWorldTuning';
import { reputationCatalogEvent } from '../manager/reputationCatalog';
import type { GameEvent, StateChange } from '../types';
import type { PressAnswerOption, PressQuestion } from './types';

export interface PressResolveInput {
  question: PressQuestion;
  answer: PressAnswerOption;
  season: number;
  clubId: string;
  gameWeek: number;
  timestampIso: string;
}

export interface PressResolveResult {
  changes: StateChange[];
  events: GameEvent[];
}

export function resolvePressAnswer(input: PressResolveInput): PressResolveResult {
  const changes: StateChange[] = [];
  const events: GameEvent[] = [];
  const baseId = `evt_press_${input.question.id}_${input.answer.id}`;

  if (input.answer.tone === 'attack') {
    const rep = reputationCatalogEvent({
      catalogKey: 'press_negative',
      season: input.season,
      clubId: input.clubId,
      timestampIso: input.timestampIso,
      baseId,
    });
    events.push(rep.event);
  } else if (input.answer.tone === 'support' || input.answer.tone === 'honest') {
    const rep = reputationCatalogEvent({
      catalogKey: 'press_positive',
      season: input.season,
      clubId: input.clubId,
      timestampIso: input.timestampIso,
      baseId,
    });
    events.push(rep.event);
  }

  changes.push({
    kind: 'patchDressingRoom',
    patch: {
      cohesionDelta: input.answer.tone === 'support' ? 2 : input.answer.tone === 'attack' ? -3 : 0,
    },
  });

  changes.push({
    kind: 'patchPhaseF',
    clubId: input.clubId,
    patch: {
      pressCooldowns: {
        lastConferenceGameWeek: input.gameWeek,
        sessionsThisSeason: 1,
      },
    },
  });

  return { changes, events };
}
