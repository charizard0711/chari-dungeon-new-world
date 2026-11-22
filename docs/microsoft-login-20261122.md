# Microsoft sign-in

Status: Azure app registered, Supabase Azure provider enabled; both callback URLs saved. Production verified: owner completed Microsoft consent and returned to character selection with existing charizard. Tests muted.

Client ID: e81d2cd0-136c-4e46-bb38-04bca15c71cb
Tenant ID: 0e1d4d17-8650-4a2e-82e6-164ede995f5d
Secret expiry: 2027-05-21; renew before expiry. Never store secret in this document.

- Provider: azure; explicit email scope, PKCE.
- Microsoft Web redirect URI: https://vpuppuqqvdmjlayhcywu.supabase.co/auth/v1/callback
- Supabase return allowlist saved: https://charidungeon.com/auth-microsoft.html and https://charidungeon.com/auth-microsoft.html?mute=1
- Registered ZERO app for organizational and personal Microsoft accounts, common tenant.
- Configured optional email + xms_edov claims per Supabase documentation.
- Client secret belongs ONLY in Supabase provider settings, never repository or Vite variables.
- Released in ce14b63. Cancellation callback and production Microsoft sign-in verified. Organizational account policies may independently restrict user consent.
- Reference: https://supabase.com/docs/guides/auth/social-sign-in/auth-azure
