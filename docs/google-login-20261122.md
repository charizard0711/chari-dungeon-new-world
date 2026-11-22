# Google sign-in

Game uses Supabase OAuth with PKCE and the existing ZERO session storage key.

- Google Cloud project: `praxis-granite-515512-r7` (Chari Dungeon ZERO).
- Google authorized JavaScript origin: `https://charidungeon.com`.
- Google authorized redirect URI: `https://vpuppuqqvdmjlayhcywu.supabase.co/auth/v1/callback`.
- Supabase allowed return URL: `https://charidungeon.com/auth-google.html`.
- Return handler exchanges the one-time code, clears it from browser history, and returns to `/?login=google` to open the account/character flow.
- No Google client secret belongs in Vite environment variables, source files, or Pages output. Store it only in the Supabase Google provider configuration.
- Microsoft remains disabled. Google scopes are the provider's basic sign-in defaults; no Drive/Gmail access or offline access is requested.

Validation so far: TypeScript/Vite build; silent local canceled callback and return to login. Google provider enabled in Supabase; Google app is External / In production. Production Google button reaches the account chooser with email + profile scopes; successful account consent and return await the owner. The exact muted callback URL is also allowed for silent QA.

References: https://supabase.com/docs/guides/auth/social-sign-in/auth-google and https://supabase.com/docs/guides/auth/redirect-urls
