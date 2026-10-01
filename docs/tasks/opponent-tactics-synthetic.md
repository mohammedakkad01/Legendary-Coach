# Task: Synthetic opponent tactics (implemented Phase 4 follow-up)

## Problem
`buildPreMatchData` spread `REAL_INITIAL_PLAYER_CLUB`, so every AI opponent used the same default tactics (4-3-3 / attacking / high press). Best Tactics reasons and style bonuses looked identical against every club.

## Done (this branch)
- **`src/domain/tactics/deriveSyntheticOpponentTactics.ts`** — deterministic tactics per `clubId` (+ light `starRating` nudge).
- **`useGameStore.buildPreMatchData`** — opponent `footballTactics` from `opponentTacticsWithRoles(...)` instead of the user template.
- **`scripts/calibrateBestTactics.ts`** — synthetic opponents use the same helper.
- **Tests** — `scripts/testBestTacticsIntegration.ts` §4b.

## Not in scope (future)
- Persisted tactics from real API / `squads_cache` when that data exists.
- Background **`matchdaySimulator`** AI clubs (still Poisson; unchanged).
- Re-baseline golden-master engine snapshots if we change **user** match seeds globally (this change only affects opponent `Club` objects built for pre-match + live user matches).

## Golden master note
Phase 3 golden tests use fixed clubs/seeds directly; they do not call `buildPreMatchData`. User-visible pre-match odds and live results **can** shift slightly when facing the same opponent id (tactics only, squad unchanged).
