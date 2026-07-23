import i18n from './i18n.js'

const OTHER_LANG_KEY = 'madrassaShowOtherLangFields'
const UR_FIELD_PREF_KEY = 'madrassaUrFieldPref'
const EN_FIELD_PREF_KEY = 'madrassaEnFieldPref'

function readShowOtherLang(lng) {
  const ui = (lng || 'ur').split('-')[0]
  try {
    if (ui === 'ur') {
      const b = localStorage.getItem(UR_FIELD_PREF_KEY)
      if (b === '0' || b === '1') return b === '1'
    } else {
      const b = localStorage.getItem(EN_FIELD_PREF_KEY)
      if (b === '0' || b === '1') return b === '1'
    }
    const v = localStorage.getItem(OTHER_LANG_KEY)
    if (v === '0' || v === '1') return v === '1'
  } catch {
    /* ignore */
  }
  return false
}

/** Keep body data-* in sync so CSS can hide secondary-language fields on every route. */
export function syncLangFieldBody(lng) {
  const ui = (lng || 'ur').split('-')[0] === 'ur' ? 'ur' : 'en'
  document.body.dataset.uiLang = ui
  document.body.dataset.showOtherLang = readShowOtherLang(lng) ? '1' : '0'
}

syncLangFieldBody(i18n.language)
i18n.on('languageChanged', syncLangFieldBody)
window.addEventListener('madrassa:langFieldsPref', () => syncLangFieldBody(i18n.language))
