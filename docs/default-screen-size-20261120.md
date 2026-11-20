# Default desktop screen size

ZERO now starts in Large mode on desktop. Phaser keeps the 1280:760 game aspect ratio and scales to the available viewport. On wide PC windows this fills the viewport height and centers the game with space on the left and right. A narrower-than-game window still fits the full game within its width, preserving the existing HUD rather than clipping it. Mobile sizing is unchanged.

The Small/Large controls remain available. Their layer is above the title/login DOM overlays so they also work when the side margins are narrower than the control group. Reloading starts in Large again.

Validation: TypeScript and Vite build pass. Silent production-build browser checks with `?mute=1`:

- 2560×1228: default Large is pressed; canvas is approximately 2068×1228, horizontally centered. Login overlay exactly follows the canvas.
- 1920×1080: canvas is approximately 1819×1080. Small switches to 760px high; Large returns to 1080px high, including from the login screen.
- Reload after Small restores default Large.

Temporary browser viewport overrides are reset after checks. The original solo project is not changed.
