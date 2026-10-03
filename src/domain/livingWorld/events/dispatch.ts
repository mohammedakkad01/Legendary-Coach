/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ingestGameEvent, type IngestGameEventOptions } from './ingest';
import type { ReducerResult, GameEvent } from '../types';
import type { ReducerInput } from '../types';

export interface DispatchResult {
  applied: boolean;
  skippedReason?: 'cooldown' | 'no_handler';
  result: ReducerResult;
  event?: GameEvent;
}

export type { IngestGameEventOptions };

export function dispatchGameEvent(
  input: ReducerInput,
  event: GameEvent,
  options?: IngestGameEventOptions,
): DispatchResult {
  return ingestGameEvent(input, event, options);
}
