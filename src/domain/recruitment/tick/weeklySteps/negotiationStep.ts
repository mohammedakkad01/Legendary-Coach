/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { GameEvent } from '../../../livingWorld/types';
import type { RecruitmentPatch, RecruitmentWorldState } from '../../types';
import {
  submitNegotiationOffer,
  type SubmitOfferInput,
  type NegotiationFlowResult,
} from '../../negotiation/negotiationMachine';
import { applyRecruitmentPatches } from '../../reducer';

export interface WeeklyNegotiationStepResult {
  patches: RecruitmentPatch[];
  events: GameEvent[];
  results: NegotiationFlowResult[];
  world: RecruitmentWorldState;
}

export function runWeeklyNegotiationStep(
  world: RecruitmentWorldState,
  submissions: readonly SubmitOfferInput[],
): WeeklyNegotiationStepResult {
  let working = world;
  const patches: RecruitmentPatch[] = [];
  const events: GameEvent[] = [];
  const results: NegotiationFlowResult[] = [];

  for (const submission of submissions) {
    const negotiation = working.negotiations.find((n) => n.id === submission.negotiation.id);
    if (!negotiation) {
      results.push({ ok: false, patches: [], validationCodes: ['negotiation_not_open'] });
      continue;
    }
    const flow = submitNegotiationOffer({ ...submission, negotiation });
    results.push(flow);
    if (flow.ok && flow.patches.length > 0) {
      working = applyRecruitmentPatches(working, flow.patches);
      patches.push(...flow.patches);
      if (flow.event) events.push(flow.event);
    }
  }

  return { patches, events, results, world: working };
}
