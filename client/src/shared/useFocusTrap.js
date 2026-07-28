import { useEffect, useRef } from 'react'

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Trap Tab focus inside `containerRef` while `active` is true.
 * Focuses the first focusable (or container) on activate; restores prior focus on cleanup.
 */
export function useFocusTrap(active, containerRef) {
  const previousFocusRef = useRef(null)

  useEffect(() => {
    if (!active) return undefined
    const root = containerRef?.current
    if (!root) return undefined

    previousFocusRef.current = document.activeElement

    const focusables = () =>
      Array.from(root.querySelectorAll(FOCUSABLE)).filter(
        (el) => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true'
      )

    const nodes = focusables()
    const initial = nodes.find((el) => el.classList.contains('modal-app-close-btn') || el.classList.contains('filter-drawer__close'))
      || nodes[0]
      || root
    if (typeof initial.focus === 'function') {
      requestAnimationFrame(() => initial.focus())
    }

    function onKeyDown(e) {
      if (e.key !== 'Tab') return
      const list = focusables()
      if (!list.length) {
        e.preventDefault()
        root.focus?.()
        return
      }
      const first = list[0]
      const last = list[list.length - 1]
      if (e.shiftKey) {
        if (document.activeElement === first || !root.contains(document.activeElement)) {
          e.preventDefault()
          last.focus()
        }
      } else if (document.activeElement === last || !root.contains(document.activeElement)) {
        e.preventDefault()
        first.focus()
      }
    }

    root.addEventListener('keydown', onKeyDown)
    return () => {
      root.removeEventListener('keydown', onKeyDown)
      const prev = previousFocusRef.current
      if (prev && typeof prev.focus === 'function') {
        try {
          prev.focus()
        } catch {
          /* ignore */
        }
      }
    }
  }, [active, containerRef])
}
