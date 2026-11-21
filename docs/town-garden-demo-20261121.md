# Garden town local demo

Open http://localhost:5206/town-demo.html?mute=1 using the existing Vite server.

This is a standalone Phaser scene, not part of the production scene list or Vite build entries. No auth, world API, or database calls are made. Audio is disabled in the Phaser config unconditionally. The approved map is now shared with the production town via online/gardenMap.ts and gardenPlaza.ts.

The overview is reconstructed with 12 newly drawn building sprites, 12 garden prop types, six terrain textures, and existing central plaza art. Terrain is baked to a render texture; buildings and decorations remain individually placed sprites with depth ordering. The map module owns tile occupancy and passable garden gates. The shared character rig and cardinal pathfinder are reused.

Controls: click to pathfind, arrows/WASD to move, wheel to zoom, overview/walk buttons to switch views. Clicking a house from the overview places the demo actor at its front door for inspection. This is not house entry or purchase; no ownership is changed.

Validation: TypeScript check; scripts/test-town-demo.ts verifies all 12 front doors, 12 garden gates and four cardinal exits can be reached from the plaza and solid props block movement. Browser verification confirmed arrow movement, house collision and passage through the garden gate without console errors. All checks were silent.

Source atlases and prompts: art/town-layout-v2/. Production-ready individual files: public/assets/online/town-garden-v2/. Slicing recipe: scripts/slice-town-demo.py.

Production integration uses gardenRenderer.ts and migration 202611210012_online_garden_town.sql. The migration preserves house IDs, owners, purchase prices, character inventory and warehouse contents; it updates house exits, service coordinates and collision together. Newly obstructed town occupants and ground items are relocated rather than deleted. Apply this migration with the new client release. Upgrade preservation, all house gates/doors, warehouse entry/exit, merchant, training barrel, barber and resale were tested locally; the production renderer was inspected silently through rig-check.html?mute=1.
