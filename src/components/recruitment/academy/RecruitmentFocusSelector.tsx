/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * RecruitmentFocusSelector — Configure Academy Recruitment Focus.
 * Select primary axis, position group, and focus intensity.
 */

import React from 'react';
import { Target, Compass, Sparkles, Activity, Award, Globe, Users } from 'lucide-react';
import type {
  RecruitmentFocusAxis,
  RecruitmentPositionGroup,
  RecruitmentFocusConfig,
} from '../../../domain/recruitment/academy/academyTypes';

interface RecruitmentFocusSelectorProps {
  config: RecruitmentFocusConfig;
  onChange: (newConfig: RecruitmentFocusConfig) => void;
  isAr?: boolean;
}

const AXES: readonly { id: RecruitmentFocusAxis; labelEn: string; labelAr: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'balanced', labelEn: 'Balanced Intake', labelAr: 'تطوير متوازن وشامل', Icon: Compass },
  { id: 'position_group', labelEn: 'Specific Line Focus', labelAr: 'تركيز على خط معين', Icon: Target },
  { id: 'technical', labelEn: 'Technical Mastery', labelAr: 'المهارة الفنية العالية', Icon: Sparkles },
  { id: 'physical', labelEn: 'Athleticism & Power', labelAr: 'القوة والسرعة البدنية', Icon: Activity },
  { id: 'creative', labelEn: 'Creative Playmakers', labelAr: 'صناع اللعب والابتكار', Icon: Sparkles },
  { id: 'high_potential', labelEn: 'Raw High Potential', labelAr: 'مواهب بإمكانات خارقة', Icon: Award },
  { id: 'local_talent', labelEn: 'Local / Homegrown', labelAr: 'مواهب محلية ووطنية', Icon: Users },
  { id: 'international', labelEn: 'Global Scouting', labelAr: 'كشافة دولية وعالمية', Icon: Globe },
];

export const RecruitmentFocusSelector: React.FC<RecruitmentFocusSelectorProps> = ({
  config,
  onChange,
  isAr = false,
}) => {
  return (
    <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-md">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <span className="text-xs font-black text-white flex items-center gap-1.5">
          <Target className="w-4 h-4 text-emerald-400" />
          <span>{isAr ? 'تحديد تركيز كشافة الأكاديمية:' : 'Youth Recruitment Priority Focus:'}</span>
        </span>
        <span className="text-[10px] text-slate-400 font-mono">
          {isAr ? `كثافة التركيز: ${config.intensity}%` : `Intensity: ${config.intensity}%`}
        </span>
      </div>

      {/* Axis Selection Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {AXES.map((axis) => {
          const isSelected = config.primaryAxis === axis.id;
          const Icon = axis.Icon;

          return (
            <button
              key={axis.id}
              type="button"
              onClick={() => onChange({ ...config, primaryAxis: axis.id })}
              className={`p-2.5 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                isSelected
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-sm'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-center">{isAr ? axis.labelAr : axis.labelEn}</span>
            </button>
          );
        })}
      </div>

      {/* Position Group selector if specific line focus is selected */}
      {config.primaryAxis === 'position_group' && (
        <div className="space-y-1.5 pt-1">
          <label className="text-xs font-bold text-slate-300">
            {isAr ? 'الخط المطلوب تكثيف استكشافه:' : 'Target Squad Line:'}
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(
              [
                { id: 'goalkeepers', labelEn: 'Goalkeepers', labelAr: 'حراسة المرمى' },
                { id: 'defense', labelEn: 'Defenders', labelAr: 'خط الدفاع' },
                { id: 'midfield', labelEn: 'Midfielders', labelAr: 'خط الوسط' },
                { id: 'attack', labelEn: 'Attackers', labelAr: 'خط الهجوم' },
              ] as const
            ).map((line) => (
              <button
                key={line.id}
                type="button"
                onClick={() => onChange({ ...config, positionGroup: line.id })}
                className={`py-1.5 px-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  config.positionGroup === line.id
                    ? 'bg-sky-500/20 border-sky-500 text-sky-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                {isAr ? line.labelAr : line.labelEn}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Intensity slider */}
      <div className="space-y-1 pt-1">
        <div className="flex justify-between text-xs text-slate-400">
          <span>{isAr ? 'قوة توجيه الموارد نحو هذا التركيز:' : 'Resource Intensity Focus:'}</span>
          <span className="font-mono font-bold text-white">{config.intensity}%</span>
        </div>
        <input
          type="range"
          min={20}
          max={100}
          step={10}
          value={config.intensity}
          onChange={(e) => onChange({ ...config, intensity: parseInt(e.target.value, 10) })}
          className="w-full accent-emerald-500"
        />
      </div>
    </div>
  );
};
