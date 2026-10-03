/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * LoanCenterView — Loan Destination Search & Evaluation Center (Phase D)
 * Filters loan targets and ranks destinations with domain scoring and reasons.
 */

import React, { useState, useMemo } from 'react';
import { Clock, Filter, Award, CheckCircle, Shield, ArrowUpRight, TrendingUp } from 'lucide-react';
import { useGameStore } from '../../../state/useGameStore';
import type { Player } from '../../../types/game';
import type {
  LoanSearchFilters,
  LoanDestinationClubContext,
  LoanPlayerSearchContext,
} from '../../../domain/recruitment/loans/loanTypes';
import { searchLoanTargets } from '../../../domain/recruitment/loans/searchLoanTargets';
import { getObservedPlayerView } from '../../../domain/recruitment/knowledge/observedView';
import { RangeDisplay } from '../shared/RangeDisplay';

interface LoanCenterViewProps {
  onStartNegotiation?: (player: Player) => void;
}

export const LoanCenterView: React.FC<LoanCenterViewProps> = ({ onStartNegotiation }) => {
  const { club, language, recruitmentWorld, scoutMarket } = useGameStore();
  const isAr = language === 'ar';

  const userSquad = club.footballSquad ?? [];
  const [selectedSquadPlayerId, setSelectedSquadPlayerId] = useState<string>(userSquad[0]?.id ?? '');

  // Loan search filters state
  const [minPlayingTimePct, setMinPlayingTimePct] = useState<number>(60);
  const [minLeagueLevel, setMinLeagueLevel] = useState<number>(3);
  const [minFacilities, setMinFacilities] = useState<number>(4);
  const [minReputation, setMinReputation] = useState<number>(40);
  const [minTactical, setMinTactical] = useState<number>(60);
  const [requiresStarter, setRequiresStarter] = useState<boolean>(false);

  // Simulated candidate destination clubs from league ecosystem
  const candidateDestinations: LoanDestinationClubContext[] = useMemo(() => {
    return [
      {
        clubId: 'club_girona',
        leagueLevel: 1,
        clubReputation: 72,
        trainingFacilitiesLevel: 7,
        expectedPlayingTimePct: 75,
        tacticalCompatibility: 80,
        starterOpportunity: true,
        wageSplitPercentOffered: 60,
        durationWeeksOffered: 26,
      },
      {
        clubId: 'club_alaves',
        leagueLevel: 1,
        clubReputation: 64,
        trainingFacilitiesLevel: 6,
        expectedPlayingTimePct: 85,
        tacticalCompatibility: 75,
        starterOpportunity: true,
        wageSplitPercentOffered: 50,
        durationWeeksOffered: 26,
      },
      {
        clubId: 'club_sunderland',
        leagueLevel: 2,
        clubReputation: 60,
        trainingFacilitiesLevel: 8,
        expectedPlayingTimePct: 90,
        tacticalCompatibility: 85,
        starterOpportunity: true,
        wageSplitPercentOffered: 70,
        durationWeeksOffered: 38,
      },
      {
        clubId: 'club_al_ettifaq',
        leagueLevel: 1,
        clubReputation: 68,
        trainingFacilitiesLevel: 7,
        expectedPlayingTimePct: 80,
        tacticalCompatibility: 70,
        starterOpportunity: true,
        wageSplitPercentOffered: 100,
        durationWeeksOffered: 26,
      },
      {
        clubId: 'club_parma',
        leagueLevel: 2,
        clubReputation: 58,
        trainingFacilitiesLevel: 6,
        expectedPlayingTimePct: 80,
        tacticalCompatibility: 65,
        starterOpportunity: false,
        wageSplitPercentOffered: 45,
        durationWeeksOffered: 26,
      },
    ];
  }, []);

  const selectedPlayer = userSquad.find((p) => p.id === selectedSquadPlayerId) ?? userSquad[0];

  const searchResults = useMemo(() => {
    if (!selectedPlayer || !recruitmentWorld) return [];

    const observed =
      getObservedPlayerView(recruitmentWorld, club.id, selectedPlayer.id) ?? {
        playerId: selectedPlayer.id,
        observerClubId: club.id,
        confidencePct: 95,
        ratingRange: { min: selectedPlayer.overall - 1, max: selectedPlayer.overall + 1 },
        potentialBand: { min: selectedPlayer.potential - 2, max: selectedPlayer.potential + 2 },
        valueRange: { min: selectedPlayer.marketValue, max: selectedPlayer.marketValue },
        revealedGroups: ['technical', 'physical', 'mental'],
        estimatedRating: selectedPlayer.overall,
        estimatedPotential: selectedPlayer.potential,
        estimatedValue: selectedPlayer.marketValue,
      };

    const playerContext: LoanPlayerSearchContext = {
      playerId: selectedPlayer.id,
      position: selectedPlayer.position,
      observed,
      weeklyWage: selectedPlayer.wage,
    };

    const filters: LoanSearchFilters = {
      minExpectedPlayingTimePct: minPlayingTimePct,
      minLeagueLevel,
      minTrainingFacilitiesLevel: minFacilities,
      minClubReputation: minReputation,
      minTacticalCompatibility: minTactical,
      minEstimatedRating: 50,
      requiresStarterRole: requiresStarter,
    };

    const res = searchLoanTargets({
      worldSeed: recruitmentWorld.worldSeed,
      gameWeek: recruitmentWorld.gameWeek,
      borrowerClubId: club.id,
      player: playerContext,
      filters,
      destinations: candidateDestinations,
    });

    return res.recommendations;
  }, [
    selectedPlayer,
    recruitmentWorld,
    club.id,
    candidateDestinations,
    minPlayingTimePct,
    minLeagueLevel,
    minFacilities,
    minReputation,
    minTactical,
    requiresStarter,
  ]);

  const translateReason = (code: string): string => {
    switch (code) {
      case 'strong_playing_time':
        return isAr ? 'ضمان دقائق لعب أساسية عالية' : 'High guaranteed playing time';
      case 'strong_development_league':
        return isAr ? 'دوري تنافسي ممتاز للتطور' : 'Strong competitive league tier';
      case 'facilities_boost':
        return isAr ? 'مرافق تدريبية حديثة ومتطورة' : 'Advanced training facilities';
      case 'reputation_fit':
        return isAr ? 'سمعة النادي متوافقة مع تطلعات اللاعب' : 'Reputable destination club';
      case 'tactical_match':
        return isAr ? 'انسجام تكتيكي عالي مع طريقة اللعب' : 'Strong tactical system fit';
      case 'starter_path':
        return isAr ? 'فرصة حقيقية لمركز أساسي' : 'Clear path to starting XI';
      case 'youth_potential':
        return isAr ? 'بيئة مثالية لصقل الموهبة الواعدة' : 'Ideal development for high potential';
      default:
        return code;
    }
  };

  return (
    <div className="space-y-6" id="loan_center_view">
      {/* Header card */}
      <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-3xl shadow-md flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2.5">
          <Clock className="w-5 h-5 text-indigo-400" />
          <div>
            <h3 className="text-base font-black text-white">
              {isAr ? 'مركز إعارة اللاعبين والوجهات المستهدفة' : 'Loan Destination Evaluation Center'}
            </h3>
            <p className="text-xs text-slate-400">
              {isAr
                ? 'تقييم وفرز أفضل الأندية لاكتساب دقائق اللعب وتطوير المواهب الشابة'
                : 'Match squad prospects with high-value loan environments for development'}
            </p>
          </div>
        </div>
      </div>

      {/* Player Selection & Filter Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Player Selector & Card */}
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
          <label className="text-xs font-bold text-slate-300">
            {isAr ? 'اختر اللاعب المراد إعارته:' : 'Select Player for Loan Placement:'}
          </label>
          <select
            value={selectedSquadPlayerId}
            onChange={(e) => setSelectedSquadPlayerId(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            {userSquad.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.position} • {p.age} {isAr ? 'سنة' : 'yrs'})
              </option>
            ))}
          </select>

          {selectedPlayer && (
            <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2 text-xs">
              <div className="flex justify-between font-bold text-white">
                <span>{selectedPlayer.name}</span>
                <span className="text-sky-400">{selectedPlayer.position}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>{isAr ? 'المستوى / الإمكانية:' : 'Rating / Potential:'}</span>
                <span className="font-mono text-slate-200">
                  {selectedPlayer.overall} / {selectedPlayer.potential}
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>{isAr ? 'الراتب الأسبوعي:' : 'Weekly Wage:'}</span>
                <span className="font-mono text-emerald-400">
                  €{selectedPlayer.wage.toLocaleString()}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Right: Hard Filters */}
        <div className="lg:col-span-2 p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
          <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-amber-400" />
            <span>{isAr ? 'شروط ومعايير الإعارة الصارمة:' : 'Loan Destination Filters:'}</span>
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <div className="flex justify-between text-slate-400 mb-1">
                <span>{isAr ? 'الحد الأدنى لنسبة المشاركة:' : 'Min Playing Time Share:'}</span>
                <span className="font-mono font-bold text-white">{minPlayingTimePct}%</span>
              </div>
              <input
                type="range"
                min={30}
                max={90}
                step={5}
                value={minPlayingTimePct}
                onChange={(e) => setMinPlayingTimePct(parseInt(e.target.value, 10))}
                className="w-full accent-indigo-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-400 mb-1">
                <span>{isAr ? 'أدنى مستوى لمرافق التدريب:' : 'Min Facilities Level:'}</span>
                <span className="font-mono font-bold text-white">{minFacilities} / 10</span>
              </div>
              <input
                type="range"
                min={2}
                max={9}
                step={1}
                value={minFacilities}
                onChange={(e) => setMinFacilities(parseInt(e.target.value, 10))}
                className="w-full accent-indigo-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-400 mb-1">
                <span>{isAr ? 'الحد الأدنى للانسجام التكتيكي:' : 'Min Tactical Compatibility:'}</span>
                <span className="font-mono font-bold text-white">{minTactical}%</span>
              </div>
              <input
                type="range"
                min={40}
                max={90}
                step={5}
                value={minTactical}
                onChange={(e) => setMinTactical(parseInt(e.target.value, 10))}
                className="w-full accent-indigo-500"
              />
            </div>

            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-300 font-semibold">
                {isAr ? 'اشتراط دور أساسي مضمون:' : 'Requires Starter Role Guarantee:'}
              </span>
              <input
                type="checkbox"
                checked={requiresStarter}
                onChange={(e) => setRequiresStarter(e.target.checked)}
                className="w-4 h-4 accent-indigo-500 cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Ranked Destination Recommendations List */}
      <div className="space-y-3">
        <h4 className="text-sm font-black text-white">
          {isAr ? 'الأندية المرشحة والموصى بها للإعارة:' : 'Ranked Loan Destinations:'}
        </h4>

        {searchResults.length === 0 ? (
          <div className="p-8 bg-slate-900/60 border border-slate-800 rounded-3xl text-center space-y-2">
            <Shield className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-xs text-slate-400">
              {isAr
                ? 'لا توجد أندية تطابق هذه الشروط الصارمة حالياً. جرب خفض نسبة المشاركة أو الحد الأدنى للمرافق.'
                : 'No destination clubs passed these filter requirements. Try relaxing minimum playing time or facility criteria.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {searchResults.map((rec, i) => (
              <div
                key={rec.destinationClubId}
                className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-white text-sm">
                        #{i + 1} {rec.destinationClubId.replace('club_', '').toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                      <span>
                        {isAr ? 'تحمل الراتب:' : 'Wage split:'}{' '}
                        <strong className="text-emerald-400 font-mono">
                          {rec.suggestedWageSplitPercent}%
                        </strong>
                      </span>
                      <span>•</span>
                      <span>
                        {rec.suggestedDurationWeeks} {isAr ? 'أسبوع' : 'wks'}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 block">
                      {isAr ? 'نقاط الملاءمة' : 'Fit Score'}
                    </span>
                    <span className="text-lg font-black text-indigo-400 font-mono">
                      {rec.score}/100
                    </span>
                  </div>
                </div>

                {/* Score Reasons Badges */}
                <div className="flex flex-wrap gap-1.5">
                  {rec.scoreReasons.map((reason, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-[11px] font-medium"
                    >
                      ✓ {translateReason(reason)}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
