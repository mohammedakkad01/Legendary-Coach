/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { clamp } from '../../shared/math';
import { RECRUITMENT_TUNING as T } from '../config/recruitmentTuning';
import type { AgentDemandContext, AgentDemandResult } from './motivationTypes';

function personalityFloor(archetype: string): number {
  switch (archetype) {
    case 'leader':
      return T.negotiation.minAcceptRatio.leader;
    case 'ambitious':
      return T.negotiation.minAcceptRatio.ambitious;
    case 'temperamental':
      return T.negotiation.minAcceptRatio.temperamental;
    case 'loyal':
      return T.negotiation.minAcceptRatio.loyal;
    case 'nervous':
      return T.negotiation.minAcceptRatio.nervous;
    default:
      return T.negotiation.minAcceptRatio.professional;
  }
}

/** Pre-offer agent fee posture (feeds negotiation evaluateOffer ratios). */
export function computeAgentDemands(ctx: AgentDemandContext): AgentDemandResult {
  const desire = ctx.motivation.projectedTransferDesire;
  const floor = personalityFloor(ctx.personalityArchetype);
  const desirePremium = (desire / 100) * T.motivation.agentDesirePremiumSpan;
  const minFeeAcceptRatio = clamp(floor + desirePremium * 0.35, floor, floor + 0.35);
  const openingAskRatio = clamp(minFeeAcceptRatio + T.motivation.agentOpeningAskGap + desirePremium * 0.2, minFeeAcceptRatio, 1.45);

  const reasonCodes: string[] = ['agent_fee_posture'];
  if (desire >= T.motivation.highDesireThreshold) reasonCodes.push('agent_high_desire_premium');

  return { minFeeAcceptRatio, openingAskRatio, reasonCodes };
}
