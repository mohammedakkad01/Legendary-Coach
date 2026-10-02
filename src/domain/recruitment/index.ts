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
} from './integration';
export type { RecruitmentIntegrationResult } from './integration';

export { ensureRecruitmentV5 } from './migration/migrateRecruitmentV5';
