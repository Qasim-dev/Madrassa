import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import ur from '../locales/ur.json'
import en from '../locales/en.json'

const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('locale') : null

i18n.use(initReactI18next).init({
  resources: {
    ur: { translation: ur },
    en: { translation: en },
  },
  lng: saved || 'ur',
  fallbackLng: 'ur',
  interpolation: { escapeValue: false },
})

export default i18n
