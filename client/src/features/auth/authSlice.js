import { createSlice } from '@reduxjs/toolkit'

const TOKEN_KEY = 'token'

function readStoredToken() {
  if (typeof window === 'undefined') return null
  try {
    return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

function clearStoredToken() {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(TOKEN_KEY)
    sessionStorage.removeItem(TOKEN_KEY)
  } catch {
    /* ignore */
  }
}

function writeStoredToken(token, remember) {
  if (typeof window === 'undefined') return
  clearStoredToken()
  if (!token) return
  try {
    const store = remember ? localStorage : sessionStorage
    store.setItem(TOKEN_KEY, token)
  } catch {
    /* ignore */
  }
}

const initialState = {
  token: readStoredToken(),
  user: null,
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials(state, action) {
      state.token = action.payload.token
      state.user = action.payload.user
      const remember = action.payload.remember !== false
      writeStoredToken(action.payload.token, remember)
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
      state.user = null
      clearStoredToken()
    },
  },
})

export const { setCredentials, setUser, logout } = authSlice.actions
export default authSlice.reducer
