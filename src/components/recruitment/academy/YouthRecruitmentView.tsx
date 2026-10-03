/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * YouthRecruitmentView — Youth Academy Recruitment Focus & Intake Stories View (Phase D)
 * Configure recruitment focus and manage academy graduate intakes with uncertain potentials.
 */

import React, { useState, useMemo } from 'react';
import { Target, Sparkles, Plus, Award, CheckCircle } from 'lucide-react';
import { useGameStore } from '../../../state/useGameStore';
import type {
  AcademyIntakeProspectView,
  RecruitmentFocusConfig,
} from '../../../domain/recruitment/academy/academyTypes';
import {
  getClubRecruitmentFocus,
  patchesForRecruitmentFocus,
  runAcademyIntake,
  defaultRecruitmentFocus,
} from '../../../domain/recruitment/index';
import { RecruitmentFocusSelector } from './RecruitmentFocusSelector';
import { AcademyIntakeStoryCard } from './AcademyIntakeStoryCard';

export const YouthRecruitmentView: React.FC = () => {
  const { club, language, recruitmentWorld, livingWorld, addPlayerToSquad } = useGameStore();
  const isAr = language === 'ar';

  const defaultFocus = useMemo(() => defaultRecruitmentFocus(), []);

  const [focusConfig, setFocusConfig] = useState<RecruitmentFocusConfig>(() => {
    if (!recruitmentWorld) return defaultFocus;
    return getClubRecruitmentFocus(recruitmentWorld, club.id);
  });

  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  // Retrieve intake records for user club
  const intakeRecords = recruitmentWorld?.academyIntakeRecords ?? [];
  const clubProspects: AcademyIntakeProspectView[] = useMemo(() => {
    return intakeRecords
      .filter((r) => r.clubId === club.id)
      .map((r) => r.prospect);
  }, [intakeRecords, club.id]);

  const handleFocusChange = (newConfig: RecruitmentFocusConfig) => {
    setFocusConfig(newConfig);
    const patches = patchesForRecruitmentFocus(club.id, newConfig);

    useGameStore.setState((state) => ({
      recruitmentWorld: {
        ...state.recruitmentWorld,
        academyFocusByClubId: {
          ...state.recruitmentWorld.academyFocusByClubId,
          [club.id]: newConfig,
        },
      },
    }));

    setFeedbackToast(isAr ? 'تم تحديث تركيز كشافة الأكاديمية بنجاح!' : 'Recruitment focus updated successfully!');
  };

  const handleGenerateIntake = () => {
    if (!recruitmentWorld) return;

    const intakeResult = runAcademyIntake(recruitmentWorld, {
      worldSeed: recruitmentWorld.worldSeed,
      gameWeek: recruitmentWorld.gameWeek,
      season: livingWorld?.currentSeason ?? 1,
      timestampIso: new Date().toISOString(),
      club: {
        clubId: club.id,
        youthAcademyLevel: club.facilities.youthAcademyLevel,
        recruitmentInvestment: club.facilities.scoutingNetworkLevel * 10,
        coachingQuality: club.facilities.trainingGroundLevel * 10,
        facilitiesScore: club.facilities.trainingGroundLevel * 10,
        clubReputation: Math.round(club.finances.reputation / 100),
        regionCode: 'SA',
      },
      focus: focusConfig,
    });

    // Apply recruitment patches
    useGameStore.setState((state) => {
      let nextWorld = state.recruitmentWorld;
      for (const patch of intakeResult.patches) {
        if (patch.kind === 'appendAcademyIntakeRecord') {
          nextWorld = {
            ...nextWorld,
            academyIntakeRecords: [patch.record, ...nextWorld.academyIntakeRecords],
          };
        }
      }
      return { recruitmentWorld: nextWorld };
    });

    setFeedbackToast(
      isAr
        ? `🎉 تخرجت دفعة مواهب جديدة (${intakeResult.prospects.length} لاعبين) من أكاديمية النادي!`
        : `🎉 New academy intake graduated (${intakeResult.prospects.length} prospects)!`,
    );
  };

  const handlePromote = (prospect: AcademyIntakeProspectView) => {
    // Promote prospect into first-team squad
    addPlayerToSquad({
      id: prospect.prospectId,
      name: prospect.displayName,
      nameEn: prospect.displayName,
      sport: 'football',
      position: prospect.position,
      secondaryPositions: [],
      overall: prospect.estimatedOverall,
      potential: prospect.potentialEstimate,
      age: prospect.age,
      nationality: prospect.nationality,
      nationalityFlag: prospect.nationalityFlag,
      marketValue: Math.round(prospect.estimatedOverall * 80_000),
      wage: Math.round(prospect.estimatedOverall * 150),
      contractYears: 3,
      morale: 85,
      form: 7,
      stamina: 90,
      fatigue: 0,
      injuredWeeks: 0,
      suspendedMatches: 0,
      matchesPlayed: 0,
      goalsOrPoints: 0,
      assists: 0,
      cleanSheetsOrRebounds: 0,
      averageRating: 6.8,
      attributes: {},
      rarity: 'prospect',
      personality: 'professional',
      traits: [],
    });

    // Remove from intake inbox
    useGameStore.setState((state) => ({
      recruitmentWorld: {
        ...state.recruitmentWorld,
        academyIntakeRecords: state.recruitmentWorld.academyIntakeRecords.filter(
          (r) => r.prospectId !== prospect.prospectId,
        ),
      },
    }));

    setFeedbackToast(
      isAr
        ? `🌟 تم تصعيد ${prospect.displayName} إلى قائمة الفريق الأول بنجاح!`
        : `🌟 Promoted ${prospect.displayName} to senior squad!`,
    );
  };

  const handleLoan = (prospect: AcademyIntakeProspectView) => {
    setFeedbackToast(
      isAr
        ? `تم إدراج ${prospect.displayName} على قائمة الإعارة المتاحة للأندية الشقيقة.`
        : `Listed ${prospect.displayName} for developmental loan.`,
    );
  };

  const handleRelease = (prospect: AcademyIntakeProspectView) => {
    useGameStore.setState((state) => ({
      recruitmentWorld: {
        ...state.recruitmentWorld,
        academyIntakeRecords: state.recruitmentWorld.academyIntakeRecords.filter(
          (r) => r.prospectId !== prospect.prospectId,
        ),
      },
    }));

    setFeedbackToast(
      isAr
        ? `تم استبعاد الموهبة ${prospect.displayName} من الأكاديمية.`
        : `Released ${prospect.displayName} from academy.`,
    );
  };

  return (
    <div className="space-y-6" id="youth_recruitment_view">
      {/* Feedback Toast */}
      {feedbackToast && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-500/30 rounded-2xl text-emerald-200 text-xs font-bold flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span>{feedbackToast}</span>
          </div>
          <button onClick={() => setFeedbackToast(null)} className="text-emerald-400 text-xs">
            ✕
          </button>
        </div>
      )}

      {/* Recruitment Focus Configuration */}
      <RecruitmentFocusSelector
        config={focusConfig}
        onChange={handleFocusChange}
        isAr={isAr}
      />

      {/* Intake Trigger Header */}
      <div className="flex items-center justify-between p-4 bg-slate-900 border border-slate-800 rounded-3xl">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-400" />
          <div>
            <h3 className="text-sm sm:text-base font-black text-white">
              {isAr ? 'خريجو ومواهب الأكاديمية' : 'Academy Graduate Intakes'}
            </h3>
            <p className="text-xs text-slate-400">
              {isAr
                ? 'تقييمات احتمالية غير مؤكدة للمواهب الصاعدة'
                : 'Narrative intake cards with uncertain potential bands'}
            </p>
          </div>
        </div>

        <button
          onClick={handleGenerateIntake}
          className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all shadow-md cursor-pointer"
        >
          {isAr ? 'فحص دفعة مواهب جديدة' : 'Scout New Intake'}
        </button>
      </div>

      {/* Prospects Cards Grid */}
      {clubProspects.length === 0 ? (
        <div className="p-12 bg-slate-900/60 border border-slate-800 rounded-3xl text-center space-y-3">
          <Award className="w-12 h-12 text-slate-600 mx-auto" />
          <h4 className="text-sm font-bold text-slate-300">
            {isAr ? 'لا توجد مواهب في الأكاديمية حالياً' : 'No academy prospects awaiting decision'}
          </h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {isAr
              ? 'انقر على "فحص دفعة مواهب جديدة" لاستكشاف خريجي الأكاديمية وفقاً لتركيزك المحدد.'
              : 'Click "Scout New Intake" to generate academy prospects based on your recruitment focus.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clubProspects.map((prospect) => (
            <AcademyIntakeStoryCard
              key={prospect.prospectId}
              prospect={prospect}
              onPromote={handlePromote}
              onLoan={handleLoan}
              onRelease={handleRelease}
              isAr={isAr}
            />
          ))}
        </div>
      )}
    </div>
  );
};
