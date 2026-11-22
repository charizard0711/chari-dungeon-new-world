# Inbox and administration

- `/admin/` uses the existing game login session. Only `online_profiles.super_account` accounts can call admin operations; this is enforced inside the security-definer RPC, not just the page.
- User management lists registered non-anonymous accounts (50 per page), verification state, character names and gold. It supports search and individual in-game operation mail. It does not change passwords or permissions.
- Announcements support drafts, publication, editing and unpublishing. Reads are stored per account. Editing an already-read announcement does not reset read state.
- Bell and envelope counts refresh every 15 seconds. Opening a detail marks that item read. Counts 10+ display `+`.
- Friend mail requires an accepted friendship at send time. Limits: 100-character subject, 4000-character body, 3-second interval and 60 messages/hour. No HTML is rendered from content.
- The migration `202611220010_online_inbox.sql` was applied through the Supabase dashboard. A read-only transaction verified the admin RPC against the existing SUPER profile. No player mail or public announcement was sent during testing.
- Validation: `node scripts/test-online-inbox.mjs`, `npx tsx scripts/test-screen-visibility.ts`, `npx tsx scripts/test-wall-visibility.ts`, production build, muted browser UI checks.
