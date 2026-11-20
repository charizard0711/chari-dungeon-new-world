# Responsiveness and equipment rendering — 2026-11-20

Production: https://charidungeon.com/ (ZERO only).

- Start local cardinal movement immediately; queue at most three unconfirmed steps. RPC moves remain ordered, single-flight and server-validated. A stale acknowledgement cannot rewind the local prediction. Denial/death/teleport discards dependent moves; failures return to the last confirmed state. Items and rewards are never predicted.
- Poll at ~300 ms in dungeons / ~500 ms in town, skip hidden pages and pending moves. Poll revisions still reject stale responses.
- Migration 010 removes the global town lock from nested poll/list calls only. Mutations retain it. Migration 011 takes the party lock before per-user/presence/inventory writes, including target-room joins; enemy ticks still lock their room row. This avoids all-party polling contention while preserving party consistency and a fixed lock order. Both migrations are idempotent and preserve helper ACLs.
- Resolve equipment artwork in the active online scene. Load into a temporary texture and atomically swap, preserving facing frame and display size. Validate directional atlas frames; never reuse another weapon's scabbard. Correct alternate expansion-art paths in character previews and retain the 64px town character size after armor swaps.
- Add original synthesized pickup/drop WAVs (no external service). Play after successful mutations, including treasure/reward inventory gains; failed actions and polling stay silent. Shared SE volume, mute URL and noAudio remain respected.

Validation: build; test:responsiveness; town/equipment/adventure/map-A regression suites. Local UI used mute=1 / noAudio=true. Injected 450ms transport latency: local position advanced to (17,13) while confirmed position remained (16,12), then converged with an empty queue. Tested an alternate light sword plus Arcadia shield in the real UI; directional held frame and 64x64 body verified. Unit integration also covers queued ACKs, collision denial, network failure, loot success/failure, atomic texture loading and migration locks/ACLs.

Limit: bounded prediction hides input latency, not an unlimited outage or server throughput limit. No claim of a measured production FPS improvement is made; real-world load still depends on network latency and active players.
