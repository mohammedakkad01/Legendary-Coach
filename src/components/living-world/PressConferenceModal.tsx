/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PressConferenceModal — Post-match or trigger-based popup for press conference sessions.
 */

import React from 'react';
import { PressConferenceView } from './PressConferenceView';
import { X, Mic } from 'lucide-react';

interface PressConferenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAr: boolean;
}

export const PressConferenceModal: React.FC<PressConferenceModalProps> = ({
  isOpen,
  onClose,
  isAr,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl overflow-y-auto space-y-4"
        role="dialog"
        aria-modal="true"
        aria-label={isAr ? 'المؤتمر الصحفي الرسمي' : 'Official Press Conference'}
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <Mic className="w-5 h-5 text-sky-400" />
            <h3 className="text-sm font-black text-white font-heading">
              {isAr ? 'مؤتمر صحفي بعد المباراة' : 'Post-Match Press Session'}
            </h3>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <PressConferenceView isAr={isAr} onFinished={onClose} />
      </div>
    </div>
  );
};
