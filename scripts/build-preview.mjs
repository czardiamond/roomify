import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const env = process.env;
const APP_ID = "roomify";
const APP_NAME = "Roomify";
const EXPECTED_PROJECT_ID = "diamond-roomify";
const APPROVED_CONFIG_SHA256 = "29d580a752011eb6f60a1234685593a7655aeb4c0ae17b7103ff4717683d8d3b";
const OUTPUT = ".preview-public";
const SOURCE_ROOT = resolve(ROOT, 'public');
const SOURCES = ["index.html", "styles.css", "app.js", "assets", "memory"];
const HOST_RE = new RegExp(`^motion-preview-${APP_ID}(?:-[a-z0-9]+)*\\.vercel\\.app$`);

function fail(message) { throw new Error(`[${APP_ID}] ${message}`); }
function canonical(value) { return JSON.stringify(value); }
function configHash(value) { return createHash('sha256').update(canonical(value)).digest('hex'); }
function exactConfig() {
  if (!env.PROJECT_MEMORY_FIREBASE_CONFIG) fail('PROJECT_MEMORY_FIREBASE_CONFIG is required for preview builds');
  let value;
  try { value = JSON.parse(env.PROJECT_MEMORY_FIREBASE_CONFIG); } catch { fail('PROJECT_MEMORY_FIREBASE_CONFIG must be valid JSON'); }
  if (!value || Array.isArray(value) || typeof value !== 'object') fail('Firebase config must be an object');
  if (value.projectId !== EXPECTED_PROJECT_ID) fail(`Firebase projectId must be ${EXPECTED_PROJECT_ID}`);
  if (configHash(value) !== APPROVED_CONFIG_SHA256) fail('Firebase config does not match the approved canonical public config');
  return value;
}
function previewHost() {
  const host = String(env.VERCEL_URL || '').trim().toLowerCase();
  if (!HOST_RE.test(host)) fail(`VERCEL_URL must be an exact ${APP_ID} motion-preview host`);
  return host;
}
function configScript(host, firebaseConfig) {
  const serialized = JSON.stringify(firebaseConfig);
  return `// Generated preview artifact. Do not edit or use outside the exact preview host.\n(() => {\n  const expectedHost = ${JSON.stringify(host)};\n  const firebaseConfig = ${serialized};\n  window.PROJECT_MEMORY_CONFIG = { appId: ${JSON.stringify(APP_ID)}, appName: ${JSON.stringify(APP_NAME)}, expectedProjectId: ${JSON.stringify(EXPECTED_PROJECT_ID)}, firebaseConfig: location.hostname === expectedHost ? firebaseConfig : null };\n})();\n`;
}
async function main() {
  const preview = env.VERCEL_ENV === 'preview';
  let host = null; let firebaseConfig = null;
  if (preview) { host = previewHost(); firebaseConfig = exactConfig(); }
  const out = resolve(ROOT, OUTPUT);
  await rm(out, { recursive: true, force: true });
  await mkdir(out, { recursive: true });
  for (const source of SOURCES) await cp(join(SOURCE_ROOT, source), join(out, source), { recursive: true });
  await rm(join(out, 'memory/package.json'), { force: true });
  await writeFile(join(out, 'memory-config.js'), configScript(host || '', firebaseConfig), 'utf8');
  console.log(`[${APP_ID}] ${preview ? `preview enabled for ${host}` : 'closed non-preview build'}`);
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
