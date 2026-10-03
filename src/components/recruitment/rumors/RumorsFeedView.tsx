/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * RumorsFeedView — Transfer Rumors & Media Buzz Feed (Phase D)
 * Renders structured rumors deterministically with reliability badges.
 */

import React, { useState, useMemo } from 'react';
import { Newspaper, Filter, Eye, RefreshCw, Flame, ExternalLink } from 'lucide-react';
import { useGameStore } from '../../../state/useGameStore';
import type { TransferRumor, RumorReliability } from '../../../domain/recruitment/rumors/rumorTypes';
import { renderRumorTemplate, toPublicRumorView } from '../../../domain/recruitment/rumors/rumorTemplates';
import { ReliabilityBadge } from '../shared/ReliabilityBadge';
import type { Player } from '../../../types/game';

interface RumorsFeedViewProps {
  onInspectPlayer?: (player: Player) => void;
  onNegotiatePlayer?: (player: Player) => void;
}

export const RumorsFeedView: React.FC<RumorsFeedViewProps> = ({
  onInspectPlayer,
  onNegotiatePlayer,
}) => {
  const { club, language, recruitmentWorld, scoutMarket } = useGameStore();
  const isAr = language === 'ar';

  const [selectedReliability, setSelectedReliability] = useState<RumorReliability | 'all'>('all');
  const [filterClubOnly, setFilterClubOnly] = useState(false);

  const rumors: TransferRumor[] = recruitmentWorld?.transferRumors ?? [];

  const filteredRumors = useMemo(() => {
    return rumors.filter((r) => {
      if (selectedReliability !== 'all' && r.reliability !== selectedReliability) {
        return false;
      }
      if (filterClubOnly && r.subjectClubId !== club.id && r.claimingClubId !== club.id) {
        return false;
      }
      return true;
    });
  }, [rumors, selectedReliability, filterClubOnly, club.id]);

  const findMarketPlayer = (playerId: string) => {
    return scoutMarket.find((p) => p.id === playerId) ?? null;
  };

  return (
    <div className="space-y-5" id="rumors_feed_view">
      {/* Header and Filter Controls */}
      <div className="flex items-center justify-between flex-wrap gap-3 p-4 bg-slate-900/90 border border-slate-800 rounded-3xl shadow-md">
        <div className="flex items-center gap-2">
          <Newspaper className="w-5 h-5 text-amber-400" />
          <div>
            <h3 className="text-sm sm:text-base font-black text-white">
              {isAr ? 'نبض وسوق الشائعات الانتقالية' : 'Transfer Rumors & Media Feed'}
            </h3>
            <p className="text-[11px] text-slate-400">
              {isAr
                ? 'تقارير الصحافة ومصادر السوق الموثوقة وغير المؤكدة'
                : 'Press reports, insider claims, and social media chatter'}
            </p>
          </div>
        </div>

        {/* Filter controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setFilterClubOnly(!filterClubOnly)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              filterClubOnly
                ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {isAr ? 'نادينا فقط' : 'My Club Only'}
          </button>

          <select
            value={selectedReliability}
            onChange={(e) => setSelectedReliability(e.target.value as RumorReliability | 'all')}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-300 focus:outline-none focus:border-amber-500"
          >
            <option value="all">{isAr ? 'جميع المستويات' : 'All Reliabilities'}</option>
            <option value="reliable">{isAr ? 'الموثوقة فقط' : 'Reliable Only'}</option>
            <option value="uncertain">{isAr ? 'التقارير غير المؤكدة' : 'Unconfirmed Only'}</option>
            <option value="false">{isAr ? 'الشائعات المتداولة' : 'Social Rumors'}</option>
          </select>
        </div>
      </div>

      {/* Rumors List */}
      {filteredRumors.length === 0 ? (
        <div className="p-12 bg-slate-900/60 border border-slate-800 rounded-3xl text-center space-y-3">
          <Newspaper className="w-12 h-12 text-slate-600 mx-auto" />
          <h4 className="text-sm font-bold text-slate-300">
            {isAr ? 'لا توجد شائعات متداولة حالياً تطابق الفلاتر' : 'No rumors match your filters'}
          </h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {isAr
              ? 'تتجدد الشائعات أسبوعياً مع تطور نشاط الأندية والوكلاء في سوق الانتقالات.'
              : 'Rumors refresh weekly as clubs and agents become active in the market.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRumors.map((rumor) => {
            const publicView = toPublicRumorView(rumor, language);
            const text = publicView.renderedText;
            const player = findMarketPlayer(rumor.subjectPlayerId);

            return (
              <div
                key={rumor.id}
                className="p-4 rounded-2xl bg-slate-900 border border-slate-800/90 hover:border-slate-700/80 transition-all space-y-3 shadow-md"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <ReliabilityBadge reliability={publicView.reliability} isAr={isAr} />
                    <span className="text-[11px] font-mono text-slate-500">
                      {isAr ? `أسبوع ${rumor.createdWeek}` : `Week ${rumor.createdWeek}`}
                    </span>
                  </div>

                  <span className="text-[10px] font-mono text-slate-500 uppercase">
                    {rumor.claimKind}
                  </span>
                </div>

                {/* Rumor Headline */}
                <p className="text-sm font-semibold text-slate-200 leading-relaxed">
                  {text}
                </p>

                {/* Target Player Quick Preview & Action */}
                {player && (
                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{player.name}</span>
                      <span className="text-slate-400">
                        ({player.position} — {player.realTeam ?? 'Free Agent'})
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {onInspectPlayer && (
                        <button
                          onClick={() => onInspectPlayer(player)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
                        >
                          {isAr ? 'فحص الكشافة' : 'Scout'}
                        </button>
                      )}

                      {onNegotiatePlayer && (
                        <button
                          onClick={() => onNegotiatePlayer(player)}
                          className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold transition-colors cursor-pointer"
                        >
                          {isAr ? 'تفاوض' : 'Negotiate'}
                        </button>
                      )}
                    </div>
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
