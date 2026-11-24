# Panel activation audio 2026-11-25

Approved recovery preview 1 is copied unchanged. Five matching original cues cover attack/defense up/down and paralysis. Existing panel placements are unchanged.

Only authoritative state differences activate sounds for the local character. Newly consumed healing, newly applied buffs, re-entering an active buff source, and paralysis activation are handled. Entry, polling, removed buffs, and consuming the paralysis lost turn do not replay sounds. Playback respects SE settings, volume, mute=1, noAudio, and background-tab silence.

Verified using mocked audio (no speaker playback): scripts/test-panel-audio.mjs. TypeScript and production build passed. No DB migration needed.
