# Real-time grid combat

Players retain grid movement and authoritative collisions. Each character stores move_step_ms (default 152ms, allowed 110–400ms). Weapon cooldowns are enforced on the server and displayed as attacks per second: handgun 260, dagger 280, twin daggers 300, dual swords 360, katana 380, longsword 420, lance 470, bow 650, greatsword 760ms. These are initial tuning values.

Enemies use shared room time, with separate per-species movement and attack deadlines. Only nearby enemies with present players update. An extra player cannot accelerate the same simulation tick. Existing target selection, enemy traits, collision and boss checkpoint cinematics are retained. Ordinary AoE has a fixed shared deadline; opening/floor-breaking cinematics freeze participants. Long inactivity resumes without overdue catch-up damage.

A nonblocking combat pulse transfers the snapshot and positions without rebuilding inventory/chat/equipment. The client rejects stale or cross-room pulses and preserves predicted movement while a movement request is pending. The 120ms pulse remains request-driven, not a background server daemon: rooms without active requests pause. Network RTT can still limit effective cadence.

Validation: full migration chain in PGlite; authoritative two-player clock deduplication, idle AI, enemy attack cooldown, timed AoE, safe resume, movement and attack rate limiting, cinematic action locks and permissions; sparse client packet merge; existing predictive movement/error reconciliation regression; TypeScript and production build. Browser tests use mute=1. Actual two-device latency still needs player feedback.

Production migration 202611250004 applied through Supabase SQL Editor in a transaction. The initial attempt rolled back on a whitespace hook assertion; regex whitespace hooks then applied successfully. Server function checks confirmed trait, movement, attack, area deadline and area cooldown hooks.
