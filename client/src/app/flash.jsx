import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'

const FlashContext = createContext(null)

/**
 * App-wide non-blocking flash messages (replaces window.alert for errors/notices).
 */
export function FlashProvider({ children }) {
  const [flash, setFlash] = useState(null)

  const showFlash = useCallback((message, tone = 'danger') => {
    if (!message) return
    setFlash({ message: String(message), tone, id: Date.now() })
  }, [])

  const clearFlash = useCallback(() => setFlash(null), [])

  useEffect(() => {
    if (!flash) return undefined
    const tmr = setTimeout(() => setFlash(null), 5600)
    return () => clearTimeout(tmr)
  }, [flash])

  const value = useMemo(() => ({ showFlash, clearFlash }), [showFlash, clearFlash])

  return (
    <FlashContext.Provider value={value}>
      {children}
      {flash && typeof document !== 'undefined'
        ? createPortal(
            <div className="app-flash-host no-print" role="status" aria-live="polite">
              <div className={`app-flash app-flash--${flash.tone}`}>
                <p className="app-flash__msg mb-0">{flash.message}</p>
                <button type="button" className="app-flash__close" aria-label="Dismiss" onClick={clearFlash}>
                  ×
                </button>
              </div>
            </div>,
            document.body
          )
        : null}
    </FlashContext.Provider>
  )
}

export function useFlash() {
  const ctx = useContext(FlashContext)
  if (!ctx) {
    return {
      showFlash: (message) => {
        if (message) console.warn('[flash]', message)
      },
      clearFlash: () => {},
    }
  }
  return ctx
}
