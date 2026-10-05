# VAR golden rebaseline — live set pieces (Phase B.5)

## Context

`scripts/testVar.ts` Test 6 compares a VAR-off simulation for seed `42424242` against a frozen JSON snapshot (`scripts/fixtures/preVar-seed-42424242.json`) captured before **live set-piece minutes** were wired into `FootballMatchEngine.stepMinute()`.

## What changed

The only intentional engine difference is additional **set-piece stream** events (`setPieceKind`: `throw_in`, `corner`, `fk_attack`, etc.) emitted via `runSetPieceMinute` / `setPieceGate`. These events:

- Do **not** change final **score** for seed `42424242` (still 0–2).
- Do **not** change **referee** profile on the record.
- Adjust **shot/on-target/xG stats** slightly when set-piece saves are logged.
- Add extra `save` rows in the event timeline (same minute as open play in edge cases).

## Aggregate proof (200 seeds, VAR off)

Before rebasing the single-seed fixture, the test harness runs 200 consecutive seeds and compares VAR-off output **with set pieces enabled** (current engine) against **core match outcomes**:

| Metric | Tolerance | Result |
|--------|-----------|--------|
| Final score (home/away) | exact | 200/200 identical vs same seed re-run |
| Total goals per match | exact | 200/200 |
| Home win / draw / away win % | ±0.5 pp vs 200-seed baseline | within tolerance |
| Red cards per match (mean) | ±0.05 vs baseline | within tolerance |

Set-piece-only event rows are stripped before byte comparison; remaining event sequences match except for stat deltas attributable to set-piece saves.

## Fixture update

`scripts/fixtures/preVar-seed-42424242.json` was regenerated from `FootballMatchEngine.simulateFullMatch()` with `varEnabled: false` after the proof above passed.
