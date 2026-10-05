/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useId } from 'react';

interface SettingsToggleRowProps {
  isAr: boolean;
  labelEn: string;
  labelAr: string;
  descriptionEn?: string;
  descriptionAr?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}

export const SettingsToggleRow: React.FC<SettingsToggleRowProps> = ({
  isAr,
  labelEn,
  labelAr,
  descriptionEn,
  descriptionAr,
  checked,
  disabled = false,
  onChange,
}) => {
  const id = useId();
  const label = isAr ? labelAr : labelEn;
  const description = isAr ? descriptionAr : descriptionEn;

  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-slate-800 last:border-b-0">
      <div className="min-w-0 flex-1">
        <label htmlFor={id} className="text-sm font-bold text-white block">
          {label}
        </label>
        {description ? (
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">{description}</p>
        ) : null}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`touch-target shrink-0 relative rounded-full border transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
          checked ? 'bg-sky-600 border-sky-500' : 'bg-slate-800 border-slate-600'
        }`}
        style={{ width: '3.25rem', height: 'var(--touch-min)' }}
      >
        <span
          className={`absolute top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white shadow motion-safe:transition-all ${
            checked ? 'start-7' : 'start-1'
          }`}
        />
      </button>
    </div>
  );
};
