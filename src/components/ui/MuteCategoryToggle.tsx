/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import type { NotificationCategory } from '../../domain/livingWorld/types';
import { Lock } from 'lucide-react';

const CATEGORY_LABEL: Record<
  NotificationCategory,
  { en: string; ar: string }
> = {
  Critical: { en: 'Critical', ar: 'حرجة' },
  Important: { en: 'Important', ar: 'هامة' },
  Information: { en: 'Information', ar: 'معلومات' },
  Suggestion: { en: 'Suggestions', ar: 'مقترحات' },
  Story: { en: 'Story', ar: 'قصص ومسار' },
};

interface MuteCategoryToggleProps {
  isAr: boolean;
  category: NotificationCategory;
  muted: boolean;
  locked?: boolean;
  onToggle: () => void;
}

export const MuteCategoryToggle: React.FC<MuteCategoryToggleProps> = ({
  isAr,
  category,
  muted,
  locked = category === 'Critical',
  onToggle,
}) => {
  const labels = CATEGORY_LABEL[category];
  const label = isAr ? labels.ar : labels.en;

  return (
    <button
      type="button"
      disabled={locked}
      aria-disabled={locked}
      aria-pressed={muted}
      onClick={() => !locked && onToggle()}
      className={`touch-target-row min-w-[7rem] px-3 py-2 rounded-xl text-xs font-bold border cursor-pointer transition-colors ${
        locked
          ? 'bg-slate-950/80 border-slate-700 text-slate-500 cursor-not-allowed'
          : muted
            ? 'bg-slate-950 border-slate-700 text-slate-500 line-through'
            : 'bg-slate-800 border-slate-700 text-slate-200 hover:border-sky-500/40'
      }`}
    >
      <span className="flex items-center justify-center gap-1.5">
        {locked ? <Lock className="w-3.5 h-3.5" aria-hidden /> : null}
        {label}
      </span>
    </button>
  );
};
