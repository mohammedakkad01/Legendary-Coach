/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { FootballTactics } from '../../types/game';
import type { TacticalUsageSample as LivingTacticalUsageSample } from '../livingWorld/types';
import type { TacticalInstructions } from './instructionTypes';
import { clampInstruction } from './instructionTypes';

export type TacticalUsageSample = LivingTacticalUsageSample;

export interface TacticalIdentitySnapshot {
  readonly tags: readonly string[];
  readonly sampleSize: number;
  readonly updatedAt: string;
}

const MIN_SAMPLE = 6;

export function recordUsage(
  history: readonly TacticalUsageSample[],
  sample: TacticalUsageSample,
  maxSamples = 24,
): TacticalUsageSample[] {
  const next = [...history, sample];
  return next.length <= maxSamples ? next : next.slice(next.length - maxSamples);
}

export function deriveTacticalIdentity(
  history: readonly TacticalUsageSample[],
  instructions?: TacticalInstructions,
): TacticalIdentitySnapshot | null {
  if (history.length < MIN_SAMPLE) return null;
  const tags = new Set<string>();
  const pressHigh = history.filter((h) => h.pressing === 'high_press' || h.pressing === 'gegenpress').length;
  const pressLow = history.filter((h) => h.pressing === 'low_block').length;
  const counter = history.filter((h) => h.passing === 'direct_counter').length;
  const possession = history.filter((h) => h.passing === 'short_tiki_taka').length;
  const wide = history.filter((h) => h.formation === '4-3-3' || h.formation === '3-4-3').length;
  const n = history.length;

  if (pressHigh / n >= 0.45) tags.add('high_press');
  if (pressLow / n >= 0.45) tags.add('low_block');
  if (counter / n >= 0.4) tags.add('counter');
  if (possession / n >= 0.4) tags.add('possession');
  if (wide / n >= 0.5) tags.add('wide');

  if (instructions) {
    if (clampInstruction(instructions.inPossession.width) >= 65) tags.add('wide');
    if (clampInstruction(instructions.inPossession.width) <= 35) tags.add('central');
    if (clampInstruction(instructions.outOfPossession.pressingIntensity) >= 70) tags.add('high_press');
  }

  const avgGf = history.reduce((s, h) => s + h.goalsFor, 0) / n;
  if (avgGf >= 2.2) tags.add('prolific');

  return {
    tags: [...tags],
    sampleSize: n,
    updatedAt: new Date().toISOString(),
  };
}

export function identityShiftDetected(
  prev: TacticalIdentitySnapshot | undefined,
  next: TacticalIdentitySnapshot,
): boolean {
  if (!prev) return next.tags.length > 0;
  const a = new Set(prev.tags);
  const b = new Set(next.tags);
  if (a.size !== b.size) return true;
  for (const t of a) if (!b.has(t)) return true;
  return false;
}
