# Player hits, northern arrival station and discovery map

- Player hits use six weapon families and a shared six-frame atlas. Up to24 reusable sprites, offscreen culling, 200ms animation. Existing attack-impact timing also schedules the effect and sound. Authoritative `hit_tiles` preserve killing blows and multi-target hits.
- The entrance station stays unchanged. The arrival station is immediately north of the boss, at x43..58/y-18..-1. The platform is56,-4 and the rear turnstile54,-1; the short connection joins the existing rear gate54..55,2. Live boss and dungeon coordinates stay unchanged. Track begins along the original entrance alignment and runs north around the outside. Both station areas are omitted from maps.
- Discovery is per expedition and floor, saved in private `online_adventure_maps`. Accepted movement reveals the cell and its immediately adjoining cells; the server marks every intermediate step in a batch. Starting at the entrance reveals only the immediate footprint. Same-room allies share the bitset; rejoining preserves it. No existing full layout is imported.
- Large map: wheel/plus/minus zoom, scrollbars for panning, zoom-aware right-click pins. Starts near the player's position. Minimap: wheel zoom and click to open the large map. Purple rooms are guardian/weaver; red is the final boss. These colors appear only once explored.
- The narrow boss approach uses existing red marble art with gold edging.

## Art

Built-in `image_gen.imagegen`, new transparent image saved as `public/assets/online/combat-fx-v2/player-hits.png`. Runtime downsamples to768x768. Source is a6x6 atlas.

Prompt: Production sprite atlas for overhead pixel RPG player HIT effects, exact SIX columns and SIX rows, square cells, true transparent background and generous margins. Each row has six frames from tiny flash through peak impact, scatter and fade. Rows: fine white sword slash with gold sparks; broad white-gold greatsword impact and few stone chips; ivory spear piercing star and straight streak; tiny arrow puncture with sage particles; white-hot bullet impact with amber sparks; violet-cyan crystalline magic. Crisp hand-painted pixel art readable at48px, limited glow. No text, labels, grid, floor, characters or weapons.

## Validation

- `test-player-effects.mjs`: six effect types, animation duration, direction, bounded pool and disposal.
- `test-exploration-station.mjs`: hidden initial map, all accepted batch cells, ally sharing, re-entry persistence, station exclusion, private helpers, north arrival, continuous track, and exact killing-blow cell.
- Existing fast-motion, boss-cinematic, recall and combat-pulse checks.
- Muted Phaser preview: player hit animation, station layers, large map, wheel zoom and boss approach.

Migrations002–004 of2026-11-27 must be applied with this release; none deletes characters, rooms, equipment or boss progress.

## Additional equipment and effects

- Recall bell: 1.07s rotating ground circle, then the existing loading transition to the current floor entrance (user confirmed). No destination change to town.
- Boots: ten items, D/C/B/A/S/SS/SSS with alternate A and SSS designs. Defense only, no character appearance change. Reuses authoritative equipment instances, gacha, drop/pickup, warehouse and shortcut validation. The right sidebar now has a boots row and six menu buttons; map remains accessible by clicking the minimap.
- Invisibility potion: server timestamps10s, stops direct enemy targeting, breaks before an accepted attack/skill, expires without another request. Area hazards remain dangerous. All clients render the transparent character.
- Once-per-character blessing/rest springs fade to28% on the consuming player's view. Ordinary resting spring use is now saved per character as well.
- AoE counters use ceiling integer labels with no unit. Resolving cells emit pooled impacts once. Received damage plays existing `se_hurt` audio; silent mode is preserved.

### Boots artwork

Built-in `image_gen.imagegen`; `public/assets/online/boots-v1/boots.png`, exact5x2 atlas. Runtime prepares128px icons once and removes the source texture.

Prompt: Production fantasy RPG inventory icon atlas, exact5 columns x2 rows,10 matching pairs of boots, true transparent background, consistent three-quarter view and scale, saturated hand-painted pixel details readable at48px. Brown leather D; gray chain C; blue steel B; violet arcane A; red dragon S; ivory/gold holy SS; white/cyan celestial SSS; black/crimson dark-lord SSS; orange pumpkin knight A; purple pumpkin witch A. No labels, frames, characters or background.

Migrations202611270002–007 applied to production together in one transaction. Verified arrival_y=-18, boots=10, exploration installed=true, private helper exposed=false. Silent preview confirmed normal title startup, boots icons, transparent player, recall return, integer AoE labels and sidebar placement.
