# Boss presentation, stations, emotes — 2026-11-23

- Boss boundary uses the authoritative first-floor coordinates (41–58, 3–22). Crossing restarts the scene with a loading screen. Prediction alone does not restart it. Maze mobs, props, railway and other-stage players are not mounted in the boss view. Returning restores exploration.
- This is a separate client presentation area, **not a separate database room**. Room ID, participants, encounter state, sealing, deaths and rewards remain governed by the existing server. No new migration or economy changes.
- New generated station artwork; platform treatment and glowing boarding pads match the server's existing (49,87)/(54,29) automatic boarding rules. Unlock and 500G fare remain unchanged.
- Twelve fixed emotes travel via existing authoritative chat with an explicit emote marker. The marker is stripped for chat and bubbles. Only newly received visible-player messages trigger speech; ordinary chat is never spoken.
- Speech uses available Japanese browser/OS voices, preferring named female voices, with pitch 1.13 and rate 1.04. This is not a recorded character voice; exact voice depends on installed voices. If no Japanese voice exists, the bubble still works. Respects effect volume, mute=1, noAudio, tab visibility, opt-out and overlap suppression.
- Header settings icon follows mail; prior settings navigation slot now opens emotes on both desktop/mobile.
- Boot and entry gauges have explicit 10px fills inside 18px tracks and higher contrast.

Validation: build; boss-stage boundary/prediction tests; mocked speech/mute tests (no sound); camera/rail geometry, rail map, terrain streaming tests. Browser mute=1: station walk-on boarding deducted exactly 500G, boss boundary transition reduced 47 rendered exploration enemies to zero waiting / one battling boss, return restored 47; emote bubble, desktop/mobile menu and header settings verified. Gauge at 68% measured 10px fill height. Browser console no errors. No real iPhone Safari device or multiplayer load test; crash resolution is not claimed.
