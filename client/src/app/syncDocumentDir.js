import i18n from './i18n.js'

/**
 * Urdu → RTL; English → LTR. Keeps <html dir lang> in sync for layout + fonts.
 */
export function syncDocumentDir(lng) {
  const code = (lng || 'ur').split('-')[0]
  const rtl = code === 'ur'
  const root = document.documentElement
  root.setAttribute('dir', rtl ? 'rtl' : 'ltr')
  root.setAttribute('lang', rtl ? 'ur' : 'en')
  root.dataset.locale = rtl ? 'ur' : 'en'
}

syncDocumentDir(i18n.language)
i18n.on('languageChanged', syncDocumentDir)
