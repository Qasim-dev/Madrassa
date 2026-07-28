import { verifyAccessToken } from '../utils/jwt.js';
import { verifyUploadSignature, normalizeUploadPath } from '../utils/signedUpload.js';

/**
 * Allow /uploads access via HMAC query signature or Bearer/access_token JWT.
 * Blocks anonymous open directory access.
 */
export function requireUploadAccess(req, res, next) {
  const rel = normalizeUploadPath(`/uploads${req.path}`);
  if (!rel) {
    return res.status(400).json({ message: 'Invalid path' });
  }

  const { exp, sig, access_token: accessToken } = req.query || {};
  if (exp && sig && verifyUploadSignature(rel, exp, sig)) {
    return next();
  }

  const header = req.headers.authorization;
  const bearer = header?.startsWith('Bearer ') ? header.slice(7) : null;
  const token = bearer || (typeof accessToken === 'string' ? accessToken : null);
  if (token) {
    try {
      verifyAccessToken(token);
      return next();
    } catch {
      /* fall through */
    }
  }

  return res.status(401).json({ message: 'Unauthorized' });
}
