/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { GameEvent } from '../../livingWorld/types';
import { hashStringToSeed } from '../../shared/seed';
import { SeededRandom } from '../../../engine/prng';
import { RECRUITMENT_TUNING as T } from '../config/recruitmentTuning';
import type { IdentifiedTransferTarget } from '../aiClubs/clubProfileTypes';
import type { PreOfferWillingnessResult } from '../motivation/motivationTypes';
import type { ObservedPlayerView, RecruitmentPatch } from '../types';
import { assignRumorReliability } from './reliabilityModel';
import {
  canCreateRumor,
  emptyRumorThrottleState,
  recordRumorCreated,
  rumorDedupeKey,
} from './rumorThrottle';
import type {
  ClubInterestRecord,
  RumorClaimKind,
  RumorSourceKind,
  RumorThrottleState,
  TransferRumor,
  TransferRumorType,
} from './rumorTypes';

export interface RumorInterestCandidate {
  interestedClubId: string;
  playerId: string;
  sellerClubId?: string;
  target: IdentifiedTransferTarget;
  observed: ObservedPlayerView;
}

export interface AgentActivityCandidate {
  playerId: string;
  subjectClubId?: string;
  willingness: PreOfferWillingnessResult;
}

export interface GenerateWeeklyRumorsInput {
  worldSeed: number;
  gameWeek: number;
  userClubId: string;
  throttle: RumorThrottleState;
  clubInterests: readonly RumorInterestCandidate[];
  agentActivities: readonly AgentActivityCandidate[];
  /** Optional fabricated rumors (stress test / media noise). */
  allowFabricatedRumors?: boolean;
}

export interface GenerateWeeklyRumorsResult {
  rumors: TransferRumor[];
  interests: ClubInterestRecord[];
  patches: RecruitmentPatch[];
  events: GameEvent[];
  throttle: RumorThrottleState;
}

function rumorId(worldSeed: number, gameWeek: number, key: string, index: number): string {
  return `rumor_${hashStringToSeed(`${worldSeed}|${gameWeek}|${key}|${index}`)}`;
}

function interestId(worldSeed: number, gameWeek: number, clubId: string, playerId: string): string {
  return `interest_${hashStringToSeed(`${worldSeed}|${gameWeek}|${clubId}|${playerId}`)}`;
}

function claimFromAction(action: string): RumorClaimKind {
  if (action === 'offer_loan') return 'loan_interest';
  if (action === 'bid_immediately' || action === 'negotiate') return 'bid_planned';
  return 'monitoring';
}

function sourceForType(type: TransferRumorType): RumorSourceKind {
  switch (type) {
    case 'agent_activity':
      return 'agent';
    case 'club_interest':
      return 'club_leak';
    case 'player_seeks_move':
      return 'press';
    default:
      return 'fan_media';
  }
}

function tryAddRumor(params: {
  input: GenerateWeeklyRumorsInput;
  throttle: RumorThrottleState;
  rumors: TransferRumor[];
  index: number;
  draft: Omit<TransferRumor, 'id' | 'reliability'>;
  observerConfidencePct: number;
}): RumorThrottleState {
  const key = rumorDedupeKey({
    type: params.draft.type,
    playerId: params.draft.subjectPlayerId,
    claimingClubId: params.draft.claimingClubId,
    claimKind: params.draft.claimKind,
  });
  const gate = canCreateRumor(params.throttle, params.input.gameWeek, key);
  if (!gate.allowed) return params.throttle;

  const reliability = assignRumorReliability({
    worldSeed: params.input.worldSeed,
    gameWeek: params.input.gameWeek,
    playerId: params.draft.subjectPlayerId,
    clubId: params.draft.claimingClubId ?? params.input.userClubId,
    truthFlag: params.draft.truthFlag,
    observerConfidencePct: params.observerConfidencePct,
    rumorIndex: params.index,
  });

  params.rumors.push({
    ...params.draft,
    id: rumorId(params.input.worldSeed, params.input.gameWeek, key, params.index),
    reliability,
  });
  return recordRumorCreated(params.throttle, params.input.gameWeek, key);
}

