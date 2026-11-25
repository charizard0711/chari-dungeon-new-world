# Loading bounds 2026-11-25

The initial HTML loading screen is now a child of #game-container, with absolute inset bounds. A tiny pre-bundle size script gives that container the same default logical size and fit rules as the game's desktop/mobile layout, avoiding a viewport-sized first paint. Existing runtime small/large controls still own the size once the game starts.

Town/dungeon/house travel loading is also attached to the canvas parent and fills that parent. It no longer uses a separate fixed viewport rectangle or resize/scroll observers. Both loaders follow the game frame and clip to its border. Backgrounds, progress percentages and transitions are retained. Boot remains above the floating HUD if re-shown.

Validation: test-loading-bounds.mjs checks the initial fit for desktop, constrained windows, phone, and forced mobile settings on production and QA HTML entries. TypeScript and build. Muted browser measured both loaders at 1278x758 inside a 1280x760 game frame (1px border on each side) in small mode, with the same matching relationship in large mode. No console errors. No change to account, server or gameplay data.
