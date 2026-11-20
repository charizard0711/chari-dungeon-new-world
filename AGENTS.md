# Chari Dungeon: ZERO

- This is the independent online-only TypeScript / Phaser / Vite game.
- Production URL: https://charizard0711.github.io/chari-dungeon-new-world/
- The original solo game stays at C:\chari-dungeon-release-final and https://charizard0711.github.io/chari-dungeon/. Do not deploy this project to the solo URL.
- Main flow: Start -> login or signup -> up to two characters -> town. No solo mode, ranking entry, or dungeon entry.
- The town reuses the existing HUD, assets and animation. Unregistered legacy scenes remain as source dependencies for shared types and UI; do not add them to the runtime scene list.
- All browser tests must use ?mute=1 with noAudio enabled. Never enable sound during tests.
- Never commit .env.local, credentials, user exports, or database backups.
