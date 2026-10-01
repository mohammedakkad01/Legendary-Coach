# Prompt A — finish Phase 4 (paste into Cursor Agent, in the REAL repo)

You are working in the real "The Legendary Coach" repo (Phases 0–3 already committed locally).
Phase 4 (Best Tactics) DOMAIN is already written and tested; your job is to integrate it.
Rules: surgical changes, no new deps, strict TS, tests in tsx-script style, i18n via typed dictionaries, RTL + mobile-first, never apply tactics silently, no browser alerts.

## 0. Files I am adding (copy as-is, same paths)
- src/domain/tactics/bestTactics/{types,availability,hungarian,slotValue,lineupOptimizer,candidateScorer,tacticsSelector,roles,reasons,recommendBestTactics,applyRecommendation,index}.ts
- src/i18n/bestTactics.ts
- scripts/testBestTactics.ts
- docs/phase4/gameTuning.BEST_TACTICS.snippet.ts  -> paste its `BEST_TACTICS` block into src/config/gameTuning.ts ABOVE the deepFreeze helper and add `deepFreeze(BEST_TACTICS);` with the others. (Do NOT replace gameTuning.ts: yours has TACTICAL_ENGINE which my copy lacked.)
- package.json: add script "testBestTactics": "tsx scripts/testBestTactics.ts" and chain it into "test".

## 1. Verify first (read-only), then report before editing
1. Run tsc + all tests; run `npx tsx scripts/testBestTactics.ts` (expect 53 passing).
2. Confirm which Phase 1 APIs my code imports exist unchanged: computeEffectiveRating, SUITABILITY_RANK, isOutOfPosition, normalizeSlot, positionGroupOf, getFormation, FORMATION_IDS, isFootballFormation, createSquadState/applySquadState, validateForKickoff, resolveTacticalState/toFootballTactics, Result/ok/err, clamp.
3. Find where the NEXT opponent's data lives (store: next fixture / match preview / opponent club) and what the engine uses for opponent attack/defense power and formation/mentality/pressing. Report the exact selector/function.

## 2. Integration tasks
A. Opponent adapter (pure): `src/domain/tactics/bestTactics/opponentProfile.ts` exporting `deriveOpponentProfile(...)` -> `OpponentProfile` using the SAME power functions the pre-match odds use (calcAttackPower/calcDefensePower via buildSlotAssignments for the opponent's XI) and the opponent's footballTactics. If no next match: return undefined (the recommender already handles it). Add tests.
B. Store: add `applyBestTactics(rec: BestTacticsRecommendation)` to useGameStore: reads the user's club, calls `applyRecommendation(club, rec, { maxSubstitutes })` (maxSubstitutes from the VIP tier, same source moveSquadEntity uses), writes ONE atomic state update on success; on Err returns the error for the UI to localize (`bestTacticsErrorText`). No silent application anywhere.
C. Hook `src/hooks/useBestTactics.ts`: `compute()` calls recommendBestTactics with the club squad (map Player -> BestTacticsPlayer), current lineup/tactics, opponent profile, maxSubstitutes. Memoize by a stable key (lineup ids + squad fitness/availability fields + tactics + opponent); compute on button press only (never on render). Expose {status, recommendation, error, compute, apply, dismiss}.
D. UI (mobile-first, RTL, existing design language, no hardcoded strings -> src/i18n/bestTactics.ts):
   - `src/components/tactics/BestTacticsButton.tsx` in the Tactics screen (TacticalBoardView.tsx): one button, disabled while computing.
   - `src/components/tactics/BestTacticsPreviewSheet.tsx`: bottom sheet showing formation, score vs current score, expected points, the proposed XI on a mini pitch (reuse PitchPlayerNode/PositionBadge styling), "Changes" list (who replaces whom — only slots that differ), tactical settings, substitutes, alternatives (formation + score), and the localized reasons via `reasonText(reason, names, isAr)`. If `alreadyOptimal`, show `noChanges` and keep Apply available but secondary. Buttons: Apply / Cancel. Escape/back closes. Focus-trap + aria labels. On Apply -> store.applyBestTactics; on Err show `bestTacticsErrorText` inline (no alert()); if UNAVAILABLE_PLAYER show the stale-warning and offer re-compute.
   - Players come from the club squad; build the id->name map from it.
E. Tests (tsx style): store action applies atomically & rejects stale; opponent adapter; hook key stability (pure part). Keep all 214 existing tests green.

## 3. Known limitations you must handle or flag (do not hide them)
- The scoring model in candidateScorer.ts is an independent, config-driven heuristic (BEST_TACTICS in gameTuning). It does NOT call the engine's calcAttackPower/calcDefensePower/TACTICAL_ENGINE bonus. Optional but valuable: add a calibration script that, for ~200 seeded matches vs a fixed opponent, compares the engine's results for (a) the Best-Tactics setup and (b) the current/top-11-by-overall setup, and report whether Best Tactics gains points. If it does not, tell me and propose reweighting in BEST_TACTICS (config only).
- validateForKickoff is still not wired into confirmStartMatch (open decision from earlier phases) — do NOT change it now.
- Lint: the zip I tested had no eslint.config; run the repo's real lint.

## 4. Deliverable
Report: files changed, tests added, tsc/lint/test results, open decisions. Then STOP and wait for my approval before Phase 5.

---
# Prompt B — Phases 5–8 (use AFTER Phase 4 is approved; paste the original brief's global rules + the phase text)
Start with PHASE 5 (Referee). Before any code: read-only check of what Phases 1–4 built that Phase 5 depends on (SeededRandom in engine/prng.ts, footballEngine event generation for fouls/cards/penalties, MatchEvent types, match-state persistence of the seed), then give a file-level plan and WAIT. Referee/VAR apply only to the user's own matches (live/instant/skip), never to matchdaySimulator.ts. One phase at a time; after each: tsc + lint + all tests + short report + wait.
