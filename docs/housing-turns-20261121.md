# Shared boss rounds and residential town

## Boss arena

The first-floor boss arena now uses shared 1200 ms rounds. Each character chooses one move, attack, skill or wait; the latest choice replaces the previous choice until the deadline. A missing choice waits. All valid player moves resolve together before attacks and area damage. Swaps and vacating chains work; conflicting destinations are rejected at selection time and shown as reserved cells. NPCs outside the boss arena retain autonomous real-time movement. Four players and extra polls cannot multiply boss turns. Offline gaps never replay missed rounds.

Area attacks have shared fixed tiles and a two-turn warning (`2T`, `1T`). Killing the boss still cancels warnings and awards each member once. Player actions execute through the original server-owned equipment, damage, durability and reward rules. Internal turn actions skip the global town lock while the room lock remains held, avoiding lock inversion. Normal polling keeps the prior contention fix.

## Housing

- North, east, south and west each have nine distinct houses (36 total), with prices 500,000 / 750,000 / 1,000,000 / 1,500,000 / 2,500,000 / 4,000,000 / 6,000,000 / 8,000,000 / 10,000,000 G.
- One character owns at most one house; each physical house has one owner. No sale/refund feature is included. Purchase has an explicit in-game second-click confirmation.
- The tree northeast of the practice barrel is replaced with a staffed property kiosk, centered at (16,2).
- Outdoor streets expand around the original plaza without shifting its coordinates. Collision and the map cover all four districts. Items can be dropped in the expanded streets.
- House doors load an actual tile room with beds, desks, chairs, bookshelves, rugs, a settings crystal and an exit. Larger properties have larger interiors; the palace has a royal double bed, luxury desk, sofa and piano.
- Owner-only crystal settings independently permit accepted friends and current guild members. Permission revocation ejects visitors on their next update. Indoors, characters disappear outdoors and appear only to occupants of that house. Chat is scoped to the house; inventory, equipment and gold stay character-owned. Indoor ground drops are disabled.
- Tables and helper functions are private; all access, purchases, price checks, movement, chat and ownership are server validated. Sale races and duplicate ownership are prevented transactionally.
- House exterior images load only in town; furniture/floors load only for interiors. New assets total approximately 4 MB and are packaged in `public/assets/online/housing-v1/`.

## Generated artwork and prompts

Built-in `image_gen` was used, with transparent cutouts for all objects. Final assets: `north.webp`, `east.webp`, `south.webp`, `west.webp` (three-by-three atlases, 512 px cells), `furniture.webp` (four-by-three atlas, 384 px cells), `booth.webp`, `floors.webp` (two 256 px cells). Originals stay under `C:/Users/masam/.codex/generated_images/01a1ed2e-c820-70d0-8428-db389f5c65b9/`.

Prompt set: production top-down three-quarter-front JRPG sprites matching the existing painted medieval timber/stone town, transparent empty backgrounds, isolated complete silhouettes, no text, no ground and regular non-overlapping atlas cells. Each district has nine different roof shapes, proportions and footprints, progressing from tiny cottages through two-storey houses, mansions and a gold-trimmed marble royal palace. North uses thatch/red/green/slate/blue roofs; east uses cedar/sandstone/orange/teal/turquoise; south uses warm plaster/brick/mint/emerald; west uses dark cedar/grey stone/violet/slate/red/blue-purple. The north atlas received a second built-in background-removal edit preserving the nine buildings and exact cell layout.

Furniture prompt: exact 4×3 transparent atlas, reading order simple teal single bed; royal crimson four-poster double bed; wooden writing desk with book and candle; marble/gold writing desk; chair; bookcase; turquoise crystal pedestal; potted fern; crimson sofa; black/gold grand piano; burgundy/gold rug; open wooden doorway. Booth prompt: compact staffed property kiosk with teal/ivory canopy, gold house emblem, brass keys, rolled property maps, model house and a friendly waistcoated agent. Floor prompt: opaque two-square atlas with oak-plank flooring and luxurious ivory marble/teal/gold inlay, orthographic overhead and no objects.

## Validation and rollout

- `node scripts/test-online-boss-rounds.mjs`: shared round rate, last-choice replacement, actor identity, swaps, move-before-AoE dodge, reservations, boss clear/rewards and private tables.
- `npx tsx scripts/test-online-housing.ts`: 36 reachable entrances, every town collision cell compared with SQL, purchases/debits, insufficient funds and ownership, private/friend/guild access, revocation, indoor isolation/chat, exterior item drops, exit placement and RLS.
- Existing town, responsiveness, adventure, guild, equipment, warehouse and exploration suites passed with their fixtures updated for shared boss rounds.
- All browser tests used `?mute=1`; live QA status confirmed `noAudio=true`. Test accounts and purchases exist only in isolated local PGlite.
- Supabase migrations 202611210003 and 202611210004 applied; production returned `houses=36`, `owners=0`, `shared_turns=true`, `turn_engine=true`. Migration 202611210005 relocates only existing objects covered by new collision.
- Browser proof images are in `outputs/housing-turns-20261121/`.
