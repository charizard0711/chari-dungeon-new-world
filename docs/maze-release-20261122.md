# Floor 1 maze release

107 × 84 tile map, 11 rooms, 48 enemies and 42 chests. Six ordinary candidate chests become gold once per room; the cooperative vault always contains a gold chest.

The right-side pressure panel needs another player to cross. The bridge remains raised while occupied and lowers after the last occupant returns. State and chest rewards are server authoritative.

The left fountain is once per character and room: normal 89%, silver 10%, gold 1%. Boss readiness pads trigger a cage-opening sequence and seal the exits. A party wipe resets the boss; victory removes floor buffs.

Migration preserves character money/equipment and opened legacy chests, moves existing floor-one positions to a safe entrance, and initializes new map state. Apply 202611220001_online_maze_cooperation.sql before publishing this build.

Validation: node scripts/test-online-maze.mjs; node scripts/previews/test-encounter.mjs; npm run build. Local actual-scene QA: /maze-check.html?mute=1 (development only). Browser checks are muted.
