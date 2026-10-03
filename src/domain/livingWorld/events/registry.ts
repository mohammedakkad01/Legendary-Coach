/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { GameEvent, ReducerInput, StateChange, PlayerMentalStateDelta } from '../types';
import { LIVING_WORLD_TUNING } from '../config/livingWorldTuning';
import { handlerChangesFromReputationEvent } from '../manager/reputationCatalog';
export type GameEventHandler = (event: GameEvent, input: ReducerInput) => StateChange[];

const handlers = new Map<string, GameEventHandler>();

export function registerHandler(eventType: string, handler: GameEventHandler): void {
  handlers.set(eventType, handler);
}

export function unregisterHandler(eventType: string): void {
  handlers.delete(eventType);
}

export function clearHandlers(): void {
  handlers.clear();
}

export function getHandler(eventType: string): GameEventHandler | undefined {
  return handlers.get(eventType);
}

let defaultHandlersRegistered = false;

export function ensureDefaultHandlersRegistered(): void {
  if (defaultHandlersRegistered) return;
  registerDefaultHandlers();
  defaultHandlersRegistered = true;
}

export function registerDefaultHandlers(): void {
  registerHandler('player.morale_shift', (event) => {
    const playerId = event.playerId;
    const delta = event.context.delta;
    if (!playerId || typeof delta !== 'number') return [];
    return [{ kind: 'changePlayerMorale', playerId, delta, reason: String(event.context.reason ?? '') }];
  });

  registerHandler('player.mental_shift', (event) => {
    const playerId = event.playerId;
    if (!playerId) return [];
    const mentalDelta: PlayerMentalStateDelta = {};
    const deltaChange: StateChange = {
      kind: 'changePlayerMentalStateDelta',
      playerId,
      delta: mentalDelta,
    };
    if (typeof event.context.confidenceDelta === 'number') mentalDelta.confidence = event.context.confidenceDelta;
    if (typeof event.context.happinessDelta === 'number') mentalDelta.happiness = event.context.happinessDelta;
    if (typeof event.context.frustrationDelta === 'number') mentalDelta.frustration = event.context.frustrationDelta;
    if (typeof event.context.pressureDelta === 'number') mentalDelta.pressure = event.context.pressureDelta;
    if (Object.keys(mentalDelta).length === 0) return [];
    return [deltaChange];
  });

  registerHandler('manager.reputation_shift', (event) => {
    const delta = event.context.delta;
    if (typeof delta !== 'number') return [];
    return [
      {
        kind: 'changeManagerReputation',
        delta,
        eventType: event.type,
        gameEventId: event.id,
        season: event.season,
      },
    ];
  });

  for (const key of Object.keys(LIVING_WORLD_TUNING.reputation.deltas) as (keyof typeof LIVING_WORLD_TUNING.reputation.deltas)[]) {
    registerHandler(`manager.reputation.${key}`, (event) => handlerChangesFromReputationEvent(event));
  }

  registerHandler('manager.tactical_identity_shift', (event) => {
    const tags = String(event.context.tags ?? '');
    const sampleSize = typeof event.context.sampleSize === 'number' ? event.context.sampleSize : 0;
    if (!tags) return [];
    return [
      {
        kind: 'setManagerTacticalIdentity',
        identity: {
          tags: tags.split(',').filter(Boolean),
          sampleSize,
          updatedAt: event.timestamp,
        },
      },
    ];
  });

  registerHandler('memory.player', (event, _input) => {
    const playerId = event.playerId;
    if (!playerId) return [];
    const entryId = String(event.context.entryId ?? event.id);
    return [
      {
        kind: 'addPlayerMemory',
        playerId,
        entry: {
          id: entryId,
          type: 'praise',
          season: event.season,
          matchday: typeof event.context.matchday === 'number' ? event.context.matchday : undefined,
          subjectIds: [],
          intensity: typeof event.context.intensity === 'number' ? event.context.intensity : 50,
          decayRate: typeof event.context.decayRate === 'number' ? event.context.decayRate : 2,
        },
      },
    ];
  });
}
