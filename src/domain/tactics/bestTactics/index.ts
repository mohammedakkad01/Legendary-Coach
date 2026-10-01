export { recommendBestTactics } from './recommendBestTactics';
export { applyRecommendation } from './applyRecommendation';
export type { ApplyBestTacticsError, ApplyError, FormationLockedError } from './applyRecommendation';
export { deriveOpponentProfile } from './opponentProfile';
export { isAvailable, unavailableReason } from './availability';
export type {
  BestTacticsError, BestTacticsInput, BestTacticsPlayer, BestTacticsRecommendation,
  ExcludedPlayer, FormationAlternative, OpponentProfile,
} from './types';
