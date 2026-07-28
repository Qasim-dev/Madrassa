/**
 * Role → permission matrix for tenant users.
 * admin: full access. staff: operational (attendance/exams marks/library) without money/settings admin.
 */

export const ROLES = Object.freeze(['admin', 'staff']);

/** Permission keys used by requirePermission / FE guards */
export const PERMISSIONS = Object.freeze({
  'students:read': ['admin', 'staff'],
  'students:write': ['admin', 'staff'],
  'students:delete': ['admin'],
  'teachers:read': ['admin', 'staff'],
  'teachers:write': ['admin'],
  'teachers:delete': ['admin'],
  'grades:write': ['admin'],
  'tartibat:write': ['admin'],
  'tartibat:delete': ['admin'],
  'attendance:write': ['admin', 'staff'],
  'character:write': ['admin', 'staff'],
  'exams:read': ['admin', 'staff'],
  'exams:write': ['admin', 'staff'],
  'exams:admin': ['admin'],
  'fees:read': ['admin'],
  'fees:write': ['admin'],
  'finance:read': ['admin'],
  'finance:write': ['admin'],
  'inventory:read': ['admin', 'staff'],
  'inventory:write': ['admin'],
  'library:write': ['admin', 'staff'],
  'speeches:write': ['admin', 'staff'],
  'idcards:write': ['admin', 'staff'],
  'settings:write': ['admin'],
  'users:manage': ['admin'],
  'bookreading:write': ['admin', 'staff'],
});

export function roleHasPermission(role, permission) {
  const allowed = PERMISSIONS[permission];
  if (!allowed) return false;
  return allowed.includes(role);
}

export function permissionsForRole(role) {
  return Object.keys(PERMISSIONS).filter((p) => roleHasPermission(role, p));
}
