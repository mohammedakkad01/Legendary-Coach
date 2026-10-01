/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Values recorded from the codebase BEFORE the Phase 1 refactor (commit fd85222).
 * They prove that centralizing position logic did not change a single number.
 */

export const LEGACY_SLOTS = ["GK", "CB", "LB", "RB", "CDM", "CM", "CAM", "LW", "RW", "ST", "LWB", "RWB", "LM", "RM", "LAM", "RAM", "XYZ"] as const;
/** Effective rating (overall 80, fatigue 20, morale 70, no secondaries) recorded from the ORIGINAL getEffectivePlayerRating before the refactor. Row = natural position, column = LEGACY_SLOTS. */
export const LEGACY_RATING_MATRIX: Record<string, number[]> = {"GK": [78, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 51], "CB": [12, 78, 66, 66, 51, 51, 31, 31, 31, 31, 66, 66, 31, 31, 31, 31, 51], "LB": [12, 66, 78, 78, 66, 51, 51, 31, 31, 31, 78, 78, 31, 31, 51, 51, 51], "RB": [12, 66, 78, 78, 66, 51, 51, 31, 31, 31, 78, 78, 31, 31, 51, 51, 51], "CDM": [12, 51, 66, 66, 78, 66, 51, 51, 51, 31, 66, 66, 51, 51, 51, 51, 51], "CM": [12, 51, 51, 51, 66, 78, 66, 51, 51, 51, 51, 51, 51, 51, 66, 66, 51], "CAM": [12, 31, 51, 51, 51, 66, 78, 66, 66, 51, 51, 51, 66, 66, 78, 78, 51], "LW": [12, 31, 31, 31, 51, 51, 66, 78, 78, 66, 31, 31, 78, 78, 66, 66, 51], "RW": [12, 31, 31, 31, 51, 51, 66, 78, 78, 66, 31, 31, 78, 78, 66, 66, 51], "ST": [12, 31, 31, 31, 31, 51, 51, 66, 66, 78, 31, 31, 66, 66, 51, 51, 51]};
/** Slot labels per formation recorded from the ORIGINAL data/formationLayouts.ts. */
export const LEGACY_FORMATION_LABELS: Record<string, string[]> = {"4-3-3": ["GK", "RB", "CB", "CB", "LB", "CDM", "CM", "CM", "RW", "ST", "LW"], "4-4-2": ["GK", "RB", "CB", "CB", "LB", "RM", "CM", "CM", "LM", "ST", "ST"], "4-2-3-1": ["GK", "RB", "CB", "CB", "LB", "CDM", "CDM", "RAM", "CAM", "LAM", "ST"], "3-5-2": ["GK", "CB", "CB", "CB", "RWB", "CM", "CAM", "CM", "LWB", "ST", "ST"], "5-3-2": ["GK", "RWB", "CB", "CB", "CB", "LWB", "CM", "CDM", "CM", "ST", "ST"], "4-1-4-1": ["GK", "RB", "CB", "CB", "LB", "CDM", "RM", "CM", "CM", "LM", "ST"], "3-4-3": ["GK", "CB", "CB", "CB", "RM", "CM", "CM", "LM", "RW", "ST", "LW"]};
