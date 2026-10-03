/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ReliabilityBadge — Displays structured rumor reliability & validation tags.
 */

import React from 'react';
import { ShieldCheck, HelpCircle, AlertTriangle } from 'lucide-react';
import type { RumorReliability } from '../../../domain/recruitment/rumors/rumorTypes';

interface ReliabilityBadgeProps {
  reliability: RumorReliability;
  isAr?: boolean;
  className?: string;
}

export const ReliabilityBadge: React.FC<ReliabilityBadgeProps> = ({
  reliability,
  isAr = false,
  className = '',
}) => {
  switch (reliability) {
    case 'reliable':
      return (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 ${className}`}
        >
          <ShieldCheck className="w-3 h-3 text-emerald-400" />
          {isAr ? 'مصدر موثوق' : 'Reliable Source'}
        </span>
      );
    case 'uncertain':
      return (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-500/10 border border-amber-500/30 text-amber-300 ${className}`}
        >
          <HelpCircle className="w-3 h-3 text-amber-400" />
          {isAr ? 'تقرير غير مؤكد' : 'Unconfirmed Report'}
        </span>
      );
    case 'false':
    default:
      return (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-500/10 border border-rose-500/30 text-rose-300 ${className}`}
        >
          <AlertTriangle className="w-3 h-3 text-rose-400" />
          {isAr ? 'شائعة متداولة' : 'Social Media Rumor'}
        </span>
      );
  }
};