export function generateWeeklyRumors(input: GenerateWeeklyRumorsInput): GenerateWeeklyRumorsResult {
  let throttle = input.throttle ?? emptyRumorThrottleState();
  const rumors: TransferRumor[] = [];
  const interests: ClubInterestRecord[] = [];
  const patches: RecruitmentPatch[] = [];
  const events: GameEvent[] = [];
  let rumorIndex = 0;

  for (const row of input.clubInterests) {
    const action = row.target.decision.action;
    if (action === 'pass' || action === 'wait' || action === 'scout_longer') continue;

    const interest: ClubInterestRecord = {
      id: interestId(input.worldSeed, input.gameWeek, row.interestedClubId, row.playerId),
      interestedClubId: row.interestedClubId,
      playerId: row.playerId,
      sellerClubId: row.sellerClubId,
      interestLevel: row.target.interestLevel,
      createdWeek: input.gameWeek,
    };

    const draft: Omit<TransferRumor, 'id' | 'reliability'> = {
      type: 'club_interest',
      subjectPlayerId: row.playerId,
      subjectClubId: row.sellerClubId,
      claimingClubId: row.interestedClubId,
      claimKind: claimFromAction(action),
      source: sourceForType('club_interest'),
      truthFlag: true,
      createdWeek: input.gameWeek,
    };

    const before = rumors.length;
    throttle = tryAddRumor({
      input,
      throttle,
      rumors,
      index: rumorIndex,
      draft,
      observerConfidencePct: row.observed.confidencePct,
    });
    if (rumors.length > before) {
      rumorIndex += 1;
      const linked = rumors[rumors.length - 1];
      interest.linkedRumorId = linked.id;
      interests.push(interest);
    }
  }

  for (const agent of input.agentActivities) {
    if (!agent.willingness.willInfluenceTransfer) continue;

    const draft: Omit<TransferRumor, 'id' | 'reliability'> = {
      type: 'agent_activity',
      subjectPlayerId: agent.playerId,
      subjectClubId: agent.subjectClubId,
      claimKind: 'agent_approached',
      source: 'agent',
      truthFlag: agent.willingness.band !== 'refuse',
      createdWeek: input.gameWeek,
    };

    const before = rumors.length;
    throttle = tryAddRumor({
      input,
      throttle,
      rumors,
      index: rumorIndex,
      draft,
      observerConfidencePct: 50,
    });
    if (rumors.length > before) rumorIndex += 1;
  }

  if (input.allowFabricatedRumors) {
    const rng = new SeededRandom(
      hashStringToSeed(`fabricated_rumor_${input.worldSeed}_${input.gameWeek}`),
    );
    const fabrications = rng.nextRange(0, T.rumors.maxFabricatedPerWeek);
    for (let i = 0; i < fabrications; i += 1) {
      const agent = input.agentActivities[i % Math.max(1, input.agentActivities.length)];
      if (!agent) break;
      const draft: Omit<TransferRumor, 'id' | 'reliability'> = {
        type: 'fee_speculation',
        subjectPlayerId: agent.playerId,
        subjectClubId: agent.subjectClubId,
        claimKind: 'bid_planned',
        source: 'fan_media',
        truthFlag: false,
        createdWeek: input.gameWeek,
      };
      const before = rumors.length;
      throttle = tryAddRumor({
        input,
        throttle,
        rumors,
        index: rumorIndex,
        draft,
        observerConfidencePct: 20,
      });
      if (rumors.length > before) rumorIndex += 1;
    }
  }

  for (const rumor of rumors) {
    patches.push({ kind: 'appendTransferRumor', rumor });
    events.push({
      id: `rec_rumor_${rumor.id}`,
      type: 'recruitment.rumor.created',
      timestamp: new Date(0).toISOString(),
      season: 1,
      playerId: rumor.subjectPlayerId,
      clubId: rumor.claimingClubId ?? input.userClubId,
      severity: rumor.reliability === 'reliable' ? 'medium' : 'low',
      context: {
        rumorId: rumor.id,
        reliability: rumor.reliability,
        claimKind: rumor.claimKind,
      },
    });
  }

  if (rumors.length > 0 || interests.length > 0) {
    patches.push({ kind: 'setRumorThrottle', throttle });
  }

  for (const interest of interests) {
    patches.push({ kind: 'appendClubInterest', interest });
    events.push({
      id: `rec_interest_${interest.id}`,
      type: 'recruitment.interest.club',
      timestamp: new Date(0).toISOString(),
      season: 1,
      playerId: interest.playerId,
      clubId: interest.interestedClubId,
      severity: 'low',
      context: {
        interestId: interest.id,
        interestLevel: interest.interestLevel,
      },
    });
  }

  return { rumors, interests, patches, events, throttle };
}
