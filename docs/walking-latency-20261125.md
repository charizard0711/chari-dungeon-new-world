# Walking and freeze investigation — 2026-11-25

Production observations (Supabase SQL statistics and Postgres logs, JST):
- Recent 60-minute view contained no 5xx, but expanding to 24 hours exposed repeated statement timeouts at 17:20–17:21, plus advisory-lock waits around 3–7.6 seconds.
- Aggregate RPC statistics included mean 91.75ms and max 7759.38ms for the largest query group. These are cumulative, not per-action or a direct reproduction of the reported freeze.
- The timeout stack included online_maze_sync_pre_cinematic and the world wrapper chain. There was no basis to attribute everything to server hardware.

Changes:
- Idle dungeon polls opt into nonblocking user/room advisory locks, in the existing user-before-room order. Busy polls defer until the next tick rather than entering the queue. Old clients keep receiving complete packets.
- Ordinary buffered movement can send at most three cardinal squares per RPC. Every square runs the existing authoritative movement/combat/heal path. A server-clock token bucket retains the 110ms minimum and caps stored credit to three squares. Near enemies, boss planning and houses retain their existing single-step behavior.
- A partial batch preserves confirmed squares, rejects the blocked remainder, and reconciles prediction without replaying uncertain mutations.
- Opened chests no longer send repeated failing interactions when a direction key is held against them. Repeated already-open validation errors were also present in the incident logs.
- Network waits abort after 8 seconds and release busy state. An in-memory ring retains only 100 action/time/status entries, without payloads, chat, identity or tokens.
- Monster-death comparison uses an ID index; alive monsters skip death-only profile work.
- Rendering indexes monster states once per packet. Visibility rays reuse tile results; fog work is limited to the viewport; adjacent actor steps avoid BFS.

Validation:
- Real scene queue with mocked delayed responses: batching, prediction, partial credit, collision, timeout recovery and no mutation replay.
- Isolated SQL tests: rate limits, input cap, partial collision, fountain, dungeon movement, boss exclusion, permissions; injected busy locks verify deferred polling and legacy compatibility.
- Nearest-target mob properties, splitting/lantern/torch, shared boss turns and screen LOS pass.
- Visibility test: identical visible tiles, 12420 -> 621 visited cells for the sample viewport (95% fewer checks, not an overall FPS claim).
- Local PGlite CPU benchmark with 48 monsters: 25.67ms -> 25.45ms median. This small gain does not establish a production CPU improvement. Batching targets network round trips; poll deferral targets lock contention.
- Browser town arrow movement checked with mute=1/noAudio; no console errors. No live multiplayer latency reproduction has been performed after release.
