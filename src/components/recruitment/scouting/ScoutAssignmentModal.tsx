/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ScoutAssignmentModal — Configure scouting assignments.
 * Supports Player, League, Region, and Role Focus assignments.
 */

import React, { useState } from 'react';
import { X, Search, Shield, Globe, Award, CheckCircle, AlertCircle } from 'lucide-react';
import type { ScoutStaff } from '../../../domain/recruitment/scouts/scoutTypes';
import type { ScoutingTargetKind } from '../../../domain/recruitment/scouting/types';
import type { Player } from '../../../types/game';

interface ScoutAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  scouts: readonly ScoutStaff[];
  availablePlayers: readonly Player[];
  onAssign: (params: {
    scoutId: string;
    targetKind: ScoutingTargetKind;
    playerId?: string;
    leagueId?: string;
    regionId?: string;
    roleFocus?: string;
  }) => { ok: boolean; message: string };
  isAr?: boolean;
}

export const ScoutAssignmentModal: React.FC<ScoutAssignmentModalProps> = ({
  isOpen,
  onClose,
  scouts,
  availablePlayers,
  onAssign,
  isAr = false,
}) => {
  const [selectedScoutId, setSelectedScoutId] = useState<string>(scouts[0]?.id ?? '');
  const [targetKind, setTargetKind] = useState<ScoutingTargetKind>('player');
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>(availablePlayers[0]?.id ?? '');
  const [leagueId, setLeagueId] = useState<string>('league_premier');
  const [regionId, setRegionId] = useState<string>('region_sa');
  const [roleFocus, setRoleFocus] = useState<string>('Striker');
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  if (!isOpen) return null;

  const handleCreate = () => {
    if (!selectedScoutId) {
      setFeedback({ ok: false, msg: isAr ? 'يرجى اختيار كشاف' : 'Please select a scout' });
      return;
    }

    const res = onAssign({
      scoutId: selectedScoutId,
      targetKind,
      playerId: targetKind === 'player' ? selectedPlayerId : undefined,
      leagueId: targetKind === 'league' ? leagueId : undefined,
      regionId: targetKind === 'region' ? regionId : undefined,
      roleFocus: targetKind === 'role_focus' ? roleFocus : undefined,
    });

    setFeedback({ ok: res.ok, msg: res.message });
    if (res.ok) {
      setTimeout(() => {
        setFeedback(null);
        onClose();
      }, 1200);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-5 sm:p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Search className="w-5 h-5 text-amber-400" />
            <h3 className="text-base sm:text-lg font-black text-white">
              {isAr ? 'تكليف كشاف جديد' : 'New Scouting Assignment'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scout Selection */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-300">
            {isAr ? 'اختر الكشاف المسؤول:' : 'Select Scout:'}
          </label>
          <select
            value={selectedScoutId}
            onChange={(e) => setSelectedScoutId(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 font-semibold focus:outline-none focus:border-amber-500"
          >
            {scouts.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.specialties.join(', ')} — {isAr ? `تقييم ${s.judgingAbility}` : `Rating ${s.judgingAbility}`})
              </option>
            ))}
          </select>
        </div>

        {/* Assignment Target Kind */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-300">
            {isAr ? 'نوع التكليف:' : 'Target Type:'}
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(
              [
                { id: 'player', labelEn: 'Player', labelAr: 'لاعب معين', Icon: Shield },
                { id: 'role_focus', labelEn: 'Role Focus', labelAr: 'مركز محدد', Icon: Award },
                { id: 'league', labelEn: 'League', labelAr: 'دوري', Icon: Globe },
                { id: 'region', labelEn: 'Region', labelAr: 'منطقة', Icon: Globe },
              ] as const
            ).map((kind) => {
              const Icon = kind.Icon;
              const isSelected = targetKind === kind.id;
              return (
                <button
                  key={kind.id}
                  type="button"
                  onClick={() => setTargetKind(kind.id)}
                  className={`p-2 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                    isSelected
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{isAr ? kind.labelAr : kind.labelEn}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Dynamic target input */}
        {targetKind === 'player' && (
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300">
              {isAr ? 'اختر اللاعب المستهدف:' : 'Select Target Player:'}
            </label>
            <select
              value={selectedPlayerId}
              onChange={(e) => setSelectedPlayerId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 font-semibold focus:outline-none focus:border-amber-500"
            >
              {availablePlayers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.position} — {p.realTeam ?? 'Free Agent'})
                </option>
              ))}
            </select>
          </div>
        )}

        {targetKind === 'role_focus' && (
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300">
              {isAr ? 'المركز المطلوب رصده:' : 'Role / Position Focus:'}
            </label>
            <select
              value={roleFocus}
              onChange={(e) => setRoleFocus(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 font-semibold focus:outline-none focus:border-amber-500"
            >
              <option value="Striker">{isAr ? 'مهاجم صريح (ST)' : 'Striker (ST)'}</option>
              <option value="Playmaker">{isAr ? 'صانع ألعاب (CAM)' : 'Playmaker (CAM)'}</option>
              <option value="Winger">{isAr ? 'جناح هجومي (Winger)' : 'Winger (LW/RW)'}</option>
              <option value="Midfielder">{isAr ? 'وسط ميدان (CM/CDM)' : 'Midfielder (CM/CDM)'}</option>
              <option value="CenterBack">{isAr ? 'قلب دفاع (CB)' : 'Center Back (CB)'}</option>
              <option value="FullBack">{isAr ? 'ظهير (LB/RB)' : 'Full Back (LB/RB)'}</option>
              <option value="Goalkeeper">{isAr ? 'حارس مرمى (GK)' : 'Goalkeeper (GK)'}</option>
            </select>
          </div>
        )}

        {targetKind === 'league' && (
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300">
              {isAr ? 'الدوري المستهدف:' : 'Target League:'}
            </label>
            <select
              value={leagueId}
              onChange={(e) => setLeagueId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 font-semibold focus:outline-none focus:border-amber-500"
            >
              <option value="league_premier">Premier League</option>
              <option value="league_la_liga">La Liga</option>
              <option value="league_spl">Saudi Pro League</option>
              <option value="league_serie_a">Serie A</option>
            </select>
          </div>
        )}

        {targetKind === 'region' && (
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300">
              {isAr ? 'المنطقة الجغرافية:' : 'Region:'}
            </label>
            <select
              value={regionId}
              onChange={(e) => setRegionId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 font-semibold focus:outline-none focus:border-amber-500"
            >
              <option value="region_middle_east">{isAr ? 'الشرق الأوسط والخليج' : 'Middle East & Gulf'}</option>
              <option value="region_west_europe">{isAr ? 'غرب أوروبا' : 'Western Europe'}</option>
              <option value="region_south_america">{isAr ? 'أمريكا الجنوبية' : 'South America'}</option>
              <option value="region_north_africa">{isAr ? 'شمال أفريقيا' : 'North Africa'}</option>
            </select>
          </div>
        )}

        {/* Feedback message */}
        {feedback && (
          <div
            className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
              feedback.ok
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
            }`}
          >
            {feedback.ok ? (
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{feedback.msg}</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            {isAr ? 'إلغاء' : 'Cancel'}
          </button>
          <button
            type="button"
            onClick={handleCreate}
            className="px-5 py-2 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md transition-all cursor-pointer"
          >
            {isAr ? 'تأكيد إرسال الكشاف' : 'Deploy Scout'}
          </button>
        </div>
      </div>
    </div>
  );
};
