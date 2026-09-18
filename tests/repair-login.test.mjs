import test from 'node:test';
import assert from 'node:assert/strict';
import { PassThrough, Writable } from 'node:stream';
import { promptRepairLogin } from '../scripts/lib/repair-login.mjs';

test('interactive maintenance login accepts credentials without echoing the password', async () => {
  const input = new PassThrough();
  input.isTTY = true;
  input.setRawMode = () => {};
  let transcript = '';
  const output = new Writable({ write(chunk, encoding, done) { transcript += chunk.toString(); done(); } });
  const pending = promptRepairLogin({ input, output });
  input.write('operator@example.test\n');
  await new Promise(resolve => setImmediate(resolve));
  input.write('test-only-secret\n');
  const result = await pending;
  assert.equal(result.email, 'operator@example.test');
  assert.equal(result.password, 'test-only-secret');
  assert.match(transcript, /Password \(tidak ditampilkan\)/);
  assert.doesNotMatch(transcript, /test-only-secret/);
});

test('maintenance login refuses to request a password from a non-interactive input', async () => {
  await assert.rejects(promptRepairLogin({ input: new PassThrough() }), /terminal interaktif/);
});
