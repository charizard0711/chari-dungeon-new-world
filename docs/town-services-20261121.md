# Plaza services

Central paving uses the actual 3 × 3 slab region of the pale-blue atlas, one slab per existing 48px movement cell. Outside paving is unchanged. Four entrance roads remain open; solid trees fill the surrounding green strips. The training target moves from (22,13) to (8,9), west of the fountain.

New separately painted sprites: housing office/elderly male clerk, barber/female hairdresser, star lottery/mustached clerk, crystal marketplace display. Assets are in public/assets/online/town-services-v1/. Generation prompts are in prompts.txt in that directory; built-in imagegen was used with transparent backgrounds.

Marketplace: interact at (22,7). Up to three active listings per account across both characters. One equipment instance or consumable per listing, 1–10,000,000G, no fee. Equipped gear must be removed first. Escrow preserves instance ID, rare color and durability. Buyers receive the item and sellers receive G in the same transaction. Sellers can cancel using the listing character. Sold/cancelled listings are retained for audit. Reads are paged in groups of 30.

Star lottery: interact at (17,18). Game G only, immediate result, 1,000G/ticket. Payouts: 1,000,000 (0.01%), 100,000 (0.09%), 10,000 (0.9%), 2,000 (9%), 1,000 (20%), none (70%). Price and odds appear before purchase. Last 10 results are shown. Two-second account cooldown; server chooses the result. Browser-generated request IDs make transaction retries idempotent; no random roll runs in the client.

Deployment requires migrations 202611210013 and 202611210014 with the client. Existing character, warehouse and house ownership data are preserved; newly obstructed presence/loot is relocated. The RPC checks authentication, active character, town location, interaction distance, ownership, price, capacity and balances under the existing world advisory lock. Tables have RLS and no client table grants.

Validation: test-town-commerce.ts (escrow, payment, retry, account cap, rare/worn gear, wrong owner, distance, invalid price, full inventory rollback, lottery, new barrel, RLS); test-town-demo.ts (all doors/gates/entrances); test-online-housing.ts (complete server/client collision parity and housing behavior). UI tested silently through the development-only rig-check fixture, including text price input, custom increment button, confirmation, listing and cancellation. QA transport is only reachable under DEV and scene.preview; rig-check is not a production entry.
