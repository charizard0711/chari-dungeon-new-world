# Local wardrobe and vertical attack study

Preview: http://localhost:5206/motion-lab.html?mute=1

This is an isolated canvas prototype. No production entry point, account, inventory, server, sound, or deployment was changed.

- Ten existing armor definitions, eighteen valid gender/clothing combinations. Halloween outfits retain their gender-specific designs.
- Existing brown plus black, silver, blond, wine-red, and midnight-blue hair. Runtime hair palette affects uncovered hair; SSS hoods hide it.
- Individual armor-colored arm/forearm/glove layers, following existing inventory icons. Crimson and aqua have full hoods, including rear views.
- Front/back melee poses use independent hand paths and blade angles. Short blades thrust; swords sweep; heavy sword timing remains 460 ms. Other attacks keep the existing 268 ms duration. Side attacks and the accepted spear path remain unchanged.
- Original weapon imagery remains used for side views. Bow and fantasy pistol have supplementary front/rear angle art, retaining original ornament and colors.
- Painted gait sheets contain 6–8 frames per direction, mapped to eight playback phases. Unequal authored row spacing is recorded explicitly to avoid adjacent-frame fragments.

Art: `public/assets/characters/wardrobe-v5/`. Generation prompts and source paths: `art/wardrobe-v5/prompts.json` and `weapon-angle-prompts.json`. Rejected incomplete paired sheets remain in generation history but are not loaded. Final runtime cropping metadata is authoritative in `src/motionLab/wardrobe-assets.json`.

Validation: TypeScript check; wardrobe/vertical pose test; existing original-weapon rig test (808 poses); silent browser checks of all eighteen appearance selections and all five added hair colors; visual front/back, hood, gallery, bow and pistol checks.

Controls: arrow keys/WASD/click to move; right click or Space to attack; gender/clothes/hair selectors; front/back/left/right buttons; slow playback and timeline scrub; all-clothes and all-weapons galleries. Prototype is intentionally limited to one representative of each of eight weapon types.
