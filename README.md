# Chari Dungeon: ZERO

Online-only successor to Chari Dungeon, built with TypeScript, Phaser and Vite.

Production: https://charizard0711.github.io/chari-dungeon-new-world/

The original solo game remains at https://charizard0711.github.io/chari-dungeon/.

## Development

Run `npm ci`, create `.env.local` from `.env.example`, then `npm run dev`.
Use only the Supabase project URL, publishable key and Turnstile site key in `VITE_` variables. Never put a service-role key in the browser.

`npm run build` type-checks and produces `dist/`. `npm run test:town` checks the local PostgreSQL-compatible town rules and presentation helpers without playing sound.

## Flow

Start -> login / account creation -> two character slots -> create a male or female adventurer -> town.
The running game registers only BootScene, TitleScene and the shared UIScene; online scenes are installed when Start is selected. The former solo scenes are not registered or reachable. Their source remains as a reference for shared UI/types and future online content.

## Release

Run `npm run deploy` from this checkout after validating changes. The script builds the game, copies only `dist/` into an isolated Git worktree, and pushes `gh-pages` in **charizard0711/chari-dungeon-new-world**. It never pushes to the original game's repository.

Database schema and migrations live in `supabase/migrations`. The initial release reuses the existing Supabase project; this is separate from deleting existing player records. Data reset requires an explicit, reviewed reset action and is not run by build/deploy.

Authentication email generation: `npm run email:build`. Its output must be applied to Supabase's Confirm signup subject/body; configure Site URL and allowed redirects for the ZERO game URL. The old solo site's confirmation URL forwards to the new confirmation page for already delivered links.

Generated title assets and prompts: [docs/new-world-art.md](docs/new-world-art.md).

Current branding and ZERO logo prompt: [docs/zero-brand-20261120.md](docs/zero-brand-20261120.md).
