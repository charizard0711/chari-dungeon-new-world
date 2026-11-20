# Dungeon scenery and input update — 2026-11-20

Production: https://charidungeon.com/ . The original solo project is unchanged.

## First floor

The existing persistent 88 × 34 floor now uses sixteen floor materials and reusable multi-cell cliffs, bridges, water, vegetation, columns, market props, a large spirit tree and crystal cathedral. Logical movement remains one 48 px cell. Solid footprints cover architecture and water rather than treating every image as a single blocked cell. Saved kills, keys, chest openings, rewards and individual dropped-item metadata are preserved; objects caught in new solids are relocated.

Vesper has front, left, right and back views with two walk poses; the golem and spider guardians also have four directions. Enemy position interpolation and hit-shake use separate containers. Common and gold chests reuse the original solo closed/open images in `public/assets/items/chests-centered/`.

The town notice board and the entrance crystal offer reached **floor entrances**, not subarea teleportation. Transfers restart the scene behind a dungeon-entrance loading painting. Only floor 1 is playable; floor 2 currently contains an entrance checkpoint. The API reserves floor numbers up to 50 without claiming those floors exist.

The server queues one shared party action beat with a 100 ms coalescing window and minimum 160 ms tick interval. Idle polling does not advance enemies. Movement, waiting and attacks contribute to that shared beat. Enemies respect home territories. Boss area attacks count down 3 → 2 → 1 on their target cells while normal pursuit and attacks continue.

Migration: `supabase/migrations/202611200007_online_dungeon_rebuild.sql`, applied to the live project. The older wrapper remains private; authenticated players call only the current validated RPC.

## Input and rendering

- Poll-driven HUD updates no longer rebuild open Phaser overlays. Unchanged character data skips inventory reconstruction.
- Chat retains its DOM input and IME composition; responses only clear the draft actually sent. Clicking the map or Escape restores game keyboard input.
- Gold and warehouse amounts use text input with numeric input mode and custom ▲ / ▼ controls. Full-width digits are supported. Drafts survive tab switches.
- Cheat digit buttons update their text in place rather than rebuilding their own hit areas.
- Inventory tabs reuse stable tab controls and cached icon nodes. Relevant texture arrivals are coalesced; full images use their original asset URLs instead of repeated canvas PNG conversion. Browser QA with 130 weapon icons measured approximately 8–11 ms of synchronous tab-render work, excluding browser painting and machine-dependent scheduling.
- New outgoing authentication emails use the SMTP sender name **Chari Dungeon: ZERO**. Previously delivered messages keep their original sender label.

## Artwork provenance

Generation mode: built-in `image_gen`. Prompt specifications and reference descriptions are recorded in `art/adventure-floor1-v2/prompts.json`.

Original generated images: `art/adventure-floor1-v2/{floors,props,architecture,vesper,guardians,loading}.png`.
Prepared runtime assets: `public/assets/online/adventure-v2/{floors,props,architecture,vesper,guardians,loading}.webp`.
Preparation script: `scripts/prepare-adventure-v2.mjs` (crop, alpha trim, resize and atlas packing only).
Floor frames: 128 px. Object and character frames: 256 px. Loading image: 1600 × 900.

## Validation

Automated checks: `test:town`, `test:town:equipment`, `test:adventure`, `test:gold-audio`, `test:input`, TypeScript and production build. SQL tests cover old-room preservation, party action coalescing, idle ticks, countdown/melee coexistence, collision, transfer restrictions and private helper access. Input tests cover full-width digits, amount bounds, composition and keyboard restoration.

Silent browser QA (`?mute=1`, noAudio): board entry and crystal transfer, modular scenery, Vesper back view and countdown, real enemy damage, Japanese chat draft/focus, gold direct input and custom increment, tab draft persistence, icon loading and cached tab rendering. Evidence is in `outputs/dungeon-rebuild-20261120/` (not deployed).
