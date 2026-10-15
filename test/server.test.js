'use strict';

const assert = require('node:assert/strict');
const { after, before, test } = require('node:test');
const { createServer } = require('../server');

let server;
let baseUrl;

before(async () => {
  server = createServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  if (!server?.listening) return;
  await new Promise((resolve, reject) => {
    server.close(error => error ? reject(error) : resolve());
  });
});

test('read-only capability endpoint reports only the current prototype state', async () => {
  const response = await fetch(`${baseUrl}/api/capabilities`);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /application\/json/);
  assert.equal(response.headers.get('cache-control'), 'no-store');

  const body = await response.json();
  assert.equal(body.apiVersion, 1);
  assert.equal(body.mode, 'prototype');
  assert.deepEqual(body.integrations.photoDesign, {
    status: 'not_configured',
    provider: null,
    uploadEndpointEnabled: false,
    externalPhotoTransferEnabled: false,
    roomSpecificRenderingEnabled: false
  });
  assert.equal(body.integrations.authentication.status, 'not_configured');
  assert.equal(body.integrations.authentication.cloudSessionsEnabled, false);
  assert.equal(body.integrations.persistence.status, 'browser_local_only');
  assert.equal(body.integrations.persistence.cloudStorageEnabled, false);
  assert.equal(body.integrations.billing.status, 'not_configured');
  assert.equal(body.integrations.billing.checkoutEnabled, false);
  assert.equal(body.integrations.billing.chargesEnabled, false);
  assert.equal(body.integrations.productCatalog.status, 'sample_data');
  assert.equal(body.integrations.productCatalog.liveInventoryEnabled, false);
});

test('capability endpoint supports HEAD without returning a body', async () => {
  const response = await fetch(`${baseUrl}/api/capabilities`, { method: 'HEAD' });
  assert.equal(response.status, 200);
  assert.equal(await response.text(), '');
});

test('capability endpoint is read-only', async () => {
  const response = await fetch(`${baseUrl}/api/capabilities`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sample: 'synthetic test input' })
  });
  assert.equal(response.status, 405);
  assert.equal(response.headers.get('allow'), 'GET, HEAD');
  assert.equal((await response.json()).error, 'READ_ONLY_ENDPOINT');
});

test('there are no write endpoints for render, auth, storage, or billing', async () => {
  for (const route of ['/api/render', '/api/auth/session', '/api/designs', '/api/checkout']) {
    const response = await fetch(`${baseUrl}${route}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sample: 'synthetic test input' })
    });
    assert.equal(response.status, 405, `${route} must remain disabled`);
    assert.equal(response.headers.get('allow'), 'GET, HEAD');
  }
});

test('health check and static app assets are served locally', async () => {
  const health = await fetch(`${baseUrl}/health`);
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), { ok: true, app: 'roomify-demo' });

  const page = await fetch(`${baseUrl}/`);
  assert.equal(page.status, 200);
  assert.match(await page.text(), /Roomify — a room that feels like you/);

  const image = await fetch(`${baseUrl}/assets/style-scandinavian.jpg`);
  assert.equal(image.status, 200);
  assert.match(image.headers.get('content-type'), /image\/jpeg/);
  assert.ok(Number(image.headers.get('content-length')) > 0);
});

test('source files outside public are not served', async () => {
  const response = await fetch(`${baseUrl}/server.js`);
  assert.equal(response.status, 404);
});
