/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PreOfferMotivationPill — Renders qualitative player willingness and agent postures.
 * Strictly qualitative without revealing internal desire floats.
 */

import React from 'react';
import { Flame, ThumbsUp, HelpCircle, UserX, ShieldCheck } from 'lucide-react';
import type { PreOfferWillingnessBand } from '../../../domain/recruitment/motivation/motivationTypes';

interface PreOfferMotivationPillProps {
  band: PreOfferWillingnessBand;
  isAr?: boolean;
  className?: string;
  agentPostureCode?: string;
}

export const PreOfferMotivationPill: React.FC<PreOfferMotivationPillProps> = ({
  band,
  isAr = false,
  className = '',
  agentPostureCode,
}) => {
  const getBandMeta = () => {
    switch (band) {
      case 'desperate':
        return {
          labelEn: 'Desperate to Join',
          labelAr: 'متحمس جداً للانضمام',
          style: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300',
          Icon: Flame,
        };
      case 'keen':
        return {
          labelEn: 'Keen on Transfer',
          labelAr: 'منفتح ومرحب بالانتقال',
          style: 'bg-sky-500/15 border-sky-500/40 text-sky-300',
          Icon: ThumbsUp,
        };
      case 'open':
        return {
          labelEn: 'Open to Offers',
          labelAr: 'مستعد للاستماع للعروض',
          style: 'bg-amber-500/15 border-amber-500/40 text-amber-300',
          Icon: HelpCircle,
        };
      case 'reluctant':
        return {
          labelEn: 'Hesitant / Reluctant',
          labelAr: 'متردد ومتحفظ',
          style: 'bg-orange-500/15 border-orange-500/40 text-orange-300',
          Icon: UserX,
        };
      case 'refuse':
      default:
        return {
          labelEn: 'Unwilling to Negotiate',
          labelAr: 'يرفض فكرة الرحيل تماماً',
          style: 'bg-rose-500/15 border-rose-500/40 text-rose-300',
          Icon: UserX,
        };
    }
  };

  const meta = getBandMeta();
  const Icon = meta.Icon;

  return (
    <div className={`inline-flex flex-col gap-1 ${className}`}>
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${meta.style}`}
      >
        <Icon className="w-3.5 h-3.5 shrink-0" />
        <span>{isAr ? meta.labelAr : meta.labelEn}</span>
      </span>

      {agentPostureCode && (
        <span className="text-[10px] text-slate-400 font-medium px-1 flex items-center gap-1">
          <ShieldCheck className="w-3 h-3 text-slate-500" />
          <span>
            {isAr
              ? agentPostureCode === 'agent_high_desire_premium'
                ? 'الوكيل يطلب شروطاً تفضيلية'
                : 'الوكيل مستعد لتفاوض مرن'
              : agentPostureCode === 'agent_high_desire_premium'
              ? 'Agent demands favorable terms'
              : 'Agent open to negotiation'}
          </span>
        </span>
      )}
    </div>
  );
};
