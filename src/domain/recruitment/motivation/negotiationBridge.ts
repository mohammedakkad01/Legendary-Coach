/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { PlayerNegotiationContext } from '../negotiation/contextTypes';
import type { TransferMotivationResult } from './motivationTypes';

/**
 * Merges recruitment motivation into negotiation player context without importing Phase C modules.
 * Canonical `PlayerCareerState.transferDesire` remains on the player record; this uses the projection at call time.
 */
export function withMotivationForNegotiation(
  base: PlayerNegotiationContext,
  motivation: TransferMotivationResult,
): PlayerNegotiationContext {
  return {
    ...base,
    transferDesire: motivation.projectedTransferDesire,
  };
}
