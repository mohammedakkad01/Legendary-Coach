/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Interactive 2D Tactical Board & Lineup Pitch
 * Formations, tactical mentalities, drag/click player swaps, role assignments.
 */

import React, { useState } from 'react';
import { useGameStore } from '../state/useGameStore';
import { FootballFormation, MatchMentality, PressingStyle, PassingStyle, TeamTempo } from '../types/game';
import { Shield, Sparkles, ChevronRight, UserCheck, Flame, Crown, Lock } from 'lucide-react';
import { VIP_LEVELS } from '../data/vipData';

const FORMATION_COORDINATES: Record<FootballFormation, { x: number; y: number; pos: string }[]> = {
  '4-3-3': [
    { x: 50, y: 88, pos: 'GK' },
    { x: 15, y: 70, pos: 'RB' },
    { x: 38, y: 72, pos: 'CB' },
    { x: 62, y: 72, pos: 'CB' },
    { x: 85, y: 70, pos: 'LB' },
    { x: 50, y: 52, pos: 'CDM' },
    { x: 30, y: 44, pos: 'CM' },
    { x: 70, y: 44, pos: 'CM' },
    { x: 18, y: 22, pos: 'RW' },
    { x: 50, y: 16, pos: 'ST' },
    { x: 82, y: 22, pos: 'LW' },
  ],
  '4-4-2': [
    { x: 50, y: 88, pos: 'GK' },
    { x: 15, y: 70, pos: 'RB' },
    { x: 38, y: 72, pos: 'CB' },
    { x: 62, y: 72, pos: 'CB' },
    { x: 85, y: 70, pos: 'LB' },
    { x: 16, y: 46, pos: 'RM' },
    { x: 38, y: 48, pos: 'CM' },
    { x: 62, y: 48, pos: 'CM' },
    { x: 84, y: 46, pos: 'LM' },
    { x: 38, y: 18, pos: 'ST' },
    { x: 62, y: 18, pos: 'ST' },
  ],
  '4-2-3-1': [
    { x: 50, y: 88, pos: 'GK' },
    { x: 15, y: 70, pos: 'RB' },
    { x: 38, y: 72, pos: 'CB' },
    { x: 62, y: 72, pos: 'CB' },
    { x: 85, y: 70, pos: 'LB' },
    { x: 35, y: 56, pos: 'CDM' },
    { x: 65, y: 56, pos: 'CDM' },
    { x: 20, y: 36, pos: 'RAM' },
    { x: 50, y: 34, pos: 'CAM' },
    { x: 80, y: 36, pos: 'LAM' },
    { x: 50, y: 16, pos: 'ST' },
  ],
  '3-5-2': [
    { x: 50, y: 88, pos: 'GK' },
    { x: 25, y: 72, pos: 'CB' },
    { x: 50, y: 74, pos: 'CB' },
    { x: 75, y: 72, pos: 'CB' },
    { x: 12, y: 48, pos: 'RWB' },
    { x: 36, y: 50, pos: 'CM' },
    { x: 50, y: 42, pos: 'CAM' },
    { x: 64, y: 50, pos: 'CM' },
    { x: 88, y: 48, pos: 'LWB' },
    { x: 38, y: 18, pos: 'ST' },
    { x: 62, y: 18, pos: 'ST' },
  ],
  '5-3-2': [
    { x: 50, y: 88, pos: 'GK' },
    { x: 12, y: 68, pos: 'RWB' },
    { x: 30, y: 74, pos: 'CB' },
    { x: 50, y: 75, pos: 'CB' },
    { x: 70, y: 74, pos: 'CB' },
    { x: 88, y: 68, pos: 'LWB' },
    { x: 30, y: 48, pos: 'CM' },
    { x: 50, y: 50, pos: 'CDM' },
    { x: 70, y: 48, pos: 'CM' },
    { x: 38, y: 18, pos: 'ST' },
    { x: 62, y: 18, pos: 'ST' },
  ],
  '4-1-4-1': [
    { x: 50, y: 88, pos: 'GK' },
    { x: 15, y: 70, pos: 'RB' },
    { x: 38, y: 72, pos: 'CB' },
    { x: 62, y: 72, pos: 'CB' },
    { x: 85, y: 70, pos: 'LB' },
    { x: 50, y: 56, pos: 'CDM' },
    { x: 16, y: 38, pos: 'RM' },
    { x: 38, y: 40, pos: 'CM' },
    { x: 62, y: 40, pos: 'CM' },
    { x: 84, y: 38, pos: 'LM' },
    { x: 50, y: 18, pos: 'ST' },
  ],
  '3-4-3': [
    { x: 50, y: 88, pos: 'GK' },
    { x: 25, y: 72, pos: 'CB' },
    { x: 50, y: 74, pos: 'CB' },
    { x: 75, y: 72, pos: 'CB' },
    { x: 15, y: 48, pos: 'RM' },
    { x: 38, y: 50, pos: 'CM' },
    { x: 62, y: 50, pos: 'CM' },
    { x: 85, y: 48, pos: 'LM' },
    { x: 20, y: 22, pos: 'RW' },
    { x: 50, y: 16, pos: 'ST' },
    { x: 80, y: 22, pos: 'LW' },
  ],
};

interface FormationItem {
  id: FootballFormation;
  label: string;
  minVipLevel: number;
}

const ALL_FORMATIONS: FormationItem[] = [
  { id: '4-3-3', label: '4-3-3', minVipLevel: 1 },
  { id: '4-4-2', label: '4-4-2', minVipLevel: 1 },
  { id: '4-2-3-1', label: '4-2-3-1', minVipLevel: 1 },
  { id: '3-5-2', label: '3-5-2', minVipLevel: 1 },
  { id: '5-3-2', label: '5-3-2', minVipLevel: 1 },
  { id: '4-1-4-1', label: '4-1-4-1 (VIP 2+)', minVipLevel: 2 },
  { id: '3-4-3', label: '3-4-3 (VIP 3+)', minVipLevel: 3 },
];

