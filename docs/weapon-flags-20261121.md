# Shared weapon rig and guild flags

- All 103 weapon definitions, normal and rare colors, use `loadWeaponVisual` in the motion lab, live actor renderer and equipment/character previews.
- The original eight demo representatives retain their approved sources and grips. Other weapons register their handle and axis from their own opaque pixels. Dual blades use one blade per hand; bows and guns have dedicated front/back views.
- Generated art and prompts: `art/weapon-directions-v7/README.md`. Seven transparent atlases, including rare single dual blades; existing item icons remain unchanged.
- Tile animation: 205 → 175 ms, preserving the 600 ms eight-pose walk cycle.
- Guild leaders choose one of ten flags during creation or in the Guild menu. A 14×16 flag appears immediately left of each member's overhead name. Unguilded players have no flag.
- Migration `202611210009_online_guild_flags.sql` applied through the Supabase SQL editor. Verified the flag column exists, the authenticated game RPC remains executable, and the internal wrapper is not executable by clients.

Validation: TypeScript/build; 206 variants × 4 directions × 8 attack phases (6,592 rendered frames) in the muted browser QA; no console errors. Registration padding invariance, source/mapping completeness, 808 rig poses, layering, 18 wardrobe combinations, movement and guild/social regressions passed. Guild tests cover flag range, leader-only writes, propagation to members, inspection and removal after leaving.

Browser QA: normal/rare bows, lances, katana and dual blades; guild flag selection/save and overhead flag. No real player inventory or guild was changed during tests.
