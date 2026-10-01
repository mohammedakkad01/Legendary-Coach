/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * "Best Tactics" trigger for the Tactics screen. Only starts the analysis —
 * nothing is applied until the user confirms in BestTacticsPreviewSheet.
 */

import React from 'react';
import { Wand2, Loader2 } from 'lucide-react';
import { bestTacticsLabel } from '../../i18n/bestTactics';

export interface BestTacticsButtonProps {
  readonly isAr: boolean;
  readonly busy: boolean;
  readonly onPress: () => void;
}

export const BestTacticsButton: React.FC<BestTacticsButtonProps> = ({ isAr, busy, onPress }) => (
  <button
    id="btn_best_tactics"
    type="button"
    onClick={onPress}
    disabled={busy}
    aria-busy={busy}
    className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-black px-4 py-2 rounded-xl shadow-lg shadow-amber-500/20 text-sm cursor-pointer disabled:opacity-60 disabled:cursor-wait"
  >
    {busy ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Wand2 className="w-4 h-4" aria-hidden="true" />}
    <span>{bestTacticsLabel(busy ? 'computing' : 'button', isAr)}</span>
  </button>
);
