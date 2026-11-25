# Shared boss turns

Normal floor enemies keep the nearest-player turn rules: one response to the
target's action, facing-direction ties and idle-target provocation. Polling and
unrelated players do not advance them. Existing solo-style monster traits remain.

Inside the active boss arena, each living, connected participant selects one
move, attack, skill, wait or item action. A choice can be replaced until resolution.
The first choice starts a 1,800 ms grace period. All-ready rounds can resolve after
268 ms; otherwise the deadline supplies waits for missing choices. Empty rounds
remain frozen, and polling after a long pause never catches up multiple rounds.

Moves validate against a single starting snapshot. Unique destinations, vacating
chains and swaps are supported; stationary players block. The regular movement
path still applies panels, status effects, skill charging and collection. Enemy
responses and fixed-tile warnings run once per enemy after all moves. Attack speed
selects initiative; it does not slow the existing attack animation. A lethal first
strike cancels that player's pending attack.

The room advisory lock protects the full resolution. Private actor execution
temporarily switches the authenticated identity and restores it on both success
and failure. It bypasses per-user locks only while the room lock is held, avoiding
inversion with another participant waiting for the room. Helpers remain private.

Opening/smash cinematics discard pending choices and keep their existing action
lock. Death, reset and completion retain the previous room/reward behavior. The
HUD shows ready/participant counts and remaining time; delayed potion sounds and
action errors use the authoritative completed-turn result.

Migration: `202611250001_online_shared_boss_turns.sql` (applied through the production
Supabase SQL editor on 2026-11-25; installation and helper privileges verified).
No account, character, equipment or room progress was reset for this release.

Validation, with audio disabled:

- `node scripts/test-target-turns.mjs`
- `npm run test:boss-rounds` — four players, one response, early/timeout resolution,
  idle freeze, swaps, collision, AoE escape, potions, lethal initiative and locks
- `node scripts/test-boss-cinematics.mjs`
- `node scripts/test-effect-panels.mjs`
- `npm run build`

These are local PostgreSQL-compatible integration tests. Real-device latency and
the feel of the 1,800 ms grace period still depend on live connection conditions.
