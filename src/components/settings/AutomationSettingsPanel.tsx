/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useGameStore } from '../../state/useGameStore';
import type { AutomationFeatureId } from '../../domain/automation/types';
import { SettingsToggleRow } from '../ui/SettingsToggleRow';

const FEATURE_ROWS: {
  id: AutomationFeatureId;
  labelEn: string;
  labelAr: string;
  allowApply: boolean;
}[] = [
  { id: 'bench', labelEn: 'Auto select bench', labelAr: 'اختيار دكة بدلاء تلقائي', allowApply: true },
  { id: 'rotation', labelEn: 'Auto rotate squad', labelAr: 'تدوير التشكيلة تلقائياً', allowApply: true },
  { id: 'recovery', labelEn: 'Auto schedule recovery', labelAr: 'جدولة الاستشفاء تلقائياً', allowApply: true },
  { id: 'scout', labelEn: 'Auto scout (mirror delegation)', labelAr: 'تقارير الكشاف (عبر التفويض)', allowApply: false },
  { id: 'loans', labelEn: 'Auto loan search (mirror delegation)', labelAr: 'بحث الإعارة (عبر التفويض)', allowApply: false },
  { id: 'tactics', labelEn: 'Auto recommend tactics', labelAr: 'اقتراح أفضل تكتيك', allowApply: false },
  { id: 'opponent', labelEn: 'Auto analyze opponent', labelAr: 'تحليل المنافس', allowApply: false },
];

export const AutomationSettingsPanel: React.FC<{ isAr: boolean }> = ({ isAr }) => {
  const settings = useGameStore((s) => {
    void s.automationPrefsVersion;
    return s.getAutomationSettings();
  });
  const setFeature = useGameStore((s) => s.setAutomationFeature);
  const reports = useGameStore((s) => s.getAutomationReports());
  const undo = useGameStore((s) => s.undoLastAutomation);

  return (
    <div className="space-y-4">
      <h2 className="text-base font-black text-white">
        {isAr ? 'أتمتة المدرب' : 'Coach automation'}
      </h2>
      <p className="text-xs text-slate-400">
        {isAr
          ? 'الإعدادات محفوظة محلياً فقط — لا تدخل في ملف الحفظ.'
          : 'Preferences are local only — never written to your career save.'}
      </p>
      <div className="space-y-2">
        {FEATURE_ROWS.map((row) => {
          const st = settings[row.id];
          return (
            <div key={row.id} className="rounded-xl border border-white/10 bg-white/5 p-3 space-y-2">
              <SettingsToggleRow
                isAr={isAr}
                labelEn={row.labelEn}
                labelAr={row.labelAr}
                checked={st.enabled}
                onChange={(enabled) => setFeature(row.id, { enabled })}
              />
              {row.allowApply && st.enabled && (
                <div className="flex gap-2 text-xs">
                  <button
                    type="button"
                    className={`px-2 py-1 rounded-lg ${st.mode === 'suggest' ? 'bg-emerald-600 text-white' : 'bg-white/10'}`}
                    onClick={() => setFeature(row.id, { mode: 'suggest' })}
                  >
                    {isAr ? 'اقتراح فقط' : 'Suggest only'}
                  </button>
                  <button
                    type="button"
                    className={`px-2 py-1 rounded-lg ${st.mode === 'apply' ? 'bg-emerald-600 text-white' : 'bg-white/10'}`}
                    onClick={() => setFeature(row.id, { mode: 'apply' })}
                  >
                    {isAr ? 'تطبيق تلقائي' : 'Apply automatically'}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {reports.length > 0 && (
        <p className="text-xs text-slate-400">
          {isAr ? `تقارير الجلسة: ${reports.length}` : `Session reports: ${reports.length}`}
        </p>
      )}
      <button
        type="button"
        className="text-xs px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15"
        onClick={() => undo()}
      >
        {isAr ? 'تراجع عن آخر تطبيق' : 'Undo last apply'}
      </button>
    </div>
  );
};
