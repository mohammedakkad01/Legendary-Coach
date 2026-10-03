/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * RevealedAttributesTable — Displays revealed attribute groups vs locked ones.
 * Unrevealed categories appear as locked/unknown without exposing internal values.
 */

import React from 'react';
import { Lock, CheckCircle, ShieldAlert, Sparkles, Activity, Brain, UserCheck } from 'lucide-react';
import type { RevealedAttributeGroup } from '../../../domain/recruitment/types';

interface RevealedAttributesTableProps {
  revealedGroups: readonly RevealedAttributeGroup[];
  personalityIndicators?: readonly string[];
  injuryConcernLevel?: number;
  isAr?: boolean;
  className?: string;
}

interface StageMeta {
  key: RevealedAttributeGroup;
  titleEn: string;
  titleAr: string;
  icon: React.ComponentType<{ className?: string }>;
}

const STAGES: readonly StageMeta[] = [
  { key: 'technical', titleEn: 'Technical Ability', titleAr: 'القدرات الفنية', icon: Sparkles },
  { key: 'physical', titleEn: 'Physical Conditioning', titleAr: 'الحالة البدنية', icon: Activity },
  { key: 'mental', titleEn: 'Tactical & Mental', titleAr: 'الذكاء التكتيكي والذهني', icon: Brain },
  { key: 'strengths_weaknesses', titleEn: 'Strengths & Weaknesses', titleAr: 'نقاط القوة والضعف', icon: UserCheck },
  { key: 'adaptability', titleEn: 'Adaptability', titleAr: 'التكيف مع الفريق', icon: Sparkles },
  { key: 'personality', titleEn: 'Personality & Temperament', titleAr: 'الشخصية والسلوك', icon: UserCheck },
  { key: 'injury_concerns', titleEn: 'Injury Susceptibility', titleAr: 'سجل ومخاطر الإصابات', icon: ShieldAlert },
];

export const RevealedAttributesTable: React.FC<RevealedAttributesTableProps> = ({
  revealedGroups,
  personalityIndicators = [],
  injuryConcernLevel,
  isAr = false,
  className = '',
}) => {
  const isRevealed = (stage: RevealedAttributeGroup) => revealedGroups.includes(stage);

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {STAGES.map((stage) => {
          const unlocked = isRevealed(stage.key);
          const Icon = stage.icon;

          return (
            <div
              key={stage.key}
              className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 text-xs transition-colors ${
                unlocked
                  ? 'bg-slate-900/90 border-slate-700/80 text-slate-200'
                  : 'bg-slate-950/60 border-slate-800/40 text-slate-500'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className={`p-1.5 rounded-lg shrink-0 ${
                    unlocked ? 'bg-sky-500/10 text-sky-400' : 'bg-slate-800/50 text-slate-600'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <span className="font-semibold truncate">
                  {isAr ? stage.titleAr : stage.titleEn}
                </span>
              </div>

              {unlocked ? (
                <div className="flex items-center gap-1 text-emerald-400 font-bold shrink-0">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span className="text-[10px]">{isAr ? 'مكشوف' : 'Revealed'}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-slate-500 font-medium shrink-0">
                  <Lock className="w-3.5 h-3.5 text-slate-600" />
                  <span className="text-[10px]">{isAr ? 'مغلق' : 'Locked'}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Detail expansion for revealed personality & injury concerns if present */}
      {isRevealed('personality') && personalityIndicators.length > 0 && (
        <div className="p-3 bg-slate-900/70 border border-slate-800 rounded-xl text-xs space-y-1.5">
          <div className="text-slate-400 font-semibold">
            {isAr ? 'مؤشرات شخصية اللاعب (مرصودة):' : 'Observed Personality Indicators:'}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {personalityIndicators.map((trait, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-medium"
              >
                {trait}
              </span>
            ))}
          </div>
        </div>
      )}

      {isRevealed('injury_concerns') && injuryConcernLevel !== undefined && (
        <div className="p-3 bg-slate-900/70 border border-slate-800 rounded-xl text-xs flex items-center justify-between">
          <span className="text-slate-400 font-semibold">
            {isAr ? 'تقييم مخاطر الإصابات:' : 'Injury Susceptibility:'}
          </span>
          <span
            className={`font-bold px-2 py-0.5 rounded-md text-[11px] ${
              injuryConcernLevel > 60
                ? 'bg-rose-500/10 text-rose-300 border border-rose-500/30'
                : injuryConcernLevel > 30
                ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
            }`}
          >
            {injuryConcernLevel > 60
              ? isAr ? 'عالية الخطورة' : 'High Risk'
              : injuryConcernLevel > 30
              ? isAr ? 'متوسطة' : 'Moderate'
              : isAr ? 'منخفضة / سليم' : 'Low / Resilient'}
          </span>
        </div>
      )}
    </div>
  );
};
