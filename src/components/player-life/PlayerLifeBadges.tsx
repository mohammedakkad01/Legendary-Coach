/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phase C — Shared Player Life UI Components
 * Meters, badges, and indicator pills adhering to mobile-first responsive layout.
 */

import React from 'react';
import type { PlayerMentalState } from '../../domain/livingWorld/types';
import type { InjurySeverity } from '../../domain/playerLife/types';
import { Activity, AlertTriangle, ShieldCheck, HeartPulse, Sparkles, Smile, Frown, Flame } from 'lucide-react';

interface ConditionMeterProps {
  label: string;
  value: number;
  max?: number;
  color?: 'emerald' | 'amber' | 'rose' | 'sky' | 'indigo';
  showPercent?: boolean;
}

export const ConditionMeter: React.FC<ConditionMeterProps> = ({
  label,
  value,
  max = 100,
  color = 'sky',
  showPercent = true,
}) => {
  const clamped = Math.max(0, Math.min(max, value));
  const percent = Math.round((clamped / max) * 100);

  const colorStyles = {
    emerald: 'bg-emerald-500 text-emerald-400',
    amber: 'bg-amber-500 text-amber-400',
    rose: 'bg-rose-500 text-rose-400',
    sky: 'bg-sky-500 text-sky-400',
    indigo: 'bg-indigo-500 text-indigo-400',
  }[color];

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px] font-bold">
        <span className="text-slate-400">{label}</span>
        <span className={colorStyles.split(' ')[1]}>
          {clamped}
          {showPercent && '%'}
        </span>
      </div>
      <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${colorStyles.split(' ')[0]}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
};

export interface MoodInfo {
  tag: string;
  labelAr: string;
  labelEn: string;
  colorClass: string;
  icon: React.ComponentType<{ className?: string }>;
}

export function getPlayerMoodInfo(mental?: PlayerMentalState): MoodInfo {
  if (!mental) {
    return {
      tag: 'neutral',
      labelAr: 'مستقر ومتوازن',
      labelEn: 'Balanced & Steady',
      colorClass: 'bg-slate-800 text-slate-300 border-slate-700',
      icon: Smile,
    };
  }

  const { frustration = 40, confidence = 50, happiness = 50, pressure = 45 } = mental;

  if (frustration >= 65) {
    return {
      tag: 'frustrated',
      labelAr: 'محبط ومستاء',
      labelEn: 'Frustrated & Discontent',
      colorClass: 'bg-rose-950/60 text-rose-300 border-rose-800/80',
      icon: Frown,
    };
  }
  if (pressure >= 70) {
    return {
      tag: 'pressured',
      labelAr: 'تحت ضغط شديد',
      labelEn: 'Under High Pressure',
      colorClass: 'bg-amber-950/60 text-amber-300 border-amber-800/80',
      icon: Flame,
    };
  }
  if (confidence >= 70 && happiness >= 60) {
    return {
      tag: 'superb',
      labelAr: 'معنويات فائقة وحماس',
      labelEn: 'High Spirit & Confident',
      colorClass: 'bg-emerald-950/60 text-emerald-300 border-emerald-800/80',
      icon: Sparkles,
    };
  }
  if (happiness >= 60) {
    return {
      tag: 'happy',
      labelAr: 'مرتاح ومندمج',
      labelEn: 'Happy & Settled',
      colorClass: 'bg-teal-950/60 text-teal-300 border-teal-800/80',
      icon: Smile,
    };
  }
  return {
    tag: 'steady',
    labelAr: 'هادئ ومحترف',
    labelEn: 'Calm & Focused',
    colorClass: 'bg-slate-800/80 text-slate-300 border-slate-700',
    icon: Smile,
  };
}

export const MoodBadge: React.FC<{ mental?: PlayerMentalState; isAr: boolean }> = ({ mental, isAr }) => {
  const info = getPlayerMoodInfo(mental);
  const Icon = info.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold border ${info.colorClass}`}
    >
      <Icon className="w-3 h-3 shrink-0" />
      <span>{isAr ? info.labelAr : info.labelEn}</span>
    </span>
  );
};

export const SquadRoleBadge: React.FC<{
  role?: 'starter' | 'rotation' | 'youth' | 'fringe';
  isAr: boolean;
}> = ({ role = 'rotation', isAr }) => {
  const map = {
    starter: {
      ar: 'أساسي لا غنى عنه',
      en: 'Key Starter',
      cls: 'bg-sky-950/70 border-sky-600/50 text-sky-300',
    },
    rotation: {
      ar: 'مداورة دورية',
      en: 'Squad Rotation',
      cls: 'bg-indigo-950/70 border-indigo-600/50 text-indigo-300',
    },
    youth: {
      ar: 'موهبة صاعدة',
      en: 'Youth Prospect',
      cls: 'bg-emerald-950/70 border-emerald-600/50 text-emerald-300',
    },
    fringe: {
      ar: 'احتياطي فرعي',
      en: 'Fringe Player',
      cls: 'bg-slate-900 border-slate-700 text-slate-400',
    },
  }[role];

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-black border ${map.cls}`}>
      {isAr ? map.ar : map.en}
    </span>
  );
};

export const InjurySeverityBadge: React.FC<{
  severity: InjurySeverity;
  isAr: boolean;
}> = ({ severity, isAr }) => {
  const map = {
    minor: {
      ar: 'طفيفة (شد خفيف)',
      en: 'Minor Strain',
      cls: 'bg-amber-950/60 border-amber-600/50 text-amber-300',
    },
    moderate: {
      ar: 'متوسطة (تمزق جزئي)',
      en: 'Moderate Sprain',
      cls: 'bg-orange-950/60 border-orange-600/50 text-orange-300',
    },
    major: {
      ar: 'حرجة (إصابة بالغة)',
      en: 'Severe Injury',
      cls: 'bg-rose-950/80 border-rose-600/60 text-rose-300',
    },
    recurring: {
      ar: 'إصابة متكررة ومزمنة',
      en: 'Recurring Problem',
      cls: 'bg-purple-950/80 border-purple-600/60 text-purple-300',
    },
  }[severity];

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-black border ${map.cls}`}>
      <HeartPulse className="w-3 h-3" />
      <span>{isAr ? map.ar : map.en}</span>
    </span>
  );
};

export const InjuryReturnRangeBadge: React.FC<{
  estimatedWeeks: number;
  confidence: number;
  isAr: boolean;
}> = ({ estimatedWeeks, confidence, isAr }) => {
  // Domain rule: Uncertain estimates are displayed as a range, never exact!
  // If confidence is lower, the window is wider.
  const spread = confidence >= 85 ? 1 : confidence >= 65 ? 2 : 3;
  const minWeeks = Math.max(1, Math.round(estimatedWeeks - spread / 2));
  const maxWeeks = Math.max(minWeeks + 1, Math.round(estimatedWeeks + spread / 2));

  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] font-bold text-amber-300">
      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
      <span>
        {isAr
          ? `العودة التقديرية: ${minWeeks} – ${maxWeeks} أسابيع (دقة تشخيص: %${confidence})`
          : `Est. Return: ${minWeeks} – ${maxWeeks} wks (${confidence}% confidence)`}
      </span>
    </div>
  );
};
