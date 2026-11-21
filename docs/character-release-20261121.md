# Character wardrobe release — ZERO

- New painted bodies, eighteen valid gender/outfit combinations, six hair colors. Hair belongs to the character and is visible to other players.
- Black/red and white/cyan SSS hoods now show a softly lit face in front and side views. Rear views remain hooded. Originals are preserved in wardrobe-v5; final replacements are in hood-face-v6.
- Town, dungeon, house, equipment panel and character selection use the same body and hand rig. Original 103-weapon catalog is retained; directional gun cells, katana grips and alternate-color blade axes are handled explicitly. Combat/server timings and movement rules are unchanged.
- Each actor has a 256px canvas texture, updated only when its pose changes, at up to 30 uploads/second. Async equipment changes are revision guarded. Loading waits for character appearance assets. Portrait rendering never replaces active Phaser textures.
- Supabase migration 202611210007 adds constrained hair_color and owner-only appearance_hair action. Existing accounts and items are preserved. Applied through SQL Editor; verified all character values valid, authenticated RPC available, internal wrapper not exposed.

Validation: npm run build; test-character-hair.ts (ownership, invalid/anonymous rejection, remote visibility, wrapper privileges); test-wardrobe-vertical.ts (18 outfits and continuous poses); test-original-weapon-rig.ts (808 poses). Silent browser checks in actual OnlineTownScene via rig-check.html, with movement, shield, front/back/side appearance, black and white SSS hoods, female body, silver hair, Arcadia, Nereia, directional pistol and alternate dagger. QA entry points are excluded from production Vite inputs.

Final art: public/assets/characters/hood-face-v6/{crimson_male,crimson_female,aqua}.png. Exact prompts/source outputs: art/wardrobe-v5/hood-face-prompts.json. Existing solo release repository is untouched.
