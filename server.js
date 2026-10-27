const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { URL } = require('node:url');

const ROOT = path.resolve(__dirname, 'public');
const PORT = Number(process.env.PORT || 3000);
const HOST = '0.0.0.0';
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon'
};

// Deliberately static: do not infer readiness from environment variables or secrets.
// A provider is not enabled until a provider-specific adapter and reviewed consent flow exist.
const CAPABILITIES = Object.freeze({
  apiVersion: 1,
  mode: 'prototype',
  integrations: {
    photoDesign: {
      status: 'not_configured',
      provider: null,
      uploadEndpointEnabled: false,
      externalPhotoTransferEnabled: false,
      roomSpecificRenderingEnabled: false
    },
    authentication: {
      status: 'not_configured',
      provider: null,
      cloudSessionsEnabled: false
    },
    persistence: {
      status: 'browser_local_only',
      provider: null,
      cloudStorageEnabled: false
    },
    billing: {
      status: 'not_configured',
      provider: null,
      checkoutEnabled: false,
      chargesEnabled: false
    },
    productCatalog: {
      status: 'sample_data',
      liveInventoryEnabled: false
    }
  }
});

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'DENY',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': "default-src 'self'; img-src 'self' data:; script-src 'self' https://www.gstatic.com https://apis.google.com; style-src 'self'; connect-src 'self' https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://firestore.googleapis.com; frame-src https://diamond-roomify.firebaseapp.com; form-action 'self'; base-uri 'self'; frame-ancestors 'none'"
};

function sendJson(res, statusCode, payload, { head = false, headers = {} } = {}) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
    ...headers
  });
  res.end(head ? undefined : body);
}

function createServer() {
  return http.createServer((req, res) => {
    for (const [key, value] of Object.entries(SECURITY_HEADERS)) res.setHeader(key, value);

    let pathname;
    try {
      pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    } catch {
      res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Bad request');
    }

    if (pathname === '/api/capabilities') {
      if (req.method === 'GET' || req.method === 'HEAD') {
        return sendJson(res, 200, CAPABILITIES, { head: req.method === 'HEAD' });
      }
      return sendJson(res, 405, {
        error: 'READ_ONLY_ENDPOINT',
        message: 'Auth and private memory are configurable. Firebase is not live until the parent supplies public config; no account claims are made while config is null.',
        allowedMethods: ['GET', 'HEAD']
      }, { headers: { 'Allow': 'GET, HEAD' } });
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Allow': 'GET, HEAD',
        'Cache-Control': 'no-store'
      });
      return res.end('Method not allowed');
    }

    if (pathname === '/health') {
      return sendJson(res, 200, { ok: true, app: 'roomify-demo' }, { head: req.method === 'HEAD' });
    }
    if (pathname === '/') pathname = '/index.html';

    const filePath = path.resolve(ROOT, `.${pathname}`);
    if (!filePath.startsWith(`${ROOT}${path.sep}`)) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Forbidden');
    }

    fs.stat(filePath, (statError, stat) => {
      if (statError || !stat.isFile()) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
        return res.end('Not found');
      }
      const extension = path.extname(filePath).toLowerCase();
      const contentType = TYPES[extension] || 'application/octet-stream';
      res.writeHead(200, {
        'Content-Type': contentType,
        'Content-Length': stat.size,
        'Cache-Control': ['.html', '.css', '.js', '.json'].includes(extension) ? 'no-cache' : 'public, max-age=3600'
      });
      if (req.method === 'HEAD') return res.end();
      fs.createReadStream(filePath).pipe(res);
    });
  });
}

function startServer() {
  const server = createServer();
  server.listen(PORT, HOST, () => {
    console.log(`Roomify demo listening on http://${HOST}:${PORT}`);
  });
  server.on('error', error => {
    console.error('Roomify server error:', error.message);
    process.exitCode = 1;
  });
  return server;
}

if (require.main === module) startServer();

module.exports = { CAPABILITIES, createServer };
