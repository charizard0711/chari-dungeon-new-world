# Exploration and party UI — 2026-11-20

Production: https://charidungeon.com/ . Independent online project; original solo game unchanged.

- Right-click a nearby character to inspect their equipped weapon, armor, shield and necklace, including descriptions and current durability. The server accepts only characters in the same live player list within Manhattan distance 3, and returns equipped items only. Inventory, warehouse, shortcuts and account identity remain private. Legacy starter gear without explicit keys is normalized to the original starter items.
- PC arrow keys and mobile directional controls share the movement branch: an adjacent enemy is attacked; NPCs, treasure chests, entrance crystals and other interactive props perform their normal action; other players still block overlap.
- Mobile exposes only quick slots 1–5, approximately 68 × 60 logical CSS pixels at a 390 × 844 viewport. Desktop retains twenty slots. Existing slots 6–20 are retained in saved data and remain available on desktop.
- Chat has explicit Close/Open labels. Mobile expanded chat occupies the area below the enlarged shortcut row.
- The Map menu shows floor topology, your gold marker, cyan ally markers and a live position list. It does not add teleportation controls.
- Dungeon visibility is the union of a square radius 4 around every connected ally on the same floor. Defeating Lantern Mushroom increases the entire room party to radius 5 permanently for that saved run, including re-entry. Out-of-sight enemy images do not accept pointer input. This is visual fog, not a security boundary on already-synchronized world state.
- Chambers are larger while both key-gate chokepoints remain enforced. Four bridges have explicit three-cell-wide deck footprints; side floor cells are removed, floor tiles are omitted below the bridge art, and the railings sit outside the walkable deck.
- Eight ordinary monster species have four directions and three poses per direction (96 frames total), using the same movement container, independent hit shake and stride cadence as the boss. Existing boss/elite artwork is retained.
- Waterfalls have moving water streaks and splash ripples.
- Magical gacha costs **1,000 in-game G**, enforced on the server. This is not a real-money payment. Seven rarity colors each have closed, upper-shell and lower-shell art. The result is still drawn once by the server; animation and skip never repeat the purchase.

Migration: `supabase/migrations/202611200008_online_exploration.sql`; generated shared map seed: `supabase/seed/adventure-floor1-v3.sql`. Existing room progress is retained and obstructed actors/loot are relocated. Lantern Mushroom is appended to existing active rooms without resetting other enemies or chests.

## Art

Built-in image_gen was used, including a transparency correction for the moss knight/ghost atlas. All final prompts, reference paths and selected original files are in `art/exploration-v3/prompts.json`. Runtime preparation is reproducible with `node scripts/prepare-exploration-v3.mjs`. Prepared files are in `public/assets/online/exploration-v3/`: four 768 × 1152 monster sheets (192 px cells), two bridge frames in a 1024 × 512 sheet, and twenty-one 192 px capsule images. No CLI image generation or model API was used.

## Validation

`test:town`, `test:town:equipment`, `test:adventure`, `test:exploration`, `test:gold-audio`, `test:input`, TypeScript and production build. New SQL tests cover nearby inspection and isolation, missing legacy gear keys, the atomic 1000G debit and insufficient balance, actual mushroom kill, saved vision expansion and private RPC wrapper access. Geometry tests check both bridge decks and their side gaps, shared light and gate reachability.

Silent browser QA uses disposable local PGlite data, `?mute=1` and noAudio. It covers right-click player inspection, arrow NPC conversation, arrow enemy damage, arrow chest opening, all seven capsule sets, an actual gacha purchase, bridge/visibility rendering, the live map and the enlarged mobile shortcut row. Evidence is in `outputs/exploration-v3/` and is not deployed. Only the first floor is playable; the second floor remains an entrance checkpoint.
