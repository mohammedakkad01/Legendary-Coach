export type { VARReview, VarDecision, VarMatchState, VarPlayerRef, VarReviewType } from './varTypes';
export { varStreamSeed, VAR_STREAM_SALT } from './varStream';
export {
  goalOffsideLabelRate,
  interventionRate,
  isVarQualifying,
  maxReviewsPerMatch,
  penaltyErrorRate,
  redErrorRate,
  refereeErrorScale,
  reviewConfidence,
} from './varRates';
export type { VarCandidateKind } from './varRates';
export { applyVarDecision, commitIncident, scoresAreConsistent } from './applyVarDecision';
export { prepareGoalReview, preparePenaltyReview, prepareRedReview, rollIntervention, withholdPenalty } from './prepareIncident';
