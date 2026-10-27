import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(process.cwd());
const source=fs.readFileSync(path.join(root, 'public/app.js'),'utf8');
assert.match(source,/projectMemoryReady/);
assert.match(source,/projectMemory/);
assert.match(source,/openProjectAccount\??\.\(['"]signin/);
assert.match(source,/authenticated/);
assert.match(source,/onAuth/);
assert.match(source,/withoutMedia/);
assert.match(source,/resetAccountSensitiveState/);
assert.doesNotMatch(source,/localStorage\.(?:getItem|setItem|removeItem)/);

function mockMemory(authenticated, uid = 'owner-a') {
  const writes = [];
  return {
    authenticated,
    user: authenticated ? { uid } : null,
    writes,
    async set(key, value) { if (!this.authenticated) throw new Error('Authenticated non-anonymous user required'); writes.push({ key, value }); }
  };
}

{
  const memory = mockMemory(false);
  assert.equal(memory.authenticated, false, 'signed-out memory must deny durable writes');
  await assert.rejects(() => memory.set('roomify-saved-designs', []), /Authenticated/);
}
{
  const memory = mockMemory(true);
  const structured = { style: 'japandi', budget: 900, products: [{ id: 'lack', price: 40 }], notes: 'warm oak', metadata: { source: 'roomify' } };
  await memory.set('roomify-saved-designs', [structured]);
  assert.deepEqual(memory.writes[0].value[0], structured, 'owner save preserves structured design state');
  assert.equal('before' in memory.writes[0].value[0], false, 'cloud payload excludes image data');
  assert.equal('attachments' in memory.writes[0].value[0], false, 'cloud payload excludes attachments');
}
{
  let saved = [{ id: 'a', title: 'Account A plan' }];
  let transientPreview = 'data:image/jpeg;base64,not-persisted';
  const switchAccount = () => { saved = []; transientPreview = null; };
  switchAccount();
  assert.deepEqual(saved, [], 'account switch clears prior owner records from app state');
  assert.equal(transientPreview, null, 'account switch clears transient media preview');
}
console.log('memory integration mocked ownership and media checks passed');
