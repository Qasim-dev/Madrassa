/** Client-side mirror of server permission matrix (keep in sync). */
export const PERMISSIONS = {
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
  'recycle:read': ['admin'],
  'recycle:restore': ['admin'],
  'recycle:purge': ['admin'],
}

export function roleHasPermission(role, permission) {
  const allowed = PERMISSIONS[permission]
  if (!allowed) return false
  return allowed.includes(role)
}

export function can(userOrRole, permission) {
  const role = typeof userOrRole === 'string' ? userOrRole : userOrRole?.role
  if (Array.isArray(userOrRole?.permissions)) {
    return userOrRole.permissions.includes(permission)
  }
  return roleHasPermission(role || 'staff', permission)
}
