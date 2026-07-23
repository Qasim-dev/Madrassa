import { Router } from 'express';
import countries from 'i18n-iso-countries';
import { createRequire } from 'module';
import { Country, State, City } from 'country-state-city';

const require = createRequire(import.meta.url);
const enLocale = require('i18n-iso-countries/langs/en.json');
const urLocale = require('i18n-iso-countries/langs/ur.json');

countries.registerLocale(enLocale);
countries.registerLocale(urLocale);

const router = Router();

function locPair({ ur, en }) {
  return { ur: ur || en || '', en: en || ur || '' };
}

const PK_STATE_UR = new Map([
  ['Punjab', 'پنجاب'],
  ['Sindh', 'سندھ'],
  ['Khyber Pakhtunkhwa', 'خیبر پختونخوا'],
  ['Balochistan', 'بلوچستان'],
  ['Islamabad Capital Territory', 'اسلام آباد دارالحکومت'],
  ['Azad Kashmir', 'آزاد جموں و کشمیر'],
  ['Gilgit-Baltistan', 'گلگت بلتستان'],
  ['Federally Administered Tribal Areas', 'قبائلی علاقہ جات'],
]);

function romanToUrdu(s) {
  const x = String(s || '').trim();
  if (!x) return '';
  // Very small transliteration fallback (good enough for PK city names)
  let t = x.toLowerCase();
  const rules = [
    ['kh', 'خ'],
    ['gh', 'غ'],
    ['sh', 'ش'],
    ['ch', 'چ'],
    ['ph', 'ف'],
    ['bh', 'بھ'],
    ['dh', 'دھ'],
    ['th', 'تھ'],
    ['jh', 'جھ'],
    ['aa', 'ا'],
    ['ee', 'ی'],
    ['oo', 'و'],
  ];
  for (const [a, b] of rules) t = t.split(a).join(b);
  const map = new Map([
    ['a', 'ا'],
    ['b', 'ب'],
    ['c', 'ک'],
    ['d', 'د'],
    ['e', 'ے'],
    ['f', 'ف'],
    ['g', 'گ'],
    ['h', 'ہ'],
    ['i', 'ی'],
    ['j', 'ج'],
    ['k', 'ک'],
    ['l', 'ل'],
    ['m', 'م'],
    ['n', 'ن'],
    ['o', 'و'],
    ['p', 'پ'],
    ['q', 'ق'],
    ['r', 'ر'],
    ['s', 'س'],
    ['t', 'ت'],
    ['u', 'و'],
    ['v', 'و'],
    ['w', 'و'],
    ['x', 'کس'],
    ['y', 'ی'],
    ['z', 'ز'],
    [' ', ' '],
    ['-', ' '],
    ["'", ''],
    ['.', ''],
  ]);
  let out = '';
  for (const ch of t) out += map.get(ch) ?? '';
  // restore basic casing spacing
  return out.replace(/\s+/g, ' ').trim();
}

router.get('/countries', async (_req, res, next) => {
  try {
    const list = Country.getAllCountries()
      .map((c) => {
        const iso2 = c.isoCode;
        const en = countries.getName(iso2, 'en') || c.name;
        const ur = countries.getName(iso2, 'ur') || en;
        return { code: iso2, name: locPair({ ur, en }) };
      })
      .sort((a, b) => a.name.en.localeCompare(b.name.en));
    res.json(list);
  } catch (e) {
    next(e);
  }
});

router.get('/states', async (req, res, next) => {
  try {
    const code = String(req.query.country || '').toUpperCase();
    if (!code) return res.status(400).json({ message: 'country is required (ISO2)' });
    const list = State.getStatesOfCountry(code)
      .map((s) => ({
        code: s.isoCode || s.name,
        name:
          code === 'PK'
            ? locPair({ ur: PK_STATE_UR.get(s.name) || romanToUrdu(s.name), en: s.name })
            : locPair({ ur: s.name, en: s.name }),
      }))
      .sort((a, b) => a.name.en.localeCompare(b.name.en));
    res.json(list);
  } catch (e) {
    next(e);
  }
});

router.get('/cities', async (req, res, next) => {
  try {
    const country = String(req.query.country || '').toUpperCase();
    const state = String(req.query.state || '');
    if (!country) return res.status(400).json({ message: 'country is required (ISO2)' });
    if (!state) return res.status(400).json({ message: 'state is required (state code)' });
    const list = City.getCitiesOfState(country, state)
      .map((c) => ({
        name:
          country === 'PK'
            ? locPair({ ur: romanToUrdu(c.name), en: c.name })
            : locPair({ ur: c.name, en: c.name }),
      }))
      .sort((a, b) => a.name.en.localeCompare(b.name.en));
    res.json(list);
  } catch (e) {
    next(e);
  }
});

export default router;

