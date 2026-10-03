/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { RECRUITMENT_TUNING as T } from '../config/recruitmentTuning';
import { clamp } from '../../shared/math';

export function baseConfidenceForRelationship(isOwnSquad: boolean): number {
  return isOwnSquad ? T.knowledge.baseConfidenceOwnSquad : T.knowledge.baseConfidenceExternal;
}

export function applyConfidenceDelta(current: number, delta: number): number {
  return clamp(current + delta, 0, T.knowledge.maxConfidence);
}

export function errorScaleForConfidence(confidencePct: number): number {
  const t = clamp(confidencePct, 0, 100) / 100;
  return (
    T.knowledge.errorScaleAtLowConfidence +
    (T.knowledge.errorScaleAtHighConfidence - T.knowledge.errorScaleAtLowConfidence) * t
  );
}
