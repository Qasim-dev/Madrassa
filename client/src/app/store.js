import { configureStore } from '@reduxjs/toolkit'
import authReducer from '../features/auth/authSlice'
import sessionReducer from '../features/session/sessionSlice'
import { api } from '../services/api'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    session: sessionReducer,
    [api.reducerPath]: api.reducer,
  },
  middleware: (gDM) => gDM().concat(api.middleware),
})
