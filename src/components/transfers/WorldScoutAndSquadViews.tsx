/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * World Scout Search Tab and Squad Selling Tab components.
 */

import React from 'react';
import { Search, RefreshCw, Trophy, Users, Gem, Coins, Check } from 'lucide-react';
import { ApiPlayerResult, convertApiPlayerToGamePlayer } from '../../services/footballApi';
import { Player } from '../../types/game';

interface WorldScoutViewProps {
  isAr: boolean;
  diamonds: number;
  coins: number;
  worldSearchQuery: string;
  setWorldSearchQuery: (q: string) => void;
  worldSearching: boolean;
  worldResults: ApiPlayerResult[];
  signedWorldNames: string[];
  squad: Player[];
  onSearch: (q: string) => void;
  onSignDiamonds: (p: ApiPlayerResult) => void;
  onSignCoins: (p: ApiPlayerResult) => void;
}

export const WorldScoutView: React.FC<WorldScoutViewProps> = ({
  isAr,
  diamonds,
  coins,
  worldSearchQuery,
  setWorldSearchQuery,
  worldSearching,
  worldResults,
  signedWorldNames,
  squad,
  onSearch,
  onSignDiamonds,
  onSignCoins,
}) => {
  return (
    <div className="space-y-6">
      <div className="p-5 rounded-3xl bg-gradient-to-r from-sky-950/70 via-slate-900 to-indigo-950/70 border border-sky-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-sky-400 font-bold text-xs">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>{isAr ? 'كشاف النجوم وقاعدة البيانات العالمية' : 'World Star Scouting Network'}</span>
          </div>
          <h3 className="text-xl font-black text-white mt-1 font-heading">
            {isAr ? 'استقطاب نجوم كرة القدم العالمية' : 'Sign International Superstars'}
          </h3>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            {isAr 
              ? 'ابحث بالاسم عن أي نجم كرة قدم في العالم (Haaland, Salah, Mbappe, Yamal, Vinicius, De Bruyne) واستعرض بطاقته الواقعية وتعاقد معه فوراً.' 
              : 'Search for any international football player (Haaland, Salah, Mbappe, Yamal) to view their authentic card and sign them to your squad.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-center">
            <span className="text-[10px] text-slate-400 block">{isAr ? 'الجواهر المتاحة' : 'Gems'}</span>
            <span className="text-sm font-black text-fuchsia-400">{diamonds} 💎</span>
          </div>
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSearch(worldSearchQuery);
        }}
        className="relative"
      >
        <div className="relative flex items-center">
          <Search className="absolute right-4 rtl:right-4 ltr:left-4 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={worldSearchQuery}
            onChange={(e) => setWorldSearchQuery(e.target.value)}
            placeholder={isAr ? 'ابحث باسم اللاعب: مثلاً Haaland, Salah, Mbappe, Bellingham, Yamal...' : 'Search player name: Haaland, Salah, Mbappe...'}
            className="w-full py-3.5 px-12 rounded-2xl bg-slate-900 border border-slate-700/80 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-sky-500 shadow-inner"
          />
          <button
            type="submit"
            disabled={worldSearching}
            className="absolute left-2.5 rtl:left-2.5 ltr:right-2.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
          >
            {worldSearching ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            <span>{isAr ? 'بحث كشفي' : 'Scout'}</span>
          </button>
        </div>
      </form>

      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
        <span className="text-slate-400 shrink-0 font-medium">{isAr ? 'أشهر النجوم:' : 'Popular:'}</span>
        {['Erling Haaland', 'Kylian Mbappe', 'Mohamed Salah', 'Lamine Yamal', 'Vinicius Junior', 'Jude Bellingham', 'Cristiano Ronaldo', 'Lionel Messi'].map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => {
              setWorldSearchQuery(name);
              onSearch(name);
            }}
            className="px-3 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 shrink-0 transition-colors cursor-pointer"
          >
            {name}
          </button>
        ))}
      </div>

      {worldSearching ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin text-sky-400" />
          <p className="text-sm font-medium">{isAr ? 'جاري البحث في قاعدة البيانات الكروية العالمية...' : 'Scouting international database...'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {worldResults.map((p) => {
            const gameP = convertApiPlayerToGamePlayer(p);
            const isSigned = signedWorldNames.includes(p.strPlayer) || squad.some(sp => sp.nameEn.toLowerCase() === p.strPlayer.toLowerCase());
            const canAffordCoins = coins >= gameP.marketValue;

            return (
              <div
                key={p.idPlayer || p.strPlayer}
                className="relative overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 p-5 shadow-xl flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="relative w-16 h-16 rounded-2xl bg-slate-800 overflow-hidden border border-slate-700 flex items-center justify-center shrink-0">
                        {p.strCutout || p.strThumb ? (
                          <img
                            src={p.strCutout || p.strThumb}
                            alt={p.strPlayer}
                            className="w-full h-full object-cover object-top"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <Users className="w-8 h-8 text-slate-600" />
                        )}
                        <span className="absolute bottom-0 right-0 bg-slate-950/80 px-1 py-0.5 text-[9px] font-bold text-sky-300 rounded-tl">
                          {gameP.position}
                        </span>
                      </div>

                      <div>
                        <h4 className="font-bold text-base text-white leading-snug">{p.strPlayer}</h4>
                        <p className="text-xs text-slate-400 mt-0.5">{p.strTeam || 'نادي عالمي'} • {p.strNationality || 'دولي'}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">{isAr ? `العمر: ${gameP.age} سنة` : `Age: ${gameP.age}`}</p>
                      </div>
                    </div>

                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-600 text-slate-950 font-black flex flex-col items-center justify-center shadow-lg">
                      <span className="text-base leading-none">{gameP.overall}</span>
                      <span className="text-[9px] font-bold uppercase opacity-80">OVR</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-4 p-2.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs text-center font-bold">
                    <div>
                      <span className="text-[10px] text-slate-500 block">PAC</span>
                      <span className="text-emerald-400">{gameP.attributes.pace}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">SHO</span>
                      <span className="text-amber-400">{gameP.attributes.shooting}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">PAS</span>
                      <span className="text-sky-400">{gameP.attributes.passing}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3.5 border-t border-slate-800 space-y-2">
                  {isSigned ? (
                    <div className="w-full py-2.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 font-bold text-xs text-center flex items-center justify-center gap-1.5">
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>{isAr ? 'اللاعب متواجد في تشكيلة ناديك' : 'Signed to Squad'}</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => onSignDiamonds(p)}
                        className="py-2.5 px-2 rounded-xl bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-500 hover:to-pink-500 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Gem className="w-3.5 h-3.5 text-yellow-300" />
                        <span>50 💎 {isAr ? 'توقيع فوري' : 'Sign'}</span>
                      </button>

                      <button
                        onClick={() => onSignCoins(p)}
                        disabled={!canAffordCoins}
                        className={`py-2.5 px-2 rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1 cursor-pointer ${
                          canAffordCoins
                            ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                            : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        <Coins className="w-3.5 h-3.5" />
                        <span>{gameP.marketValue.toLocaleString()} $</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

interface SquadSalesViewProps {
  isAr: boolean;
  squad: Player[];
  onSellPlayer: (playerId: string) => void;
}

export const SquadSalesView: React.FC<SquadSalesViewProps> = ({
  isAr,
  squad,
  onSellPlayer,
}) => {
  return (
    <div className="space-y-4">
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-base font-black text-white">
            {isAr ? 'بيع لاعبي الفريق وتوفير السيولة المالية' : 'Sell Squad Members for Liquidity'}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {isAr 
              ? 'يمكنك بيع اللاعبين غير الأساسيين للحصول على 90% من قيمتهم السوقية فوراً.' 
              : 'Sell non-essential players to instantly claim 90% of their transfer value in club cash.'}
          </p>
        </div>
        <span className="text-xs font-bold text-slate-400 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
          {isAr ? `إجمالي القائمة: ${squad.length} لاعب` : `Squad Size: ${squad.length} players`}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {squad.map((player) => {
          const sellPrice = Math.round(player.marketValue * 0.9);
          const isProtected = squad.length <= 11;

          return (
            <div key={player.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-slate-800 border border-slate-700 flex flex-col items-center justify-center font-black text-white shrink-0">
                  <span className="text-xs leading-none text-amber-400">{player.overall}</span>
                  <span className="text-[8px] uppercase text-slate-400">OVR</span>
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">
                    {isAr ? player.name : player.nameEn}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {player.position} • {player.age} {isAr ? 'سنة' : 'yrs'}
                  </span>
                </div>
              </div>

              <div className="text-right space-y-1">
                <span className="text-xs font-black text-emerald-400 block">
                  +{sellPrice.toLocaleString()} $
                </span>
                <button
                  onClick={() => onSellPlayer(player.id)}
                  disabled={isProtected}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-black border transition-all cursor-pointer ${
                    isProtected
                      ? 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed'
                      : 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border-rose-500/40'
                  }`}
                >
                  {isProtected ? (isAr ? 'أساسي' : 'Locked') : (isAr ? 'عرض للبيع' : 'Sell')}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
