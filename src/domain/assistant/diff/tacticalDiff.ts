/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { FootballTactics } from '../../../types/game';

export interface TacticalDiffEntry {
  readonly field: keyof FootballTactics | string;
  readonly before: string;
  readonly after: string;
}

export function diffTactics(before: FootballTactics, after: Partial<FootballTactics>): TacticalDiffEntry[] {
  const keys: (keyof FootballTactics)[] = [
    'formation',
    'mentality',
    'pressing',
    'passing',
    'tempo',
    'width',
    'offsideTrap',
  ];
  const out: TacticalDiffEntry[] = [];
  for (const k of keys) {
    if (after[k] === undefined) continue;
    const b = String(before[k]);
    const a = String(after[k]);
    if (b !== a) out.push({ field: k, before: b, after: a });
  }
  return out;
}
