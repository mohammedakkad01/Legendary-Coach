/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ScoutConfidenceMeter — Visual confidence meter (0%–100%)
 * Highlights scouting depth and reliability without exposing hidden mechanics.
 */

import React from 'react';
import { Eye, ShieldCheck, AlertCircle } from 'lucide-react';

interface ScoutConfidenceMeterProps {
  confidencePct: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  isAr?: boolean;
  className?: string;
}

export const ScoutConfidenceMeter: React.FC<ScoutConfidenceMeterProps> = ({
  confidencePct,
  size = 'md',
  showLabel = true,
  isAr = false,
  className = '',
}) => {
  const clamped = Math.max(0, Math.min(100, Math.round(confidencePct)));

  const getTier = (pct: number) => {
    if (pct >= 85) {
      return {
        labelEn: 'Verified',
        labelAr: 'مؤكد ودقيق',
        color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
        barColor: 'bg-emerald-500',
        Icon: ShieldCheck,
      };
    }
    if (pct >= 60) {
      return {
        labelEn: 'Solid',
        labelAr: 'صلب وموثوق',
        color: 'text-sky-400 bg-sky-500/10 border-sky-500/30',
        barColor: 'bg-sky-500',
        Icon: Eye,
      };
    }
    if (pct >= 30) {
      return {
        labelEn: 'Emerging',
        labelAr: 'قيد الملاحظة',
        color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
        barColor: 'bg-amber-500',
        Icon: Eye,
      };
    }
    return {
      labelEn: 'Low Confidence',
      labelAr: 'بيانات أولية',
      color: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
      barColor: 'bg-rose-500',
      Icon: AlertCircle,
    };
  };

  const tier = getTier(clamped);
  const TierIcon = tier.Icon;

  return (
    <div className={`flex flex-col gap-1 ${className}`} aria-label={`Confidence: ${clamped}%`}>
      <div className="flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5">
          <TierIcon className={`w-3.5 h-3.5 ${tier.color.split(' ')[0]}`} />
          {showLabel && (
            <span className="font-semibold text-slate-300">
              {isAr ? tier.labelAr : tier.labelEn}
            </span>
          )}
        </div>
        <span className="font-mono font-bold text-slate-200">{clamped}%</span>
      </div>

      <div
        className={`w-full bg-slate-800/80 rounded-full overflow-hidden border border-slate-700/50 ${
          size === 'sm' ? 'h-1.5' : size === 'lg' ? 'h-3' : 'h-2'
        }`}
      >
        <div
          className={`h-full rounded-full transition-all duration-500 ${tier.barColor}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
};
