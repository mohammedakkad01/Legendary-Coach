/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Detailed Player Inspection Modal with full attributes and traits breakdown.
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Users, Handshake } from 'lucide-react';
import { Player } from '../../types/game';
import { getPositionBadgeColor } from './TransferPlayerCard';

interface TransferPlayerDetailsModalProps {
  player: Player | null;
  isAr: boolean;
  onClose: () => void;
  onStartNegotiation: (player: Player) => void;
}

export const TransferPlayerDetailsModal: React.FC<TransferPlayerDetailsModalProps> = ({
  player,
  isAr,
  onClose,
  onStartNegotiation,
}) => {
  if (!player) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden text-slate-100"
        >
          {/* Header */}
          <div className="relative p-6 bg-gradient-to-r from-amber-950 via-slate-900 to-indigo-950 border-b border-slate-800">
            <button
              onClick={onClose}
              className="absolute top-4 left-4 sm:left-auto sm:right-4 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-slate-800 overflow-hidden border border-slate-700 shrink-0 flex items-center justify-center shadow-lg">
                {player.photoUrl ? (
                  <img
                    src={player.photoUrl}
                    alt={player.nameEn}
                    className="w-full h-full object-cover object-top"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <Users className="w-8 h-8 text-slate-600" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-black font-heading text-white">
                    {isAr ? player.name : player.nameEn}
                  </h3>
                  <span>{player.nationalityFlag}</span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {player.realTeam || 'النادي'} • {player.age} {isAr ? 'سنة' : 'years old'}
                </p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className={`px-2.5 py-0.5 rounded-lg text-xs font-black border ${getPositionBadgeColor(player.position)}`}>
                    {player.position}
                  </span>
                  <span className="text-xs font-bold text-emerald-400">
                    {isAr ? `إمكانية الوصول: ${player.potential}` : `Potential: ${player.potential}`}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Body: Attributes */}
          <div className="p-6 space-y-5">
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                {isAr ? 'القدرات والإحصائيات الفنية' : 'Detailed Attributes'}
              </h4>
              <div className="grid grid-cols-2 gap-3 text-xs">
                {[
                  { labelAr: 'السرعة والانطلاق', labelEn: 'Pace & Acceleration', val: player.attributes.pace, color: 'bg-emerald-500' },
                  { labelAr: 'التسديد وإنهاء الهجمات', labelEn: 'Shooting & Finishing', val: player.attributes.shooting, color: 'bg-amber-500' },
                  { labelAr: 'التمرير وصناعة اللعب', labelEn: 'Passing & Vision', val: player.attributes.passing, color: 'bg-sky-500' },
                  { labelAr: 'المراوغة والتحكم', labelEn: 'Dribbling & Control', val: player.attributes.dribbling, color: 'bg-purple-500' },
                  { labelAr: 'الدفاع وافتكاك الكرة', labelEn: 'Defending & Tackling', val: player.attributes.defending, color: 'bg-indigo-500' },
                  { labelAr: 'القوة البدنية والالتحامات', labelEn: 'Physical & Stamina', val: player.attributes.physical, color: 'bg-rose-500' },
                ].map((attr) => (
                  <div key={attr.labelEn} className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-medium text-[11px]">{isAr ? attr.labelAr : attr.labelEn}</span>
                      <span className="font-black text-white">{attr.val}</span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${attr.color} rounded-full`}
                        style={{ width: `${Math.min(100, attr.val || 0)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Traits */}
            {player.traits.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  {isAr ? 'السمات والمميزات الخاصة' : 'Traits & Specialties'}
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {player.traits.map((t) => (
                    <span key={t} className="px-2.5 py-1 rounded-lg bg-slate-800 text-amber-300 font-bold text-xs border border-slate-700">
                      ⚡ {t}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Contract & Action */}
            <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-4">
              <div>
                <span className="text-[10px] text-slate-400 block">{isAr ? 'قيمة الصفقة' : 'Signing Fee'}</span>
                <span className="text-lg font-black text-amber-400">
                  {player.marketValue.toLocaleString()} $
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors cursor-pointer"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  onClick={() => onStartNegotiation(player)}
                  className="px-5 py-2.5 rounded-xl font-black text-xs shadow-lg transition-all flex items-center gap-1.5 cursor-pointer bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-400 hover:to-cyan-400 text-slate-950 shadow-sky-500/30"
                >
                  <Handshake className="w-4 h-4" />
                  <span>{isAr ? 'بدء التفاوض' : 'Negotiate'}</span>
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
