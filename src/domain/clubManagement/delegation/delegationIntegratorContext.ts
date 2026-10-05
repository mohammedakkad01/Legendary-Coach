/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Optional integrator-supplied context for delegated tasks (store bridge / tests).
 * Pure club-management tick must not invent loan destinations or async pre-match UI state.
 */

import type { Club, Fixture, LeagueStanding } from '../../../types/game';
import type { LivingWorldState } from '../../livingWorld/types';
import type { LoanDestinationClubContext } from '../../recruitment/loans/loanTypes';
import type { RecruitmentWorldState } from '../../recruitment/types';

export interface DelegationIntegratorContext {
  userClubId: string;
  recruitmentWorld?: RecruitmentWorldState;
  livingWorld?: LivingWorldState;
  userClub?: Club;
  leagueFixtures?: readonly Fixture[];
  leagueStandings?: readonly LeagueStanding[];
  /** Next opponent club snapshot (XI/tactics) when available. */
  opponentClub?: Club | null;
  nextFixture?: Fixture | null;
  loanSearch?: {
    destinations: readonly LoanDestinationClubContext[];
  };
}
