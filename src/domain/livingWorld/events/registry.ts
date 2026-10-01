/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { GameEvent, ReducerInput, StateChange } from '../types';
import { applyMentalDeltas } from '../playerPsychology';

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

  registerHandler('player.mental_shift', (event, input) => {
    const playerId = event.playerId;
    if (!playerId) return [];
    const player = input.players.find((p) => p.id === playerId);
    const current = player?.mentalState ?? {
      confidence: 50,
      happiness: 50,
      frustration: 40,
      pressure: 45,
    };
    const deltas: Partial<typeof current> = {};
    if (typeof event.context.confidenceDelta === 'number') deltas.confidence = event.context.confidenceDelta;
    if (typeof event.context.happinessDelta === 'number') deltas.happiness = event.context.happinessDelta;
    if (typeof event.context.frustrationDelta === 'number') deltas.frustration = event.context.frustrationDelta;
    if (typeof event.context.pressureDelta === 'number') deltas.pressure = event.context.pressureDelta;
    const next = applyMentalDeltas(current, deltas);
    return [{ kind: 'changePlayerMentalState', playerId, patch: next }];
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
