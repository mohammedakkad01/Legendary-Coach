export { recommendBestTactics } from './recommendBestTactics';
export {
  computeRoleCompatibility,
  roleCompatibilityMultiplier,
  invalidateRoleCompatibilityCache,
} from '../functionalRoles/roleCompatibility';
export type { FunctionalRoleId } from '../functionalRoles/roleCatalog';
export { applyRecommendation } from './applyRecommendation';
export type { ApplyBestTacticsError, ApplyError } from './applyRecommendation';
export { deriveOpponentProfile } from './opponentProfile';
export { isAvailable, unavailableReason } from './availability';
export type {
  BestTacticsError, BestTacticsInput, BestTacticsPlayer, BestTacticsRecommendation,
  ExcludedPlayer, FormationAlternative, OpponentProfile,
} from './types';
