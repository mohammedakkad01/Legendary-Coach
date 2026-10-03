/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * RangeDisplay — Safe rendering of numeric and monetary ranges.
 * Never leaks exact values; formats min–max neatly with localized units.
 */

import React from 'react';

interface RangeDisplayProps {
  min: number;
  max: number;
  type?: 'rating' | 'currency' | 'weeks';
  className?: string;
  isAr?: boolean;
}

export const RangeDisplay: React.FC<RangeDisplayProps> = ({
  min,
  max,
  type = 'rating',
  className = '',
  isAr = false,
}) => {
  const formatCurrency = (val: number): string => {
    if (val >= 1_000_000) {
      const millions = (val / 1_000_000).toFixed(1).replace(/\.0$/, '');
      return isAr ? `${millions} مليون €` : `€${millions}M`;
    }
    if (val >= 1_000) {
      const thousands = Math.round(val / 1_000);
      return isAr ? `${thousands} ألف €` : `€${thousands}K`;
    }
    return `€${val.toLocaleString()}`;
  };

  if (type === 'currency') {
    const formattedMin = formatCurrency(min);
    const formattedMax = formatCurrency(max);
    return (
      <span className={`font-mono font-bold tracking-tight ${className}`}>
        {min === max ? formattedMin : `${formattedMin} – ${formattedMax}`}
      </span>
    );
  }

  if (type === 'weeks') {
    return (
      <span className={`font-medium ${className}`}>
        {min === max
          ? `${min} ${isAr ? 'أسبوع' : 'wk'}`
          : `${min} – ${max} ${isAr ? 'أسابيع' : 'wks'}`}
      </span>
    );
  }

  // default 'rating'
  return (
    <span className={`font-mono font-extrabold ${className}`}>
      {min === max ? min : `${min} – ${max}`}
    </span>
  );
};
