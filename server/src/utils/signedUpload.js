import crypto from 'crypto';
import path from 'path';

function signingSecret() {
  const s = process.env.UPLOAD_SIGNING_SECRET || process.env.JWT_SECRET;
  if (!s) throw new Error('UPLOAD_SIGNING_SECRET or JWT_SECRET is not set');
  return s;
}

/** Normalize to path under /uploads/... */
export function normalizeUploadPath(filePath) {
  const raw = String(filePath || '').trim().replace(/\\/g, '/');
  if (!raw) return '';
  const withSlash = raw.startsWith('/') ? raw : `/${raw}`;
  if (!withSlash.startsWith('/uploads/')) return '';
  // Prevent path traversal
  const resolved = path.posix.normalize(withSlash);
  if (!resolved.startsWith('/uploads/') || resolved.includes('..')) return '';
  return resolved;
}

export function signUploadPath(uploadPath, expiresAtMs) {
  const p = normalizeUploadPath(uploadPath);
  if (!p) throw new Error('Invalid upload path');
  const exp = String(expiresAtMs);
  const payload = `${p}.${exp}`;
  const sig = crypto.createHmac('sha256', signingSecret()).update(payload).digest('hex');
  return { path: p, exp, sig };
}

export function buildSignedUploadUrl(uploadPath, ttlMs = 60 * 60 * 1000) {
  const expiresAtMs = Date.now() + ttlMs;
  const { path: p, exp, sig } = signUploadPath(uploadPath, expiresAtMs);
  return `${p}?exp=${exp}&sig=${sig}`;
}

export function verifyUploadSignature(uploadPath, exp, sig) {
  const p = normalizeUploadPath(uploadPath);
  if (!p || !exp || !sig) return false;
  const expNum = Number(exp);
  if (!Number.isFinite(expNum) || expNum < Date.now()) return false;
  const expected = crypto
    .createHmac('sha256', signingSecret())
    .update(`${p}.${exp}`)
    .digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(String(sig)));
  } catch {
    return false;
  }
}
