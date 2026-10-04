/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { recommendBestTactics } from '../../tactics/bestTactics/recommendBestTactics';
import type { BestTacticsInput } from '../../tactics/bestTactics/types';
import type { Recommendation } from '../types';

export function wrapBestTacticsAsRecommendation(
  input: BestTacticsInput,
  infoConfidence: number,
): { readonly recommendation: Recommendation | null; readonly raw: ReturnType<typeof recommendBestTactics> } {
  const raw = recommendBestTactics(input);
  if (!raw.ok) {
    return { recommendation: null, raw };
  }
  const rec = raw.value;
  const reasonCodes = rec.reasons.map((r) => r.code);
  const confidence = Math.min(infoConfidence, rec.alreadyOptimal ? infoConfidence : Math.min(92, infoConfidence + 8));

  const recommendation: Recommendation = {
    id: rec.id,
    dedupeKey: `best_tactics|${rec.id}`,
    source: 'best_tactics',
    severity: rec.alreadyOptimal ? 'info' : 'warning',
    confidence,
    reasonCodes,
    titleEn: rec.alreadyOptimal ? 'Lineup already near optimal' : 'Best Tactics available',
    titleAr: rec.alreadyOptimal ? 'التشكيلة قريبة من الأمثل' : 'أفضل تكتيك متاح',
    summaryEn: rec.alreadyOptimal
      ? 'Model sees minimal gain — review reasons before applying.'
      : `Expected uplift vs current (${rec.currentScore ?? '—'} → ${rec.score}).`,
    summaryAr: rec.alreadyOptimal
      ? 'النموذج يرى مكسباً محدوداً — راجع الأسباب قبل التطبيق.'
      : `تحسّن متوقع (${rec.currentScore ?? '—'} → ${rec.score}).`,
    suggestedChanges: [{ kind: 'best_tactics_apply', bestTacticsRec: rec }],
    importance: 55,
  };

  return { recommendation, raw };
}
