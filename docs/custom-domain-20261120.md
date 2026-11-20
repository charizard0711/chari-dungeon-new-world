# ZERO custom domain

Primary game URL: https://charidungeon.com/

The user registered `charidungeon.com` with Cloudflare Registrar for one year. The purchase was completed by the user in the browser. The registration is active; auto-renewal is enabled at the currently displayed $11.17/year. Personal contact and billing data are not stored in this repository.

## Hosting and DNS

The hosting repository is still `charizard0711/chari-dungeon-new-world` and publishes its `gh-pages` branch. The existing solo repository/domain is separate.

GitHub Pages custom domain: `charidungeon.com`. The tracked `public/CNAME` is copied to every publication by the release script.

Cloudflare records, all **DNS only**, TTL Auto:

| Name | Type | Content |
|---|---|---|
| @ | A | 185.199.108.153 |
| @ | A | 185.199.109.153 |
| @ | A | 185.199.110.153 |
| @ | A | 185.199.111.153 |
| www | CNAME | charizard0711.github.io |

The initially attempted flattened apex CNAME was replaced by GitHub's recommended A records to make HTTPS certificate eligibility explicit. No unrelated DNS records existed or were changed.

## Authentication

- Supabase Site URL: `https://charidungeon.com/`.
- Signup/resend return URLs in the client: `https://charidungeon.com/`.
- Four-language confirmation mail links: `https://charidungeon.com/auth-confirm.html` with the one-time token hash and selected language.
- The existing Turnstile widget includes `charidungeon.com` alongside its existing GitHub and local QA hostnames; Managed mode and pre-clearance settings were preserved. No secret was rotated or copied.
- The old GitHub Pages project URL is retained as a compatibility address and redirects through GitHub's custom-domain handling.

## Validation

TypeScript and Vite production build pass. DNS resolves to all four published GitHub Pages addresses. HTTP returns the ZERO title and release record from source commit `924426f`.

HTTPS provisioning is complete. GitHub's certificate is approved for both `charidungeon.com` and `www.charidungeon.com`, and HTTPS enforcement is enabled. `https://charidungeon.com/` returns HTTP 200 with the ZERO title. HTTP, www and the previous GitHub Pages project URL all return HTTP 301 to `https://charidungeon.com/`.

The Pages custom domain was re-registered after GitHub's DNS health check passed, following GitHub's certificate provisioning guidance. No TLS warnings were bypassed. The published game was checked in the browser with `?mute=1`; no production account was created or deleted by this domain setup.
