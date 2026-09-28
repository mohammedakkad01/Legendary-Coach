/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Career Loop Stepper & Quick Action Component
 * Directs the player through the core managerial loop:
 * Club → Squad → Tactics → Match → Result → Transfers → Training → Next Match
 */

import React from 'react';
import { useGameStore, GameTab } from '../state/useGameStore';
import { 
  Building2, 
  Users, 
  ShieldAlert, 
  PlayCircle, 
  Trophy, 
  ArrowLeftRight, 
  Dumbbell, 
  ChevronRight, 
  ChevronLeft,
  Sparkles
} from 'lucide-react';

interface CareerLoopStep {
  id: GameTab;
  labelAr: string;
  labelEn: string;
  icon: React.ComponentType<{ className?: string }>;
  descriptionAr: string;
  descriptionEn: string;
}

const CAREER_STEPS: CareerLoopStep[] = [
  { id: 'club', labelAr: 'النادي', labelEn: 'Club', icon: Building2, descriptionAr: 'المرافق والتطوير', descriptionEn: 'Facilities & Ops' },
  { id: 'squad', labelAr: 'التشكيلة', labelEn: 'Squad', icon: Users, descriptionAr: 'اللياقة والجاهزية', descriptionEn: 'Fitness & Roster' },
  { id: 'tactics', labelAr: 'الخطة', labelEn: 'Tactics', icon: ShieldAlert, descriptionAr: 'التكتيك والتعليمات', descriptionEn: 'Tactics & Setup' },
  { id: 'match', labelAr: 'المباراة', labelEn: 'Match', icon: PlayCircle, descriptionAr: 'خوض اللقاء المباشر', descriptionEn: 'Live Action' },
  { id: 'round_summary', labelAr: 'النتيجة', labelEn: 'Result', icon: Trophy, descriptionAr: 'حصاد الجولة', descriptionEn: 'Round Review' },
  { id: 'transfers', labelAr: 'الانتقالات', labelEn: 'Transfers', icon: ArrowLeftRight, descriptionAr: 'سوق اللاعبين', descriptionEn: 'Market Scouting' },
  { id: 'training', labelAr: 'التدريب', labelEn: 'Training', icon: Dumbbell, descriptionAr: 'تطوير النجوم', descriptionEn: 'Skill Academy' },
];

export const CareerLoopBar: React.FC = () => {
  const { activeTab, setActiveTab, language, isMatchLive } = useGameStore();
  const isAr = language === 'ar';

  // Determine current loop index
  const currentIndex = CAREER_STEPS.findIndex(s => s.id === activeTab);
  const nextStep = currentIndex >= 0 && currentIndex < CAREER_STEPS.length - 1 
    ? CAREER_STEPS[currentIndex + 1] 
    : CAREER_STEPS[0];

  return (
    <div 
      aria-label={isAr ? 'دورة مسيرة المدرب' : 'Managerial Career Loop'} 
      className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-2 sm:p-3 shadow-lg mb-4"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
        
        {/* Loop Progression Pills */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
          <div className="hidden lg:flex items-center gap-1.5 pl-2 border-l border-slate-800 text-[11px] font-black text-amber-400">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isAr ? 'مسار المسيرة:' : 'Career Loop:'}</span>
          </div>

          {CAREER_STEPS.map((step, idx) => {
            const Icon = step.icon;
            const isCurrent = activeTab === step.id;
            const isCompleted = currentIndex > idx;

            return (
              <React.Fragment key={step.id}>
                <button
                  onClick={() => setActiveTab(step.id)}
                  id={`career_loop_step_${step.id}`}
                  title={isAr ? step.descriptionAr : step.descriptionEn}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                    isCurrent
                      ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/30'
                      : isCompleted
                      ? 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
                      : 'bg-slate-950/60 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{isAr ? step.labelAr : step.labelEn}</span>
                </button>

                {idx < CAREER_STEPS.length - 1 && (
                  <span className="text-slate-600 px-0.5 shrink-0">
                    {isAr ? <ChevronLeft className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                  </span>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Quick Jump to Next Loop Stage */}
        <div className="flex items-center justify-end gap-2 shrink-0">
          <button
            onClick={() => setActiveTab(nextStep.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs shadow-md shadow-emerald-950/40 transition active:scale-95 cursor-pointer"
          >
            <span>
              {isAr 
                ? `الخطوة التالية: ${nextStep.labelAr}` 
                : `Next Step: ${nextStep.labelEn}`}
            </span>
            {isAr ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        </div>

      </div>
    </div>
  );
};
