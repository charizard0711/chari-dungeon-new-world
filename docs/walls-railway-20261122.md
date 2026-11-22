# Connected maze walls and boss railway

- First-floor walls use the approved wall atlas as continuous world-aligned upper faces, shaded returns, front faces and shadows. Blue-grey corridors, pale spring rooms and dark boss walls share collision cells with the existing maze. Static chunks are cached; movement does not rebuild walls.
- Entrance station: turnstile (49,80), landing (49,79). Boss station: turnstile (53,26), landing (52,26), outside the sealed arena. Station alcoves extend existing walkable ground without changing existing rooms or progress.
- A server trigger records each participating character when the boss encounter reaches `battle`. Opening the cage alone does not unlock the train. Unlock persists after defeat, leaving and creating another room. The destination remains in the same room and floor; keys and arena seals still apply.
- Server verifies authenticated character, dungeon/floor, unlock, station distance, attack recovery and free destination tiles. Clients cannot write the unlock table.
- Ride shows 3-frame wheels and crystal lights, continuous rails/sleepers, tunnel parallax, acceleration, cruise and braking over 6.2 seconds. No audio is played during QA.
- SQL migration: `202611220006_online_boss_railway.sql`, applied transactionally. No resets of room snapshots or characters.
- Validation: `test-boss-railway.mjs`, `test-railway-map.ts`, `test-target-turns.mjs`, TypeScript and production build; muted browser journey and stations.
- The legacy `test-adventure-map.ts` still targets the obsolete 128×60 map and already-stale spawn coordinates; this change uses the current 107×84 maze validation instead.

Artwork: built-in image_gen. Assets saved to `public/assets/online/railway-v1/`. Prompts recorded in `ASSETS.txt` there. Approved wall texture remains `public/assets/online/wall-demo-v1/walls.png`.
