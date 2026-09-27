/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Youth Academy Talent Generator
 * Pure domain logic generating prospects based on youth academy level.
 */

import { Player } from '../../types/game';

const ACADEMY_FIRST_NAMES_AR = ['خالد', 'ياسر', 'فيصل', 'سلطان', 'ماجد', 'عبدالعزيز', 'تركي', 'نواف', 'بندر', 'راكان'];
const ACADEMY_LAST_NAMES_AR = ['الغامدي', 'العتيبي', 'القحطاني', 'الزهراني', 'الشمري', 'الدوسري', 'المطيري', 'الحربي'];
const ACADEMY_POSITIONS: Array<Player['position']> = ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'RW', 'ST'];

export function generateAcademyTalent(
  sport: 'football' | 'basketball',
  youthAcademyLevel: number
): { talent: Player; starRating: number } {
  const first = ACADEMY_FIRST_NAMES_AR[Math.floor(Math.random() * ACADEMY_FIRST_NAMES_AR.length)];
  const last = ACADEMY_LAST_NAMES_AR[Math.floor(Math.random() * ACADEMY_LAST_NAMES_AR.length)];
  const fullName = `${first} ${last}`;
  const position: Player['position'] = sport === 'football'
    ? ACADEMY_POSITIONS[Math.floor(Math.random() * ACADEMY_POSITIONS.length)]
    : (['PG', 'SG', 'SF', 'PF', 'C'] as Player['position'][])[Math.floor(Math.random() * 5)];

  // Facility level 1-10 nudges the average potential from ~72 up to ~90.
  const facilityBonus = (youthAcademyLevel - 1) * 1.8;
  const potential = Math.max(60, Math.min(96, Math.round(68 + facilityBonus + (Math.random() * 20 - 4))));
  const overall = Math.max(48, Math.round(potential - (12 + Math.random() * 10)));
  const starRating = potential >= 90 ? 5 : potential >= 84 ? 4 : potential >= 76 ? 3 : potential >= 68 ? 2 : 1;
  const rarity: Player['rarity'] = starRating >= 5 ? 'legend' : starRating >= 4 ? 'rare' : 'prospect';

  const talent: Player = {
    id: `academy_gen_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    sport,
    name: fullName,
    nameEn: fullName,
    age: 16 + Math.floor(Math.random() * 3),
    nationality: 'السعودية',
    nationalityFlag: '🇸🇦',
    position,
    secondaryPositions: [],
    overall,
    potential,
    attributes: {
      pace: overall + Math.floor(Math.random() * 6) - 3,
      dribbling: overall + Math.floor(Math.random() * 6) - 3,
      passing: overall + Math.floor(Math.random() * 6) - 3,
      shooting: overall + Math.floor(Math.random() * 6) - 3,
      physical: overall + Math.floor(Math.random() * 6) - 3,
      defending: position === 'GK' ? 30 : overall + Math.floor(Math.random() * 6) - 3,
      goalkeeping: position === 'GK' ? overall : 10,
      speed: overall,
      playmaking: overall,
      shootingThree: overall,
    },
    rarity,
    personality: (['ambitious', 'professional', 'nervous', 'leader'] as const)[Math.floor(Math.random() * 4)],
    traits: starRating >= 5 ? ['خريج الأكاديمية الذهبي', 'مهارات فطرية'] : ['خريج الأكاديمية'],
    morale: 90,
    form: 6 + Math.floor(Math.random() * 3),
    stamina: 95,
    fatigue: 0,
    injuredWeeks: 0,
    suspendedMatches: 0,
    contractYears: 4,
    wage: Math.round(overall * 12),
    marketValue: Math.round(overall * overall * 700),
    matchesPlayed: 0,
    goalsOrPoints: 0,
    assists: 0,
    cleanSheetsOrRebounds: 0,
    averageRating: 0,
  };

  return { talent, starRating };
}
