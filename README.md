# Roomify — live prototype

A responsive, browser-only prototype inspired by the Roomify app demonstrated in the linked video.

## Live preview

[Open Roomify](https://roomify-diamond-20261015.sheer-cornet.workers.dev)

## Run locally

```bash
node server.js
```

Open `http://localhost:3000`.

## Working in this demo

- Upload a room photo for a local before/visual-reference comparison. The file is read in the browser; it is not sent to an AI provider.
- Choose Scandinavian, Japandi, Modern, Boho, or Industrial style directions.
- Set a £300–£2,000 budget and receive a curated IKEA UK sample list that stays within it.
- Open retailer product pages from the shopping list.
- Add refinement notes, compare the uploaded room with a style reference, and save plans locally in this browser.
- Use the responsive landing page, style studio, saved-design gallery, and plan comparison.

## Deliberate demo limitations

This is not yet a production SaaS. The redesign visual is a generated style reference, **not** an AI edit of the uploaded room. Refinement text is recorded as a note; it does not regenerate the visual. Authentication, cloud database/storage, an AI image API, Stripe checkout, custom domain, and live product inventory are not connected. The UI says so before presenting sign-in or plan actions. Photos remain on the device unless a user explicitly saves a design, which stores a compressed copy in local browser storage.

The IKEA UK sample prices were checked against official listings on 15 October 2026: GULLVALLA 2-seat sofa (£249), LANDSKRONA 3-seat sofa (£599), LACK coffee table (£40), and ÖKENSAND floor lamp (£40). Prices/availability can change; the app is independent and is not affiliated with IKEA.

## Local integration readiness

Running `node server.js` also exposes a read-only, no-store `GET /api/capabilities` endpoint for the current integration states. It reads no provider credentials and makes no external calls; write methods are disabled. The existing public Cloudflare Worker is still a static-assets deployment and was not changed, so this endpoint is available only when running the local Node server.

Run the dependency-free checks with `node --test`.

## Project files

- `public/index.html` — interface structure
- `public/styles.css` — responsive visual design
- `public/app.js` — browser interactions and local persistence
- `public/assets/` — original generated style reference images
- `server.js` — minimal static HTTP server with basic security headers
