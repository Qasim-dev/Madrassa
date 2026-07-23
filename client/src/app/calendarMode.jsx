import { useCallback } from 'react'
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { CALENDAR_MODE_KEY } from '../shared/formatDisplayDate.js'
import { formatDisplayDate } from '../shared/formatDisplayDate.js'

const CalendarModeContext = createContext({
  mode: 'hijri',
  setMode: () => {},
  toggle: () => {},
})

export function CalendarModeProvider({ children }) {
  const [mode, setMode] = useState(() => localStorage.getItem(CALENDAR_MODE_KEY) || 'hijri')

  useEffect(() => {
    localStorage.setItem(CALENDAR_MODE_KEY, mode)
  }, [mode])

  const value = useMemo(
    () => ({
      mode,
      setMode,
      toggle: () => setMode((m) => (m === 'hijri' ? 'gregorian' : 'hijri')),
    }),
    [mode]
  )

  return <CalendarModeContext.Provider value={value}>{children}</CalendarModeContext.Provider>
}

export function useCalendarMode() {
  return useContext(CalendarModeContext)
}

export function useFormatDisplayDate(lng) {
  const { mode } = useCalendarMode()
  return useCallback((value) => formatDisplayDate(value, lng, mode), [lng, mode])
}

