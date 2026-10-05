/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Block 6 automation UI — wires only when store exposes the real API.
 */

import React from 'react';
import { useGameStore } from '../../state/useGameStore';
import { EmptyState } from '../ui/EmptyState';
import { SlidersHorizontal } from 'lucide-react';

type AutomationCapableStore = {
  getAutomationSettings?: () => unknown;
  setAutomationFeature?: (id: string, patch: unknown) => unknown;
  getAutomationReports?: () => readonly unknown[];
  undoLastAutomation?: () => unknown;
};

export const AutomationSettingsPanel: React.FC<{ isAr: boolean }> = ({ isAr }) => {
  const store = useGameStore() as ReturnType<typeof useGameStore> & AutomationCapableStore;

  const ready =
    typeof store.getAutomationSettings === 'function' &&
    typeof store.setAutomationFeature === 'function';

  if (!ready) {
    return (
      <div className="space-y-4">
        <h2 className="text-base font-black text-white">
          {isAr ? 'أتمتة المدرب' : 'Coach automation'}
        </h2>
        <EmptyState
          isAr={isAr}
          title="Automation module not available in this build"
          titleAr="وحدة الأتمتة غير متوفرة في هذا الإصدار"
          description="Phase H Block 6 must be merged so getAutomationSettings / setAutomationFeature exist on the game store. No mock APIs are used."
          descriptionAr="يجب دمج Block 6 لتوفير getAutomationSettings و setAutomationFeature في المتجر. لا نستخدم واجهات وهمية."
          icon={<SlidersHorizontal className="w-8 h-8" />}
        />
      </div>
    );
  }

  // Block 6 present: implement feature rows against real store (future merge).
  return (
    <EmptyState
      isAr={isAr}
      title="Automation API detected — UI wiring pending Block 6 types export"
      titleAr="واجهة الأتمتة مكتشفة — ربط الواجهة ينتظر تصدير أنواع Block 6"
    />
  );
};
