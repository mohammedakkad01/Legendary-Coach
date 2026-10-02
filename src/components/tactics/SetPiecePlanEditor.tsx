/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Minimal set-piece taker picker (corner / free kick) for the tactical board.
 */

import React from 'react';
import type { Club, FootballTactics } from '../../types/game';
import type { SetPiecePlan } from '../../domain/tactics/setPieces/setPieceTypes';
import { ensureTacticalInstructions } from '../../domain/tactics/migrateTacticsPhaseB';

interface SetPiecePlanEditorProps {
  club: Club;
  tactics: FootballTactics;
  isAr: boolean;
  onChange: (next: Partial<FootballTactics>) => void;
}

function outfieldOptions(club: Club) {
  return club.footballLineup
    .map((id) => club.footballSquad.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => !!p && p.position !== 'GK');
}

export const SetPiecePlanEditor: React.FC<SetPiecePlanEditorProps> = ({ club, tactics, isAr, onChange }) => {
  const options = outfieldOptions(club);
  const plans = tactics.setPiecePlans;
  const cornerTaker = plans?.cornerAttack?.takerId ?? tactics.cornerTakerId ?? '';
  const fkTaker = plans?.freeKickAttack?.takerId ?? tactics.freeKickTakerId ?? '';

  const patchPlan = (kind: 'cornerAttack' | 'freeKickAttack', takerId: string) => {
    const base = ensureTacticalInstructions(tactics);
    const existing = base.setPiecePlans ?? {};
    const prev: SetPiecePlan | undefined = existing[kind];
    const type = kind === 'cornerAttack' ? 'corner_attack' : 'free_kick_attack';
    const nextPlan: SetPiecePlan = {
      type,
      takerId: takerId || undefined,
      assignments: prev?.assignments ?? [],
    };
    onChange({
      setPiecePlans: { ...existing, [kind]: nextPlan },
      ...(kind === 'cornerAttack' ? { cornerTakerId: takerId || undefined } : { freeKickTakerId: takerId || undefined }),
    });
  };

  return (
    <div className="space-y-3 pt-2 border-t border-slate-800">
      <p className="text-[11px] font-bold text-slate-400">
        {isAr ? 'الركلات الثابتة' : 'Set pieces'}
      </p>
      <div className="grid grid-cols-1 gap-2">
        <label className="text-[10px] text-slate-500 block">
          {isAr ? 'منفّذ الركنيات' : 'Corner taker'}
          <select
            value={cornerTaker}
            onChange={(e) => patchPlan('cornerAttack', e.target.value)}
            className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-2 text-xs font-bold text-white"
          >
            <option value="">{isAr ? 'افتراضي' : 'Default'}</option>
            {options.map((p) => (
              <option key={p.id} value={p.id}>
                {isAr ? p.name : p.nameEn}
              </option>
            ))}
          </select>
        </label>
        <label className="text-[10px] text-slate-500 block">
          {isAr ? 'منفّذ الركلات الحرة' : 'Free-kick taker'}
          <select
            value={fkTaker}
            onChange={(e) => patchPlan('freeKickAttack', e.target.value)}
            className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-2 text-xs font-bold text-white"
          >
            <option value="">{isAr ? 'افتراضي' : 'Default'}</option>
            {options.map((p) => (
              <option key={p.id} value={p.id}>
                {isAr ? p.name : p.nameEn}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
};
