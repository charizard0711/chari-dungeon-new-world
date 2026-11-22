# Attack timing, ranged shots, gait and local wall preview

- Attack speed: handgun 135, bow 45, greatsword 40; other types retain previous values. Animation time scales by 90 / speed. All greatswords use the heavy 200ms windup / 460ms base animation before speed scaling. Higher speed wins initiative, ties favour the player.
- Shared normal release/impact/recovery timing drives pose, projectile arrival, impact audio, damage numbers and delayed enemy HP/death presentation. Skill effect timelines scale with the weapon speed. The server applies matching attack recovery checks and a 70% handgun damage multiplier.
- HUD shows attack speed; visible enemies show speed and initiative comparison. A slower enemy's response animation follows the player's contact.
- Projectile origins use the same originalMuzzle rig calculation as the prototype, transformed into the rendered character space. Upward shots draw behind the body. Dedicated small bullet artwork and byte-identical CHARIA profile-gun-eagle recording are recorded in public/assets/online/projectile-v1/ASSETS.txt and weapon-audio-v2/ASSETS.txt.
- Up/down walk lower-body phases alternate the leading leg. Upper body, cape orientation, side walking and weapon anchors are preserved.
- Super account gold presets: 10k, 100k, 1M, 10M. Server keeps authentication, super_account, catalog unlock and integer overflow checks. Upper per-request amount is 10M.
- wall-demo.html is a local-only 48px grid preview with three new wall materials and old-wall comparison. Production maze walls are unchanged. Generated artwork/prompt: public/assets/online/wall-demo-v1/ASSETS.txt (built-in image_gen).

Validation: PGlite full-migration tests including speed, gun damage, recovery, initiative, gold permissions/limits; shared timing/muzzle assertions; TypeScript/build; muted browser UI checks. Audio verified by source/hash, never played aloud during testing.
