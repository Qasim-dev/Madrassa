import { createSlice } from '@reduxjs/toolkit'

const tokenFromStorage = () =>
  typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null

const initialState = {
  token: tokenFromStorage(),
  user: null,
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials(state, action) {
      state.token = action.payload.token
      state.user = action.payload.user
      if (action.payload.token) {
        localStorage.setItem('token', action.payload.token)
      }
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
      localStorage.removeItem('token')
    },
  },
})

export const { setCredentials, setUser, logout } = authSlice.actions
export default authSlice.reducer
