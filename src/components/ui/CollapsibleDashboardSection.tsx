/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Progressive-disclosure section for the unified manager dashboard.
 */

import React, { useId, useState, useCallback, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface CollapsibleDashboardSectionProps {
  isAr: boolean;
  sectionId: string;
  titleEn: string;
  titleAr: string;
  attention?: boolean;
  defaultExpanded?: boolean;
  summary: React.ReactNode;
  children?: React.ReactNode;
}

export const CollapsibleDashboardSection: React.FC<CollapsibleDashboardSectionProps> = ({
  isAr,
  sectionId,
  titleEn,
  titleAr,
  attention = false,
  defaultExpanded = false,
  summary,
  children,
}) => {
  const panelId = useId();
  const storageKey = `dashboard_section_${sectionId}`;

  const [expanded, setExpanded] = useState(() => {
    if (typeof sessionStorage === 'undefined') return defaultExpanded;
    const stored = sessionStorage.getItem(storageKey);
    if (stored === 'true') return true;
    if (stored === 'false') return false;
    return defaultExpanded;
  });

  useEffect(() => {
    try {
      sessionStorage.setItem(storageKey, String(expanded));
    } catch {
      // ignore
    }
  }, [expanded, storageKey]);

  const toggle = useCallback(() => {
    setExpanded((v) => !v);
  }, []);

  const title = isAr ? titleAr : titleEn;

  return (
    <section
      className={`rounded-2xl border bg-slate-900/80 overflow-hidden ${
        attention ? 'border-amber-500/40 shadow-md shadow-amber-950/20' : 'border-slate-800'
      }`}
      aria-labelledby={`${panelId}-heading`}
    >
      <button
        type="button"
        id={`${panelId}-heading`}
        className="touch-target-row w-full flex items-center justify-between gap-3 px-4 py-3 text-start cursor-pointer hover:bg-slate-800/40 transition-colors"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={toggle}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-black text-white truncate">{title}</span>
          {attention && (
            <span className="shrink-0 text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
              {isAr ? 'يتطلب انتباهك' : 'Needs attention'}
            </span>
          )}
        </div>
        <ChevronDown
          className={`w-5 h-5 shrink-0 text-slate-400 motion-safe:transition-transform ${
            expanded ? 'rotate-180' : ''
          }`}
          aria-hidden
        />
      </button>

      <div className="px-4 pb-3 space-y-2 border-t border-slate-800/80">{summary}</div>

      {expanded && children ? (
        <div id={panelId} className="px-4 pb-4 border-t border-slate-800/60">
          {children}
        </div>
      ) : null}
    </section>
  );
};
