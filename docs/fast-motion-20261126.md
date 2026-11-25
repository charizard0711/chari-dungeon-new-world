# Dungeon motion rewrite — 2026-11-26

The production dungeon now has a dedicated authenticated online_dungeon_walk RPC. It validates room/floor, cardinal adjacency, server-clock movement credit, player/enemy occupancy, dynamic walls, boss locks, the cooperative bridge, webs, roots, traps and effect panels. It accepts at most three buffered squares per call. No client timestamp controls movement. A private per-character input channel caches the last acknowledgement; retries of the same sequence cannot repeat movement or rewards. Only receipt metadata is stored, not another copy of the room snapshot. Lock waits are bounded.

The client maintains bounded local prediction, sends buffered dungeon squares even near enemies, and accepts combat pulses while movement is pending. Metadata polling is reduced from 500ms to 2s in dungeons. Older metadata/ACK replies cannot rewind newer combat/position state. Nonmovement actions drain the currently in-flight batch and cancel unsent predictions before acting. A failed movement resets the local input channel and reconciles state.

Fast packets carry authoritative HP, charge counters, positions, floor snapshot, combat events, chat and ground items. Equipment/inventory/social metadata continue through the established authenticated APIs. HP/gold changes no longer rebuild every weapon and inventory item on the client. Existing mutations, rewards and item rules are retained.

Enemy simulation reuses the existing trait logic against one in-memory JSON frame, persists the result once instead of twice per enemy, and reads static floor config once per tick. Private cached collision/LOS helpers copy the existing rules; grid parity is tested. Combat processing reuses its first complete result and refreshes post-death state without a second complete world rebuild.

Validation completed:
- Full migration chain in isolated PGlite; movement batching, duplicate receipt, partial credit/collision, player exclusion, healing/paralysis/roots/webs, wrong-room rejection, boss opening lock and API/table permissions.
- Existing boss cinematic suite: shared intro, both participants locked, 2 HP checkpoints, three broken floors per checkpoint, knockback once and wipe reset.
- Existing effect panel suite: individual healing, exactly one lost turn, buffs and destruction.
- 2,664 cell collision/LOS parity check across key/bridge/boss/broken-floor states.
- Real scene queue tests: combat reception during movement, stale ACKs, partial batches, rollback, metadata ordering and interaction drain. Ground loot and remote attack/chat pulse propagation checked.
- TypeScript and production build; browser tests use mute=1/noAudio.

Measurements are local, not a guarantee of live two-device latency:
- Isolated movement median about 22ms to 4ms (roughly 80% reduction). Earlier run 20.8ms to 3.1ms. Results vary with warmup/fixture.
- Same real scene queue with artificial 350ms RPC: previous dungeon 24 squares in 8.60s (2.79/s), new 4.36s (5.51/s), about half the duration. This is injected latency, not a measured player RTT.
- 12-enemy stress fixture: room updates 701 to 57 across 28 samples (about 92% fewer writes); median about 44.5ms to 32.4ms. This is an intentionally dense synthetic fixture.
- Attack response CPU improvement is variable; no fixed percentage is claimed.

Production migration 202611250005 applied through Supabase SQL Editor in a transaction. Verified cached movement, cached enemy scheduler, combat refresh and private receipts. A small create-or-replace follow-up included ground loot in the common packet.

Limits: HTTP/network RTT still exists. Room time remains request-driven; this release does not introduce a persistent WebSocket game server. Live two-player latency and iPhone Safari memory usage still require observation. No promise of zero network lag is made.

One older ground-loot test harness fails before SQL setup because its data-URL transpilation cannot resolve the existing gardenMap import. The replacement fast-motion and pulse tests cover movement and ground-loot propagation; this unrelated harness import failure is not reported as passing.
