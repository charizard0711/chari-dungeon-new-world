# Dungeon growth investigation — 2026-11-27

## Findings

- The legacy and active in-memory spider AI both appended web records without deduplication or a cap. Production inspection found only33 entries at the time of diagnosis, so this was a real defect but not established as the main cause of the reported freeze.
- `mountAdventureView` retained enemy display containers when an enemy disappeared from a new snapshot without an explicit zero-HP update. A regression test fails against pre-fix source and passes after cleanup is added. This can accumulate invisible per-frame work over enemy replacement cycles.
- Every presentation sync serialized the entire room snapshot and reapplied static chest/gate/web state. Updates now skip identical snapshot references (except mutable local previews), cache static property segments, redraw enemy health bars only on HP/max changes, and precompute waterfall positions.
- Background combat pulses could overlap in-flight movement and metadata requests. They now yield while movement, queued movement or a metadata poll is active; metadata polls yield to an active dungeon pulse. Movement never waits for a background poll on the client.

## Chat history

- Each chat/log/channel view retains20 lines, dropping the oldest. Scene log buffers also retain20. No account or durable room progress is removed.
- Actual browser DOM inspection confirmed20 log rows after repeated notices.

## Server changes

`202611270008_online_bounded_webs.sql` adds a private immutable helper, keeps only the latest256 unique trap cells, patches both `online_enemy_step_state` and `online_turn_enemy_pre_cinematic`, and compacts existing room web arrays. Production verified both AI paths bounded and helper not callable by authenticated users. Existing maximum went33 to31 after deduplication. All other snapshot fields are preserved.

## Verification

- `test-dungeon-growth.mjs`: real PostgreSQL-compatible PGlite migrations,30000 legacy webs,20000 subsequent writes, bounded256 cells, duplicate removal, access restrictions, progress preservation and idempotent migration. Trap JSON487501 to4173 bytes in the synthetic worst case.
- `test-adventure-view-growth.mjs`: actual transpiled presentation code with object lifecycle mocks;5000 enemy spawn/despawn cycles plus5000 trap replacements. Pre-fix code fails cleanup assertion. Fixed code returns to baseline after every cycle.
- Fast movement server/client, responsiveness, combat pulse, player/enemy effects, input and presentation tests pass. All playback mocked or muted.
- Old `test-online-poll-contention.mjs` fails its expectation of six obsolete global-lock wrappers, which current migrations no longer use. This test is not evidence against the current per-user/per-room locking path; current fast-motion tests pass.
- Actual Phaser browser soak uses offline synthetic room snapshots and noAudio. It exercises production town/adventure presentation, camera/terrain streaming, equipment, recurring attacks/logs, web replacements and disappearing enemies. It does not reproduce network latency or prove all production freezes resolved.

## Local diagnostic trace

`performanceTrace.ts` retains at most24 samples locally in sessionStorage and the game canvas data attribute. Each5-second sample includes aggregate frame time, slow-frame count, objects, textures, tweens, update listeners, enemy/web counts, heap size where supported and recent request P95. No account identifiers, chat, inventory, coordinates or uploads. Listener is removed on scene shutdown; visibility changes reset the frame clock.

## Production observations

At inspection:16 saved rooms, maximum58 enemies, maximum JSON35558 bytes, events capped30. Database tables were small (rooms about5MB) with autovacuum operating. Cumulative RPC statistics include multi-second worst cases; these aggregate past releases and cannot establish current latency or identify this particular freeze. Do not claim a server upgrade is necessary from this evidence.
