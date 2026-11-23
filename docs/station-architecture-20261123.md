# Station architecture — 2026-11-23

Departure: cream masonry, teal/brass platform canopy, benches, timetable, clock, luggage and compass floor. Arrival: blue-gray floor and walls, left-hand track, matching railway furniture. Map enlarged from 115x94 to 115x108; a southern arrival exit preserves the original maze connection. Architecture uses individual cropped sprite modules, not a flat background. Walking obstacles match station furniture. The arrival crossing stays walkable.

Boarding pads: entry (51,101), boss (50,39). Parked train anchors: (52,101), (49,39). Fare remains 500 G. Boss-unlock condition remains. Gate opens before entering, panel auto-boards, journey follows the actual contiguous rail route and disembarks onto the opposite pad. Existing rooms, characters and inventory remain. Only characters on newly solid furniture are moved to a free safe tile by the migration.

Validation: TypeScript/Vite production build; railway connectivity/route/config equality test; PGlite round-trip test covering locked gate, unlock, auto-board, 500 G each way, arrival and return; latency/pin regression. Muted browser QA verified full station layouts and forward journey. Browser console had no errors. No physical iPhone test performed.

Art mode: built-in image_gen. Runtime atlas: public/assets/online/railway-v4/modules.png (1254 square, 16 modules). Concept prompts are in art/station-layout-v4/README.md.

Atlas prompt: Create a production GAME SPRITE ATLAS from the station designs in references, NOT a scene. Exactly 4 columns by 4 rows of equal square cells, transparent background, no grid lines, no text. Each isolated asset entirely within its own cell with clear transparent gutter. Orthographic top-down RPG three-quarter pixel painted style, matching rich teal enamel, brass trim, cream and blue gray masonry. Row1: cream floor, gray floor, cream window wall, gray window wall. Row2: teal canopy, bench, brass clock, timetable. Row3: stone pillar, brass fence, flowering planter, luggage trolley. Row4: closed ticket gate, identical open gate, lantern, compass floor inlay. Clean outlines and distinct modular parts.

Cleanup edit: Preserve all cell positions; remove fringe noise and outer glow, retain clean transparent silhouettes and interior colors. Floors seamless, all other pieces contained within their own cell. No text or grid lines.
