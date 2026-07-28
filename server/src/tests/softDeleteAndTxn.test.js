import assert from 'node:assert/strict';
import test from 'node:test';
import { withNotDeleted, NOT_DELETED, softDeleteSet, restoreSet } from '../utils/softDelete.js';
import { sessionOpts } from '../utils/mongoTransaction.js';

test('withNotDeleted merges active-record filters', () => {
  assert.deepEqual(withNotDeleted({ tenantId: 't1' }), {
    tenantId: 't1',
    deletedAt: null,
    isDeleted: { $ne: true },
  });
  assert.equal(NOT_DELETED.deletedAt, null);
});

test('softDeleteSet and restoreSet are inverses of each other', () => {
  const del = softDeleteSet('user1', '  leftover  ');
  assert.equal(del.isDeleted, true);
  assert.ok(del.deletedAt instanceof Date);
  assert.equal(del.deletedBy, 'user1');
  assert.equal(del.deleteReason, 'leftover');

  const rest = restoreSet();
  assert.equal(rest.isDeleted, false);
  assert.equal(rest.deletedAt, null);
  assert.equal(rest.deletedBy, null);
  assert.equal(rest.deleteReason, '');
});

test('sessionOpts omits session when null', () => {
  assert.deepEqual(sessionOpts(null), {});
  assert.deepEqual(sessionOpts(undefined), {});
  const fake = { id: 1 };
  assert.deepEqual(sessionOpts(fake), { session: fake });
});
