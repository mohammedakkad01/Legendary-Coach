// ---------------------------------------------------------------------------
// 5) BEST TACTICS  (Phase 4 — NEW; consumed only by domain/tactics/bestTactics/*)
// Paste this block into src/config/gameTuning.ts ABOVE the "Deep freeze" helper,
// and add `deepFreeze(BEST_TACTICS);` next to the other deepFreeze calls.
// All values are heuristics, clamped at load, and only affect the RECOMMENDATION
// — never the match engine.
// ---------------------------------------------------------------------------
export const BEST_TACTICS = {
  /** Share (0–0.5) of a slot value that comes from role-relevant attributes instead of overall. */
  attributeBlend: bounded(0.25, 0, 0.5),
  /** Max rating points a player's form (1–10) can add/remove. 0 disables form. */
  formBonusMax: bounded(2, 0, 5),
  /** Max rating points removed for very low stamina (0–100). */
  staminaPenaltyMax: bounded(3, 0, 6),
  /** Fatigue (0–100) at/above which a player counts as "tired" in the reasons. */
  tiredFatigue: bounded(70, 40, 100),
  /** Form (1–10) at/above which a player counts as "in form" in the reasons. */
  inFormThreshold: bounded(8, 6, 10),
  /** Used when no opponent info is available (power on the same ~rating scale). */
  defaultOpponent: { attack: bounded(70, 30, 99), defense: bounded(70, 30, 99) },
  /** Rating-point gap → win probability steepness (bigger = flatter). */
  logisticScale: bounded(9, 3, 30),
  /** Max draw probability (reached when teams are level). */
  drawMax: bounded(0.3, 0.1, 0.45),
  /** Composite score weights (normalized at use; must stay > 0 in total). */
  weights: {
    expectedPoints: bounded(0.55, 0, 1),
    suitability: bounded(0.15, 0, 1),
    condition: bounded(0.10, 0, 1),
    naturalShare: bounded(0.10, 0, 1),
    styleFit: bounded(0.10, 0, 1),
  },
  /** Per-position contribution to team attack / defence power (0–1). */
  attackWeight: {
    GK: 0, CB: 0.05, LB: 0.25, RB: 0.25, CDM: 0.2, CM: 0.45, CAM: 0.8, LW: 0.9, RW: 0.9, ST: 1,
  },
  defenseWeight: {
    GK: 1, CB: 1, LB: 0.6, RB: 0.6, CDM: 0.8, CM: 0.45, CAM: 0.15, LW: 0.1, RW: 0.1, ST: 0.05,
  },
  /** Attribute relevance per slot (each row sums to 1). Missing attribute → player's overall. */
  slotAttributes: {
    GK: { goalkeeping: 1 },
    CB: { defending: 0.55, physical: 0.3, pace: 0.15 },
    LB: { defending: 0.35, pace: 0.3, passing: 0.2, physical: 0.15 },
    RB: { defending: 0.35, pace: 0.3, passing: 0.2, physical: 0.15 },
    CDM: { defending: 0.4, passing: 0.3, physical: 0.3 },
    CM: { passing: 0.4, dribbling: 0.2, defending: 0.2, physical: 0.2 },
    CAM: { passing: 0.35, dribbling: 0.3, shooting: 0.25, pace: 0.1 },
    LW: { pace: 0.35, dribbling: 0.35, shooting: 0.2, passing: 0.1 },
    RW: { pace: 0.35, dribbling: 0.35, shooting: 0.2, passing: 0.1 },
    ST: { shooting: 0.5, pace: 0.2, physical: 0.2, dribbling: 0.1 },
  },
  /** How sliders move team power (rating points per slider point above/below 50). */
  sliderEffect: {
    attackPerAttackingIntensity: bounded(0.05, 0, 0.2),
    defensePerAttackingIntensity: bounded(-0.045, -0.2, 0),
    defensePerDefensiveIntensity: bounded(0.02, 0, 0.1),
  },
  /** Opponent-aware mentality: desired intensity = 50 + gap × gapScale (clamped ±maxShift). */
  mentality: {
    gapScale: bounded(3, 0, 8),
    maxShift: bounded(30, 0, 50),
    penaltyPerPoint: bounded(0.04, 0, 0.2),
  },
  /** Matchup bonuses, in rating points (added to the expected strength gap). */
  matchup: {
    midfieldPerPlayer: bounded(0.8, 0, 3),
    wideVsBackThree: bounded(0.8, 0, 3),
    directVsHighPress: bounded(1, 0, 3),
    tikiVsHighPress: bounded(-1, -3, 0),
    tikiSkillOk: bounded(75, 50, 95),
    counterVsAttacking: bounded(1, 0, 3),
    counterPaceMin: bounded(70, 50, 95),
    offsideTrapBonus: bounded(0.6, 0, 3),
    offsideTrapRisk: bounded(-0.8, -3, 0),
    offsideDefendingMin: bounded(72, 50, 95),
    offsideLineMin: bounded(60, 30, 100),
  },
  /** Squad-trait fit of tempo / width / passing / pressing (rating points, ±maxAdjust). */
  style: {
    maxAdjust: bounded(3, 0, 8),
    perSkillPoint: bounded(0.08, 0, 0.3),
    skillReference: bounded(65, 40, 90),
    pressingStaminaReference: bounded(70, 40, 95),
    pressingStaminaPenalty: bounded(2.5, 0, 8),
  },
  /** Do not recommend a change whose composite gain over the current setup is below this. */
  minImprovement: bounded(0.5, 0, 10),
  /** Number of runner-up formations returned for the preview. */
  alternativesCount: bounded(2, 0, 6),
} as const;

