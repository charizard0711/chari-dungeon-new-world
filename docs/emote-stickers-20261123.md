# Illustrated emotes

12 illustrated speech balloons share one transparent 4 x 3 atlas. Menu, shortcut and in-world image use the same frame. Drag from the emote list to a character shortcut; slots persist and support existing swap/remove/number-key behavior. Only fixed emote IDs are accepted by the server. Existing browser Japanese speech is retained; voice depends on installed device voices and is not a recorded voice asset.

## Validation
- Build passed.
- test-emote-shortcuts.mjs: save, swap, remove, re-entry persistence, invalid ID/index rejection, ownership, idempotent migration passed.
- test-emotes.ts: mocked speech selection, mute, volume and spam guards passed. No audible playback.
- test-pointer-drag.ts: release, cancellation and cleanup passed.
- Muted local browser: desktop registration, swap and illustrated world bubble; mobile layout registration passed. Real iPhone Safari was not tested.
- Production migration 202611230001_online_emote_shortcuts.sql applied through Supabase SQL editor, success. No grants changed.

## Art
Tool: built-in image_gen; new generation, transparent background, one atlas. Asset: public/assets/online/emotes-v1/greetings.png (1448 x 1086). Generated image used intact; source-coordinate frames in Phaser and CSS background positioning.
Prompt: Create ONE production-ready game emote SPRITE ATLAS, exactly 4 columns by 3 rows of equal rectangular cells on transparent background, no grid lines. All twelve cells filled, evenly aligned, ample transparent gutter within each cell, no overlap. Each cell contains a cute white rounded speech balloon with a small downward tail and a different illustration of the SAME adorable chibi young adult female fantasy adventurer: chestnut bob haircut, turquoise hair ribbon, big warm brown eyes, rosy cheeks, teal scarf, cream tunic. High quality colorful Japanese RPG sticker illustrations, confident clean outlines readable at 96 pixels. NO TEXT NO LETTERS NO WORDS NO NUMBERS. Row1 left to right: cheerful morning stretch with tiny sun; friendly hello waving one hand; evening greeting with tiny crescent moon; grateful smile holding a pink heart. Row2 left to right: polite greeting hands together bowing slightly; good job holding warm tea cup with gentle smile; apologetic bow with tiny sweat drop; confident okay thumbs up. Row3 left to right: wait a moment raised palms with tiny hourglass; let's go enthusiastically pointing forward; hooray both arms raised with gold stars; goodbye waving with small heart. Consistent character, consistent balloon sizes, full balloon and tail contained inside each cell, no feet needed, waist-up chibi. Rich warm colors against pure white balloons, soft teal balloon outlines, polished game sticker art. Entire image is a usable single atlas with twelve illustrations, not a UI mockup.
