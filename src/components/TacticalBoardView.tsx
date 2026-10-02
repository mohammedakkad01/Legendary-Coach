/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Interactive 2D Tactical Board & Lineup Pitch
 * Formations, tactical mentalities, drag/click player swaps, role assignments.
 */

import React, { useMemo, useState } from 'react';
import { useGameStore } from '../state/useGameStore';
import { useFeedback } from '../context/FeedbackContext';
import { FootballFormation, MatchMentality, PressingStyle, PassingStyle, TeamTempo } from '../types/game';
import { Shield, Sparkles, UserCheck, Flame, Crown, Lock } from 'lucide-react';
import { VIP_LEVELS } from '../data/vipData';
import { FORMATION_MIN_VIP_LEVEL } from '../domain/vip/vipCalculations';
import { getFormation } from '../domain/squad/formations';
import { createSquadState } from '../domain/squad/squadStateAdapter';
import { getAssignments, getBenchIds } from '../domain/squad/squadQueries';
import { computeEffectiveRating } from '../domain/squad/positionSuitability';
import type { MoveTarget, SquadLocation } from '../domain/squad/squadTypes';
import { useSquadDnd } from '../hooks/squadDnd/useSquadDnd';
import { PitchPlayerNode } from './squad/PitchPlayerNode';
import { RosterPlayerRow } from './squad/RosterPlayerRow';
import { SectionDropStrip } from './squad/SectionDropStrip';
import { DragGhost } from './squad/DragGhost';
import { SquadAriaLive } from './squad/SquadAriaLive';
import { PlayerInfoPanel } from './squad/PlayerInfoPanel';
import { SQUAD_DND_TEXT, moveErrorText, pick } from '../i18n/squad';
import { useBestTactics } from '../hooks/useBestTactics';
import { BestTacticsButton } from './tactics/BestTacticsButton';
import { BestTacticsPreviewSheet } from './tactics/BestTacticsPreviewSheet';
import { bestTacticsErrorText, bestTacticsLabel } from '../i18n/bestTactics';
import { simulateMatchRound, MatchRoundResult } from '../engine/tacticalMatchEngine';
import type { Player } from '../types/game';
import {
  getInstructionSliderValue,
  instructionSliderLabels,
  patchInstructionSlider,
  type InstructionSliderKey,
} from '../domain/tactics/instructionUi';
import { SetPiecePlanEditor } from './tactics/SetPiecePlanEditor';

const INSTRUCTION_SLIDERS: InstructionSliderKey[] = [
  'inPossession.width',
  'inPossession.tempo',
  'inPossession.passingRisk',
  'outOfPossession.lineHeight',
  'outOfPossession.pressingIntensity',
];

interface FormationItem {
  id: FootballFormation;
  label: string;
  minVipLevel: number;
}

const ALL_FORMATIONS: FormationItem[] = [
  { id: '4-3-3', label: '4-3-3', minVipLevel: FORMATION_MIN_VIP_LEVEL['4-3-3'] },
  { id: '4-4-2', label: '4-4-2', minVipLevel: FORMATION_MIN_VIP_LEVEL['4-4-2'] },
  { id: '4-2-3-1', label: '4-2-3-1', minVipLevel: FORMATION_MIN_VIP_LEVEL['4-2-3-1'] },
  { id: '3-5-2', label: '3-5-2', minVipLevel: FORMATION_MIN_VIP_LEVEL['3-5-2'] },
  { id: '5-3-2', label: '5-3-2', minVipLevel: FORMATION_MIN_VIP_LEVEL['5-3-2'] },
  { id: '4-1-4-1', label: '4-1-4-1 (VIP 2+)', minVipLevel: FORMATION_MIN_VIP_LEVEL['4-1-4-1'] },
  { id: '3-4-3', label: '3-4-3 (VIP 3+)', minVipLevel: FORMATION_MIN_VIP_LEVEL['3-4-3'] },
];

