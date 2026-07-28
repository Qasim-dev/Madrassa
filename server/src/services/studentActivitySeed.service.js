import { StudentActivityCategory } from '../models/StudentActivityCategory.js';

const DEFAULT_GRADES = [
  { value: 'excellent', label: { ur: 'ممتاز', en: 'Excellent' }, scoreEquivalent: 5 },
  { value: 'very_good', label: { ur: 'بہت اچھا', en: 'Very Good' }, scoreEquivalent: 4 },
  { value: 'good', label: { ur: 'اچھا', en: 'Good' }, scoreEquivalent: 3 },
  { value: 'average', label: { ur: 'اوسط', en: 'Average' }, scoreEquivalent: 2 },
  { value: 'poor', label: { ur: 'کمزور', en: 'Poor' }, scoreEquivalent: 1 },
];

/** Seed starter categories once per tenant — admins can edit/add freely afterward. */
export const DEFAULT_ACTIVITY_CATEGORIES = [
  {
    key: 'namaz',
    name: { ur: 'نماز', en: 'Namaz' },
    description: { ur: 'روزانہ نماز کی پابندی', en: 'Daily prayer observance' },
    icon: 'mosque',
    color: '#0f8f5f',
    displayOrder: 10,
    ratingType: 'stars',
    maxScore: 5,
    isRequired: true,
  },
  {
    key: 'akhlaq',
    name: { ur: 'اخلاق', en: 'Behavior' },
    description: { ur: 'اخلاقی رویہ', en: 'Character & manners' },
    icon: 'heart',
    color: '#0369a1',
    displayOrder: 20,
    ratingType: 'grade',
    maxScore: 5,
    gradeOptions: DEFAULT_GRADES,
    isRequired: true,
  },
  {
    key: 'discipline',
    name: { ur: 'نظم و ضبط', en: 'Discipline' },
    description: { ur: 'قواعد کی پابندی', en: 'Rule compliance' },
    icon: 'shield',
    color: '#7c3aed',
    displayOrder: 30,
    ratingType: 'score',
    maxScore: 5,
    isRequired: false,
  },
  {
    key: 'cleanliness',
    name: { ur: 'صفائی', en: 'Cleanliness' },
    icon: 'sparkles',
    color: '#0891b2',
    displayOrder: 40,
    ratingType: 'emoji',
    maxScore: 3,
  },
  {
    key: 'uniform',
    name: { ur: 'یونیفارم', en: 'Uniform' },
    icon: 'shirt',
    color: '#ca8a04',
    displayOrder: 50,
    ratingType: 'boolean',
    maxScore: 1,
  },
  {
    key: 'homework',
    name: { ur: 'ہوم ورک', en: 'Homework' },
    icon: 'book',
    color: '#ea580c',
    displayOrder: 60,
    ratingType: 'boolean',
    maxScore: 1,
  },
  {
    key: 'hifz_revision',
    name: { ur: 'حفظ دہرائی', en: 'Memorization revision' },
    icon: 'bookOpen',
    color: '#16a34a',
    displayOrder: 70,
    ratingType: 'stars',
    maxScore: 5,
  },
  {
    key: 'extra',
    name: { ur: 'اضافی سرگرمی', en: 'Extra activities' },
    icon: 'activity',
    color: '#db2777',
    displayOrder: 80,
    ratingType: 'grade',
    maxScore: 5,
    gradeOptions: DEFAULT_GRADES,
  },
];

export async function ensureDefaultActivityCategories(tenantId, userId = null) {
  const count = await StudentActivityCategory.countDocuments({ tenantId });
  if (count > 0) return StudentActivityCategory.find({ tenantId }).sort({ displayOrder: 1 }).lean();

  const docs = DEFAULT_ACTIVITY_CATEGORIES.map((c) => ({
    ...c,
    tenantId,
    createdBy: userId || null,
    isActive: true,
    minScore: 0,
    defaultScore: null,
  }));
  await StudentActivityCategory.insertMany(docs);
  return StudentActivityCategory.find({ tenantId }).sort({ displayOrder: 1 }).lean();
}

export function normalizeActivityValue(category, raw) {
  if (raw == null || raw === '') {
    return { value: '', score: null, grade: '' };
  }
  const type = category?.ratingType || 'score';
  const max = Number(category?.maxScore) || 5;

  if (type === 'boolean') {
    const yes = raw === true || raw === 'yes' || raw === '1' || raw === 1 || raw === 'true';
    return { value: yes ? 'yes' : 'no', score: yes ? max : 0, grade: '' };
  }
  if (type === 'stars') {
    const n = Math.max(0, Math.min(max, Number(raw) || 0));
    return { value: String(n), score: n, grade: '' };
  }
  if (type === 'emoji') {
    const map = { happy: 3, ok: 2, sad: 1, '😊': 3, '😐': 2, '☹️': 1 };
    const score = map[raw] != null ? map[raw] : Number(raw) || null;
    const value = typeof raw === 'string' ? raw : String(raw);
    return { value, score, grade: '' };
  }
  if (type === 'grade') {
    const opts = category.gradeOptions || DEFAULT_GRADES;
    const hit = opts.find((o) => o.value === raw || o.value === String(raw));
    return {
      value: hit?.value || String(raw),
      score: hit?.scoreEquivalent ?? null,
      grade: hit?.value || String(raw),
    };
  }
  const n = Number(raw);
  const score = Number.isFinite(n) ? Math.max(0, Math.min(max, n)) : null;
  return { value: score != null ? String(score) : String(raw), score, grade: '' };
}