export const TacticalBoardView: React.FC = () => {
  const { club, updateFootballTactics, swapFootballLineup, setFootballRoles, language, startNewMatch, vipPoints, setActiveTab } = useGameStore();
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

  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(null);
  const [formationLockWarning, setFormationLockWarning] = useState<string | null>(null);

  const lineupPlayers = club.footballLineup.map((id, index) => {
    const player = club.footballSquad.find(p => p.id === id);
    return { player, slotIndex: index };
  });

  const benchPlayers = club.footballBench.map(id => club.footballSquad.find(p => p.id === id)).filter(Boolean);

  const coords = FORMATION_COORDINATES[tactics.formation] || FORMATION_COORDINATES['4-3-3'];

  // Average Rating
  const validPlayers = lineupPlayers.map(lp => lp.player).filter(Boolean);
  const avgOverall = validPlayers.length > 0 
    ? Math.round(validPlayers.reduce((acc, p) => acc + (p?.overall || 0), 0) / validPlayers.length) 
    : 65;

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

  const handleSlotClick = (index: number) => {
    if (selectedSlotIndex === index) {
      setSelectedSlotIndex(null);
    } else {
      setSelectedSlotIndex(index);
    }
  };

  const handleBenchSwap = (benchPlayerId: string) => {
    if (selectedSlotIndex !== null) {
      swapFootballLineup(selectedSlotIndex, benchPlayerId);
      setSelectedSlotIndex(null);
    }
  };

  return (
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
          <div className="bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-center">
            <span className="text-[10px] text-slate-400 block">{isAr ? 'التناغم' : 'Chemistry'}</span>
            <span className="text-lg font-black text-emerald-400">92%</span>
          </div>
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
            {coords.map((coord, idx) => {
              const player = lineupPlayers[idx]?.player;
              const isSelected = selectedSlotIndex === idx;

              return (
                <div
                  key={idx}
                  onClick={() => handleSlotClick(idx)}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center cursor-pointer transition-all duration-300 ${
                    isSelected ? 'scale-115 z-30' : 'hover:scale-105 z-20'
                  }`}
                  style={{ left: `${coord.x}%`, top: `${coord.y}%` }}
                >
                  {/* Circular Player Disc */}
                  <div className={`relative w-11 h-11 sm:w-13 sm:h-13 rounded-full flex items-center justify-center font-black text-sm shadow-xl transition-all ${
                    isSelected
                      ? 'bg-amber-400 text-slate-950 ring-4 ring-amber-300 shadow-amber-500/50'
                      : 'bg-gradient-to-br from-sky-500 to-indigo-700 text-white border-2 border-white/80'
                  }`}>
                    {player ? (
                      <span className="font-heading font-black">{player.overall}</span>
                    ) : (
                      <span className="text-xs text-slate-400">{coord.pos}</span>
                    )}

                    {/* Captain Badge */}
                    {tactics.captainId === player?.id && (
                      <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-amber-500 text-slate-950 font-black text-[9px] flex items-center justify-center border border-white">
                        C
                      </span>
                    )}
                  </div>

                  {/* Player Label Card */}
                  <div className={`mt-1 px-1.5 py-0.5 rounded text-[10px] font-bold text-center leading-tight whitespace-nowrap shadow-md max-w-[85px] truncate ${
                    isSelected 
                      ? 'bg-amber-400 text-slate-950' 
                      : 'bg-slate-950/85 text-white border border-slate-700/60'
                  }`}>
                    {player ? (isAr ? player.name : player.nameEn) : coord.pos}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Swap Instruction Hint */}
          {selectedSlotIndex !== null && (
            <div className="bg-amber-500/20 border border-amber-500/40 p-3 rounded-xl flex items-center justify-between text-xs text-amber-300 animate-pulse">
              <span>{isAr ? 'تم تحديد اللاعب. اضغط على أي لاعب بديل في القائمة بالأسفل للتبديل معه.' : 'Player selected. Click any bench player on the right to swap positions.'}</span>
              <button 
                onClick={() => setSelectedSlotIndex(null)}
                className="font-bold underline text-white"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
            </div>
          )}
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
          </div>

          {/* Bench & Substitutes Drawer */}
          <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl space-y-3">
            <h3 className="text-sm font-black font-heading text-white flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-sky-400" />
                <span>{isAr ? 'دكة البدلاء والاحتياط' : 'Substitutes & Bench'}</span>
              </div>
              <span className="text-xs text-slate-400">{benchPlayers.length} {isAr ? 'لاعبين' : 'players'}</span>
            </h3>

            <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
              {benchPlayers.map((player) => {
                if (!player) return null;
                const isSelected = selectedSlotIndex !== null;

                return (
                  <div
                    key={player.id}
                    onClick={() => handleBenchSwap(player.id)}
                    className={`p-2 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-950/40 border-amber-500/50 hover:bg-amber-900/60'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center font-black text-xs text-white">
                        {player.overall}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-white">
                            {isAr ? player.name : player.nameEn}
                          </span>
                          <span className="text-[10px] text-slate-400">{player.nationalityFlag}</span>
                        </div>
                        <span className="text-[10px] text-sky-400 font-semibold">{player.position}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block">{isAr ? 'اللياقة' : 'Stamina'}</span>
                        <span className="text-xs font-bold text-emerald-400">{player.stamina}%</span>
                      </div>
                      {isSelected && (
                        <ChevronRight className="w-4 h-4 text-amber-400 animate-bounce" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
