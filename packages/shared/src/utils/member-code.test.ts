import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildMemberQrPayload, generateMemberCode, parseMemberQrPayload } from './member-code';

test('generateMemberCode produces MBR prefix', () => {
  const code = generateMemberCode(() => 0);
  assert.match(code, /^MBR-[A-Z0-9]{8}$/);
});

test('buildMemberQrPayload encodes tenant slug and code', () => {
  const payload = buildMemberQrPayload('toko-demo', 'MBR-ABC12345');
  assert.equal(payload, 'barokah:member:toko-demo:MBR-ABC12345');
});

test('parseMemberQrPayload parses full payload', () => {
  const parsed = parseMemberQrPayload('barokah:member:toko-demo:MBR-ABC12345');
  assert.deepEqual(parsed, { tenantSlug: 'toko-demo', memberCode: 'MBR-ABC12345' });
});

test('parseMemberQrPayload accepts bare member code', () => {
  const parsed = parseMemberQrPayload('MBR-ABC12345');
  assert.deepEqual(parsed, { tenantSlug: '', memberCode: 'MBR-ABC12345' });
});
