import test from 'node:test';
import assert from 'node:assert/strict';
import { withNotDeleted, NOT_DELETED } from '../utils/softDelete.js';
import { sessionOpts } from '../utils/mongoTransaction.js';

test('withNotDeleted merges deletedAt null filter', () => {
  assert.deepEqual(withNotDeleted({ tenantId: 't1' }), { tenantId: 't1', deletedAt: null });
  assert.deepEqual(NOT_DELETED, { deletedAt: null });
});

test('sessionOpts omits session when null', () => {
  assert.deepEqual(sessionOpts(null), {});
  assert.deepEqual(sessionOpts(undefined), {});
  const fake = { id: 's' };
  assert.deepEqual(sessionOpts(fake), { session: fake });
});
