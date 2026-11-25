# Modal motion and menu emotes 2026-11-25

Settings and codex redesign are preview proposals only: outputs/ui-layout-20261125/settings-codex-proposal.png. Built-in image generation produced a two-panel concept: settings with audio/language on the left and keypad on the right; codex with compact cards and right-side details. The existing layouts have not been replaced pending the user's review.

Existing canvas modals use modalMotion.ts (240ms, scale .88 to 1). DOM role=dialog windows now use the same motion via one observer installed with game presentation. Newly opened/reused-mode windows animate once; polling and inner-content refresh do not restart. Reduced-motion preferences skip the DOM animation. Observer and animations are cleaned up on game destruction/removal.

Menu/shortcut emotes use the new square portrait atlas and CSS caption panels. In-world speech bubbles and voice clips stay unchanged. Proof: outputs/ui-layout-20261125/emotes-implemented.png.

Validation: TypeScript, build, test-dom-modal-motion.mjs, test-emotes.ts, test-emote-shortcuts.mjs. Muted browser verified card display and drag registration; console errors were empty.
