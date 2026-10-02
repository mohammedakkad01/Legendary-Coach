/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Player } from '../../../types/game';
import { evaluatePositionSuitability } from '../../squad/positionSuitability';
import { clamp } from '../../shared/math';
import type { FunctionalRoleId } from './roleCatalog';
import { getRoleDefinition } from './roleCatalog';

export type RoleCompatPlayer = Pick<Player, 'id' | 'position' | 'overall' | 'attributes' | 'secondaryPositions'>;

const compatCache = new Map<string, number>();

function cacheKey(playerId: string, roleId: FunctionalRoleId, attrFingerprint: number): string {
  return `${playerId}|${roleId}|${attrFingerprint}`;
}

function attrFingerprint(p: RoleCompatPlayer): number {
  const a = p.attributes;
  if (!a) return p.overall;
  return (
    (a.pace ?? 0) +
    (a.shooting ?? 0) * 1.1 +
    (a.passing ?? 0) +
    (a.dribbling ?? 0) +
    (a.defending ?? 0) +
    (a.physical ?? 0) +
    (a.goalkeeping ?? 0)
  );
}

export function invalidateRoleCompatibilityCache(playerId?: string): void {
  if (!playerId) {
    compatCache.clear();
    return;
  }
  for (const key of compatCache.keys()) {
    if (key.startsWith(`${playerId}|`)) compatCache.delete(key);
  }
}

function readAttr(p: RoleCompatPlayer, key: keyof NonNullable<Player['attributes']>): number {
  const v = p.attributes?.[key];
  return typeof v === 'number' && Number.isFinite(v) ? v : p.overall;
}

/**
 * 0–100 compatibility of a player in a functional role (slot-aware when provided).
 */
export function computeRoleCompatibility(
  player: RoleCompatPlayer,
  roleId: FunctionalRoleId,
  assignedSlotLabel?: string,
): number {
  const fp = Math.round(attrFingerprint(player));
  const key = cacheKey(player.id, roleId, fp);
  const cached = compatCache.get(key);
  if (cached !== undefined) return cached;

  const role = getRoleDefinition(roleId);
  const weights = role.attributeWeights;
  let wSum = 0;
  let score = 0;
  for (const [attr, w] of Object.entries(weights)) {
    const weight = w as number;
    if (weight <= 0) continue;
    score += readAttr(player, attr as keyof NonNullable<Player['attributes']>) * weight;
    wSum += weight;
  }
  const attrScore = wSum > 0 ? score / wSum : player.overall;

  let positionFit = 70;
  if (role.corePositions.includes(player.position)) positionFit = 95;
  else if (player.secondaryPositions?.some((sp) => role.corePositions.includes(sp))) positionFit = 82;

  if (assignedSlotLabel) {
    const slotSuit = evaluatePositionSuitability(player, assignedSlotLabel);
    positionFit = positionFit * 0.55 + slotSuit.multiplier * 100 * 0.45;
  }

  const raw = attrScore * 0.65 + positionFit * 0.35;
  const result = Math.round(clamp(raw, 0, 100));
  compatCache.set(key, result);
  return result;
}

/** Stable API for Best Tactics / UI. */
export function roleCompatibilityMultiplier(compatibility: number): number {
  return 0.55 + 0.45 * (clamp(compatibility, 0, 100) / 100);
}
