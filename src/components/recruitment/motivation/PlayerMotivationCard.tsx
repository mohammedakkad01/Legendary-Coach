/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PlayerMotivationCard — Pre-offer willingness & agent posture summary.
 * Strictly qualitative display adhering to safety boundary (no hidden desire floats).
 */

import React, { useMemo } from 'react';
import { UserCheck, HelpCircle, ShieldAlert, Award, TrendingUp } from 'lucide-react';
import type { Player, Club } from '../../../types/game';
import type { RecruitmentWorldState } from '../../../domain/recruitment/types';
import {
  buildTransferMotivationSignalsFromPlayer,
  computeTransferMotivation,
  computePreOfferWillingness,
  computeAgentDemands,
} from '../../../domain/recruitment/index';
import { PreOfferMotivationPill } from '../shared/PreOfferMotivationPill';

interface PlayerMotivationCardProps {
  player: Player;
  userClub: Club;
  recruitmentWorld: RecruitmentWorldState | null;
  isAr?: boolean;
  className?: string;
}

export const PlayerMotivationCard: React.FC<PlayerMotivationCardProps> = ({
  player,
  userClub,
  recruitmentWorld,
  isAr = false,
  className = '',
}) => {
  const analysis = useMemo(() => {
    if (!recruitmentWorld) return null;

    const signals = buildTransferMotivationSignalsFromPlayer(player, {
      userClub,
      sellerClubId: player.realTeam ?? 'seller_club',
      suitorClubId: userClub.id,
      suitorReputation: userClub.finances.reputation / 100,
    });

    const motivation = computeTransferMotivation({
      worldSeed: recruitmentWorld.worldSeed,
      gameWeek: recruitmentWorld.gameWeek,
      observerClubId: userClub.id,
      signals,
    });

    const willingness = computePreOfferWillingness(motivation, signals);
    const agentDemands = computeAgentDemands({
      referenceMarketValue: player.marketValue,
      motivation,
      personalityArchetype: player.personality ?? 'professional',
    });

    return { signals, motivation, willingness, agentDemands };
  }, [player, userClub, recruitmentWorld]);

  if (!analysis) return null;

  const { willingness, agentDemands, motivation } = analysis;

  const translateReasonCode = (code: string): string => {
    switch (code) {
      case 'pre_offer_agent_active':
        return isAr ? 'الوكيل مستعد لبحث العروض' : 'Agent actively fielding interest';
      case 'pre_offer_refused':
        return isAr ? 'اللاعب ملتزم بناديه الحالي' : 'Committed to current contract';
      case 'agent_high_desire_premium':
        return isAr ? 'مطالب مالية تتناسب مع مكانة اللاعب' : 'Demands premium financial package';
      case 'agent_fee_posture':
        return isAr ? 'موقف الوكيل متزن وقابل للتفاوض' : 'Flexible agent stance on transfer fee';
      case 'seeking_champions_league':
        return isAr ? 'يطمح للمشاركة في البطولات القارية الكبرى' : 'Desires continental competition';
      case 'low_playing_time':
        return isAr ? 'يبحث عن ضمان دقائق لعب أساسية' : 'Prioritizing regular first-team minutes';
      default:
        return isAr ? 'عوامل احترافية واقتصادية' : 'Standard professional considerations';
    }
  };

  return (
    <div
      className={`p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3 ${className}`}
      aria-label="Player Motivation Summary"
    >
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
        <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
          <UserCheck className="w-4 h-4 text-amber-400" />
          <span>{isAr ? 'رغبة اللاعب وموقف الوكيل:' : 'Player Willingness & Agent Stance:'}</span>
        </span>
        <PreOfferMotivationPill
          band={willingness.band}
          isAr={isAr}
          agentPostureCode={agentDemands.reasonCodes[1]}
        />
      </div>

      {/* Motives Highlights */}
      <div className="space-y-1.5 text-xs">
        <div className="text-slate-400 font-semibold text-[11px]">
          {isAr ? 'العوامل المؤثرة على المفاوضات:' : 'Key Negotiation Influences:'}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {willingness.reasonCodes.slice(0, 3).map((code, idx) => (
            <span
              key={idx}
              className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-slate-300 text-[11px] font-medium"
            >
              • {translateReasonCode(code)}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
