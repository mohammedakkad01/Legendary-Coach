/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import type { Recommendation } from '../../domain/assistant';
import { diffTactics } from '../../domain/assistant/diff/tacticalDiff';
import { assistantLabel } from '../../i18n/assistant';

export interface AssistantPreviewSheetProps {
  readonly isAr: boolean;
  readonly recommendation: Recommendation;
  readonly clubTactics: import('../../types/game').FootballTactics;
  readonly onClose: () => void;
}

export const AssistantPreviewSheet: React.FC<AssistantPreviewSheetProps> = ({
  isAr,
  recommendation: rec,
  clubTactics,
  onClose,
}) => {
  const change = rec.suggestedChanges[0];
  const diff = useMemo(() => {
    if (!change?.patch) return [];
    return diffTactics(clubTactics, change.patch);
  }, [change, clubTactics]);

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 p-3">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-4 max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-black text-white">{assistantLabel('preview', isAr)}</h3>
          <button type="button" className="min-h-[44px] min-w-[44px] text-slate-400" onClick={onClose}>
            {assistantLabel('close', isAr)}
          </button>
        </div>
        {change?.kind === 'best_tactics_apply' && change.bestTacticsRec && (
          <p className="text-xs text-slate-300 mb-2">
            {isAr
              ? `تشكيلة ${change.bestTacticsRec.formation} — ${change.bestTacticsRec.lineup.length} لاعب`
              : `Formation ${change.bestTacticsRec.formation} — full XI + bench bundle`}
          </p>
        )}
        {diff.length === 0 ? (
          <p className="text-xs text-slate-400">
            {isAr ? 'لا تغييرات تكتيكية في هذا الاقتراح.' : 'No tactical enum changes in this suggestion.'}
          </p>
        ) : (
          <ul className="space-y-2 text-xs">
            {diff.map((d) => (
              <li key={d.field} className="flex justify-between gap-2 text-slate-300">
                <span className="font-bold">{d.field}</span>
                <span>
                  {d.before} → <span className="text-cyan-300">{d.after}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