export const TacticalBoardView: React.FC = () => {
  const { club, updateFootballTactics, setFootballRoles, language, startNewMatch, vipPoints, setActiveTab, savedTacticalPlans, saveTacticalPlan, loadTacticalPlan, deleteTacticalPlan, moveSquadEntity, getTeamSynergy, nextMatchInsight } = useGameStore();
  const { toast } = useFeedback();
  const isAr = language === 'ar';
  const tactics = club.footballTactics;

  // Calculate current VIP Tier
  let currentVipTier = VIP_LEVELS[0];
  for (const tier of VIP_LEVELS) {
    if (vipPoints >= tier.pointsRequired) {
      currentVipTier = tier;
    }
  }
  const vipLevel = currentVipTier.level;

  const [formationLockWarning, setFormationLockWarning] = useState<string | null>(null);
  const [newPlanName, setNewPlanName] = useState('');
  const [planFeedback, setPlanFeedback] = useState<string | null>(null);
  const maxPlanSlots = currentVipTier.maxSavedTacticalPlans || 0;
  const maxBenchSlots = currentVipTier.maxBenchSlots || 5;
  const [roundPreview, setRoundPreview] = useState<MatchRoundResult | null>(null);
  const [roundPreviewError, setRoundPreviewError] = useState<string | null>(null);
  const [infoPlayerId, setInfoPlayerId] = useState<string | null>(null);
  const bestTactics = useBestTactics();
  const handleApplyBestTactics = () => {
    const result = bestTactics.apply();
    if (result?.ok) toast.success(bestTacticsLabel('applied', isAr));
  };

  // Squad domain state, derived fresh from the club each render (see
  // domain/squad/squadStateAdapter.ts — tolerant of a short/legacy lineup).
  const { state: squadState } = useMemo(
    () => createSquadState(club, { maxSubstitutes: maxBenchSlots }),
    [club.footballSquad, club.footballLineup, club.footballBench, club.footballTactics.formation, maxBenchSlots],
  );
  const assignments = useMemo(() => getAssignments(squadState), [squadState]);
  const assignmentByPlayerId = useMemo(() => new Map(assignments.map((a) => [a.playerId, a])), [assignments]);
  const benchIds = useMemo(() => getBenchIds(squadState), [squadState]);

  const dnd = useSquadDnd({
    squadState,
    onMove: (playerId, target) => moveSquadEntity(playerId, target),
    describeOutcome: (playerId, target, result) => {
      const name = squadState.players.get(playerId);
      const label = name ? (isAr ? (club.footballSquad.find((p) => p.id === playerId)?.name ?? playerId) : (club.footballSquad.find((p) => p.id === playerId)?.nameEn ?? playerId)) : playerId;
      if (!result.ok) {
        const message = moveErrorText(result.error, isAr);
        toast.error(message);
        return message;
      }
      if (result.value.kind === 'noop') return isAr ? 'تم إلغاء التحديد.' : 'Selection cancelled.';
      const displaced = result.value.displacedPlayerId
        ? club.footballSquad.find((p) => p.id === result.value.displacedPlayerId)
        : null;
      const displacedName = displaced ? (isAr ? displaced.name : displaced.nameEn) : null;
      const message = displacedName
        ? (isAr ? `تم تبديل ${label} مع ${displacedName}.` : `${label} swapped with ${displacedName}.`)
        : (isAr ? `تم نقل ${label}.` : `${label} moved.`);
      void target;
      return message;
    },
  });

  const handlePreviewRound = () => {
    setRoundPreview(null);
    const opponentClub = nextMatchInsight?.opponentClub;
    if (!opponentClub) {
      setRoundPreviewError(
        isAr
          ? 'بيانات المنافس القادم غير محمّلة بعد — افتح الشاشة الرئيسية أولاً ثم عد هنا.'
          : 'Next opponent data is not loaded yet — visit the dashboard first, then come back.'
      );
      return;
    }
    setRoundPreviewError(null);

    const myXI = club.footballSquad.filter((p): p is Player => club.footballLineup.includes(p.id));
    const effectiveMyXI = myXI.length >= 7 ? myXI : club.footballSquad.slice(0, 11);

    const oppXI = opponentClub.footballSquad.filter((p): p is Player => opponentClub.footballLineup.includes(p.id));
    const effectiveOppXI = oppXI.length >= 7 ? oppXI : opponentClub.footballSquad.slice(0, 11);

    const result = simulateMatchRound(effectiveMyXI, effectiveOppXI, tactics, opponentClub.footballTactics);
    setRoundPreview(result);
  };

  const handleSavePlan = () => {
    const res = saveTacticalPlan(newPlanName);
    setPlanFeedback(res.message);
    if (res.success) setNewPlanName('');
    setTimeout(() => setPlanFeedback(null), 4000);
  };

  const handleLoadPlan = (id: string) => {
    const res = loadTacticalPlan(id);
    setPlanFeedback(res.message);
    setTimeout(() => setPlanFeedback(null), 3000);
  };

  const formationDef = getFormation(squadState.formation);
  // Naming matches the rest of this file (and the original UI copy): "bench"
  // here means the matchday substitutes bench (club.footballBench), and
  // "reserves" means squad members on neither the XI nor that bench.
  const benchPlayers = squadState.substitutes
    .map((id) => club.footballSquad.find((p) => p.id === id))
    .filter((p): p is Player => !!p);
  const reservePlayers = benchIds
    .map((id) => club.footballSquad.find((p) => p.id === id))
    .filter((p): p is Player => !!p);

  // Average Rating — التقييم الفعّال الحقيقي لكل لاعب حسب خانته الحالية (نفس دالة الشارة والتحذير)
  const startingBreakdowns = squadState.slots
    .map((id, slotIndex) => {
      const player = id ? club.footballSquad.find((p) => p.id === id) : undefined;
      if (!player) return null;
      const label = formationDef.slots[slotIndex]?.label ?? player.position;
      return computeEffectiveRating(player, label);
    })
    .filter((b): b is NonNullable<typeof b> => !!b);
  const avgOverall = startingBreakdowns.length > 0
    ? Math.round(startingBreakdowns.reduce((acc, b) => acc + b.effective, 0) / startingBreakdowns.length)
    : 65;

  const teamSynergy = getTeamSynergy();
  const synergyColor = teamSynergy.score >= 85
    ? 'text-emerald-400'
    : teamSynergy.score >= 65
      ? 'text-lime-400'
      : teamSynergy.score >= 45
        ? 'text-amber-400'
        : 'text-red-400';

  const handleSelectFormation = (item: FormationItem) => {
    if (vipLevel < item.minVipLevel) {
      setFormationLockWarning(
        isAr 
          ? `🔒 تشكيل ${item.id} متاح حصرياً للمدربين من مستوى VIP ${item.minVipLevel} وما فوق! يمكنك ترقية مستواك مجاناً عبر الجواهر أو المهام.` 
          : `🔒 Formation ${item.id} is exclusive to VIP Level ${item.minVipLevel}+! Upgrade via VIP tab.`
      );
      return;
    }
    setFormationLockWarning(null);
    updateFootballTactics({ formation: item.id });
  };

  const infoPlayer = infoPlayerId ? club.footballSquad.find((p) => p.id === infoPlayerId) ?? null : null;
  const infoAssignment = infoPlayerId ? assignmentByPlayerId.get(infoPlayerId) ?? null : null;

  return (
    <>
      {(() => {
        const dragState = dnd.state;
        if (dragState.phase !== 'dragging') return null;
        const draggedPlayer = club.footballSquad.find((p) => p.id === dragState.playerId);
        if (!draggedPlayer) return null;
        const draggedAssignment = assignmentByPlayerId.get(draggedPlayer.id);
        const rating = draggedAssignment?.suitability
          ? computeEffectiveRating(draggedPlayer, draggedAssignment.assignedPosition ?? draggedPlayer.position).effective
          : draggedPlayer.overall;
        return (
          <DragGhost
            ref={dnd.ghostRef}
            rating={rating}
            label={isAr ? draggedPlayer.name : draggedPlayer.nameEn}
            startX={dragState.x}
            startY={dragState.y}
          />
        );
      })()}

      {bestTactics.recommendation && (
        <BestTacticsPreviewSheet
          isAr={isAr}
          club={club}
          recommendation={bestTactics.recommendation}
          error={bestTactics.error}
          isStale={bestTactics.isStale}
          busy={bestTactics.status === 'computing'}
          onApply={handleApplyBestTactics}
          onClose={bestTactics.dismiss}
          onRecompute={() => void bestTactics.compute()}
        />
      )}

      {infoPlayer && infoAssignment && (
        <PlayerInfoPanel player={infoPlayer} assignment={infoAssignment} isAr={isAr} onClose={() => setInfoPlayerId(null)} />
      )}

    <div className="max-w-7xl mx-auto p-3 sm:p-6 space-y-6">
      
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
        <div>
          <h2 className="text-xl sm:text-2xl font-black font-heading text-white flex items-center gap-2">
            <Shield className="w-6 h-6 text-sky-400" />
            <span>{isAr ? 'غرفة العمليات التكتيكية والخطة' : 'Tactical War Room & Formation'}</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            {isAr ? 'حدد الرسم التكتيكي، وزع المهام، وتبادل المراكز بين الأساسيين والبدلاء.' : 'Configure formations, tactical styles, and swap players on the interactive pitch.'}
          </p>
        </div>

        {/* Tactical Metrics */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* VIP Tactical Perk Badge */}
          <div 
            onClick={() => setActiveTab('vip')}
            className="bg-gradient-to-r from-amber-950/70 to-slate-900 border border-amber-500/40 hover:border-amber-400 px-3 py-1.5 rounded-xl cursor-pointer transition-all flex items-center gap-2 shadow-md"
            title={isAr ? 'اضغط لفتح شجرة مميزات الـ VIP' : 'Click to view VIP tree'}
          >
            <Crown className="w-4 h-4 text-amber-400" />
            <div className="text-right">
              <span className="text-[10px] text-amber-400 block font-bold leading-none">VIP {vipLevel}</span>
              <span className="text-[11px] font-black text-white leading-tight">
                ⚔️ +{currentVipTier.attackBoostPercent}% / 🛡️ +{currentVipTier.defenseBoostPercent}%
              </span>
            </div>
          </div>

          <div className="bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-center">
            <span className="text-[10px] text-slate-400 block">{isAr ? 'قوة التشكيلة' : 'Lineup OVR'}</span>
            <span className="text-lg font-black text-amber-400">{avgOverall}</span>
          </div>
          <div
            className="bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-center"
            title={teamSynergy.warnings.join(' · ')}
          >
            <span className="text-[10px] text-slate-400 block">{isAr ? 'التناغم' : 'Chemistry'}</span>
            <span className={`text-lg font-black ${synergyColor}`}>{teamSynergy.score}%</span>
            <span className={`text-[9px] font-bold block ${synergyColor}`}>{isAr ? teamSynergy.rating : teamSynergy.ratingEn}</span>
          </div>
          <BestTacticsButton
            isAr={isAr}
            busy={bestTactics.status === 'computing'}
            onPress={() => void bestTactics.compute()}
          />
          <button
            id="btn_play_match_from_tactics"
            onClick={() => startNewMatch()}
            className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black px-4 py-2 rounded-xl shadow-lg shadow-emerald-500/20 text-sm cursor-pointer"
          >
            <Flame className="w-4 h-4" />
            <span>{isAr ? 'بدء المباراة' : 'Play Match'}</span>
          </button>
        </div>
      </div>

      {bestTactics.status === 'error' && bestTactics.error && (
        <div role="alert" className="bg-rose-950/60 border border-rose-500/40 p-3 rounded-2xl flex items-center justify-between gap-2 text-xs text-rose-200">
          <span>{bestTacticsErrorText(bestTactics.error, isAr)}</span>
          <button
            onClick={bestTactics.dismiss}
            aria-label={bestTacticsLabel('close', isAr)}
            className="text-rose-300 hover:text-white text-xs px-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* VIP Formation Lock Warning Toast */}
      {formationLockWarning && (
        <div className="bg-amber-950/70 border border-amber-500/50 p-3 rounded-2xl flex items-center justify-between text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{formationLockWarning}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setActiveTab('vip')}
              className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[11px] cursor-pointer"
            >
              {isAr ? 'ترقية VIP' : 'Upgrade VIP'}
            </button>
            <button 
              onClick={() => setFormationLockWarning(null)}
              className="text-amber-400 hover:text-white text-xs px-1"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Pitch Area (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col space-y-3">
          
          {/* Formation Picker Bar */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            <span className="text-xs font-bold text-slate-400 whitespace-nowrap">
              {isAr ? 'التشكيل:' : 'Formation:'}
            </span>
            {ALL_FORMATIONS.map(item => {
              const isLocked = vipLevel < item.minVipLevel;
              const isSelected = tactics.formation === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => handleSelectFormation(item)}
                  className={`px-3 py-1 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 whitespace-nowrap ${
                    isSelected
                      ? 'bg-sky-500 text-slate-950 shadow-md ring-2 ring-sky-300'
                      : isLocked
                        ? 'bg-slate-900/80 text-slate-500 border border-slate-800 hover:border-amber-500/40'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {isLocked && <Lock className="w-3 h-3 text-amber-400" />}
                  <span>{item.id}</span>
                  {item.minVipLevel > 1 && (
                    <span className={`text-[9px] px-1 py-0.2 rounded font-black ${isSelected ? 'bg-sky-700 text-white' : 'bg-amber-500/20 text-amber-300'}`}>
                      VIP {item.minVipLevel}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* 2D Realistic Turf Pitch */}
          <div 
            className="relative w-full aspect-[4/5] sm:aspect-[3/4] bg-emerald-950 rounded-2xl overflow-hidden border-4 border-emerald-900/60 shadow-2xl"
            style={{
              backgroundImage: `
                repeating-linear-gradient(0deg, rgba(16, 185, 129, 0.08) 0px, rgba(16, 185, 129, 0.08) 40px, rgba(5, 150, 105, 0.03) 40px, rgba(5, 150, 105, 0.03) 80px),
                radial-gradient(ellipse at center, rgba(6, 78, 59, 0.95), rgba(2, 44, 34, 1))
              `
            }}
          >
            {/* Pitch Markings */}
            <div className="absolute inset-4 border-2 border-white/20 rounded-lg pointer-events-none">
              {/* Halfway Line */}
              <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white/20" />
              {/* Center Circle */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 border-2 border-white/20 rounded-full" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-white/40 rounded-full" />
              {/* Top Penalty Box */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-52 h-24 border-2 border-t-0 border-white/20 rounded-b-md" />
              {/* Bottom Penalty Box */}
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-52 h-24 border-2 border-b-0 border-white/20 rounded-t-md" />
            </div>

            {/* Player Nodes on Pitch */}
            {formationDef.slots.map((slot, idx) => {
              const playerId = squadState.slots[idx];
              const player = playerId ? club.footballSquad.find((p) => p.id === playerId) : undefined;
              const target: MoveTarget = { section: 'starting', slotIndex: idx };
              const location: SquadLocation = { section: 'starting', slotIndex: idx };
              const isPicked = dnd.state.phase !== 'idle' && dnd.state.playerId === playerId;
              const isHoverTarget = dnd.state.phase === 'dragging' && !!dnd.state.hoverTarget
                && dnd.state.hoverTarget.section === 'starting' && dnd.state.hoverTarget.slotIndex === idx;
              const breakdown = player ? computeEffectiveRating(player, slot.label) : null;

              return (
                <PitchPlayerNode
                  key={idx}
                  x={slot.x}
                  y={slot.y}
                  slotLabel={slot.label}
                  target={target}
                  player={player ?? null}
                  breakdown={breakdown}
                  isCaptain={!!player && tactics.captainId === player.id}
                  isPicked={isPicked}
                  isHoverTarget={isHoverTarget}
                  isAr={isAr}
                  handleProps={player ? dnd.getCardHandleProps(player.id, location, isAr ? player.name : player.nameEn) : null}
                  dropZoneProps={!player ? dnd.getDropZoneProps(target, isAr ? `خانة ${slot.label} الفارغة` : `Empty ${slot.label} slot`) : null}
                  onOpenInfo={() => player && setInfoPlayerId(player.id)}
                />
              );
            })}
          </div>

          {/* Swap Instruction Hint */}
          {dnd.state.phase === 'picked' && (
            <div className="bg-amber-500/20 border border-amber-500/40 p-3 rounded-xl flex items-center justify-between text-xs text-amber-300 animate-pulse">
              <span>{pick(SQUAD_DND_TEXT.pickedHint, isAr)}</span>
              <button
                onClick={dnd.cancel}
                className="font-bold underline text-white"
              >
                {pick(SQUAD_DND_TEXT.cancel, isAr)}
              </button>
            </div>
          )}
          <SquadAriaLive message={dnd.announcement} />
        </div>

        {/* Tactics & Bench Controls (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Tactical Philosophy Settings */}
          <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl space-y-4">
            <h3 className="text-sm font-black font-heading text-white flex items-center gap-1.5 border-b border-slate-800 pb-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>{isAr ? 'التعليمات والفلسفة التكتيكية' : 'Tactical Instructions'}</span>
            </h3>

            {/* Mentality */}
            <div>
              <label className="text-xs font-bold text-slate-400 mb-1.5 block">
                {isAr ? 'العقلية العامة:' : 'Team Mentality:'}
              </label>
              <div className="grid grid-cols-3 gap-1 text-xs">
                {(['defensive', 'balanced', 'attacking'] as MatchMentality[]).map(m => (
                  <button
                    key={m}
                    onClick={() => updateFootballTactics({ mentality: m })}
                    className={`py-1.5 px-2 rounded-lg font-bold text-center transition-colors ${
                      tactics.mentality === m 
                        ? 'bg-sky-600 text-white font-black' 
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    {m === 'defensive' ? (isAr ? 'دفاعي' : 'Defensive') :
                     m === 'balanced' ? (isAr ? 'متوازن' : 'Balanced') : (isAr ? 'هجومي' : 'Attacking')}
                  </button>
                ))}
              </div>
            </div>

            {/* Pressing Style */}
            <div>
              <label className="text-xs font-bold text-slate-400 mb-1.5 block">
                {isAr ? 'أسلوب الضغط الدفاعي:' : 'Pressing Style:'}
              </label>
              <div className="grid grid-cols-2 gap-1 text-xs">
                {(['low_block', 'mid_press', 'high_press', 'gegenpress'] as PressingStyle[]).map(p => (
                  <button
                    key={p}
                    onClick={() => updateFootballTactics({ pressing: p })}
                    className={`py-1.5 px-2 rounded-lg font-bold text-center transition-colors ${
                      tactics.pressing === p 
                        ? 'bg-emerald-600 text-white font-black' 
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    {p === 'low_block' ? (isAr ? 'تكتل دفاعي' : 'Low Block') :
                     p === 'mid_press' ? (isAr ? 'ضغط متوسط' : 'Mid Press') :
                     p === 'high_press' ? (isAr ? 'ضغط متقدم' : 'High Press') : (isAr ? 'جيجين بريس' : 'Gegenpress')}
                  </button>
                ))}
              </div>
            </div>

            {/* Passing Style & Tempo */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-400 mb-1.5 block">
                  {isAr ? 'أسلوب التمرير:' : 'Passing:'}
                </label>
                <select
                  value={tactics.passing}
                  onChange={(e) => updateFootballTactics({ passing: e.target.value as PassingStyle })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-2 text-xs font-bold text-white"
                >
                  <option value="short_tiki_taka">{isAr ? 'تيكي تاكا قصيرة' : 'Short Tiki-Taka'}</option>
                  <option value="mixed">{isAr ? 'لعب مختلط' : 'Mixed Style'}</option>
                  <option value="direct_counter">{isAr ? 'مرتدات مباشرة' : 'Direct Counters'}</option>
                  <option value="long_ball">{isAr ? 'كرات طولية' : 'Long Balls'}</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 mb-1.5 block">
                  {isAr ? 'إيقاع ورتم اللعب:' : 'Tempo:'}
                </label>
                <select
                  value={tactics.tempo}
                  onChange={(e) => updateFootballTactics({ tempo: e.target.value as TeamTempo })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-2 text-xs font-bold text-white"
                >
                  <option value="slow_patient">{isAr ? 'هادئ ومدروس' : 'Patient'}</option>
                  <option value="normal">{isAr ? 'متوازن' : 'Normal'}</option>
                  <option value="fast_electric">{isAr ? 'سريع وصاعق' : 'Electric Fast'}</option>
                </select>
              </div>
            </div>

            {/* Match Round Preview — تضاد التكتيكات */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 space-y-2">
              <button
                onClick={handlePreviewRound}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white font-black py-2 rounded-lg text-xs sm:text-sm shadow-md"
              >
                <Sparkles className="w-4 h-4" />
                {isAr ? 'معاينة الجولة القادمة (تضاد التكتيكات)' : 'Preview Next Round (Tactical Counter)'}
              </button>

              {roundPreviewError && (
                <p className="text-[11px] text-amber-400 text-center">{roundPreviewError}</p>
              )}

              {roundPreview && (
                <div className="space-y-1.5 pt-1">
                  <p className="text-xs font-bold text-white text-center">{roundPreview.summaryAr}</p>
                  <div className="flex justify-between text-[10px] text-slate-400 px-1">
                    <span>{isAr ? 'وسطك' : 'Your Mid'}: <span className="text-white font-bold">{roundPreview.myMidfieldScore}</span></span>
                    <span>{isAr ? 'وسط المنافس' : 'Opp Mid'}: <span className="text-white font-bold">{roundPreview.oppMidfieldScore}</span></span>
                  </div>
                  {(roundPreview.myCounterEffect.active || roundPreview.oppCounterEffect.active) && (
                    <p className="text-[10px] text-emerald-400 text-center px-1">
                      ⚡ {roundPreview.myCounterEffect.active ? roundPreview.myCounterEffect.descriptionAr : roundPreview.oppCounterEffect.descriptionAr}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Offside Trap */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs font-bold text-slate-300">
                {isAr ? 'تطبيق مصيدة التسلل' : 'Offside Trap'}
              </span>
              <input
                type="checkbox"
                checked={tactics.offsideTrap}
                onChange={(e) => updateFootballTactics({ offsideTrap: e.target.checked })}
                className="w-4 h-4 accent-sky-500 rounded cursor-pointer"
              />
            </div>

            <div className="space-y-2.5 pt-2 border-t border-slate-800">
              <p className="text-[11px] font-bold text-slate-400">
                {isAr ? 'تعليمات متقدمة (Phase B)' : 'Advanced instructions'}
              </p>
              {INSTRUCTION_SLIDERS.map((key) => {
                const labels = instructionSliderLabels(isAr);
                const value = getInstructionSliderValue(tactics, key);
                return (
                  <div key={key}>
                    <div className="flex justify-between text-[10px] text-slate-500 mb-0.5">
                      <span>{labels[key]}</span>
                      <span className="font-mono text-slate-300">{value}</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={value}
                      onChange={(e) =>
                        updateFootballTactics(patchInstructionSlider(tactics, key, Number(e.target.value)))
                      }
                      className="w-full accent-sky-500 h-1.5"
                    />
                  </div>
                );
              })}
            </div>

            <SetPiecePlanEditor
              club={club}
              tactics={tactics}
              isAr={isAr}
              onChange={(partial) => updateFootballTactics(partial)}
            />
          </div>

          {/* Bench & Substitutes Drawer */}
          <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl space-y-3">
            <h3 className="text-sm font-black font-heading text-white flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-sky-400" />
                <span>{isAr ? 'دكة البدلاء والاحتياط' : 'Substitutes & Bench'}</span>
              </div>
              <span className="text-xs text-slate-400">{benchPlayers.length}/{maxBenchSlots} {isAr ? 'خانات' : 'slots'}</span>
            </h3>

            <div
              data-drop-target="substitutes"
              className="space-y-2 max-h-[260px] overflow-y-auto pr-1 rounded-xl"
            >
              {benchPlayers.length === 0 && (
                <p className="text-[11px] text-slate-500 text-center py-3">{isAr ? 'لا يوجد بدلاء بعد' : 'No substitutes yet'}</p>
              )}
              {benchPlayers.map((player, index) => {
                const target: MoveTarget = { section: 'substitutes', index };
                const location: SquadLocation = { section: 'substitutes', index };
                const isPicked = dnd.state.phase !== 'idle' && dnd.state.playerId === player.id;
                const isHoverTarget = dnd.state.phase === 'dragging' && dnd.state.hoverTarget?.section === 'substitutes' && dnd.state.hoverTarget.index === index;
                return (
                  <RosterPlayerRow
                    key={player.id}
                    player={player}
                    target={target}
                    isPicked={isPicked}
                    isHoverTarget={isHoverTarget}
                    isAr={isAr}
                    handleProps={dnd.getCardHandleProps(player.id, location, isAr ? player.name : player.nameEn)}
                    onOpenInfo={() => setInfoPlayerId(player.id)}
                  />
                );
              })}
              {benchPlayers.length < maxBenchSlots && dnd.state.phase !== 'idle' && (
                <SectionDropStrip
                  dropZoneProps={dnd.getDropZoneProps({ section: 'substitutes' }, isAr ? 'إضافة إلى دكة البدلاء' : 'Add to substitutes bench')}
                  isHoverTarget={dnd.state.phase === 'dragging' && dnd.state.hoverTarget?.section === 'substitutes' && dnd.state.hoverTarget.index === undefined}
                  label={pick(SQUAD_DND_TEXT.dropHere, isAr)}
                />
              )}
            </div>

            {/* Reserves not yet on the matchday bench */}
            {(reservePlayers.length > 0 || dnd.state.phase !== 'idle') && (
              <div className="pt-2 border-t border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-400">
                    {isAr ? 'احتياط (خارج دكة البدلاء)' : 'Reserves (not on bench)'}
                  </span>
                  {benchPlayers.length >= maxBenchSlots && (
                    <span className="text-[10px] text-purple-400 flex items-center gap-1">
                      <Crown className="w-3 h-3" /> {isAr ? 'VIP 3 لخانة إضافية' : 'VIP 3 for extra slot'}
                    </span>
                  )}
                </div>
                <div data-drop-target="bench" className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1 rounded-xl">
                  {reservePlayers.map((player) => {
                    const target: MoveTarget = { section: 'bench' };
                    const location: SquadLocation = { section: 'bench' };
                    const isPicked = dnd.state.phase !== 'idle' && dnd.state.playerId === player.id;
                    return (
                      <RosterPlayerRow
                        key={player.id}
                        player={player}
                        target={target}
                        isPicked={isPicked}
                        isHoverTarget={false}
                        isAr={isAr}
                        handleProps={dnd.getCardHandleProps(player.id, location, isAr ? player.name : player.nameEn)}
                        onOpenInfo={() => setInfoPlayerId(player.id)}
                      />
                    );
                  })}
                  {dnd.state.phase !== 'idle' && (
                    <SectionDropStrip
                      dropZoneProps={dnd.getDropZoneProps({ section: 'bench' }, isAr ? 'إرجاع إلى الاحتياط' : 'Send to reserves')}
                      isHoverTarget={dnd.state.phase === 'dragging' && dnd.state.hoverTarget?.section === 'bench'}
                      label={pick(SQUAD_DND_TEXT.dropHere, isAr)}
                    />
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Saved Tactical Plans — VIP 12+ exclusive */}
          <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl space-y-3">
            <h3 className="text-sm font-black font-heading text-white flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-1.5">
                <Crown className="w-4 h-4 text-purple-400" />
                <span>{isAr ? 'الخطط التكتيكية المحفوظة' : 'Saved Tactical Plans'}</span>
              </div>
              {maxPlanSlots > 0 && (
                <span className="text-xs text-slate-400">{savedTacticalPlans.length}/{maxPlanSlots}</span>
              )}
            </h3>

            {maxPlanSlots <= 0 ? (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-purple-950/30 border border-purple-500/30 text-xs text-purple-200">
                <Lock className="w-4 h-4 flex-shrink-0 text-purple-400" />
                <span>
                  {isAr
                    ? 'حفظ حتى 5 خطط تكتيكية والتبديل الفوري بينها ميزة حصرية لأعضاء VIP 12 فما فوق.'
                    : 'Saving up to 5 tactical plans with instant swapping is exclusive to VIP 12+.'}
                </span>
              </div>
            ) : (
              <>
                {planFeedback && (
                  <div className="p-2.5 rounded-xl bg-purple-950/60 border border-purple-500/40 text-purple-200 text-[11px] font-bold text-center">
                    {planFeedback}
                  </div>
                )}

                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {savedTacticalPlans.length === 0 && (
                    <p className="text-[11px] text-slate-500 text-center py-2">
                      {isAr ? 'لا توجد خطط محفوظة بعد' : 'No saved plans yet'}
                    </p>
                  )}
                  {savedTacticalPlans.map((plan) => (
                    <div
                      key={plan.id}
                      className="p-2.5 rounded-xl border border-slate-800 bg-slate-950/60 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate">{plan.name}</p>
                        <p className="text-[10px] text-slate-500">{plan.tactics.formation} · {plan.tactics.mentality}</p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => handleLoadPlan(plan.id)}
                          className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white text-[10px] font-black"
                        >
                          {isAr ? 'تفعيل' : 'Load'}
                        </button>
                        <button
                          onClick={() => deleteTacticalPlan(plan.id)}
                          className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-rose-900/60 text-slate-400 hover:text-rose-300 text-[10px] font-bold"
                        >
                          {isAr ? 'حذف' : 'Del'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {savedTacticalPlans.length < maxPlanSlots && (
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      value={newPlanName}
                      onChange={(e) => setNewPlanName(e.target.value)}
                      placeholder={isAr ? 'اسم الخطة الحالية...' : 'Name this plan...'}
                      maxLength={24}
                      className="flex-1 bg-black/40 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-purple-400"
                    />
                    <button
                      onClick={handleSavePlan}
                      disabled={!newPlanName.trim()}
                      className="px-3 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-black text-[11px] font-black disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {isAr ? 'حفظ' : 'Save'}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

        </div>

      </div>

    </div>
    </>
  );
};
