/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Encodes a MoveTarget as a `data-drop-target` DOM attribute string and back.
 * During a drag we hit-test the DOM at the pointer position
 * (`document.elementFromPoint`), so drop zones need to be identifiable from a
 * plain string rather than a React prop.
 *
 * Pure, no DOM access here — only string <-> MoveTarget.
 */

import type { MoveTarget } from '../../domain/squad/squadTypes';

export function encodeDropTarget(target: MoveTarget): string {
  switch (target.section) {
    case 'starting':
      return `starting:${target.slotIndex}`;
    case 'substitutes':
      return target.index === undefined ? 'substitutes' : `substitutes:${target.index}`;
    case 'bench':
      return 'bench';
  }
}

const SUBSTITUTE_INDEX = /^substitutes:(\d+)$/;
const STARTING_INDEX = /^starting:(\d+)$/;

export function parseDropTarget(raw: string | undefined | null): MoveTarget | null {
  if (!raw) return null;
  if (raw === 'bench') return { section: 'bench' };
  if (raw === 'substitutes') return { section: 'substitutes' };

  const sub = SUBSTITUTE_INDEX.exec(raw);
  if (sub) return { section: 'substitutes', index: Number(sub[1]) };

  const start = STARTING_INDEX.exec(raw);
  if (start) return { section: 'starting', slotIndex: Number(start[1]) };

  return null;
}
