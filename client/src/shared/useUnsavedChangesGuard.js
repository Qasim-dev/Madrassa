import { useEffect, useRef } from 'react'
import { useBlocker } from 'react-router-dom'

/**
 * Warn on browser refresh/close and block in-app navigation when `when` is true.
 * Caller should render a confirm UI when `isBlocked` and call proceed/reset.
 */
export function useUnsavedChangesGuard(when) {
  const whenRef = useRef(when)
  whenRef.current = when

  useEffect(() => {
    function onBeforeUnload(e) {
      if (!whenRef.current) return
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [])

  const blocker = useBlocker(Boolean(when))

  return {
    isBlocked: blocker.state === 'blocked',
    proceed: () => blocker.proceed?.(),
    reset: () => blocker.reset?.(),
  }
}
