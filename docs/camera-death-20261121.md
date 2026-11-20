# Dungeon camera and death return

- Camera following attaches once per actor instead of restarting and recentering on every server packet.
- Dungeon camera has a central dead zone (56% width, 54% height). Walking inside it holds the view still; crossing its edges scrolls smoothly with existing interpolation and map bounds.
- Town retains its original follow style with packet-induced recentering removed.
- A server-owned, per-character death counter is stored in the room snapshot. The migration only annotates the existing respawn branch and is idempotent; saves, loot, equipment and HP recovery rules are retained.
- New deaths freeze local controls and movement. The screen fades to black over 700 ms. Position and camera update under black, hold for 450 ms, then upper/lower eyelids open over 1800 ms at the dungeon entrance. The counter is baselined on scene entry to avoid replaying historic deaths.
- Migration `202611210002_online_death_cue.sql` applied to the production Supabase project; `death_cue_installed = true` verified.

## Verification

- `node scripts/test-online-death-cue.mjs`: entrance coordinates/HP, one cue per death, repeat polling, repeated migrations, second death, equipment/inventory/gold preservation.
- `npm run test:adventure`: existing persistent-room and real-time encounter tests passed.
- Actual Phaser camera simulation on 740×520 and 374×374 viewports: one-cell movement remains fixed, outer movement eases, reverse movement remains fixed, world bounds and reacquisition passed.
- Browser death animation test and real OnlineTownScene integration: position held until black, entrance change under black, eyelid reveal, restored controls, no browser errors.
- All browser verification used `?mute=1`; the game integration confirmed `noAudio=true`. No sound played.
- Screenshots under `outputs/camera-death-20261121/`.
