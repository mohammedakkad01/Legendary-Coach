/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Club, MatchRecord } from '../../types/game';
import type { LivingWorldState, StateChange, GameEvent } from '../livingWorld/types';
import { mergeScouting } from './opponentAdaptation/types';
import {
  deriveTacticalIdentity,
  identityShiftDetected,
  recordUsage,
  type TacticalUsageSample,
} from './tacticalIdentity';
import { deriveTacticalInstructionsFromLegacy } from './migrateTacticsPhaseB';

export interface PostMatchLivingWorldResult {
  readonly changes: readonly StateChange[];
  readonly events: readonly GameEvent[];
}

export function buildPostMatchLivingWorldResult(
  livingWorld: LivingWorldState,
  club: Club,
  record: MatchRecord,
  opponentClubId: string,
  nowIso: string,
  oppositionAnalysisMult = 1,
): PostMatchLivingWorldResult {
  const changes: StateChange[] = [];
  const events: GameEvent[] = [];
  const isHome = record.homeClubId === club.id;
  const gf = isHome ? record.homeScore : record.awayScore;
  const ga = isHome ? record.awayScore : record.homeScore;
  const won = gf > ga;
  const drew = gf === ga;

  const sample: TacticalUsageSample = {
    formation: club.footballTactics.formation,
    mentality: club.footballTactics.mentality,
    pressing: club.footballTactics.pressing,
    passing: club.footballTactics.passing,
    won,
    drew,
    goalsFor: gf,
    goalsAgainst: ga,
  };
  changes.push({ kind: 'appendTacticalUsage', sample });

  const history = recordUsage(livingWorld.managerCareer.tacticalUsageHistory ?? [], sample);
  const instructions =
    club.footballTactics.tacticalInstructions ?? deriveTacticalInstructionsFromLegacy(club.footballTactics);
  const identity = deriveTacticalIdentity(history, instructions);
  const prevIdentity = livingWorld.managerCareer.tacticalIdentity;
  if (identity) {
    changes.push({ kind: 'setManagerTacticalIdentity', identity });
    if (identityShiftDetected(prevIdentity, identity)) {
      events.push({
        id: `evt_tactical_identity_${record.id}`,
        type: 'manager.tactical_identity_shift',
        timestamp: nowIso,
        season: livingWorld.currentSeason,
        matchId: record.id,
        clubId: club.id,
        severity: 'low',
        context: { tags: identity.tags.join(','), sampleSize: identity.sampleSize },
      });
    }
  }

  if (record.analytics) {
    const a = record.analytics;
    const attTotal = a.homeAttLeft + a.homeAttCenter + a.homeAttRight;
    const leftShare = attTotal > 0 ? Math.round((a.homeAttLeft / attTotal) * 100) : 33;
    const rightShare = attTotal > 0 ? Math.round((a.homeAttRight / attTotal) * 100) : 33;
    const prev = livingWorld.opponentTacticalScouting?.[opponentClubId];
    const sampleCap = Math.min(12, Math.max(4, Math.round(8 * oppositionAnalysisMult)));
    const entry = mergeScouting(
      prev,
      opponentClubId,
      {
        attackLeftShare: leftShare,
        attackRightShare: rightShare,
        possession: record.stats.homePossession,
        pressSuccessRate:
          a.homePressAttempts > 0
            ? Math.round((a.homePressSuccess / Math.max(1, a.homePressAttempts)) * 100)
            : 0,
      },
      sampleCap,
    );
    changes.push({ kind: 'mergeOpponentScouting', entry });
  }

  return { changes, events };
}
