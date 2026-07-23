/**
 * Pakistan administrative divisions → cities (Urdu). Used when country = PK for cascading selects.
 */
export const pakistanCitiesByStateInUrdu = {
  'آزاد جموں و کشمیر': ['مظفرآباد', 'میرپور', 'کوٹلی', 'باغ', 'راولاکوٹ', 'بھمبر', 'نیلم', 'ہٹیاں بالا'],

  بلوچستان: [
    'کوئٹہ',
    'گوادر',
    'تربت',
    'خضدار',
    'سبی',
    'ژوب',
    'لورالائی',
    'چمن',
    'مستونگ',
    'پشین',
    'قلات',
    'نوشکی',
    'دالبندین',
    'موسیٰ خیل',
    'جعفرآباد (ڈیرہ مراد جمالی)',
  ],

  'قبائلی علاقہ جات (سابقہ FATA)': ['کرم', 'خیبر', 'مہمند', 'اورکزئی', 'باجوڑ', 'شمالی وزیرستان', 'جنوبی وزیرستان'],

  'گلگت بلتستان': [
    'گلگت',
    'سکردو',
    'ہنزہ (علی آباد)',
    'دیامر (چلاس)',
    'غذر (غذر)',
    'استور',
    'غنچے (خپلو)',
    'شگر',
  ],

  'اسلام آباد دارالحکومت': ['اسلام آباد'],

  خیبرپختونخوا: [
    'پشاور',
    'مردان',
    'ایبٹ آباد',
    'سوات (مینگورہ)',
    'کوہاٹ',
    'ڈیرہ اسماعیل خان',
    'بنوں',
    'نوشہرہ',
    'چارسدہ',
    'صوابی',
    'مانسہرہ',
    'ہری پور',
    'لوئر دیر (تیمرگرہ)',
    'اپر دیر',
    'کرک',
    'لکی مروت',
    'بونیر',
    'شانگلہ',
  ],

  پنجاب: [
    'لاہور',
    'فیصل آباد',
    'راولپنڈی',
    'ملتان',
    'گوجرانوالہ',
    'سیالکوٹ',
    'شیخوپورہ',
    'سرگودھا',
    'بہاولپور',
    'ڈیرہ غازی خان',
    'رحیم یار خان',
    'جھنگ',
    'قصور',
    'گجرات',
    'اوکاڑہ',
    'ساہیوال',
    'وہاڑی',
    'منڈی بہاؤالدین',
    'حافظ آباد',
    'اٹک',
    'چکوال',
    'لودھراں',
    'خانیوال',
    'بھکر',
  ],

  سندھ: [
    'کراچی',
    'حیدرآباد',
    'سکھر',
    'لاڑکانہ',
    'نواب شاہ (شہید بینظیرآباد)',
    'میرپور خاص',
    'ٹھٹہ',
    'بدین',
    'جیکب آباد',
    'شکارپور',
    'گھوٹکی',
    'خیرپور',
    'سنگھڑ',
    'دادو',
    'عمرکوٹ',
    'تھرپارکر (مٹھی)',
  ],
}

/** @deprecated use pakistanCitiesByStateInUrdu */
export const pakistanCitiesInUrdu = pakistanCitiesByStateInUrdu

/** Stable ordering for dropdowns (matches common north→south presentation; adjust freely). */
export const PAKISTAN_PROVINCE_KEYS = [
  'پنجاب',
  'سندھ',
  'خیبرپختونخوا',
  'بلوچستان',
  'قبائلی علاقہ جات (سابقہ FATA)',
  'آزاد جموں و کشمیر',
  'گلگت بلتستان',
  'اسلام آباد دارالحکومت',
]

const PROVINCE_EN = {
  پنجاب: 'Punjab',
  سندھ: 'Sindh',
  خیبرپختونخوا: 'Khyber Pakhtunkhwa',
  بلوچستان: 'Balochistan',
  'قبائلی علاقہ جات (سابقہ FATA)': 'Former FATA (tribal districts)',
  'آزاد جموں و کشمیر': 'Azad Jammu and Kashmir',
  'گلگت بلتستان': 'Gilgit-Baltistan',
  'اسلام آباد دارالحکومت': 'Islamabad Capital Territory',
}

export function provinceUrDisplay(key) {
  return String(key || '').trim()
}

export function provinceEn(key) {
  const k = String(key || '').trim()
  return PROVINCE_EN[k] || k
}

export function citiesForProvinceKey(key) {
  const k = provinceUrDisplay(key)
  if (!k || !pakistanCitiesByStateInUrdu[k]) return []
  return pakistanCitiesByStateInUrdu[k]
}

/**
 * Resolve province key (object key in pakistanCitiesByStateInUrdu) from saved { ur, en }.
 */
export function matchProvinceKeyFromFormState(state) {
  const ur = (state?.ur || '').trim()
  const en = (state?.en || '').trim().toLowerCase()

  for (const key of PAKISTAN_PROVINCE_KEYS) {
    if (key === ur || provinceEn(key).toLowerCase() === en) return key
  }

  // Direct lookup if ur matches any dataset key not listed in PAKISTAN_PROVINCE_KEYS order
  const direct = Object.keys(pakistanCitiesByStateInUrdu).find((k) => k === ur)
  if (direct) return direct

  // Legacy / older forms (underscore keys, shorter Urdu labels)
  const legacyUrToKey = {
    گلگت_بلتستان: 'گلگت بلتستان',
    آزاد_کشمیر: 'آزاد جموں و کشمیر',
    اسلام_آباد: 'اسلام آباد دارالحکومت',
    'آزاد کشمیر': 'آزاد جموں و کشمیر',
    'اسلام آباد': 'اسلام آباد دارالحکومت',
  }
  const underscored = ur.replace(/\s+/g, '_')
  if (legacyUrToKey[underscored]) return legacyUrToKey[underscored]
  if (legacyUrToKey[ur]) return legacyUrToKey[ur]

  if (ur.includes('پختون') || en.includes('khyber') || en.includes('pakhtunkhwa')) return 'خیبرپختونخوا'
  if (ur.includes('گلگت') || en.includes('gilgit')) return 'گلگت بلتستان'
  if ((ur.includes('کشمیر') || ur.includes('جموں')) && !ur.includes('مظفرآباد')) return 'آزاد جموں و کشمیر'
  if (ur.includes('اسلام') || en.includes('islamabad')) return 'اسلام آباد دارالحکومت'
  if (ur.includes('قبائلی') || ur.includes('FATA') || en.includes('fata')) return 'قبائلی علاقہ جات (سابقہ FATA)'

  return null
}

export function cityLocFromUrduName(name) {
  const n = (name || '').trim()
  return { ur: n, en: n }
}
