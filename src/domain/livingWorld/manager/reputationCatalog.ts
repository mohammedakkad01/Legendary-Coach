/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Single reputation mutation path: catalog → GameEvent → changeManagerReputation.
 */

import { LIVING_WORLD_TUNING } from '../config/livingWorldTuning';
import type { GameEvent, StateChange } from '../types';

export type ReputationCatalogKey = keyof typeof LIVING_WORLD_TUNING.reputation.deltas;

export interface CatalogEventInput {
  catalogKey: ReputationCatalogKey;
  season: number;
  clubId: string;
  timestampIso: string;
  baseId: string;
  severity?: GameEvent['severity'];
}

export interface CatalogEventResult {
  event: GameEvent;
  changes: StateChange[];
}

export function reputationCatalogEvent(input: CatalogEventInput): CatalogEventResult {
  const delta = LIVING_WORLD_TUNING.reputation.deltas[input.catalogKey];
  const event: GameEvent = {
    id: `${input.baseId}_rep_${input.catalogKey}`,
    type: `manager.reputation.${input.catalogKey}`,
    timestamp: input.timestampIso,
    season: input.season,
    clubId: input.clubId,
    severity: input.severity ?? (delta >= 0 ? 'medium' : 'high'),
    context: { catalogKey: input.catalogKey, delta },
  };
  const changes: StateChange[] = [
    {
      kind: 'changeManagerReputation',
      delta,
      eventType: event.type,
      gameEventId: event.id,
      season: input.season,
    },
  ];
  return { event, changes };
}

export function handlerChangesFromReputationEvent(event: GameEvent): StateChange[] {
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
}

export function isReputationCatalogEventType(type: string): boolean {
  return type.startsWith('manager.reputation.');
}
