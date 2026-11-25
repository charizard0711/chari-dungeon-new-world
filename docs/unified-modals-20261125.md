# Unified modal format 2026-11-25

All game DOM dialogs inherit the approved settings/codex charcoal-and-silver format through the game presentation scope. The shared stylesheet covers the window, corner treatment, centered heading, close control, ordinary buttons, selected tabs, form fields, focus rings and scrollbars. It does not change feature-specific dimensions or inventory/shortcut icon art and rarity borders. Newly opened dialogs inherit the same format automatically.

Canvas overlays use unifiedModalFrame through addPaintedModalFrame on OnlineUIScene only. This includes the detailed journal, super item catalog and controls guide. Online row buttons share neutral colors and close icons use a cached generated silver/charcoal texture. The separate original solo repository is untouched.

Existing 240ms opening motion stays in place. The DOM observer normalizes only direct/header close controls, preserving their existing handlers and accessible labels. Warehouse return-to-town actions retain their wording. Mail/notice/emote windows now pause and restore Phaser input as other DOM modals already do, preventing close clicks from opening the mini-map behind them.

Validation: TypeScript, production build, existing DOM-motion and input-state tests. Muted browser checked inventory, friend form, mail, map and detailed journal; close mail left zero dialogs and no console errors. Proof images are in outputs/unified-modals-20261125/. Housing, commerce and warehouse use the common role=dialog stylesheet; no production account or purchase actions were used to test their contents.
