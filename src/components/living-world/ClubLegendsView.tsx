/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ClubLegendsView — Renders inducted legends and future legend candidates.
 * Displays score (0-100) and weighted reasons from computePlayerLegendScore().
 */

import React, { useState } from 'react';
import { useGameStore } from '../../state/useGameStore';
import { resolveSubjectEntity } from './helpers/resolveEntity';
import { Crown, Star, Sparkles, Award, Users, ChevronRight, Shield } from 'lucide-react';
import type { ClubLegendEntry, LegendReason } from '../../domain/livingWorld/phaseF/types';

interface ClubLegendsViewProps {
  isAr: boolean;
}

const REASON_LABELS: Record<string, { ar: string; en: string }> = {
  appearances: { ar: 'المباريات والظهور القياسي', en: 'Record Appearances' },
  goals: { ar: 'الأهداف الحاسمة للنادي', en: 'Prolific Goalscoring' },
  assists: { ar: 'صناعة الأهداف والتمريرات الحاسمة', en: 'Crucial Assists' },
  trophies: { ar: 'البطولات مع النادي', en: 'Silverware & Trophies' },
  importantGoals: { ar: 'أهداف المباريات النهائية', en: 'Decisive Goals' },
  years_at_club: { ar: 'الولاء وسنوات الخدمة', en: 'Loyalty & Longevity' },
  club_records: { ar: 'تحطيم الأرقام القياسية', en: 'Record Breaking' },
  academy_contribution: { ar: 'خريج أكاديمية النادي', en: 'Academy Graduate' },
  leadership: { ar: 'الشخصية والقيادة', en: 'Leadership & Spirit' },
  fan_impact: { ar: 'عشق الجماهير وحمل شارة القيادة', en: 'Fan Idol & Captaincy' },
};

