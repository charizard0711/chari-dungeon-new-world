# Action-driven encounters

- Arrow keys and WASD use gameplay-only DOM key state, ignore IME/text entry/modals, and clear on focus loss. Pointer and mobile controls stay available.
- No monster turns on poll. Each action advances only enemies targeting that character. Nearest living player within nine cells wins; equal distance favours the monster facing and then stable character ID. Attacking an idle target (one second without an action) provokes the monster; pursuit persists until the former target acts again.
- Initiative is server authoritative: dagger 120, twin daggers 115, handgun 110, dual swords 105, katana 100, sword 90, lance 80, bow 75, greatsword 60; unarmed 90. Higher wins, ties favour the player. A lethal enemy first strike cancels the player attack.
- Solo definitions supply current MOB behaviour. Current floor monsters have ranged shots, phase defence/exposure, wall passage, regeneration, web trails, death bursts and one-generation jelly splitting. New/future species require their special combat implementation before adding them to floors; exporting their profile alone is not sufficient.
- Monster visual steps match player steps (175ms). Boss area warnings count responding actions (2 turns), not clock time. Opening/returning cage animations still use wall time.
- Sight matches solo: radius 3, supercover walls/corners, ally union. Torch and lantern kills grant the acting character 5 actions of radius-10 wall-piercing light; polling and other players do not consume it.
- New closed/open cage sprites replace geometric bars.

Checks: scripts/test-target-turns.mjs (PGlite full migrations + two characters), scripts/test-turn-vision.ts, npm run build; browser QA muted, arrow/WASD and text-input escape checked.

Migration: 202611220002_online_target_turns.sql. Preserves characters, inventories, loot and room progress; clears obsolete pending boss choices/telegraphs only.
