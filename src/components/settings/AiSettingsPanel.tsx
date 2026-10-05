/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useGameStore } from '../../state/useGameStore';
import { SettingsToggleRow } from '../ui/SettingsToggleRow';
import { Sparkles } from 'lucide-react';

export const AiSettingsPanel: React.FC<{ isAr: boolean }> = ({ isAr }) => {
  const { aiNarrationEnabled, setAiNarrationEnabled } = useGameStore();

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-sky-400" aria-hidden />
        <h2 className="text-base font-black text-white">
          {isAr ? 'الذكاء الاصطناعي والسرد' : 'AI & narration'}
        </h2>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-950/50 px-4">
        <SettingsToggleRow
          isAr={isAr}
          labelEn="AI narration (Gemini)"
          labelAr="السرد بالذكاء الاصطناعي (Gemini)"
          descriptionEn="Optional flavour text for news and press. The game runs fully without AI — all results and progression use deterministic simulation."
          descriptionAr="نصوص اختيارية للأخبار والمؤتمرات. اللعبة تعمل بالكامل بدون ذكاء اصطناعي — النتائج والتقدم محاكاة حتمية."
          checked={aiNarrationEnabled}
          onChange={setAiNarrationEnabled}
        />
      </div>
    </div>
  );
};
