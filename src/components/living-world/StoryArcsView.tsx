/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * StoryArcsView — Dynamic Living World storyline cards and progressive disclosure.
 * Renders active story arcs from livingWorld.phaseF.storyArcs without spam.
 */

import React, { useState } from 'react';
import { useGameStore } from '../../state/useGameStore';
import { resolveSubjectEntity } from './helpers/resolveEntity';
import { 
  BookOpen, 
  Flame, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  ChevronDown, 
  ChevronUp, 
  Sparkles,
  Layers
} from 'lucide-react';
import type { StoryArc, StoryArcPhase } from '../../domain/livingWorld/phaseF/types';

interface StoryArcsViewProps {
  isAr: boolean;
}

const DETECTOR_NAMES: Record<string, { ar: string; en: string }> = {
  winning_streak: { ar: 'سلسلة الانتصارات المتتالية', en: 'Winning Streak Momentum' },
  losing_streak: { ar: 'أزمة الهزائم المتتالية والضغط', en: 'Losing Streak Crisis' },
  unexpected_defeat: { ar: 'خسارة غير متوقعة وارتداد عابر', en: 'Shock Defeat Reaction' },
  youngster_breakthrough: { ar: 'انفجار موهبة شابة من الأكاديمية', en: 'Academy Breakthrough' },
  manager_pressure: { ar: 'إنذار الإدارة وتصاعد الضغط', en: 'Board Pressure & Ultimatum' },
  tactical_surprise: { ar: 'مفاجأة تكتيكية وتحول الخطط', en: 'Tactical System Shift' },
  transfer_controversy: { ar: 'جدل الشائعات وسوق الانتقالات', en: 'Transfer Rumour Standoff' },
  default: { ar: 'مسار سردي وتطور درامي', en: 'Emergent Narrative Arc' },
};

