/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Side-channel PRNG seeds for set pieces — never mixed into the main match stream.
 */

import { hashStringToSeed } from '../shared/seed';

export type SetPieceStreamType = 'corner' | 'fk_attack' | 'throw_in';

export function setPieceStreamSeed(matchSeed: number, minute: number, type: SetPieceStreamType): number {
  return hashStringToSeed(`setpiece:${matchSeed}:${minute}:${type}`);
}

/** Deterministic 0..1 gate for scheduling set-piece minutes without touching main prng. */
export function setPieceGate(matchSeed: number, minute: number, type: SetPieceStreamType, threshold: number): boolean {
  const h = hashStringToSeed(`gate:${matchSeed}:${minute}:${type}`);
  return (h % 10000) / 10000 < threshold;
}
