# Private memory integration

Branch: `backend/private-memory-2026-10-26`

Keys: `roomify-saved-designs`, `roomify-plan-count`.

Anonymous visitors can browse and edit transient UI state, but durable record mutations prompt sign-in and await remote success. Saved Roomify records contain structured design parameters, budget, selected products, notes, dates, and non-sensitive metadata only. Uploaded photos, compressed data URLs, raw media, object URLs, File/Blob values, and attachments are excluded from cloud payloads; image previews remain transient in the current tab and are not recreated when a record is restored. Legacy browser storage is not imported, uploaded, or deleted; users need an explicit future export/import flow. Account changes clear personal records and transient previews from app state before loading the next account.

`memory-config.js` intentionally has `firebaseConfig: null`; the parent must install the final bootstrap and public config. No deployment, payments, push, profile, pins, or visibility features were added.
