/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Typed ar/en dictionary for the Phase 3 in-match tactics panel and the
 * 'tactical_change' event it produces. Mentality/Pressing/Tempo labels match
 * the pre-match Tactical Instructions panel in TacticalBoardView.tsx exactly,
 * so a coach sees the same words before and during the match.
 */

import type { FootballFormation, FootballTactics, MatchMentality, PressingStyle, TeamTempo } from '../types/game';
import { FORMATION_IDS } from '../domain/squad/formations';

type Bilingual = { readonly ar: string; readonly en: string };
const t = (ar: string, en: string): Bilingual => ({ ar, en });

export const LIVE_TACTICS_TEXT = {
  panelTitle: t('تعليمات فورية للفريق', 'Live Team Instructions'),
  formation: t('التشكيل', 'Formation'),
  mentality: t('العقلية', 'Mentality'),
  tempo: t('الإيقاع', 'Tempo'),
  pressing: t('الضغط', 'Pressing'),
  width: t('اتساع الخط', 'Width'),
  apply: t('تطبيق التعليمات', 'Apply Instructions'),
  applied: t('تم التطبيق — سيظهر أثرها من الدقيقة القادمة', 'Applied — takes effect from next minute'),
  noChange: t('لم يتغيّر شيء', 'Nothing changed'),
  close: t('إغلاق', 'Close'),
} satisfies Record<string, Bilingual>;

export const MENTALITY_TEXT: Record<MatchMentality, Bilingual> = {
  ultra_defensive: t('دفاعي متشدد', 'Ultra Defensive'),
  defensive: t('دفاعي', 'Defensive'),
  balanced: t('متوازن', 'Balanced'),
  attacking: t('هجومي', 'Attacking'),
  all_out_attack: t('هجوم شامل', 'All-Out Attack'),
};

export const PRESSING_TEXT: Record<PressingStyle, Bilingual> = {
  low_block: t('تكتل دفاعي', 'Low Block'),
  mid_press: t('ضغط متوسط', 'Mid Press'),
  high_press: t('ضغط متقدم', 'High Press'),
  gegenpress: t('جيجين بريس', 'Gegenpress'),
};

export const TEMPO_TEXT: Record<TeamTempo, Bilingual> = {
  slow_patient: t('هادئ ومدروس', 'Patient'),
  normal: t('متوازن', 'Normal'),
  fast_electric: t('سريع وصاعق', 'Electric Fast'),
};

export const WIDTH_TEXT: Record<FootballTactics['width'], Bilingual> = {
  narrow: t('ضيق', 'Narrow'),
  standard: t('عادي', 'Standard'),
  wide: t('واسع', 'Wide'),
};

export const FORMATION_LIST: readonly FootballFormation[] = FORMATION_IDS;

export const pick = (b: Bilingual, isAr: boolean): string => (isAr ? b.ar : b.en);

/** Bilingual narration for a 'tactical_change' event, from exactly the fields that changed. */
export function describeTacticalChange(changes: Partial<FootballTactics>): { textAr: string; textEn: string } {
  const partsAr: string[] = [];
  const partsEn: string[] = [];
  if (changes.formation) { partsAr.push(`التشكيل إلى ${changes.formation}`); partsEn.push(`formation to ${changes.formation}`); }
  if (changes.mentality) { partsAr.push(`العقلية إلى ${MENTALITY_TEXT[changes.mentality].ar}`); partsEn.push(`mentality to ${MENTALITY_TEXT[changes.mentality].en}`); }
  if (changes.pressing) { partsAr.push(`الضغط إلى ${PRESSING_TEXT[changes.pressing].ar}`); partsEn.push(`pressing to ${PRESSING_TEXT[changes.pressing].en}`); }
  if (changes.tempo) { partsAr.push(`الإيقاع إلى ${TEMPO_TEXT[changes.tempo].ar}`); partsEn.push(`tempo to ${TEMPO_TEXT[changes.tempo].en}`); }
  if (changes.width) { partsAr.push(`اتساع الخط إلى ${WIDTH_TEXT[changes.width].ar}`); partsEn.push(`width to ${WIDTH_TEXT[changes.width].en}`); }

  if (partsAr.length === 0) {
    return { textAr: '📋 المدرب يراجع تعليماته من الخط الجانبي.', textEn: '📋 The coach reviews instructions from the touchline.' };
  }
  return {
    textAr: `📋 تعليمات جديدة من المدرب: ${partsAr.join('، ')}.`,
    textEn: `📋 New instructions from the touchline: ${partsEn.join(', ')}.`,
  };
}
