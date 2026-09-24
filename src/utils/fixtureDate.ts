/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Small helpers to show a fixture's calendar date (ISO yyyy-mm-dd) in the UI.
 */

const parseISO = (iso?: string): Date | null => {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
};

/** e.g. "السبت، 3 أكتوبر 2026" / "Sat, 3 October 2026" */
export function formatFixtureDate(iso: string | undefined, isAr: boolean): string {
  const d = parseISO(iso);
  if (!d) return isAr ? 'الموعد يُحدد لاحقاً' : 'Date TBD';
  return d.toLocaleDateString(isAr ? 'ar' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

/** Short form for compact cards: "3 أكتوبر" / "3 Oct" */
export function formatFixtureDateShort(iso: string | undefined, isAr: boolean): string {
  const d = parseISO(iso);
  if (!d) return '—';
  return d.toLocaleDateString(isAr ? 'ar' : 'en-GB', { day: 'numeric', month: 'short' });
}

/** Whole days from today to the fixture date (negative = date already passed). null if no date. */
export function daysUntil(iso: string | undefined): number | null {
  const d = parseISO(iso);
  if (!d) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}

/** "اليوم" / "غداً" / "بعد 5 أيام" / "بانتظارك الآن" (date already passed but not played yet). */
export function countdownLabel(iso: string | undefined, isAr: boolean): string {
  const n = daysUntil(iso);
  if (n === null) return '';
  if (n < 0) return isAr ? 'بانتظارك الآن' : 'Waiting for you';
  if (n === 0) return isAr ? 'اليوم' : 'Today';
  if (n === 1) return isAr ? 'غداً' : 'Tomorrow';
  return isAr ? `بعد ${n} أيام` : `In ${n} days`;
}
