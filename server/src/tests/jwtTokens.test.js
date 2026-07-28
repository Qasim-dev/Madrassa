import test from 'node:test';
import assert from 'node:assert/strict';
import { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken } from '../utils/jwt.js';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-for-phase1';

test('access and refresh tokens are typed and not interchangeable', () => {
  const payload = { userId: 'u1', tenantId: 't1', username: 'a@b.c', role: 'admin' };
  const access = signAccessToken(payload);
  const refresh = signRefreshToken(payload);
  const a = verifyAccessToken(access);
  assert.equal(a.typ, 'access');
  assert.equal(a.userId, 'u1');
  assert.throws(() => verifyAccessToken(refresh));
  const r = verifyRefreshToken(refresh);
  assert.equal(r.typ, 'refresh');
  assert.throws(() => verifyRefreshToken(access));
});
