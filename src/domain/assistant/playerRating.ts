/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Player } from '../../types/game';

/** Single source for analyst heuristics (Player has `overall`, not `rating`). */
export function effectivePlayerOverall(player: Player): number {
  return typeof player.overall === 'number' ? player.overall : 70;
}
