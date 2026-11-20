# Warehouse, NPC directions and variant presentation

ZERO online only. Original solo project is untouched.

The warehouse building has open doors at (20,5). Clicking the doorway approaches the front cell (20,6) and enters when in range. The character becomes invisible to outdoor players and no longer occupies an outdoor cell. The two-column warehouse screen shows owned items on the left and character-specific stored items on the right. Weapons/armor/shields/necklaces retain their individual identity, durability and variant; depositing equipped gear unequips it and clears its invalid shortcuts. Consumables and gold accept an explicit quantity. Up to 200 equipment instances may be stored. Exit selects an unoccupied walkable cell near the door. Rejoining town returns outdoors; the saved warehouse remains per character.

Guide Leaf and merchant Mira now have four directional sprites. Right-click conversation updates a shared server-side facing toward the speaker. Their feet stay anchored while subtle breathing, bob and lean animate the idle pose. A new friends icon replaces the reused book art.

Variant inventory and ground art is separate from the held layer: legacy NW-facing icons are mirrored into NE-facing menu/drop images, existing new NE icons are retained, and held weapon art is preserved. Ground loot uses the actual variant texture rather than the normal definition. Tiny staggered glints replace the two oversized stars in icons/held gear, and ground loot receives subtle glints (more for variants).

Migration: `supabase/migrations/202611200003_online_warehouse.sql`. Existing character data is retained. Storage and NPC actions authenticate the caller, enforce entry/range and ownership, and reject outdoor actions while indoors. Old world wrappers and NPC state tables are private.

Art was created with built-in image_gen (transparent backgrounds). Sources and prompt set: `art/town-warehouse-v1/`; runtime sprites: `public/assets/online/warehouse-v1/`; icon normalization: `public/assets/online/item-icons-v3/`. `scripts/prepare-warehouse-art.mjs` performs technical cropping, packing and directional icon preprocessing.

Validation: existing town/equipment regressions, `scripts/test-online-warehouse.mjs` (two users, two character slots, identity/durability/conservation, invalid operations, non-blocking hidden presence and occupied-door exit), `scripts/test-warehouse-presentation.ts` (bounded idle motion/tiny glints), TypeScript/build, and silent browser QA using only a local PGlite fixture. No real player currency/items used in tests.
