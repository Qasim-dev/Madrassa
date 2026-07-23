import { createSlice } from '@reduxjs/toolkit'

const STORAGE_KEY = 'madrassaActiveSessionId'

function readStored() {
  try {
    return localStorage.getItem(STORAGE_KEY) || ''
  } catch {
    return ''
  }
}

const sessionSlice = createSlice({
  name: 'session',
  initialState: { activeSessionId: readStored() },
  reducers: {
    setActiveSessionId(state, action) {
      const v = typeof action.payload === 'string' ? action.payload : ''
      state.activeSessionId = v
      try {
        if (v) localStorage.setItem(STORAGE_KEY, v)
        else localStorage.removeItem(STORAGE_KEY)
      } catch {
        /* ignore */
      }
    },
  },
})

export const { setActiveSessionId } = sessionSlice.actions
export default sessionSlice.reducer
