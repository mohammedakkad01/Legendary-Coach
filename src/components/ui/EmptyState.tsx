/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface EmptyStateProps {
  isAr: boolean;
  title: string;
  titleAr?: string;
  description?: string;
  descriptionAr?: string;
  icon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  isAr,
  title,
  titleAr,
  description,
  descriptionAr,
  icon,
}) => (
  <div className="py-6 px-3 text-center text-slate-500 space-y-2" role="status">
    {icon && <div className="flex justify-center opacity-50">{icon}</div>}
    <p className="text-xs font-bold text-slate-400">{isAr && titleAr ? titleAr : title}</p>
    {(description || descriptionAr) && (
      <p className="text-[11px] text-slate-500 leading-relaxed max-w-sm mx-auto">
        {isAr && descriptionAr ? descriptionAr : description}
      </p>
    )}
  </div>
);
