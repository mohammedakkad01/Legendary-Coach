# Security Specification: Football API-Sports Layer 1 & Layer 2 Data Model

## 1. Data Invariants
1. Layer 1 Collections (`leagues_cache`, `clubs_cache`, `players_cache`, `sync_logs`) represent the official sports database. They are globally readable by all coaches, but write access is strictly forbidden from client SDKs to protect quota and data integrity (only server-side operations or authenticated admins can mutate them).
2. Layer 2 Collections (`user_saves/{userId}/club` and `user_saves/{userId}/club/players/{playerId}`) are owned exclusively by `request.auth.uid == userId`. No user can read, write, or modify another user's cloned save.
3. Once a user clones a club and player into Layer 2, base overall is set and mutations affect only `currentOverall`, `trainingBonus`, `vipBonus`, `fatiguePenalty`, `morale`, and `lastTrainingDate`.
4. User profiles and career saves (`users/{userId}`, `users/{userId}/careerSaves/{saveId}`) are restricted to `isOwner(userId)`.
5. Public community tactics (`tactics/{tacticId}`) are readable by all coaches; edits/deletions are restricted to the author, while `likesCount` can be incremented atomically.

## 2. The "Dirty Dozen" Threat Payloads
1. Unauthenticated client write to `leagues_cache/39` -> Must be REJECTED (Permission Denied).
2. Authenticated user attempting to overwrite `clubs_cache/team_real_madrid` -> Must be REJECTED.
3. User A attempting to read `user_saves/user_b/club` -> Must be REJECTED.
4. User A attempting to write to `user_saves/user_b/club/players/p_1` -> Must be REJECTED.
5. Injected 2MB oversized payload into `sync_logs` -> Must be REJECTED.
6. Fake client attempting to delete `leagues_cache/140` -> Must be REJECTED.
7. Spoofed admin claiming role without valid credential -> Must be REJECTED.
8. User writing negative coins or corrupted types to `user_saves/{userId}/club` -> Must be REJECTED.
9. Ghost fields injected into `user_saves/{userId}/club/players/{playerId}` -> Must be REJECTED by strict key checks.
10. Attempt to modify `userId` on an existing player clone document -> Must be REJECTED (Immutable field).
11. Blanket unauthenticated query across all user saves -> Must be REJECTED by Master Gate and path constraints.
12. Attempt to write to arbitrary root documents outside explicit match blocks -> Must be REJECTED by the global catch-all deny rule.
