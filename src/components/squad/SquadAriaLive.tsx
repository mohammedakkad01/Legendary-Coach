/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Visually-hidden live region announcing squad drag-and-drop outcomes
 * ("David swapped with Karim", "Move rejected: …") to screen-reader users.
 */

import React from 'react';

export const SquadAriaLive: React.FC<{ message: string }> = ({ message }) => (
  <div role="status" aria-live="polite" className="sr-only">
    {message}
  </div>
);
