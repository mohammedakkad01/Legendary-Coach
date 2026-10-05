/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { memo } from 'react';
import { ChevronRight } from 'lucide-react';

interface DashboardSummaryLineProps {
  isAr: boolean;
  text: string;
  subtext?: string;
  onActivate?: () => void;
  activateLabel?: string;
  activateLabelAr?: string;
}

export const DashboardSummaryLine: React.FC<DashboardSummaryLineProps> = memo(function DashboardSummaryLine({
  isAr,
  text,
  subtext,
  onActivate,
  activateLabel = 'Open',
  activateLabelAr = 'فتح',
}) {
  const interactive = Boolean(onActivate);

  if (!interactive) {
    return (
      <p className="text-xs text-slate-300 leading-relaxed py-1">
        {text}
        {subtext ? <span className="block text-[11px] text-slate-500 mt-0.5">{subtext}</span> : null}
      </p>
    );
  }

  return (
    <button
      type="button"
      onClick={onActivate}
      className="touch-target-row w-full flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-start bg-slate-950/50 hover:bg-slate-800/60 border border-slate-800 hover:border-slate-700 cursor-pointer transition-colors"
      aria-label={isAr ? activateLabelAr : activateLabel}
    >
      <span className="min-w-0">
        <span className="text-xs font-bold text-slate-200 block truncate">{text}</span>
        {subtext ? (
          <span className="text-[11px] text-slate-500 block truncate">{subtext}</span>
        ) : null}
      </span>
      <ChevronRight className={`w-4 h-4 shrink-0 text-slate-500 ${isAr ? 'rotate-180' : ''}`} aria-hidden />
    </button>
  );
});
