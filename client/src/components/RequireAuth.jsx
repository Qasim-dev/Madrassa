import { useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { logout } from '../features/auth/authSlice'
import { api, useGetMeQuery } from '../services/api'
import { readJwtExpMs } from '../shared/jwtExp'

function isUnauthorizedError(error) {
  if (!error) return false
  if (typeof error.status === 'number') return error.status === 401
  if (typeof error.originalStatus === 'number') return error.originalStatus === 401
  return error.status === '401'
}

export default function RequireAuth({ children }) {
  const token = useSelector((s) => s.auth.token)
  const dispatch = useDispatch()
  const location = useLocation()

  const { error: meError, isError: meIsError } = useGetMeQuery(undefined, {
    skip: !token,
  })

  // Proactive logout when JWT expiry time is reached (or already past).
  useEffect(() => {
    if (!token) return undefined
    const expMs = readJwtExpMs(token)
    if (expMs == null) return undefined
    const msLeft = expMs - Date.now()
    if (msLeft <= 0) {
      dispatch(logout())
      dispatch(api.util.resetApiState())
      return undefined
    }
    const id = window.setTimeout(() => {
      dispatch(logout())
      dispatch(api.util.resetApiState())
    }, Math.min(msLeft, 2_147_000_000))
    return () => window.clearTimeout(id)
  }, [token, dispatch])

  // Safety net if /auth/me (or cache) reports unauthorized.
  useEffect(() => {
    if (!token || !meIsError) return
    if (isUnauthorizedError(meError)) {
      dispatch(logout())
      dispatch(api.util.resetApiState())
    }
  }, [token, meIsError, meError, dispatch])

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }
  return children
}
