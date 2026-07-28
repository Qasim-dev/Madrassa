import { roleHasPermission } from '../constants/permissions.js';

/**
 * Require one or more permissions (user must have ALL listed).
 * Must run after requireAuth.
 */
export function requirePermission(...permissions) {
  return (req, res, next) => {
    const role = req.user?.role || 'staff';
    const missing = permissions.filter((p) => !roleHasPermission(role, p));
    if (missing.length) {
      return res.status(403).json({
        message: 'Forbidden',
        missingPermissions: missing,
      });
    }
    return next();
  };
}

/** Shortcut: admin role only */
export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  return next();
}
