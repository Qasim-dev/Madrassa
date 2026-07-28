import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useLazyGetSearchSuggestionsQuery } from '../services/api'
import { loc } from '../shared/localized'
import { AppInput } from './ui'

function fallbackPathForType(type, q) {
  const encoded = encodeURIComponent(q)
  switch (type) {
    case 'teacher':
      return `/teachers?q=${encoded}`
    case 'darjah':
      return '/tartibat/darajat'
    case 'subject':
      return '/tartibat/subjects'
    case 'book':
      return '/tartibat/books'
    case 'student':
    default:
      return `/students?q=${encoded}`
  }
}

export default function AppHeaderSearch() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [value, setValue] = useState('')
  const [focused, setFocused] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [trigger, { data, isFetching }] = useLazyGetSearchSuggestionsQuery()
  const rootRef = useRef(null)
  const lng = i18n.language

  const items = data?.items || []
  const hasItems = items.length > 0

  const normalizedValue = useMemo(() => value.trim(), [value])
  const open = focused && normalizedValue.length >= 2

  function goToItem(item) {
    if (!item) return
    if (item.to) navigate(item.to)
    else navigate(fallbackPathForType(item.type, normalizedValue))
    setFocused(false)
    setActiveIndex(-1)
  }

  function submit(e) {
    e.preventDefault()
    const q = normalizedValue
    if (!q) {
      navigate('/students')
      return
    }
    if (activeIndex >= 0 && items[activeIndex]) {
      goToItem(items[activeIndex])
      return
    }
    if (items[0]) {
      goToItem(items[0])
      return
    }
    navigate(`/students?q=${encodeURIComponent(q)}`)
    setFocused(false)
  }

  useEffect(() => {
    const q = normalizedValue
    setActiveIndex(-1)
    if (!q || q.length < 2) return
    const tmr = setTimeout(() => {
      trigger({ q, limit: 8 })
        .unwrap()
        .catch(() => {})
    }, 220)
    return () => clearTimeout(tmr)
  }, [normalizedValue, trigger])

  useEffect(() => {
    function onDocDown(e) {
      if (!rootRef.current) return
      if (rootRef.current.contains(e.target)) return
      setFocused(false)
    }
    document.addEventListener('mousedown', onDocDown)
    return () => document.removeEventListener('mousedown', onDocDown)
  }, [])

  function onPick(item) {
    goToItem(item)
  }

  function labelFor(item) {
    const primary = item?.primary && typeof item.primary === 'object' ? loc(item.primary, lng) : item?.label || ''
    const metaId = item?.meta?.studentId || ''
    if (item?.type === 'student' && metaId) return `${primary} (${metaId})`
    return primary
  }

  function secondaryFor(item) {
    const sec = item?.secondary && typeof item.secondary === 'object' ? loc(item.secondary, lng) : ''
    if (sec) return sec
    if (item?.type === 'teacher') return item?.meta?.phone || item?.meta?.idCard || ''
    if (item?.type === 'darjah') return item?.meta?.code ? String(item.meta.code) : ''
    return ''
  }

  function onKeyDown(e) {
    if (!open || !hasItems) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => (i + 1) % items.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => (i <= 0 ? items.length - 1 : i - 1))
    } else if (e.key === 'Escape') {
      setFocused(false)
      setActiveIndex(-1)
    }
  }

  return (
    <form ref={rootRef} className="app-header-search app-topbar__search" onSubmit={submit} role="search">
      <label htmlFor="app-global-search" className="visually-hidden">
        {t('header.searchLabel')}
      </label>
      <div className="app-header-search__inner relative">
        <span className="app-header-search__icon pointer-events-none" aria-hidden>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.2-4.2" />
          </svg>
        </span>
        <AppInput
          id="app-global-search"
          type="search"
          className="app-header-search__input w-100 border-0 shadow-none"
          placeholder={t('header.searchPlaceholder')}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            // Let click on a suggestion register first.
            setTimeout(() => setFocused(false), 120)
          }}
          onKeyDown={onKeyDown}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls="app-global-search-listbox"
          aria-autocomplete="list"
          aria-activedescendant={activeIndex >= 0 ? `app-search-opt-${activeIndex}` : undefined}
        />
        {open ? (
          <div
            id="app-global-search-listbox"
            className="app-header-search__dropdown"
            role="listbox"
            aria-label={t('header.searchLabel')}
          >
            {isFetching ? (
              <div className="app-header-search__hint">{lng === 'ur' ? 'تلاش…' : 'Searching…'}</div>
            ) : null}
            {!isFetching && !hasItems ? (
              <div className="app-header-search__hint">{lng === 'ur' ? 'کوئی نتیجہ نہیں' : 'No matches'}</div>
            ) : null}
            {items.map((it, idx) => (
              <button
                key={`${it.type}:${it.id}`}
                id={`app-search-opt-${idx}`}
                type="button"
                className={`app-header-search__item${idx === activeIndex ? ' is-active' : ''}`}
                role="option"
                aria-selected={idx === activeIndex}
                onMouseEnter={() => setActiveIndex(idx)}
                onClick={() => onPick(it)}
              >
                <span className="app-header-search__itemTitle">{labelFor(it)}</span>
                {secondaryFor(it) ? <span className="app-header-search__itemSub">{secondaryFor(it)}</span> : null}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </form>
  )
}
