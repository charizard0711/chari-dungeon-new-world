# Rear station and realtime corrections — 2026-11-26

The original south entrance remains at (49–50, 24), with the existing two-key requirement. The old station obstructed the client approach at (53, 26); server collision also differed from client turnstile collision. Restore the original maze corridor. Move the station to an exterior footprint (90–104, 3–20), with a northern rear passage into the same arena at (54–55, 2). Both arena exits seal during opening, battle and returning. Existing room progress, accounts and equipment remain; characters standing on removed solid geometry move to a nearby free corridor square.

Fast walking now respects locked stations, stops its buffered path on a boarding square, charges one 500G fare, and includes own travel/gold state in sparse updates. The real scene demo entered the boss scene through both entrances using keyboard input, muted. The station was visually inspected in the real Phaser scene.

Two more interruption causes were reproduced and corrected: an empty enemy array became JSON null after idle/resume, and the fast movement cinematic guard paused players outside the boss arena. Mandatory cinematic locks remain inside the arena. Redundant combat polls are skipped immediately after movement acknowledgements; idle combat polling uses 160ms rather than 120ms.

Validation: test-rear-station.mjs, test-realtime-edge-cases.mjs, test-fast-motion.mjs, test-fast-motion-client.mjs, test-frame-grid.mjs, test-production-realtime.mjs, test-boss-cinematics.mjs, test-combat-pulse.mjs; TypeScript boss stage/railway map tests; production build. No test sound was enabled.

Actual PostgreSQL 16 on an isolated loopback test cluster: user and room locks were each held in a separate session for 1.2 seconds. The movement request deferred immediately; the actual client retry loop recovered the unchanged input (8 attempts, 1.297 seconds, one accepted square). Four player connections then ran 72 walks alongside 140 combat pulses and 16 full metadata polls: 36 deferred retries, movement p50 73ms / p95 375ms / max 583ms, no lock timeout or deadlock. These include Windows psql process startup and local contention; they are not production network latency promises. An initial run exposed the empty-array failure above and was rerun successfully after correction.

Production SQL verification returned true for scoped cinematic guards, safe empty-room aggregation, and both unlocked entrances. Supabase migrations 202611260001–3 were applied; browser release must match these coordinates.
