/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { GameEvent } from '../types';
import type { StoryArc, StoryCooldownState } from '../phaseF/types';
import { LIVING_WORLD_TUNING } from '../config/livingWorldTuning';

export interface StoryDetectionContext {
  gameWeek: number;
  season: number;
  recentUserResults: readonly ('W' | 'D' | 'L')[];
  cooldowns: StoryCooldownState;
  activeArcs: StoryArc[];
}

export interface StoryDetection {
  detectorKind: string;
  importance: number;
  subjectIds: string[];
  arcId?: string;
  phase: StoryArc['phase'];
}

function streakKind(results: readonly ('W' | 'D' | 'L')[], kind: 'W' | 'L', min: number): boolean {
  if (results.length < min) return false;
  const tail = results.slice(-min);
  return tail.every((r) => r === kind);
}

function onCooldown(
  cooldowns: StoryCooldownState,
  detectorKind: string,
  gameWeek: number,
): boolean {
  const globalGap = gameWeek - cooldowns.lastGlobalGameWeek;
  if (globalGap < LIVING_WORLD_TUNING.story.globalCooldownGameWeeks) return true;
  const detGap =
    gameWeek - (cooldowns.lastByDetector[detectorKind] ?? 0);
  const minWeeks =
    LIVING_WORLD_TUNING.story.detectorCooldownGameWeeks[
      detectorKind as keyof typeof LIVING_WORLD_TUNING.story.detectorCooldownGameWeeks
    ] ?? LIVING_WORLD_TUNING.story.detectorCooldownGameWeeks.default;
  return detGap < minWeeks;
}

export function detectStoriesFromGameEvent(
  event: GameEvent,
  ctx: StoryDetectionContext,
): StoryDetection | null {
  if (onCooldown(ctx.cooldowns, 'default', ctx.gameWeek)) {
    if (event.type !== 'board.dismissed' && event.type !== 'board.ultimatum') {
      /* still allow critical board */
    }
  }

  if (event.type === 'match.user_completed') {
    const won = event.context.won === true;
    const lost = event.context.won === false && event.context.drew !== true;
    if (streakKind(ctx.recentUserResults, 'W', 4) && !onCooldown(ctx.cooldowns, 'winning_streak', ctx.gameWeek)) {
      return {
        detectorKind: 'winning_streak',
        importance: 65,
        subjectIds: [String(event.clubId ?? '')],
        phase: 'started',
      };
    }
    if (streakKind(ctx.recentUserResults, 'L', 3) && !onCooldown(ctx.cooldowns, 'losing_streak', ctx.gameWeek)) {
      return {
        detectorKind: 'losing_streak',
        importance: 70,
        subjectIds: [String(event.clubId ?? '')],
        phase: 'started',
      };
    }
    if (lost && typeof event.context.goalMargin === 'number' && event.context.goalMargin <= -3) {
      return {
        detectorKind: 'unexpected_defeat',
        importance: 72,
        subjectIds: [String(event.clubId ?? '')],
        phase: 'started',
      };
    }
    if (won) {
      void won;
    }
  }

  if (event.type.startsWith('recruitment.') && event.type.includes('intake')) {
    if (!onCooldown(ctx.cooldowns, 'youngster_breakthrough', ctx.gameWeek)) {
      return {
        detectorKind: 'youngster_breakthrough',
        importance: 60,
        subjectIds: event.playerId ? [event.playerId] : [],
        phase: 'started',
      };
    }
  }

  if (event.type === 'board.ultimatum' || event.type === 'board.warning') {
    if (!onCooldown(ctx.cooldowns, 'manager_pressure', ctx.gameWeek)) {
      return {
        detectorKind: 'manager_pressure',
        importance: 80,
        subjectIds: [String(event.clubId ?? '')],
        phase: 'developing',
      };
    }
  }

  if (event.type === 'manager.tactical_identity_shift') {
    if (!onCooldown(ctx.cooldowns, 'tactical_surprise', ctx.gameWeek)) {
      return {
        detectorKind: 'tactical_surprise',
        importance: 55,
        subjectIds: [String(event.clubId ?? '')],
        phase: 'started',
      };
    }
  }

  if (event.type.startsWith('recruitment.rumor')) {
    if (!onCooldown(ctx.cooldowns, 'big_signing', ctx.gameWeek)) {
      return {
        detectorKind: 'transfer_controversy',
        importance: 58,
        subjectIds: event.playerId ? [event.playerId] : [],
        phase: 'started',
      };
    }
  }

  return null;
}
