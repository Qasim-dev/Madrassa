import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { logout, setCredentials } from '../../features/auth/authSlice'

const rawBaseQuery = fetchBaseQuery({
  baseUrl: '/api',
  prepareHeaders: (headers, { getState }) => {
    const token = getState().auth.token
    if (token) headers.set('authorization', `Bearer ${token}`)
    return headers
  },
})

/** HTTP status from RTK errors (incl. PARSING_ERROR.originalStatus). */
function httpStatus(error) {
  if (!error) return null
  if (typeof error.status === 'number') return error.status
  if (typeof error.originalStatus === 'number') return error.originalStatus
  if (error.status === '401' || error.status === 401) return 401
  return null
}

let refreshPromise = null

async function tryRefresh(apiRTK) {
  const state = apiRTK.getState().auth
  const refreshToken = state.refreshToken
  if (!refreshToken) return false
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const result = await rawBaseQuery(
        { url: 'auth/refresh', method: 'POST', body: { refreshToken } },
        apiRTK,
        {}
      )
      if (result.data?.token || result.data?.accessToken) {
        apiRTK.dispatch(
          setCredentials({
            token: result.data.token || result.data.accessToken,
            refreshToken: result.data.refreshToken || refreshToken,
            user: result.data.user || state.user,
            remember: state.remember,
          })
        )
        return true
      }
      return false
    })().finally(() => {
      refreshPromise = null
    })
  }
  return refreshPromise
}

/** Refresh access token on 401; otherwise log out. */
const baseQuery = async (args, apiRTK, extraOptions) => {
  let result = await rawBaseQuery(args, apiRTK, extraOptions)
  if (httpStatus(result.error) !== 401) return result

  const url = typeof args === 'string' ? args : args?.url || ''
  const isPublicAuth = /auth\/(login|register|refresh|forgot-password|reset-password)|public\//.test(url)
  if (isPublicAuth) return result

  const refreshed = await tryRefresh(apiRTK)
  if (refreshed) {
    result = await rawBaseQuery(args, apiRTK, extraOptions)
    return result
  }

  apiRTK.dispatch(logout())
  queueMicrotask(() => {
    try {
      apiRTK.dispatch(api.util.resetApiState())
    } catch {
      /* ignore */
    }
  })
  return result
}

export const api = createApi({
  reducerPath: 'api',
  baseQuery,
  tagTypes: [
    'Dashboard',
    'Student',
    'Teacher',
    'Grade',
    'Attendance',
    'Fee',
    'Finance',
    'Inventory',
    'Settings',
    'Tartibat',
    'TeacherSalary',
    'Exam',
    'BookReading',
    'Library',
    'Speech',
    'IdCard',
    'StudentActivity',
    'User',
  ],
  endpoints: () => ({}),
})
