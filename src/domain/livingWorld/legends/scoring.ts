/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Player } from '../../../types/game';
import { LIVING_WORLD_TUNING } from '../config/livingWorldTuning';
import type { ClubHistoryState, ClubLegendEntry, LegendReason } from '../phaseF/types';

export interface LegendScoreInput {
  player: Player;
  history: ClubHistoryState;
  trophiesAtClub: number;
  isCaptain: boolean;
  academyGraduate: boolean;
}

export interface LegendScoreResult {
  score: number;
  reasons: LegendReason[];
}

function norm(value: number, cap: number): number {
  return Math.min(100, Math.round((value / cap) * 100));
}

export function computePlayerLegendScore(input: LegendScoreInput): LegendScoreResult {
  const w = LIVING_WORLD_TUNING.legend.weights;
  const p = input.player;
  const reasons: LegendReason[] = [];

  const apps = norm(p.matchesPlayed, 350);
  reasons.push({ code: 'appearances', weight: w.appearances, detail: String(p.matchesPlayed) });

  const goals = norm(p.goalsOrPoints, 150);
  reasons.push({ code: 'goals', weight: w.goals, detail: String(p.goalsOrPoints) });

  const assists = norm(p.assists, 80);
  reasons.push({ code: 'assists', weight: w.assists, detail: String(p.assists) });

  const trophies = norm(input.trophiesAtClub, 10);
  reasons.push({ code: 'trophies', weight: w.trophies, detail: String(input.trophiesAtClub) });

  const years = norm(Math.max(0, p.age - 18), 15);
  reasons.push({ code: 'years_at_club', weight: w.yearsAtClub, detail: String(p.age) });

  const leadership = norm(p.personalityProfile?.leadership ?? 50, 100);
  reasons.push({ code: 'leadership', weight: w.leadership, detail: String(p.personalityProfile?.leadership ?? 50) });

  let recordBoost = 0;
  if (input.history.records.biggestWinMargin !== undefined && p.goalsOrPoints >= 30) {
    recordBoost = 40;
    reasons.push({ code: 'club_records', weight: w.clubRecords, detail: 'scoring_contributor' });
  }

  const academy = input.academyGraduate ? 70 : 0;
  if (input.academyGraduate) {
    reasons.push({ code: 'academy_contribution', weight: w.academyContribution, detail: 'graduate' });
  }

  const importantGoals = 0;
  const fanImpact = input.isCaptain ? 55 : 20;
  if (input.isCaptain) {
    reasons.push({ code: 'fan_impact', weight: w.fanImpact, detail: 'captain' });
  }

  const raw =
    apps * w.appearances +
    goals * w.goals +
    assists * w.assists +
    trophies * w.trophies +
    importantGoals * w.importantGoals +
    years * w.yearsAtClub +
    recordBoost * w.clubRecords +
    academy * w.academyContribution +
    leadership * w.leadership +
    fanImpact * w.fanImpact;

  const score = Math.round(raw);
  const sorted = [...reasons].sort((a, b) => b.weight - a.weight);
  return {
    score,
    reasons: sorted.slice(0, LIVING_WORLD_TUNING.legend.maxReasonsStored),
  };
}

export function evaluateLegendLifecycle(
  existing: ClubLegendEntry | undefined,
  score: number,
  threshold: number,
  season: number,
  entityKind: 'player' | 'manager',
  entityId: string,
  reasons: LegendReason[],
): ClubLegendEntry {
  if (existing?.lifecycle === 'inducted' || existing?.lifecycle === 'retained') {
    return {
      ...existing,
      score,
      reasons,
      lifecycle: 'retained',
    };
  }
  if (score >= threshold) {
    return {
      entityKind,
      entityId,
      lifecycle: 'inducted',
      score,
      inductedSeason: season,
      reasons,
    };
  }
  return {
    entityKind,
    entityId,
    lifecycle: 'candidate',
    score,
    reasons,
  };
}
