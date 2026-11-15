# Polar.sh Production Payment Setup (`VaultSheet`)

> **Environment Warning:** This integration runs directly against Polar's **live production** environment (`https://api.polar.sh`, organization `vaultsheet`, ID `8a90c787-2540-473a-b10c-17908e22cbd9`). Never commit `.env` or share secrets.

## Files Created & Updated

- [`src/lib/polar.ts`](src/lib/polar.ts) — Shared singleton `@polar-sh/sdk/2026-10` client reading `POLAR_ACCESS_TOKEN` and `POLAR_SERVER`.
- [`src/app/checkout/route.ts`](src/app/checkout/route.ts) — `GET /checkout?products=<PRODUCT_ID>` route creating a Polar checkout session and 302-redirecting to Polar hosted checkout.
- [`src/app/api/webhook/polar/route.ts`](src/app/api/webhook/polar/route.ts) — `POST /api/webhook/polar` webhook handler verifying signatures with `webhooks.validateEvent(...)` and handling `order.paid` and `customer.state_changed`.
- [`src/lib/licensing.ts`](src/lib/licensing.ts) — Wired pricing and upgrade modal CTAs to `/checkout?products=<ID>` and added support for `VS-` prefixed Polar license keys.
- [`next.config.ts`](next.config.ts) — Added `@polar-sh/sdk` to `serverExternalPackages` for clean Next.js 16 Turbopack builds.
- [`.gitignore`](.gitignore) — Ensures `.env` is excluded from Git tracking.

## Environment Variable Names

Set these in local `.env` and Vercel Production Environment Variables (never commit values):

- `POLAR_ACCESS_TOKEN`
- `POLAR_WEBHOOK_SECRET`
- `POLAR_SERVER` (`production`)

## Provisioned Polar Production Resources

- **Products:**
  - `Test Product` (`$10.00` one-time): `0df2b98b-bca0-4581-8e55-68f7b5503559`
  - `VaultSheet — 7-Day Tax & Audit Pass` (`$12.00` one-time): `4ceb2ddc-a3ca-4161-8931-9024af24050d`
  - `VaultSheet — Annual Pro Bookkeeper Pass` (`$29.00` one-time): `8d86923c-900b-4dc1-8322-50185382e70b`
- **License Key Benefit (`VS` prefix, attached to `$12` & `$29` products):** `9de5f759-e8a8-45ff-9409-1ca0fddbc25d`
- **Webhook Endpoint (`https://vaultsheet.tech/api/webhook/polar`):** `0c35fbc0-8ec1-46b0-b741-604093374a76` (`format: raw`, events: `order.paid`, `customer.state_changed`)
- **100% Test Discount Code:** `VAULTSHEET100` (ID: `f86ef487-506b-4733-a7f5-91c11385abe2`) — enter on Polar checkout page to test end-to-end without a real charge.

## Customer Portal Note

Polar's hosted Customer Portal is already available to customers out of the box—Polar hosts the portal and emails receipts/links directly to buyers after purchase, so no custom Customer Portal route is required in app code.

## Verify-Before-Merging Checklist

- [ ] Confirm `.env` is untracked (`git status --ignored` shows `!! .env`) and contains no secrets in Git history.
- [ ] Run `npx vitest run`, `npm run lint`, and `npm run build` with 0 errors.
- [ ] Verify Vercel project environment variables contain `POLAR_ACCESS_TOKEN`, `POLAR_WEBHOOK_SECRET`, and `POLAR_SERVER=production`.
- [ ] Smoke-test `/checkout?products=0df2b98b-bca0-4581-8e55-68f7b5503559` and confirm HTTP 302 redirect to `https://buy.polar.sh/...`.
- [ ] Implement real persistence/fulfillment in `src/app/api/webhook/polar/route.ts` if server-side license database validation is added later.
