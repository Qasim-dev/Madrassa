import { createSlice } from '@reduxjs/toolkit'

const TOKEN_KEY = 'token'
const REFRESH_KEY = 'refreshToken'
const REMEMBER_KEY = 'authRemember'

function storageForRemember(remember) {
  return remember ? localStorage : sessionStorage
}

function readRemember() {
  try {
    return localStorage.getItem(REMEMBER_KEY) !== '0'
  } catch {
    return true
  }
}

function readStoredToken() {
  if (typeof window === 'undefined') return null
  try {
    return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

function readStoredRefresh() {
  if (typeof window === 'undefined') return null
  try {
    return localStorage.getItem(REFRESH_KEY) || sessionStorage.getItem(REFRESH_KEY)
  } catch {
    return null
  }
}

function clearStoredAuth() {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(TOKEN_KEY)
    sessionStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(REFRESH_KEY)
    sessionStorage.removeItem(REFRESH_KEY)
  } catch {
    /* ignore */
  }
}

function writeStoredAuth(token, refreshToken, remember) {
  if (typeof window === 'undefined') return
  clearStoredAuth()
  try {
    localStorage.setItem(REMEMBER_KEY, remember ? '1' : '0')
    const store = storageForRemember(remember)
    if (token) store.setItem(TOKEN_KEY, token)
    if (refreshToken) store.setItem(REFRESH_KEY, refreshToken)
  } catch {
    /* ignore */
  }
}

const initialState = {
  token: readStoredToken(),
  refreshToken: readStoredRefresh(),
  user: null,
  remember: readRemember(),
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials(state, action) {
      const remember = action.payload.remember !== undefined ? action.payload.remember : state.remember !== false
      state.remember = remember
      state.token = action.payload.token
      state.refreshToken = action.payload.refreshToken || null
      state.user = action.payload.user
      writeStoredAuth(action.payload.token, action.payload.refreshToken, remember)
    },
    setUser(state, action) {
      const patch = action.payload
      if (!patch) return
      if (state.user && patch.tenant) {
        state.user = {
          ...state.user,
          ...patch,
          tenant: { ...state.user.tenant, ...patch.tenant },
        }
      } else {
        state.user = state.user ? { ...state.user, ...patch } : patch
      }
    },
    logout(state) {
      state.token = null
      state.refreshToken = null
      state.user = null
      clearStoredAuth()
    },
  },
})

export const { setCredentials, setUser, logout } = authSlice.actions
export default authSlice.reducer
