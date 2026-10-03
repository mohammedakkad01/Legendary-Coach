/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * AcademyIntakeStoryCard — Renders youth academy graduates as narrative story cards.
 * Strictly uses AcademyIntakeProspectView (uncertain potential estimates, never true truth).
 */

import React from 'react';
import { Sparkles, Award, UserPlus, Clock, Trash2, ArrowUpRight, Flame } from 'lucide-react';
import type {
  AcademyIntakeProspectView,
  AcademyIntakeStoryKind,
} from '../../../domain/recruitment/academy/academyTypes';
import { RangeDisplay } from '../shared/RangeDisplay';

interface AcademyIntakeStoryCardProps {
  prospect: AcademyIntakeProspectView;
  onPromote: (prospect: AcademyIntakeProspectView) => void;
  onLoan: (prospect: AcademyIntakeProspectView) => void;
  onRelease: (prospect: AcademyIntakeProspectView) => void;
  isAr?: boolean;
}

export const AcademyIntakeStoryCard: React.FC<AcademyIntakeStoryCardProps> = ({
  prospect,
  onPromote,
  onLoan,
  onRelease,
  isAr = false,
}) => {
  const getStoryMeta = (kind: AcademyIntakeStoryKind) => {
    switch (kind) {
      case 'local_wonderkid':
        return {
          titleEn: 'Local Wonderkid',
          titleAr: 'موهبة ذهبية واعدة',
          badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
          descEn: 'Exceptional prodigy from the local scouting net. High anticipation.',
          descAr: 'موهبة استثنائية من الاستكشاف المحلي، محط آمال جماهير النادي.',
          Icon: Flame,
        };
      case 'promising_defender':
        return {
          titleEn: 'Promising Stopper',
          titleAr: 'صخرة دفاع صاعدة',
          badge: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
          descEn: 'Strong tactical awareness and defensive resilience.',
          descAr: 'قراءة ممتازة للعب وقوة ارتداد دفاعي ملحوظة.',
          Icon: Award,
        };
      case 'technical_playmaker':
        return {
          titleEn: 'Technical Playmaker',
          titleAr: 'مايسترو ومهندس وسط',
          badge: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
          descEn: 'Natural vision, sublime first touch, and tempo control.',
          descAr: 'لمسة أولى أنيقة ورؤية شاملة للملعب.',
          Icon: Sparkles,
        };
      case 'physical_athlete':
        return {
          titleEn: 'Athletic Powerhouse',
          titleAr: 'طاقة بدنية هائلة',
          badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
          descEn: 'Unrivaled stamina, sprint speed, and physical dueling.',
          descAr: 'سرعة انفجارية وقوة بدنية تمنحه التفوق في الالتحامات.',
          Icon: Sparkles,
        };
      case 'late_developer':
        return {
          titleEn: 'Late Developer',
          titleAr: 'موهبة متأخرة النضج',
          badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
          descEn: 'Raw fundamentals with huge growth curve in structured training.',
          descAr: 'خامة مميزة قابلة للتطور السريع مع صقل التدريبات المتخصصة.',
          Icon: Clock,
        };
      case 'international_prospect':
        return {
          titleEn: 'International Prospect',
          titleAr: 'موهبة دولية صاعدة',
          badge: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
          descEn: 'Discovered through international talent identification scouting.',
          descAr: 'رُصدت عبر شبكة الكشافة الدولية الخارجية.',
          Icon: Sparkles,
        };
      default:
        return {
          titleEn: 'Academy Graduate',
          titleAr: 'خريج أكاديمية منضبط',
          badge: 'bg-slate-700/40 text-slate-300 border-slate-600',
          descEn: 'Solid foundation and reliable discipline.',
          descAr: 'أساس كروي متين وانضباط تكتيكي يعتمد عليه.',
          Icon: Award,
        };
    }
  };

  const story = getStoryMeta(prospect.storyKind);
  const StoryIcon = story.Icon;

  const minPotential = Math.max(50, prospect.potentialEstimate - prospect.potentialEstimateBand);
  const maxPotential = Math.min(99, prospect.potentialEstimate + prospect.potentialEstimateBand);

  return (
    <div className="p-4 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-md space-y-3 flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-base font-black text-white">{prospect.displayName}</span>
              <span className="text-xs">{prospect.nationalityFlag}</span>
            </div>
            <p className="text-xs text-slate-400">
              {prospect.position} • {prospect.age} {isAr ? 'سنة' : 'yrs'} • {prospect.nationality}
            </p>
          </div>

          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-extrabold border ${story.badge}`}
          >
            <StoryIcon className="w-3.5 h-3.5" />
            <span>{isAr ? story.titleAr : story.titleEn}</span>
          </span>
        </div>

        {/* Narrative story summary */}
        <p className="text-xs text-slate-300 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80 mt-2">
          {isAr ? story.descAr : story.descEn}
        </p>

        {/* Uncertain Potential & Rating Estimates */}
        <div className="grid grid-cols-2 gap-2 mt-3 text-center text-xs">
          <div className="p-2 rounded-xl bg-slate-950/70 border border-slate-800">
            <span className="text-[10px] text-slate-400 block mb-0.5 font-bold">
              {isAr ? 'المستوى التقديري' : 'Estimated Current'}
            </span>
            <span className="font-mono text-amber-400 font-extrabold text-sm">
              ~{prospect.estimatedOverall}
            </span>
          </div>

          <div className="p-2 rounded-xl bg-slate-950/70 border border-slate-800">
            <span className="text-[10px] text-slate-400 block mb-0.5 font-bold">
              {isAr ? 'تقدير الإمكانية (نطاق غير مؤكد)' : 'Uncertain Potential Range'}
            </span>
            <RangeDisplay
              min={minPotential}
              max={maxPotential}
              type="rating"
              className="text-emerald-400 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Card Actions */}
      <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
        <button
          onClick={() => onPromote(prospect)}
          className="flex-1 py-2 px-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black transition-all flex items-center justify-center gap-1 cursor-pointer shadow-sm"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>{isAr ? 'ترقية للفريق الأول' : 'Promote'}</span>
        </button>

        <button
          onClick={() => onLoan(prospect)}
          className="py-2 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-300 text-xs font-bold transition-colors flex items-center justify-center gap-1 cursor-pointer"
        >
          <Clock className="w-3.5 h-3.5" />
          <span>{isAr ? 'إعارة' : 'Loan'}</span>
        </button>

        <button
          onClick={() => onRelease(prospect)}
          className="p-2 rounded-xl bg-slate-800/80 hover:bg-rose-950 hover:text-rose-400 text-slate-400 text-xs transition-colors cursor-pointer"
          title={isAr ? 'استبعاد' : 'Release'}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
