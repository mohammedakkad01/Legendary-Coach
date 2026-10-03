/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { GameEvent, ReducerInput, StateChange } from '../types';
import { LIVING_WORLD_TUNING } from '../config/livingWorldTuning';
import { ensurePhaseFState } from '../phaseF/ensurePhaseF';
import type { StoryArc, StoryCooldownState } from '../phaseF/types';
import { detectStoriesFromGameEvent, type StoryDetectionContext } from './detectors';

export interface StoryPipelineInput {
  event: GameEvent;
  reducerInput: ReducerInput;
  gameWeek: number;
  recentUserResults: readonly ('W' | 'D' | 'L')[];
}

export function buildStoryChanges(input: StoryPipelineInput): StateChange[] {
  const lw = input.reducerInput.livingWorld;
  const clubId = input.event.clubId ?? '';
  const phaseF = ensurePhaseFState(lw, clubId);
  const ctx: StoryDetectionContext = {
    gameWeek: input.gameWeek,
    season: lw.currentSeason,
    recentUserResults: input.recentUserResults,
    cooldowns: phaseF.storyCooldowns,
    activeArcs: phaseF.storyArcs,
  };

  const detection = detectStoriesFromGameEvent(input.event, ctx);
  if (!detection) return [];

  const arcId = detection.arcId ?? `arc_${detection.detectorKind}_${input.event.id}`;
  const existing = phaseF.storyArcs.find((a) => a.id === arcId);
  let arcs = phaseF.storyArcs;
  if (!existing) {
    if (arcs.filter((a) => a.phase !== 'resolved' && a.phase !== 'abandoned').length >= LIVING_WORLD_TUNING.story.maxActiveArcs) {
      return [];
    }
    const arc: StoryArc = {
      id: arcId,
      detectorKind: detection.detectorKind,
      phase: detection.phase,
      startedSeason: lw.currentSeason,
      startedGameWeek: input.gameWeek,
      subjectIds: detection.subjectIds.filter(Boolean),
      triggerEventIds: [input.event.id],
      importance: detection.importance,
      lastUpdatedGameWeek: input.gameWeek,
    };
    arcs = [...arcs, arc].slice(-LIVING_WORLD_TUNING.story.maxActiveArcs * 2);
  } else {
    arcs = arcs.map((a) =>
      a.id === arcId
        ? {
            ...a,
            phase: a.phase === 'started' ? 'developing' : a.phase,
            triggerEventIds: [...a.triggerEventIds, input.event.id].slice(-LIVING_WORLD_TUNING.story.maxArcEventsStored),
            lastUpdatedGameWeek: input.gameWeek,
          }
        : a,
    );
  }

  const cooldowns: StoryCooldownState = {
    lastGlobalGameWeek: input.gameWeek,
    lastByDetector: {
      ...phaseF.storyCooldowns.lastByDetector,
      [detection.detectorKind]: input.gameWeek,
    },
    lastBySubject: {
      ...phaseF.storyCooldowns.lastBySubject,
      ...Object.fromEntries(detection.subjectIds.map((s) => [s, input.gameWeek])),
    },
  };

  const changes: StateChange[] = [
    {
      kind: 'patchPhaseF',
      clubId: clubId || 'unknown',
      patch: { storyArcs: arcs, storyCooldowns: cooldowns },
    },
  ];

  if (input.event.type === 'match.user_completed' && input.event.context.won === true) {
    const pressureArc = arcs.find(
      (a) => a.detectorKind === 'manager_pressure' && a.phase !== 'resolved',
    );
    if (pressureArc) {
      arcs = arcs.map((a) =>
        a.id === pressureArc.id ? { ...a, phase: 'resolved' as const, lastUpdatedGameWeek: input.gameWeek } : a,
      );
      changes.push({
        kind: 'patchPhaseF',
        clubId: clubId || 'unknown',
        patch: { storyArcs: arcs },
      });
    }
  }

  return changes;
}
