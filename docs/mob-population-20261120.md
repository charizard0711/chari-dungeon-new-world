# Floor 1 population increase

Ordinary mobs: 9 -> 56 (47 additions); existing boss and two key guardians unchanged.

Room composition: spring +5, spirit tree +9, shrine +4, golem hall +4, spider nest +6, waterfall garden +3, treasury +4, trial +5, underground fountain +1, boss sanctum +4, portal room +2. Entrance and merchant rest area receive no extra spawns. Existing eight directional mob types and combat stats are reused.

Stable `pop_<area>_<number>` IDs. New-room spawns are inside walkable rooms, spaced at least three cells apart, away from room entry anchors and props. Migration 012 appends missing extras to active uncleared rooms only; existing enemy state is untouched. Live placement avoids saved party positions by five cells, drops, solids, props and other living enemies. No player or loot is relocated. Reapplying cannot revive defeated extras or duplicate spawns. Cleared rooms and rooms with stairs retain their full state.

Validated: build, adventure/exploration regression suites, client/server population parity, all spawn cells walkable and distinct, saved HP/kills/keys/chests/light/loot/member preservation, safe placement and idempotence. A populated local PGlite tick took ~12ms; this is not a production timing measurement. Browser publication checks use mute=1.
