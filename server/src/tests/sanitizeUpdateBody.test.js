import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeUpdateBody } from '../utils/sanitizeUpdateBody.js';

test('sanitizeUpdateBody strips tenantId and identity keys', () => {
  const out = sanitizeUpdateBody({
    tenantId: 'attacker-tenant',
    _id: 'attacker-id',
    id: 'attacker-id',
    __v: 9,
    createdAt: 'x',
    updatedAt: 'y',
    name: 'Safe',
  });
  assert.deepEqual(out, { name: 'Safe' });
});

test('sanitizeUpdateBody honors extra blocked fields', () => {
  const out = sanitizeUpdateBody({ title: 'A', balance: 999, photoUrl: '/x' }, ['balance', 'photoUrl']);
  assert.deepEqual(out, { title: 'A' });
});

test('sanitizeUpdateBody handles nullish body', () => {
  assert.deepEqual(sanitizeUpdateBody(null), {});
  assert.deepEqual(sanitizeUpdateBody(undefined), {});
});