const PHASE_BADGES: Record<StoryArcPhase, { ar: string; en: string; className: string }> = {
  started: { ar: 'بداية المسار', en: 'Initiated', className: 'bg-sky-500/20 text-sky-300 border-sky-500/40' },
  developing: { ar: 'يتطور', en: 'Developing', className: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
  resolved: { ar: 'مكتمل / تم الحسم', en: 'Resolved', className: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
  abandoned: { ar: 'متلاشي', en: 'Faded', className: 'bg-slate-700/40 text-slate-400 border-slate-600' },
};

export const StoryArcsView: React.FC<StoryArcsViewProps> = ({ isAr }) => {
  const { livingWorld, club, leagueStandings, matchHistory } = useGameStore();
  const arcs = livingWorld.phaseF?.storyArcs || [];

  const [expandedArcId, setExpandedArcId] = useState<string | null>(null);

  const activeArcs = arcs.filter((a) => a.phase !== 'resolved' && a.phase !== 'abandoned');
  const pastArcs = arcs.filter((a) => a.phase === 'resolved' || a.phase === 'abandoned');

  const toggleExpand = (id: string) => {
    setExpandedArcId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="space-y-5" id="story_arcs_view">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-purple-950/40 to-slate-900 border border-purple-500/30 rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
                <BookOpen className="w-3.5 h-3.5" />
                {isAr ? 'عالم كرة القدم الحي' : 'Living Football World'}
              </span>
              <span className="text-xs text-slate-400 font-bold">
                {activeArcs.length} {isAr ? 'مسارات نشطة' : 'Active Storylines'}
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-white font-heading">
              {isAr ? 'المسارات الدرامية والقصصية التلقائية' : 'Emergent Storylines & Dynamic Arcs'}
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-xl">
              {isAr
                ? 'قصص تتولد ذاتياً وبشكل حي من نتائج مبارياتك، قرارات الإدارة، تصريحات المؤتمرات، وتألق المواهب الشابة.'
                : 'Dynamic narrative arcs triggered naturally by your match outcomes, board pressure, press stances, and young talents.'}
            </p>
          </div>

          <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800 text-center min-w-[100px]">
            <span className="text-[10px] text-slate-400 block font-bold">{isAr ? 'إجمالي القصص' : 'Total Arcs'}</span>
            <span className="text-xl font-black text-purple-400 font-mono">{arcs.length}</span>
          </div>
        </div>
      </div>

      {/* Active Arcs Section */}
      <div className="space-y-3">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <Flame className="w-4 h-4 text-amber-400" />
          <span>{isAr ? 'المسارات الحية النشطة حالياً' : 'Active Emergent Arcs'}</span>
        </h3>

        {activeArcs.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs bg-slate-900/60 rounded-3xl border border-slate-800">
            {isAr
              ? 'لا توجد مسارات درامية مشتعلة حالياً. واصل خوض الجولات الرياضية لتتولد قصص جديدة.'
              : 'No active storylines at the moment. Compete in upcoming matchdays to ignite new drama.'}
          </div>
        ) : (
          activeArcs.map((arc) => {
            const isExpanded = expandedArcId === arc.id;
            const det = DETECTOR_NAMES[arc.detectorKind] || DETECTOR_NAMES.default;
            const badge = PHASE_BADGES[arc.phase];
            const resolvedSubjects = (arc.subjectIds || []).map((id) =>
              resolveSubjectEntity(id, club, leagueStandings, matchHistory, isAr)
            );

            return (
              <div
                key={arc.id}
                className="bg-slate-900/90 border border-purple-500/30 rounded-3xl p-5 transition-all shadow-md space-y-3"
              >
                {/* Header Summary */}
                <div
                  onClick={() => toggleExpand(arc.id)}
                  className="flex items-center justify-between gap-3 cursor-pointer select-none"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${badge.className}`}>
                        {isAr ? badge.ar : badge.en}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-950 px-2 py-0.5 rounded-full border border-slate-800">
                        {isAr ? `بدأ في الأسبوع ${arc.startedGameWeek}` : `Week ${arc.startedGameWeek}`}
                      </span>
                      <span className="text-[10px] font-black text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
                        {isAr ? `الأهمية: ${arc.importance}` : `Importance: ${arc.importance}`}
                      </span>
                    </div>

                    <h4 className="text-base font-black text-white font-heading">
                      {isAr ? det.ar : det.en}
                    </h4>
                  </div>

                  <button className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition">
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </button>
                </div>

                {/* Progressive Disclosure Detail Area */}
                {isExpanded && (
                  <div className="pt-3 border-t border-slate-800 space-y-3 text-xs text-slate-300">
                    {/* Associated Subjects */}
                    {resolvedSubjects.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-bold text-slate-400 block">
                          {isAr ? 'أطراف القصة والكيانات المشاركة:' : 'Associated Entities:'}
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {resolvedSubjects.map((s) => (
                            <span
                              key={s.id}
                              className="px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-1.5 font-bold"
                            >
                              <span>{s.icon}</span>
                              <span className="text-white">{s.title}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Trigger Events */}
                    <div className="bg-slate-950/70 p-3 rounded-2xl border border-slate-800 space-y-1">
                      <span className="text-[11px] text-slate-400 font-bold block">
                        {isAr ? 'أحداث المسار الموثقة:' : 'Trigger Event History:'}
                      </span>
                      <div className="space-y-1">
                        {arc.triggerEventIds.map((tid, idx) => (
                          <div key={idx} className="font-mono text-[10px] text-slate-400 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                            <span>{tid}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-500">
                      {isAr
                        ? `آخر تحديث سُجل في الأسبوع ${arc.lastUpdatedGameWeek} للموسم ${arc.startedSeason}.`
                        : `Last updated in GameWeek ${arc.lastUpdatedGameWeek}, Season ${arc.startedSeason}.`}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Past / Resolved Arcs Section */}
      {pastArcs.length > 0 && (
        <div className="space-y-2 pt-2">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-slate-500" />
            <span>{isAr ? 'الأرشيف والمسارات المكتملة' : 'Past & Resolved Arcs'}</span>
          </h3>

          <div className="space-y-2">
            {pastArcs.map((arc) => {
              const det = DETECTOR_NAMES[arc.detectorKind] || DETECTOR_NAMES.default;
              const badge = PHASE_BADGES[arc.phase];

              return (
                <div
                  key={arc.id}
                  className="p-3.5 rounded-2xl bg-slate-900/50 border border-slate-800/80 flex items-center justify-between opacity-80"
                >
                  <div className="space-y-0.5">
                    <span className="text-xs font-black text-slate-300">
                      {isAr ? det.ar : det.en}
                    </span>
                    <p className="text-[10px] text-slate-500">
                      {isAr ? `الموسم ${arc.startedSeason} • الأسبوع ${arc.startedGameWeek}` : `S${arc.startedSeason} • GW${arc.startedGameWeek}`}
                    </p>
                  </div>

                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.className}`}>
                    {isAr ? badge.ar : badge.en}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
