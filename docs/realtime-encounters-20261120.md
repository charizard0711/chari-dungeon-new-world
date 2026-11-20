# Server-timed encounters — 2026-11-20

ZERO only: https://charidungeon.com/.

- Replace player-step enemy turns with a shared server clock. An active player's ordinary state polling advances idle encounters; player actions also observe the same clock. The room's lock and 200ms simulation gate prevent the party's RPC count from multiplying enemy actions. No additional always-on daemon is introduced; rooms without online floor-1 players sleep.
- Ordinary enemies pursue at a minimum 600ms interval; elites 750ms, boss 900ms. Independent melee cooldowns are 1200/1400/1600ms. Sleeping enemies at home skip movement planning; home definitions are indexed once per simulation step. Territory, collision, HP/defence and player movement validation remain server owned.
- Boss/elite area attacks mark fixed tiles for 3000ms. Server timestamps decide hits exactly once on the first simulation update after the deadline. Melee and movement continue during casting. Killing the caster cancels its pending area attack. The next area cast is at least 8000ms after the previous cast.
- A gap over 3 seconds shifts encounter timers forward; there is no replay of missed enemy moves or overdue attacks when an inactive party reconnects. Fresh presence is still required, and offline characters are excluded from area-hit targets.
- Responses include a private server-generated timestamp; the client anchors a monotonic tenths-of-a-second countdown to it. The UI shows 3.0s -> 2.9s and waits for server confirmation at 0.0s. Prediction redraws cannot restart the countdown. No client-provided timestamps control damage.
- Enemy sprites finish their current cardinal tile before following the next queued snapshot. Typical ordinary steps interpolate for 480ms rather than rushing through every update in 70-150ms. Invisible enemies skip frame-animation rendering.
- Migration 013 adds only timing metadata to live snapshots; HP, kills, member positions, equipment, keys, chests and room progress are preserved. Legacy outstanding warnings receive a safe 1-3 second remaining deadline. Reapplying does not restart timers. Clock/tick helpers remain inaccessible to authenticated/anonymous clients.

Validation: build, adventure suite including realtime simulation/clock/migration cases, exploration, responsiveness, population. Tests cover autonomous pursuit without movement commands, four players sharing one tick, fixed cast deadlines under repeated actions, ordinary attacks during cast, dodge, one-time AoE damage, caster death, offline freeze/resume, ownership/ACLs and preserved saves. Local browser test used mute=1/noAudio=true and displayed 2.9s/2.8s warnings while the player was idle; enemy roots also showed intermediate positions while following server snapshots.

Cadence is subject to network/poll latency; the server never grants clients authority over AI or damage. Existing solo behavior is unchanged.
