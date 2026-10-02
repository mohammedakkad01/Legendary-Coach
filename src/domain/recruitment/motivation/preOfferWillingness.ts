/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { clamp } from '../../shared/math';
import { RECRUITMENT_TUNING as T } from '../config/recruitmentTuning';
import type {
  PreOfferWillingnessBand,
  PreOfferWillingnessResult,
  TransferMotivationResult,
  TransferMotivationSignalContext,
} from './motivationTypes';

export function computePreOfferWillingness(
  motivation: TransferMotivationResult,
  signals: TransferMotivationSignalContext,
): PreOfferWillingnessResult {
  const desire = motivation.projectedTransferDesire;
  const suitorRep = signals.suitorClubReputation ?? 0;
  const repLift =
    suitorRep > signals.currentClubReputation
      ? (suitorRep - signals.currentClubReputation) * T.motivation.preOfferReputationLiftScale
      : 0;

  const opennessScore = clamp(desire + repLift, 0, 100);

  let band: PreOfferWillingnessBand = 'refuse';
  if (opennessScore >= T.motivation.willingnessBands.desperate) band = 'desperate';
  else if (opennessScore >= T.motivation.willingnessBands.keen) band = 'keen';
  else if (opennessScore >= T.motivation.willingnessBands.open) band = 'open';
  else if (opennessScore >= T.motivation.willingnessBands.reluctant) band = 'reluctant';

  const willInfluenceTransfer =
    opennessScore >= T.motivation.preOfferInfluenceThreshold ||
    (band !== 'refuse' && motivation.dominantMotives.length > 0);

  const reasonCodes: string[] = [...motivation.reasonCodes];
  if (willInfluenceTransfer) reasonCodes.push('pre_offer_agent_active');
  if (band === 'refuse') reasonCodes.push('pre_offer_refused');

  return { band, opennessScore, willInfluenceTransfer, reasonCodes };
}