export const ClubLegendsView: React.FC<ClubLegendsViewProps> = ({ isAr }) => {
  const { livingWorld, club, leagueStandings, matchHistory } = useGameStore();
  const legends = livingWorld.phaseF?.legends || [];

  const [activeFilter, setActiveFilter] = useState<'all' | 'inducted' | 'candidate'>('all');

  const inductedLegends = legends.filter((l) => l.lifecycle === 'inducted' || l.lifecycle === 'retained');
  const candidates = legends.filter((l) => l.lifecycle === 'candidate');

  const filtered = activeFilter === 'inducted'
    ? inductedLegends
    : activeFilter === 'candidate'
    ? candidates
    : legends;

  return (
    <div className="space-y-5" id="club_legends_view">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-amber-950/40 to-slate-900 border border-amber-500/30 rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                <Crown className="w-3.5 h-3.5" />
                {isAr ? 'قاعة مشاهير النادي' : 'Hall of Fame'}
              </span>
              <span className="text-xs text-slate-400 font-bold">
                {inductedLegends.length} {isAr ? 'أساطير خالدة' : 'Inducted Legends'}
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-white font-heading">
              {isAr ? 'أساطير ورموز النادي' : 'Club Legends & Hall of Fame'}
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-xl">
              {isAr
                ? 'تكريم النجوم الذين نقشوا أسماءهم بحروف من ذهب عبر سنوات العطاء، الأهداف التاريخية، والبطولات الكبرى.'
                : 'Honouring the icons whose loyalty, pivotal goals, and trophies earned legendary status in the club’s history.'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800 text-center min-w-[100px]">
              <span className="text-[10px] text-slate-400 block font-bold">{isAr ? 'المرشحون القادمون' : 'Candidates'}</span>
              <span className="text-base sm:text-lg font-black text-sky-400">{candidates.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Buttons */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveFilter('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
            activeFilter === 'all'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          {isAr ? 'الكل' : 'All'} ({legends.length})
        </button>

        <button
          onClick={() => setActiveFilter('inducted')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
            activeFilter === 'inducted'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Crown className="w-3.5 h-3.5" />
          <span>{isAr ? 'الأساطير المعتمدون' : 'Inducted Legends'}</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-900 text-amber-300 font-mono">
            {inductedLegends.length}
          </span>
        </button>

        <button
          onClick={() => setActiveFilter('candidate')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
            activeFilter === 'candidate'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Star className="w-3.5 h-3.5" />
          <span>{isAr ? 'أساطير المستقبل' : 'Future Legends'}</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-900 text-sky-300 font-mono">
            {candidates.length}
          </span>
        </button>
      </div>

      {/* Legends Cards Grid */}
      {filtered.length === 0 ? (
        <div className="bg-slate-900/60 p-12 rounded-3xl border border-slate-800 text-center space-y-2">
          <Crown className="w-10 h-10 text-slate-600 mx-auto" />
          <h4 className="text-base font-black text-slate-300">
            {isAr ? 'لا يوجد لاعبون في هذه الفئة حالياً' : 'No legends found in this category'}
          </h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {isAr
              ? 'يتم تقييم لاعبي الفريق في نهاية كل موسم، وتُمنح رتبة الأسطورة للاعبين المتجاوزين لـ 72 نقطة استحقاق.'
              : 'Squad players are evaluated at every season finale. A score of 72+ grants inducted legend status.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((entry) => {
            const isInducted = entry.lifecycle === 'inducted' || entry.lifecycle === 'retained';
            const entity = resolveSubjectEntity(entry.entityId, club, leagueStandings, matchHistory, isAr);

            return (
              <div
                key={`${entry.entityKind}_${entry.entityId}`}
                className={`p-5 rounded-3xl border transition-all space-y-3.5 ${
                  isInducted
                    ? 'bg-gradient-to-br from-slate-900 via-amber-950/20 to-slate-900 border-amber-500/40 shadow-lg shadow-amber-500/5'
                    : 'bg-slate-900/90 border-slate-800'
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl border ${
                        isInducted
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}
                    >
                      {isInducted ? '👑' : '⭐'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-black text-white font-heading">
                          {entity.title}
                        </h4>
                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                            isInducted
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              : 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                          }`}
                        >
                          {isInducted
                            ? (isAr ? 'أسطورة النادي' : 'Club Legend')
                            : (isAr ? 'مرشح للمستقبل' : 'Future Candidate')}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {entity.subtitle || (isAr ? 'لاعب الفريق' : 'Club Player')}
                      </p>
                    </div>
                  </div>

                  {/* Score Dial */}
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block font-bold">
                      {isAr ? 'رصيد الاستحقاق' : 'Legend Score'}
                    </span>
                    <span
                      className={`text-xl font-black font-mono ${
                        isInducted ? 'text-amber-400' : 'text-sky-400'
                      }`}
                    >
                      {entry.score}/100
                    </span>
                  </div>
                </div>

                {/* Weighted Reasons Breakdown */}
                {entry.reasons && entry.reasons.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                    <span className="text-[11px] font-bold text-slate-400 block">
                      {isAr ? 'العوامل التي صنعت المكانة:' : 'Factors Earning Status:'}
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {entry.reasons.map((r, i) => {
                        const label = REASON_LABELS[r.code] || { ar: r.code, en: r.code };
                        return (
                          <div
                            key={i}
                            className="flex items-center justify-between text-xs px-2.5 py-1 rounded-xl bg-slate-950/70 border border-slate-800/60"
                          >
                            <span className="text-slate-300 text-[11px] truncate mr-1">
                              {isAr ? label.ar : label.en}
                            </span>
                            {r.detail && (
                              <span className="text-[10px] font-mono text-amber-400/90 font-bold shrink-0">
                                {r.detail}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Induction season tag */}
                {entry.inductedSeason && (
                  <div className="text-[11px] text-amber-400/80 pt-1 flex items-center gap-1">
                    <Award className="w-3.5 h-3.5" />
                    <span>{isAr ? `انضم لقاعة المشاهير في الموسم ${entry.inductedSeason}` : `Inducted in Season ${entry.inductedSeason}`}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
