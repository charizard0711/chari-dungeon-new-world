# Floor boss music

- Selected Suno candidate 2: Sovereign of the Forgotten Depths — Chari Dungeon ZERO.
- Source: https://suno.com/song/8e3f9853-2fa4-4aa8-9f90-5aee53fbd695
- Downloaded using the owner's Suno MP3 download UI on 2026-11-21.
- Packaged as `public/assets/audio/boss-sovereign-suno-v2.mp3` (approximately 3:20).
- Online floor boss room entry selects `boss`; boss death, room exit and floor clear restore `floor01`. Town/lobby retain `title`.
- Key guardians do not select floor boss music. Future floors without mapped areas use a distance of eight cells from a living floor boss.
- Boss audio is preloaded when entering the dungeon. Existing BGM volume and mute settings apply.
- Verification: `npx tsx scripts/test-adventure-music.ts`, `npm run build`. Verification plays no sound.
