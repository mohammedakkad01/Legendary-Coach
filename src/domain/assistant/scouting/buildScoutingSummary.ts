/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ObservedPlayerView } from '../../recruitment/types';
import type { ScoutingReport } from '../../recruitment/scouting/types';
import type { ScoutingSummary } from '../types';

export function buildScoutingSummary(
  playerId: string,
  observed: ObservedPlayerView,
  reports: readonly ScoutingReport[],
): ScoutingSummary {
  const playerReports = reports.filter((r) => r.playerId === playerId);
  const bandWidth = observed.ratingRange.max - observed.ratingRange.min;
  const bulletCodes: string[] = [];

  bulletCodes.push(`rating_band_${observed.ratingRange.min}_${observed.ratingRange.max}`);
  bulletCodes.push(`potential_band_${observed.potentialBand.min}_${observed.potentialBand.max}`);
  if (observed.revealedGroups.length >= 3) {
    bulletCodes.push(`revealed_${observed.revealedGroups.length}_groups`);
  }
  if (bandWidth >= 12) {
    bulletCodes.push('scout_band_wide');
  }
  if (playerReports.length > 0) {
    bulletCodes.push(`reports_${playerReports.length}`);
  }

  return {
    playerId,
    headlineEn: `Scout view: rating ${observed.ratingRange.min}–${observed.ratingRange.max} (${observed.confidencePct}% confidence)`,
    headlineAr: `رؤية الكشاف: تقييم ${observed.ratingRange.min}–${observed.ratingRange.max} (ثقة ${observed.confidencePct}%)`,
    bulletCodes,
    confidencePct: observed.confidencePct,
  };
}

/** Guard: summary strings must not contain exact hidden fields — only observed ranges. */
export function scoutingSummaryUsesObservedOnly(summary: ScoutingSummary, observed: ObservedPlayerView): boolean {
  const text = `${summary.headlineEn} ${summary.headlineAr}`;
  return !text.includes('trueOverall') && summary.confidencePct === observed.confidencePct;
}
