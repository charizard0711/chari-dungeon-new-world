# Fixed emote voice clips

Replaces device-specific SpeechSynthesis with 12 locally hosted WAV clips, synthesized using VOICEVOX:春日部つむぎ (normal style 8). The existing illustrated bubbles and shortcut assignments are unchanged. No paid service or runtime TTS API is used.

## Source and terms
- https://voicevox.hiroshiba.jp/product/kasukabe_tsumugi/
- https://voicevox.hiroshiba.jp/term/
- https://tsumugi-official.studio.site/rule
- https://tsumugi-official.studio.site/rule2

Reviewed 2026-11-23. Official FAQ explicitly permits voices for original characters, games and self-authored apps with an accessible credit. Credit link is displayed in the emote menu; asset README and credits.json retain attribution and terms. These are synthesized game assets, not recordings of a person or a standalone voice pack. Models/runtime are not shipped.

## Production
VOICEVOX Core 0.17.1 and official 0.vvm model, CPU. Run scripts/generate-emote-voices.py with --runtime pointing to the official downloader output. Python dependency is the official voicevox_core 0.17.1 wheel. Speed 1.04, pitch 0.025, intonation 1.15, short leading/trailing pauses; peak normalization at 0.82, max gain 2. Mono PCM16 24kHz; 12 clips total 452,624 bytes. Manifest stores text, duration, hashes and provenance.

## Validation
- All 12 WAV headers, duration, nonzero signal and non-clipping peaks checked without playback.
- Mock tests cover preload/cache reuse, fixed ID mapping, mute URL, noAudio, voice toggle, SE controls, volume update, overlapping calls, cooldown, end-of-clip destruction, hidden tab and scene shutdown.
- Build passed. Browser QA uses mute=1; no audible playback or real iPhone audio test was performed. Voice quality can be auditioned by the user in the game.
