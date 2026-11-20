# ZERO: existing characters, smoother walking

- Expand each existing six-pose walking cycle to eighteen poses by inserting two motion-compensated in-betweens between original poses, including the loop boundary.
- Repack all eighteen valid gender/armor sets into 96px, 112-frame lossless WebP atlases under `public/assets/characters/smooth-walk-v1`. Preserve every original visible pixel of the original 64 frames, including male crimson/aqua hood corrections.
- Keep town body size 64×64, step duration 150ms, 96px left/right stride, collision, network movement, idle and attack behavior. Keep the walking state active while a tile tween or queued step is pending to prevent an idle flash at a step boundary.
- Interpolate the matching hand anchors alongside each added pose so held weapons/shields follow the hands. Share the eighteen-frame list between the visual clock, town distance sampling, and atlas indexing.
- Leave the rejected anime character prototype out of the production entry points/assets. Its generated images are archived under `art/character-concepts-zero-v1/anime-prototype-v1` locally.

Rebuild artwork: `node scripts/prepare-smooth-walk.mjs`. Uses Sharp from the existing Codex image runtime, with `SHARP_MODULE` available for another installation.

Validation: `node scripts/test-smooth-walk.mjs` checks all original visible pixels/anchors, eighteen distinct poses, smaller adjacent-pose changes, and unchanged cycle and attack timing. `npm run test:town` checks grid movement, collisions, equipment transfers, skills, chat and audio mute behavior. `npm run build` verifies TypeScript and production packaging. Browser QA runs the actual town/HUD at `?mute=1`, with noAudio and a local-only preview packet; it does not create accounts or modify online data.
