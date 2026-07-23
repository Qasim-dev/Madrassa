/**
 * Default سرپرست رشتہ options (Urdu + English). Tenants get this list on signup;
 * admins can add/edit/remove rows under Settings → basic tartibat.
 */
const ROWS = [
  { ur: 'کوئی نہیں', en: 'None' },
  { ur: 'دادا', en: 'Grandfather (paternal)' },
  { ur: 'دادی', en: 'Grandmother (paternal)' },
  { ur: 'والد', en: 'Father' },
  { ur: 'والدہ', en: 'Mother' },
  { ur: 'بھائی', en: 'Brother' },
  { ur: 'بہن', en: 'Sister' },
  { ur: 'تایا', en: "Father's elder brother" },
  { ur: 'چچا', en: "Father's younger brother" },
  { ur: 'چچی', en: "Paternal uncle's wife" },
  { ur: 'ماموں', en: "Mother's brother" },
  { ur: 'ممانی', en: "Maternal uncle's wife" },
  { ur: 'پھوپھی', en: "Father's sister" },
  { ur: 'خالہ', en: "Mother's sister" },
  { ur: 'قانونی سرپرست', en: 'Legal guardian' },
  { ur: 'استاد', en: 'Teacher' },
];

/** Fresh copies for Mongoose documents (avoid shared mutation). */
export function defaultGuardianRelations() {
  return ROWS.map((r) => ({ ur: r.ur, en: r.en }));
}
