import { verifyAccessToken } from '../utils/jwt.js';

export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  try {
    const payload = verifyAccessToken(header.slice(7));
    req.user = payload;
    req.tenantId = payload.tenantId;
    return next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}
