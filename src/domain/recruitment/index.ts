/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Public recruitment API — observed views & domain rules only.
 * Internal ground-truth modules are not re-exported from this barrel.
 */

export type {
  KnowledgeState,
  ObservedPlayerView,
  RecruitmentPatch,
  RecruitmentWorldState,
  RevealedAttributeGroup,
  TransferWindowPhase,
  TransferWindowState,
} from './types';

export type { ScoutStaff, ScoutSpecialty } from './scouts/scoutTypes';
export type {
  ScoutingAssignment,
  ScoutingReport,
  ScoutingTargetKind,
  ScoutingAssignmentStatus,
} from './scouting/types';

export type {
  TransferOffer,
  TransferOfferClause,
  TransferNegotiation,
  RichNegotiationStatus,
  NegotiationLegacySnapshot,
} from './negotiation/offerTypes';
export {
  computeUpfrontCash,
  isLoanOffer,
  isTerminalNegotiationStatus,
  TERMINAL_NEGOTIATION_STATUSES,
} from './negotiation/offerTypes';

export type {
  ClubNegotiationContext,
  PlayerNegotiationContext,
  OfferValidationCode,
  OfferValidationResult,
  EvaluateOfferResult,
  EvaluateResponseCode,
} from './negotiation/contextTypes';

export { validateOffer } from './negotiation/validateOffer';
export { evaluateOffer } from './negotiation/evaluateOffer';
export {
  submitNegotiationOffer,
  withdrawNegotiation,
  acceptCounterOffer,
  createDraftNegotiation,
} from './negotiation/negotiationMachine';
export type {
  SubmitOfferInput,
  AcceptCounterOfferInput,
  NegotiationFlowResult,
} from './negotiation/negotiationMachine';

export {
  createDefaultScoutNetwork,
  scoutQualityScore,
  findScout,
  isPoorScout,
} from './scouts/defaultScoutNetwork';

export {
  createScoutingAssignment,
  watchMatchForScoutingAssignment,
  runCompleteScoutingReport,
  applyRecruitmentCommandPatches,
} from './scouting/orchestration';

export type { CreateAssignmentResult, ScoutingReportFlowResult } from './scouting/orchestration';

export { RECRUITMENT_WORLD_SCHEMA_VERSION } from './types';

export { RECRUITMENT_TUNING } from './config/recruitmentTuning';
export type { KnowledgeRevealStage } from './config/recruitmentTuning';

export {
  getObservedPlayerView,
  knowledgeToObservedView,
} from './knowledge/observedView';

export {
  createInitialKnowledge,
  adjustKnowledgeConfidence,
} from './knowledge/knowledgeState';

export {
  revealedGroupsForConfidence,
  applyProgressiveReveal,
  mergeRevealedGroups,
} from './knowledge/progressiveReveal';

export {
  baseConfidenceForRelationship,
  applyConfidenceDelta,
  errorScaleForConfidence,
} from './knowledge/confidenceModel';

export {
  ratingHalfWidth,
  potentialHalfWidth,
  valueSpreadFraction,
  rangesFromTruth,
} from './knowledge/ranges';

export {
  resolveTransferWindowPhase,
  buildTransferWindowState,
  isTransferWindowOpen,
  checkPermanentTransferAllowed,
} from './world/transferWindow';
export type { TransferWindowCheckResult, TransferWindowBlockReason } from './world/transferWindow';

export { deriveGameWeekFromSave, calendarWeekFromGameWeek } from './world/gameWeek';

export { applyRecruitmentPatches } from './reducer';

export {
  applyRecruitmentToSave,
  syncRecruitmentCalendarFromSave,
  runRecruitmentCalendarSync,
  applyScoutingPatchesToSave,
} from './integration';
export type { RecruitmentIntegrationResult } from './integration';

export type {
  TransferMotivationSignalContext,
  TransferMotivationResult,
  TransferMotiveKind,
  PreOfferWillingnessBand,
  PreOfferWillingnessResult,
  AgentDemandContext,
  AgentDemandResult,
} from './motivation/motivationTypes';

export { computeTransferMotivation } from './motivation/transferMotivation';
export type { ComputeTransferMotivationInput } from './motivation/transferMotivation';
export { computePreOfferWillingness } from './motivation/preOfferWillingness';
export { computeAgentDemands } from './motivation/agentDemands';
export { withMotivationForNegotiation } from './motivation/negotiationBridge';

export { ensureRecruitmentV5 } from './migration/migrateRecruitmentV5';
