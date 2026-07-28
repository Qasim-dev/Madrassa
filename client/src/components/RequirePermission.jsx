import { Navigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { can } from '../shared/permissions'

/** Renders children only when the signed-in user has the permission. */
export default function RequirePermission({ permission, children, fallback = null }) {
  const user = useSelector((s) => s.auth.user)
  if (!can(user, permission)) {
    if (fallback === 'redirect') return <Navigate to="/" replace />
    return fallback
  }
  return children
}
