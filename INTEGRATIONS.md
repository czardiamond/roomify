# Roomify integration readiness

## Current behavior

The live-facing interface remains an interactive prototype. The uploaded room photo is read and compared in the browser; no AI provider receives it. The design image is a style reference, not a photo-specific render. Saved designs use browser-local storage only. Sign-in, cloud storage, checkout/subscriptions, and live product inventory are not connected.

The local Node server now exposes `GET /api/capabilities`, a read-only and no-store status contract. It deliberately reports the integrations as disabled, reads no credentials, and makes no external requests. Non-read HTTP methods remain rejected. This endpoint is local-server scaffolding; the current public Cloudflare Worker serves static assets and was not redeployed.

## Decisions required before integration

1. **Room-specific AI rendering:** choose a provider/model and image workflow; decide whether users may send room photos off-device; specify consent, processing region, retention/deletion, and a per-render and monthly spend cap. Until those decisions are supplied, no photo upload endpoint or AI call is enabled.
2. **Authentication and cloud persistence:** choose identity and database/object-storage providers; decide what profile/design data is stored, data region, retention, export/deletion behavior, and account lifecycle. Provider credentials must be supplied through an approved secret store, never committed to this repository.
3. **Billing:** confirm whether paid subscriptions are wanted, the Stripe account, plans/prices/currency, billing and cancellation terms, and tax handling. Stripe secret and webhook-signing credentials are required only after those choices. Checkout and charges remain disabled.
4. **Product data:** choose an authorized catalog/feed or partner source, supported market/currency, refresh cadence, and any affiliate attribution. The current IKEA UK entries are static examples, not live availability or prices.

## Safe rollout sequence

1. Confirm the provider, privacy, retention, and spending choices above.
2. Implement one provider adapter at a time with mocked tests first and no production credentials.
3. Add secrets through an approved secret manager; do not put them in source, static assets, or logs.
4. Validate in provider test/sandbox mode and review user-facing consent and disclosures.
5. Obtain deployment approval before changing the live Worker. No production deployment is part of the current code update.
