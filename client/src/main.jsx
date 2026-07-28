import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { RouterProvider } from 'react-router-dom'
import 'bootstrap/dist/css/bootstrap.min.css'
import './index.css'
import './styles/filterDrawer.css'
import './app/i18n.js'
import './app/syncDocumentDir.js'
import './app/syncLangFieldBody.js'
import { store } from './app/store'
import { FlashProvider } from './app/flash.jsx'
import { router } from './App.jsx'
import './styles/flashAndMobileNav.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <FlashProvider>
        <RouterProvider router={router} />
      </FlashProvider>
    </Provider>
  </StrictMode>,
)
