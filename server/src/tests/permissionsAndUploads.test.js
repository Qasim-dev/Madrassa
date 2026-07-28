import test from 'node:test';
import assert from 'node:assert/strict';
import { roleHasPermission, permissionsForRole } from '../constants/permissions.js';
import {
  normalizeUploadPath,
  signUploadPath,
  verifyUploadSignature,
  buildSignedUploadUrl,
} from '../utils/signedUpload.js';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-for-phase1';

test('staff cannot access finance or settings write', () => {
  assert.equal(roleHasPermission('staff', 'finance:write'), false);
  assert.equal(roleHasPermission('staff', 'fees:write'), false);
  assert.equal(roleHasPermission('staff', 'settings:write'), false);
  assert.equal(roleHasPermission('staff', 'users:manage'), false);
  assert.equal(roleHasPermission('staff', 'exams:admin'), false);
});

test('staff can mark attendance and exam marks', () => {
  assert.equal(roleHasPermission('staff', 'attendance:write'), true);
  assert.equal(roleHasPermission('staff', 'exams:write'), true);
  assert.equal(roleHasPermission('staff', 'character:write'), true);
});

test('admin has full money and user permissions', () => {
  assert.equal(roleHasPermission('admin', 'finance:write'), true);
  assert.equal(roleHasPermission('admin', 'users:manage'), true);
  assert.ok(permissionsForRole('admin').includes('fees:write'));
  assert.equal(roleHasPermission('admin', 'recycle:purge'), true);
  assert.equal(roleHasPermission('staff', 'recycle:read'), false);
});

test('signed upload path rejects traversal and validates HMAC', () => {
  assert.equal(normalizeUploadPath('/uploads/../etc/passwd'), '');
  assert.equal(normalizeUploadPath('/uploads/photo.jpg'), '/uploads/photo.jpg');
  const { path, exp, sig } = signUploadPath('/uploads/photo.jpg', Date.now() + 60_000);
  assert.equal(verifyUploadSignature(path, exp, sig), true);
  assert.equal(verifyUploadSignature(path, exp, 'deadbeef'), false);
  assert.equal(verifyUploadSignature(path, String(Date.now() - 1000), sig), false);
  const url = buildSignedUploadUrl('/uploads/a.png', 1000);
  assert.match(url, /^\/uploads\/a\.png\?exp=\d+&sig=[a-f0-9]+$/);
});
