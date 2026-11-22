# Map railway revision

- The entry hallway is one tile wide. The entrance gate is (49,83); walk south to (49,87) to board. The boss station gate remains (53,26), boarding tile (54,29).
- Boss-battle participation remains the per-character prerequisite. Opening the gate costs nothing. Boarding costs 500G, checked and deducted in the server transaction. Each trip is persisted in online_adventure_members. Repeated clicks cannot charge again during a trip.
- The train travels along the actual contiguous route in floor1-maze.json, not a separate loading screen. Four direction frames, straight/curved painted rails, camera tracking and acceleration/braking are shared by both directions. A journey takes 20 seconds.
- Poll responses expose authoritative trip progress for all passengers. Disconnecting does not refund/restart the ride. On arrival, the server selects a free walkable station tile. Riding members cannot perform gameplay actions or become enemy turn targets.
- Migration 202611220007_online_map_railway.sql adds columns and replaces the world wrapper; it preserves characters, unlocks and room snapshots. Apply it before deploying the matching client.
- Tests: test-boss-railway.mjs (unlock, gates, boarding, fare, duplicate actions, insufficient funds, mid-route state, arrivals and permissions); test-railway-map.ts (map parity, connectivity, route continuity); TypeScript/build. Browser checks use mute=1.
- Art provenance: public/assets/online/railway-v2/ASSETS.txt. Original v1 station gate art is retained.
