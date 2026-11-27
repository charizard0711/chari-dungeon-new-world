# Gate, NPC greetings, equipment roles — 2026-11-27

## Runtime changes

- New two-state gate art at both existing stations.132x92px, cropped once from shared alpha atlas; closed leaves/amber minus and open clear lane/green arrow. Existing fare, unlock, blocking and boarding rules retained.
- Five short pre-rendered NPC WAV greetings: guide, merchant, barber, lottery and housing. Uses existing SE volume/mute/noAudio/background guards; one active voice,900ms click cooldown, destroys on completion/replacement/shutdown. Settings includes an audio-credit link. No runtime TTS, model download or paid API.
- Ten gloves mirroring the boots themes/ranks, with item catalog, equipment slot, gacha, cheat catalog, drop/pickup, quick slots and warehouse integration. Gloves and boots do not alter the character illustration.
- Online equipment roles: gloves attack cadence; boots movement cadence; clothing max HP; shield defense; necklace skill damage. Legacy solo/player rules stay behind the default `onlineEquipmentRules=false` flag; original solo repository untouched.
- Baseline movement = previous character step x1.25 (normally190ms). Boot haste by D/C/B/A/S/SS/SSS:5/8/12/16/20/25/30%. Weapon cadence baseline x1.15; gloves divide by same haste factors. Weapon-specific differences remain; animation/impact timing unchanged. Server enforces these values and returns the effective cadence for HUD/client input.
- Clothing adds5HP per base armor defense point. Existing starred-weapon50HP retained. Unequipping clamps HP without free healing. Full heal, potion/spring caps and instance sync use the same server HP function. Shield defense only, base3; fountain/panel modifiers retained.
- Necklace skill multipliers D through SSS:1.03/1.05/1.07/1.10/1.13/1.16/1.20. Applied to skill damage before authoritative enemy HP/event calculation; normal attacks unchanged.
- SUPER code99999999 invokes the server boss-test warp. Requires current dungeon membership and an implemented floor boss (currently floor1). Cannot interrupt opening/battle/returning. Sets required keys, waiting phase, resets broken floor scars and parks boss hidden; teleports caller to50,20 with loading, leaves panel activation to the existing all-participants rule. Does not auto-start battle or alter other player positions. No character/account access granted.

## Assets and prompts

Built-in `image_gen.imagegen` used, original alpha retained. Final project files:
- `public/assets/online/gate-v5/gates.png`: exact2-column closed/open atlas; top-down three-quarter RPG ticket gate, two bronze/gold/teal pedestals, cream stone plinths, right turquoise reader, thick gold leaves across lane when closed and retracted when open; clear one-tile walking lane; no floor, station, text or characters, transparent background. Frames cropped at runtime by opaque-pixel bounds.
- `public/assets/online/gloves-v1/gloves.png`: exact5x2 atlas, paired gloves matching boots: leather, chain, steel, arcane, dragon, holy dawn, white/cyan celestial, black/crimson celestial, pumpkin knight, pumpkin witch; hand-painted inventory style, consistent scale and true alpha, no arms/labels/background.128px icons prepared once.

NPC synthesis: `scripts/generate-npc-voices.py`, existing local VOICEVOX Core0.17.1, official0.vvm and4.vvm. Guide/housing:VOICEVOX:玄野武宏 style11, guide slowed/pitch lowered. Merchant/barber/lottery:VOICEVOX:春日部つむぎ style8. Full text and SHA256 per clip in `public/assets/online/npc-voices-v1/credits.json`; credits accessible in settings via credits.html. Terms checked2026-11-27: https://voicevox.hiroshiba.jp/term/ , https://virvoxproject.wixsite.com/official/voicevoxの利用規約 ; previously reviewed 春日部つむぎ license at https://tsumugi-official.studio.site/rule . Fixed original NPC dialogue, no real-person imitation.

## Validation and release

- `test-equipment-roles.mjs`: full PGlite schema, gloves grant/equip/drop/pickup, effective movement190→146ms and dagger cadence322→248ms, armor max180/full heal/removal clamp100, non-defensive accessory roles, SSS necklace1.20, SUPER-only warp, correct position/keys/waiting phase, active-battle rejection.
- `test-npc-voices.mjs`: mock-only playback, route, click cooldown, overlap disposal, mute guard, scene cleanup and WAV headers. No sound emitted.
- Fast movement server/client, input, adventure view resource lifecycle and rail audio regressions pass.
- Muted actual Phaser preview confirmed new gate silhouette/materials, hand slot placement, gloves inventory icon and attack-speed description.
- Migrations009–010 applied to production atomically. Verified gloves10, anon world execute=false, authenticated execute=true. No accounts, characters or inventory erased.
- Vite ignores new public files while a server is already running; initial old-port preview returned HTML for new images. A fresh5214 dev server loaded the exact new PNGs successfully. Production build includes these assets.
