# Settings and codex redesign 2026-11-25

Approved proposal implemented for ZERO online only as DOM dialogs using the common opening motion. Desktop: neutral charcoal/silver 920x680 window; settings split into audio/language and numeric code sections; codex has eight cards per page plus a persistent details pane. Mobile reflows settings vertically and uses two-column cards with a compact details pane. Original catalog and monster definitions, discovery sets, equipment art, and server code redemption are reused.

The new settings preserve the active input element during polls. Native text entry accepts full-width digits; the 3x4 keypad edits the same draft. Volume sliders, plus/minus and on/off switches use the existing Audio manager. Empty and invalid code feedback is inline. Super item commands remain on the existing authenticated RPC/catalog flow; no access changes were made.

Modal input is isolated from Phaser while open, and restored on close/shutdown. This also fixes close-button click-through onto the underlying mini-map. Tab is trapped within each dialog and Escape closes it. Settings carries a generic credits link; VOICEVOX attribution is now in public/credits.html instead of the game window.

QA fixture supports clean=1 and codexSample=1 for screenshots, only in the existing dev-only maze-check entry. It does not change production discovery data.

Validation: TypeScript and production build. Existing text-input and modal-motion tests. Silent desktop browser checks: full-width typing plus keypad, focus retention, volume buttons, empty input feedback, close without click-through, monster detail selection, page navigation, equipment tab, empty/locked state. Forced mobile layout: no horizontal or vertical dialog overflow (372x758 content bounds), no console errors. This is not a physical iPhone test.

Screenshots: outputs/ui-layout-20261125/settings-implemented.png and codex-implemented.png.
